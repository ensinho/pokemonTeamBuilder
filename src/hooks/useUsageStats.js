import { useMemo } from 'react';
import { useStaticData } from './useStaticData';

import { TOUR_BAND, hasTournamentBand, regulationsOf, resolveCutoff } from '../utils/metaFormats';

// Loads the precise, per-format Smogon usage stats baked by
// scripts/build-usage-stats.mjs. `useUsageIndex` returns the format catalog (for
// the format picker); `useUsageFormat` lazily loads one format's per-mon data
// (usage %, items, moves, abilities, real EV spreads, Tera, teammates) plus the
// per-rating-cutoff rankings. Daily cache-buster mirrors the other data hooks.

// One shared request per file and session (services/staticData.js), so
// switching formats back, or another screen holding the same format, never
// refetches.

const EMPTY = [];

/** The format catalog + default id the picker should show first. */
export function useUsageIndex() {
    const { data, status } = useStaticData('usage-index.json');
    const index = Array.isArray(data?.formats) ? data : null;

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
    // Keyed by file, so switching format never serves the previous file's
    // rankings under the new name while the new one loads (useStaticData).
    const { data, status } = useStaticData(formatId ? `usage/${formatId}.json` : null);

    const usageFor = useMemo(() => (id) => data?.byId?.[id] || null, [data]);

    // Every band the file carries, ascending. Files baked before cutoffs existed
    // have none, and the whole cutoff UI simply does not render for them.
    // A file merged with Limitless tournament results adds one more option after
    // the rating bands: ranking by what was registered at tournaments.
    const cutoffs = useMemo(() => {
        const list = data?.format?.cutoffs || Object.keys(data?.cutoffs || {}).map(Number);
        const numeric = [...new Set(list)].filter((c) => Number.isFinite(c)).sort((a, b) => a - b);
        return hasTournamentBand(data) ? [...numeric, TOUR_BAND] : numeric;
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
        // { teamsAnalyzed, tournaments, from, to } when Limitless results are merged in.
        tournament: data?.tournament || null,
        cutoffs,
        detailCutoff,
        activeCutoff,
        status,
    };
}
