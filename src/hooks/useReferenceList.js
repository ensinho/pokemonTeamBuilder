import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useUrlParam } from './useUrlParam';
import { useScrollRestoration } from './useScrollRestoration';

// How deep each list was revealed, keyed by `listKey`, remembered with the
// signature (search + filters) it was revealed for. Opening a row leaves the
// page; coming Back used to start again at 40 rows, so the restored scroll
// offset pointed past the end of the list. Session memory, like the Pokédex's.
const revealMemory = new Map();

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
 * @param {Function} [opts.filterEntry] (entry) => boolean, applied before paging
 *        so the count and the infinite scroll answer to it (a filter applied to
 *        the visible page only showed non-matching rows and a wrong total).
 * @param {string}   [opts.filterKey] changes when filterEntry's criteria change
 * @param {string}   [opts.listKey] identity of the list ('moves', 'items'…). When
 *        set, the reveal depth and the scroll offset survive leaving and coming
 *        Back, per search + filter signature.
 * @param {boolean}  [opts.enabled] false while the index's source is not loaded
 *        yet — reported as loading, never as an empty list.
 * @param {Function} [opts.getRelatedNames] async (normalizedSearch) => string[] | null
 *        When the search term names a Pokémon, returns the index entry names
 *        related to it (e.g. that Pokémon's moves/abilities) so a search for
 *        "pikachu" surfaces "thunderbolt"/"static". Returns null when the term
 *        isn't a Pokémon, leaving the plain name filter in charge.
 */
export function useReferenceList({ loadIndex, loadDetail, pageSize = 40, getRelatedNames, filterEntry = null, filterKey = '', listKey = '', enabled = true }) {
    const [index, setIndex] = useState([]);
    const [isLoadingIndex, setIsLoadingIndex] = useState(true);
    // The search lives in the URL (?q=), so Back, refresh and a shared link keep it.
    const [search, setSearch] = useUrlParam('q');
    const [details, setDetails] = useState({});
    const requested = useRef(new Set());

    // Tracks mount status so late-arriving fetches never setState on an
    // unmounted hook, while still being applied across re-renders.
    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    // Load the index once, retrying a couple of times on transient failures.
    useEffect(() => {
        if (!enabled) { setIsLoadingIndex(true); return undefined; }
        let cancelled = false;
        let timer;
        const attempt = (retriesLeft) => {
            Promise.resolve(loadIndex())
                .then((list) => {
                    if (cancelled) return;
                    setIndex(Array.isArray(list) ? list : []);
                    setIsLoadingIndex(false);
                })
                .catch(() => {
                    if (cancelled) return;
                    if (retriesLeft > 0) {
                        timer = setTimeout(() => attempt(retriesLeft - 1), 1500);
                    } else {
                        setIndex([]);
                        setIsLoadingIndex(false);
                    }
                });
        };
        setIsLoadingIndex(true);
        attempt(2);
        return () => { cancelled = true; clearTimeout(timer); };
    }, [loadIndex, enabled]);

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

    const searched = useMemo(() => {
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

    const filtered = useMemo(
        () => (filterEntry ? searched.filter(filterEntry) : searched),
        [searched, filterEntry],
    );

    // The revealed window belongs to one search + filter signature: a new
    // signature starts from the first page, the remembered one (coming Back)
    // starts as deep as it was left.
    const signature = `${normalized}|${filterKey}`;
    const [windowState, setWindowState] = useState(() => {
        const remembered = listKey ? revealMemory.get(listKey) : null;
        return {
            signature,
            count: remembered && remembered.signature === signature ? remembered.count : pageSize,
        };
    });
    if (windowState.signature !== signature) {
        setWindowState({ signature, count: pageSize });
    }
    const visibleCount = windowState.signature === signature ? windowState.count : pageSize;
    useEffect(() => {
        if (listKey) revealMemory.set(listKey, windowState);
    }, [listKey, windowState]);

    const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);

    // Lazily resolve details for the visible window. Results are keyed by name
    // and remain valid no matter how the window has shifted since the fetch
    // started, so they are applied even if `visible` changed mid-flight (e.g.
    // the user kept typing) — discarding them here while leaving the name in
    // `requested` would leave rows as permanent skeletons. Each detail lands
    // as soon as it resolves instead of waiting on the slowest of the batch.
    useEffect(() => {
        const pending = visible.filter((entry) => !requested.current.has(entry.name));
        if (pending.length === 0) return;
        pending.forEach((entry) => requested.current.add(entry.name));

        pending.forEach((entry) => {
            Promise.resolve(loadDetail(entry))
                .then((detail) => {
                    if (!mounted.current) return;
                    setDetails((prev) => ({ ...prev, [entry.name]: detail ?? null }));
                })
                .catch(() => {
                    // Un-mark so the row is refetched the next time it is on
                    // screen, instead of caching the failure forever.
                    requested.current.delete(entry.name);
                });
        });
    }, [visible, loadDetail]);

    const loadMore = useCallback(() => {
        setWindowState((state) => ({
            ...state,
            count: Math.max(state.count, Math.min(state.count + pageSize, filtered.length)),
        }));
    }, [filtered.length, pageSize]);

    useScrollRestoration(listKey ? `${listKey}|${signature}` : '', {
        ready: !isLoadingIndex && filtered.length > 0,
    });

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
