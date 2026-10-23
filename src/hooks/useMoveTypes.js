import { useMemo } from 'react';
import { useStaticData } from './useStaticData';

const NO_TYPES = {};

// Normalize a display move name to the Showdown move id used as the map key.
export const moveId = (name = '') => String(name).toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Loads the baked move → type map so move chips can be coloured by type without
 * a per-move API call. Returns `typeForMove(name)` (lowercase type or null).
 */
export function useMoveTypes() {
    const { data } = useStaticData('move-types.json');
    const byId = data?.byId || NO_TYPES;

    const typeForMove = useMemo(() => (name) => byId[moveId(name)] || null, [byId]);

    return { typeForMove };
}
