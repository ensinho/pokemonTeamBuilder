import { useEffect, useMemo, useState } from 'react';

/**
 * A list shown one fixed-size page at a time.
 *
 * `resetKey` names what the list is *of* (a filter, a tab): when it changes
 * the reader is looking at a different list and starts on its first page. A
 * list that merely shrinks keeps its page, clamped to the last one that exists.
 */
export function usePaged(items, pageSize, resetKey = '') {
    const [page, setPage] = useState(0);
    useEffect(() => { setPage(0); }, [resetKey]);

    const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
    const current = Math.min(page, pageCount - 1);
    const pageItems = useMemo(
        () => items.slice(current * pageSize, (current + 1) * pageSize),
        [items, current, pageSize],
    );

    return { page: current, pageCount, pageItems, setPage };
}
