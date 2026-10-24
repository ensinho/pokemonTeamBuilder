import { useMemo } from 'react';
import { useStaticData } from './useStaticData';

const NO_SETS = {};

/**
 * Loads the baked Smogon dataset — expert-curated recommended sets + written
 * analysis per species, mirrored from pkmn.github.io/smogon. Complements the
 * tournament-mined competitive-usage data: where that captures *what champions
 * actually ran* (real but thin), this gives a *robust, full-meta baseline* with
 * the reasoning behind each set. Returns a `smogonFor(id)` lookup + ready status.
 * The file is 1.8 MB: one shared request (services/staticData.js), never one
 * per caller.
 */
export function useSmogonData({ enabled = true } = {}) {
    const { data, status } = useStaticData('smogon.json', { enabled });
    const byId = data?.byId || NO_SETS;
    const smogonFor = useMemo(() => (id) => byId[id] || null, [byId]);

    return { byId, smogonFor, status };
}
