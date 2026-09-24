import { useMemo } from 'react';
import { useInfiniteReveal } from './useInfiniteReveal';
import { limitSections } from '../utils/gameDex';

/**
 * The Team Builder picker's grid, mounted a page at a time. Shared by the
 * desktop and mobile builders.
 *
 * A Smogon tier or a game filter hands the picker its whole roster at once
 * (~700–1000 cards), which the phone paid for as a second-long mount and a
 * full walk of the grid on every re-render. The default list is still paged by
 * `usePokedexStore`; a page never exceeds `step`, so windowing it is a no-op
 * and the store's own last-card observer keeps working.
 *
 * `filters` is what makes it a different list — any change snaps back to the
 * first page. The team is deliberately not in it: adding a Pokémon must not
 * throw the user back to the top of a list they scrolled.
 */
export function usePickerGridWindow({ list, sections, filters, step = 60 }) {
    const resetKey = [
        filters.regulation || '',
        filters.generation || '',
        filters.game || '',
        [...(filters.types || [])].sort().join('+'),
        filters.typeMatchMode || '',
        (filters.search || '').trim().toLowerCase(),
        filters.favoritesOnly ? 'fav' : '',
    ].join('|');

    const total = sections
        ? sections.reduce((n, s) => n + s.mons.length, 0)
        : (list?.length || 0);
    const { limit, hasMore, sentinelRef } = useInfiniteReveal(total, { step, resetKey });

    const visibleSections = useMemo(() => (sections ? limitSections(sections, limit) : null), [sections, limit]);
    const visibleList = useMemo(() => {
        if (!list) return [];
        return list.length > limit ? list.slice(0, limit) : list;
    }, [list, limit]);

    return { visibleList, visibleSections, hasMore, sentinelRef };
}
