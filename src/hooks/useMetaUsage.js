import { useMemo } from 'react';
import { useUsageIndex, useUsageFormat } from './useUsageStats';
import { NO_REGULATION } from '../constants/regulations';
import { TIER_KIND } from '../utils/metaFormats';

// The current-meta usage ranking exposed in a `popular`-compatible shape so the
// Team Builder suggestions and the Home VGC card can rank by REAL Smogon ladder
// usage instead of the thin 120-team tournament sample. Built on the shared usage
// hooks — no extra fetch.
//
// Pass a `formatId` to pair the ranking with a specific regulation (e.g. the one
// the user picks in the Team Builder game selector); omit it (or pass an unknown
// id) to fall back to the default regulation. Also returns the regulation catalog
// so callers can render a selector.
//
// Pass NO_REGULATION for playthrough mode: the catalog still loads (the selector
// has to render), but no format is fetched and every ranking comes back empty, so
// consumers stop showing meta signals without each having to special-case it.
export function useMetaUsage(formatId) {
    // Two lists, because the builder's picker shows them differently: the VGC
    // `regulations` are cover cards (three of them), the Smogon `tiers` are
    // chips (thirty-odd). Either can be the active choice, so validation below
    // runs against the whole catalog.
    const { formats: allFormats, regulations, defaultFormatId, month, status: idxStatus } = useUsageIndex();
    const tiers = useMemo(() => allFormats.filter((f) => f.kind === TIER_KIND), [allFormats]);
    const playthrough = formatId === NO_REGULATION;
    // Only honour a requested format once we know it's real; otherwise default.
    const activeId = playthrough
        ? null
        : ((formatId && allFormats.some((f) => f.id === formatId)) ? formatId : defaultFormatId);
    const activeFormat = useMemo(
        () => allFormats.find((f) => f.id === activeId) || null,
        [allFormats, activeId],
    );
    // `null` short-circuits the fetch in useUsageFormat — playthrough mode costs
    // nothing to enter and saves the ~250KB usage file.
    const { byId, format, status: fmtStatus } = useUsageFormat(activeId);

    const ranked = useMemo(() => {
        if (!byId) return [];
        return Object.entries(byId)
            .map(([id, e]) => ({ id: Number(id), name: e.name, count: Math.round(e.usage || 0) }))
            .sort((a, b) => b.count - a.count);
    }, [byId]);

    // id → usage% weight, for the suggestion engine's meta signals.
    const usageMap = useMemo(() => new Map(ranked.map((r) => [r.id, r.count])), [ranked]);

    // id → win-rate% (real tournament performance, Limitless). Only present for
    // formats mined from Limitless; older Smogon-only formats simply lack it.
    const winRateMap = useMemo(() => {
        if (!byId) return new Map();
        return new Map(
            Object.entries(byId)
                .filter(([, e]) => Number.isFinite(e.winRate))
                .map(([id, e]) => [Number(id), e.winRate]),
        );
    }, [byId]);

    return {
        ranked,
        byId: byId || {},
        usageMap,
        winRateMap,
        // The VGC regulations only — the builder's card grid is built for three
        // covers, not the whole ladder. `tiers` carries the rest.
        formats: regulations,
        tiers,
        // Whether the active choice is a Smogon tier, which is what turns the
        // builder's roster filter on.
        isTier: activeFormat?.kind === TIER_KIND,
        // Report the sentinel back, not the null we fetched with, so callers can
        // reflect the choice in the UI (and highlight it in the selector).
        formatId: playthrough ? NO_REGULATION : activeId,
        format,
        month,
        status: idxStatus === 'loading' || fmtStatus === 'loading' ? 'loading' : 'ready',
    };
}
