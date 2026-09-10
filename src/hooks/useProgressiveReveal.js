import { useCallback, useState } from 'react';
import { getRevealState } from '../utils/progressiveReveal';

/**
 * Reveal a long list in pages. Returns `{ limit, remaining, hasMore, showMore }`;
 * render `items.slice(0, limit)` and a "Show more" control while `hasMore`.
 *
 * `resetKey` (a string — format, sort, search…) snaps the list back to its first
 * page when what the list *is* changes. The count is stored alongside the key it
 * was earned under and simply ignored once the key moves on, so a reset needs no
 * effect and there is never a render showing the old count against the new list.
 */
export function useProgressiveReveal(total, { initial, step = initial, enabled = true, resetKey = '' } = {}) {
    const [state, setState] = useState({ key: resetKey, count: initial });
    const revealed = state.key === resetKey ? state.count : initial;

    const showMore = useCallback(() => {
        setState({ key: resetKey, count: revealed + step });
    }, [resetKey, revealed, step]);

    return { ...getRevealState(total, revealed, enabled), showMore };
}
