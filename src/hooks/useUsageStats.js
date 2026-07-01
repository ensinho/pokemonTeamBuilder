import { useEffect, useMemo, useState } from 'react';

// Loads the precise, per-regulation Smogon usage stats baked by
// scripts/build-usage-stats.mjs. `useUsageIndex` returns the format catalog (for
// the regulation selector); `useUsageFormat` lazily loads one format's per-mon
// data (usage %, items, moves, abilities, real EV spreads, Tera, teammates).
// Daily cache-buster mirrors the other data hooks.

const dayStamp = () => {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
};

const dataUrl = (file) =>
    `${import.meta.env.BASE_URL || '/'}data/${file}`.replace(/([^:])\/{2,}/g, '$1/') + `?d=${dayStamp()}`;

// Module-level cache so switching formats (or revisiting) never refetches.
const formatCache = new Map();

/** The regulation catalog + default id the selector should show first. */
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

    return {
        formats: index?.formats || [],
        defaultFormatId: index?.default || index?.formats?.[0]?.id || null,
        month: index?.month || null,
        status,
    };
}

/** One regulation's per-mon usage data (lazy, cached). Pass a format id or null. */
export function useUsageFormat(formatId) {
    const [data, setData] = useState(() => formatCache.get(formatId) || null);
    const [status, setStatus] = useState(formatCache.has(formatId) ? 'ready' : 'loading');

    useEffect(() => {
        if (!formatId) { setData(null); setStatus('ready'); return undefined; }
        if (formatCache.has(formatId)) { setData(formatCache.get(formatId)); setStatus('ready'); return undefined; }
        let cancelled = false;
        setStatus('loading');
        (async () => {
            try {
                const res = await fetch(dataUrl(`usage/${formatId}.json`));
                if (res.ok) {
                    const json = await res.json();
                    formatCache.set(formatId, json);
                    if (!cancelled) setData(json);
                }
            } catch (_) { /* optional */ } finally {
                if (!cancelled) setStatus('ready');
            }
        })();
        return () => { cancelled = true; };
    }, [formatId]);

    const usageFor = useMemo(() => (id) => data?.byId?.[id] || null, [data]);

    return { data, byId: data?.byId || null, usageFor, format: data?.format || null, totalBattles: data?.totalBattles || 0, status };
}
