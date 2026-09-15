import { useEffect, useMemo, useState } from 'react';

import { regulationsOf, resolveCutoff } from '../utils/metaFormats';

// Loads the precise, per-format Smogon usage stats baked by
// scripts/build-usage-stats.mjs. `useUsageIndex` returns the format catalog (for
// the format picker); `useUsageFormat` lazily loads one format's per-mon data
// (usage %, items, moves, abilities, real EV spreads, Tera, teammates) plus the
// per-rating-cutoff rankings. Daily cache-buster mirrors the other data hooks.

const dayStamp = () => {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
};

const dataUrl = (file) =>
    `${import.meta.env.BASE_URL || '/'}data/${file}`.replace(/([^:])\/{2,}/g, '$1/') + `?d=${dayStamp()}`;

// Module-level cache so switching formats (or revisiting) never refetches.
const formatCache = new Map();

const EMPTY = [];

/** The format catalog + default id the picker should show first. */
export function useUsageIndex() {
    const [index, setIndex] = useState(null);
    const [status, setStatus] = useState('loading');

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(dataUrl('usage-index.json'));
                if (res.ok) {
                    const data = await res.json();
                    if (!cancelled && Array.isArray(data?.formats)) setIndex(data);
                }
            } catch (_) { /* optional dataset */ } finally {
                if (!cancelled) setStatus('ready');
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const formats = index?.formats || EMPTY;
    // The Smogon tiers belong to the Meta pages only. The Team Builder's
    // game/regulation picker renders one card per entry, so handing it forty
    // ladders would turn a ruleset choice into a directory — it takes
    // `regulations` instead, which is what the catalog held before tiers existed.
    const regulations = useMemo(() => regulationsOf(formats), [formats]);

    return {
        formats,
        regulations,
        defaultFormatId: index?.default || formats[0]?.id || null,
        month: index?.month || null,
        status,
    };
}

/**
 * One format's usage data (lazy, cached). Pass a format id or null.
 *
 * `cutoff` selects which ladder rating band the *ranking* comes from; omit it
 * for the band the file's detail was sampled at. The breakdown (`byId`,
 * `usageFor`) is always the detail band — only one cutoff's full chaos dump is
 * baked, so `detailCutoff` is reported for the UI to say so.
 */
export function useUsageFormat(formatId, cutoff = null) {
    // Held with the id it was fetched for. Switching format used to keep serving
    // the previous file until the new one landed, which was harmless while the
    // catalog was three VGC regulations and is not now: it would render OU's
    // rankings under "Doubles UU" for as long as the fetch took.
    const [loaded, setLoaded] = useState(() => (formatCache.has(formatId) ? { id: formatId, json: formatCache.get(formatId) } : null));
    const [status, setStatus] = useState(formatCache.has(formatId) ? 'ready' : 'loading');
    const data = loaded?.id === formatId ? loaded.json : null;

    useEffect(() => {
        if (!formatId) { setLoaded(null); setStatus('ready'); return undefined; }
        if (formatCache.has(formatId)) { setLoaded({ id: formatId, json: formatCache.get(formatId) }); setStatus('ready'); return undefined; }
        let cancelled = false;
        setStatus('loading');
        (async () => {
            try {
                const res = await fetch(dataUrl(`usage/${formatId}.json`));
                if (res.ok) {
                    const json = await res.json();
                    formatCache.set(formatId, json);
                    if (!cancelled) setLoaded({ id: formatId, json });
                }
            } catch (_) { /* optional */ } finally {
                if (!cancelled) setStatus('ready');
            }
        })();
        return () => { cancelled = true; };
    }, [formatId]);

    const usageFor = useMemo(() => (id) => data?.byId?.[id] || null, [data]);

    // Every band the file carries, ascending. Files baked before cutoffs existed
    // have none, and the whole cutoff UI simply does not render for them.
    const cutoffs = useMemo(() => {
        const list = data?.format?.cutoffs || Object.keys(data?.cutoffs || {}).map(Number);
        return [...new Set(list)].filter((c) => Number.isFinite(c)).sort((a, b) => a - b);
    }, [data]);

    const detailCutoff = data?.detailCutoff ?? data?.format?.cutoff ?? null;
    const activeCutoff = useMemo(
        () => resolveCutoff(cutoff, cutoffs, detailCutoff),
        [cutoff, cutoffs, detailCutoff],
    );

    // Battle count for the band on screen — the unrated band is a far bigger
    // sample than 1825+, so reporting the detail band's count under either would
    // misstate how much data the list is drawn from.
    const bandBattles = data?.cutoffs?.[String(activeCutoff)]?.totalBattles;

    return {
        data,
        byId: data?.byId || null,
        usageFor,
        format: data?.format || null,
        totalBattles: (activeCutoff === detailCutoff ? data?.totalBattles : bandBattles) || data?.totalBattles || 0,
        cutoffs,
        detailCutoff,
        activeCutoff,
        status,
    };
}
