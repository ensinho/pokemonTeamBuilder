import { useMemo } from 'react';
import { useStaticData } from './useStaticData';

import { legalIdsForFormat, formatHasTierFilter } from '../utils/tierLegality';

// Loads the baked Smogon tierlist (public/data/tier-legality.json) and turns it
// into the set of species a format allows. Fetched once per session and shared,
// because every Team Builder surface that filters by tier wants the same answer.
//
// Deliberately separate from the usage hooks: usage says who is POPULAR in a
// tier (and only for the ~150 species the chaos dump covers), this says who is
// ALLOWED. The builder's filter needs the second, or a legal-but-niche pick
// would be missing from the list it is supposed to be choosing from.

/**
 * `{ byId, legalIdsFor(formatId), hasTierFilter(formatId), status }`.
 *
 * `legalIdsFor` returns a Set, or `null` meaning "do not filter" — either the
 * format has no tier ladder (VGC, Monotype, 1v1) or the dataset has not landed.
 * Callers must treat `null` as "allow everything", never as "allow nothing".
 */
export function useTierLegality() {
    const { data, status } = useStaticData('tier-legality.json');
    const byId = data?.byId || null;

    const legalIdsFor = useMemo(() => {
        const memo = new Map();
        return (formatId) => {
            if (!formatId) return null;
            if (!memo.has(formatId)) memo.set(formatId, legalIdsForFormat(byId, formatId));
            return memo.get(formatId);
        };
    }, [byId]);

    return { byId, legalIdsFor, hasTierFilter: formatHasTierFilter, status };
}
