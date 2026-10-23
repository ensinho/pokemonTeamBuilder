import { useMemo } from 'react';
import { useStaticData } from './useStaticData';

const NO_USAGE = {};

/**
 * Loads the mined competitive-usage dataset — real held-item / ability / tera /
 * move frequencies per species, aggregated from the pokepastes of tournament
 * teams. Returns a `usageFor(id)` lookup plus the raw map and ready status.
 * `enabled: false` (Team Builder playthrough mode) skips the download.
 */
export function useCompetitiveUsage({ enabled = true } = {}) {
    const { data, status } = useStaticData('competitive-usage.json', { enabled });
    const byId = data?.byId || NO_USAGE;
    const totalTeams = Number.isFinite(data?.totalTeams) ? data.totalTeams : 0;
    const usageFor = useMemo(() => (id) => byId[id] || null, [byId]);

    return { byId, usageFor, totalTeams, status };
}
