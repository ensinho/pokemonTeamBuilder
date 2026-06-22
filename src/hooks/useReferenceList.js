import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Drives the DATABASE list views (Moves / Abilities / Items).
 *
 * It loads a lightweight name+url index once, filters it client-side by search
 * term, paginates it, and lazily fetches the heavier per-row detail for only the
 * rows currently on screen — so browsing ~900 moves never fans out into ~900
 * requests. Details are memoised by name and survive re-renders.
 *
 * @param {object}   opts
 * @param {Function} opts.loadIndex  async () => Array<{ name, url, id }>
 * @param {Function} opts.loadDetail async (entry) => detail | null
 * @param {number}   [opts.pageSize] rows revealed per "load more" step
 * @param {Function} [opts.getRelatedNames] async (normalizedSearch) => string[] | null
 *        When the search term names a Pokémon, returns the index entry names
 *        related to it (e.g. that Pokémon's moves/abilities) so a search for
 *        "pikachu" surfaces "thunderbolt"/"static". Returns null when the term
 *        isn't a Pokémon, leaving the plain name filter in charge.
 */
export function useReferenceList({ loadIndex, loadDetail, pageSize = 40, getRelatedNames }) {
    const [index, setIndex] = useState([]);
    const [isLoadingIndex, setIsLoadingIndex] = useState(true);
    const [search, setSearch] = useState('');
    const [visibleCount, setVisibleCount] = useState(pageSize);
    const [details, setDetails] = useState({});
    const requested = useRef(new Set());

    // Load the index once.
    useEffect(() => {
        let cancelled = false;
        setIsLoadingIndex(true);
        Promise.resolve(loadIndex())
            .then((list) => { if (!cancelled) setIndex(Array.isArray(list) ? list : []); })
            .catch(() => { if (!cancelled) setIndex([]); })
            .finally(() => { if (!cancelled) setIsLoadingIndex(false); });
        return () => { cancelled = true; };
    }, [loadIndex]);

    const normalized = search.trim().toLowerCase().replace(/\s+/g, '-');

    // Names related to a searched Pokémon (its moves/abilities). Resolved lazily
    // since it may require fetching that Pokémon's record. null = not a Pokémon.
    const [relatedNames, setRelatedNames] = useState(null);
    useEffect(() => {
        if (!normalized || !getRelatedNames) { setRelatedNames(null); return undefined; }
        let cancelled = false;
        setRelatedNames(null);
        Promise.resolve(getRelatedNames(normalized))
            .then((names) => { if (!cancelled) setRelatedNames(Array.isArray(names) ? names : null); })
            .catch(() => { if (!cancelled) setRelatedNames(null); });
        return () => { cancelled = true; };
    }, [normalized, getRelatedNames]);

    const filtered = useMemo(() => {
        if (!normalized) return index;
        const byName = index.filter((entry) => entry.name.includes(normalized));
        if (!relatedNames || relatedNames.length === 0) return byName;
        // Merge the Pokémon-related entries in, de-duped against the name matches.
        const related = new Set(relatedNames);
        const seen = new Set(byName.map((entry) => entry.name));
        const merged = [...byName];
        for (const entry of index) {
            if (related.has(entry.name) && !seen.has(entry.name)) {
                merged.push(entry);
                seen.add(entry.name);
            }
        }
        return merged;
    }, [index, normalized, relatedNames]);

    // Reset the window whenever the filter changes.
    useEffect(() => { setVisibleCount(pageSize); }, [normalized, pageSize]);

    const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);

    // Lazily resolve details for the visible window.
    useEffect(() => {
        let cancelled = false;
        const pending = visible.filter((entry) => !requested.current.has(entry.name));
        if (pending.length === 0) return undefined;
        pending.forEach((entry) => requested.current.add(entry.name));

        Promise.all(pending.map(async (entry) => {
            try {
                const detail = await loadDetail(entry);
                return [entry.name, detail];
            } catch (_) {
                return [entry.name, null];
            }
        })).then((pairs) => {
            if (cancelled) return;
            setDetails((prev) => {
                const next = { ...prev };
                for (const [name, detail] of pairs) next[name] = detail;
                return next;
            });
        });

        return () => { cancelled = true; };
    }, [visible, loadDetail]);

    const loadMore = useCallback(() => {
        setVisibleCount((count) => Math.min(count + pageSize, filtered.length));
    }, [filtered.length, pageSize]);

    const sentinelRef = useRef(null);
    const hasMore = visibleCount < filtered.length;
    useEffect(() => {
        const node = sentinelRef.current;
        if (!node || !hasMore) return undefined;
        const observer = new IntersectionObserver((entries) => {
            if (entries[0]?.isIntersecting) loadMore();
        }, { rootMargin: '320px' });
        observer.observe(node);
        return () => observer.disconnect();
    }, [hasMore, loadMore]);

    return {
        search, setSearch,
        isLoadingIndex,
        total: filtered.length,
        visible,
        details,
        hasMore,
        loadMore,
        sentinelRef,
    };
}
