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
 */
export function useReferenceList({ loadIndex, loadDetail, pageSize = 40 }) {
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
    const filtered = useMemo(() => {
        if (!normalized) return index;
        return index.filter((entry) => entry.name.includes(normalized));
    }, [index, normalized]);

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
