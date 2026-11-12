import { useEffect, useState } from 'react';

import { ensureSpeciesIndex, getSpeciesIndex } from '../services/speciesIndex';

/**
 * `baseIdOf(id)` — the base species of a form (Mega Heracross → 214), or null
 * for a base species — as a hook: it answers from the index when it is already
 * in memory and re-renders once when it arrives.
 *
 * The mined competitive data (Smogon sets, ladder and tournament usage) is
 * keyed by base species. A view that looks a form up by its own id finds
 * nothing; ask `speciesIdOf(member, baseIdOf)` (utils/teamUniqueness.js) for
 * the id to look up instead. The index is the data service's memory-cached
 * one — no extra request.
 */
export function useBaseIdOf() {
    const [baseIdOf, setBaseIdOf] = useState(() => getSpeciesIndex().baseIdOf);
    useEffect(() => {
        let alive = true;
        ensureSpeciesIndex().then((index) => {
            if (alive) setBaseIdOf(() => index.baseIdOf);
        });
        return () => { alive = false; };
    }, []);
    return baseIdOf;
}
