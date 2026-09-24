import { useEffect, useState } from 'react';
import { useProgressiveReveal } from './useProgressiveReveal';

// `rootMargin` only grows the *root*. With the default (viewport) root, a list
// inside a scrolling element (`.app-shell__content`, the builder's results
// pane) is clipped by that element first, so the margin never applies and the
// next page only mounts once the user has already hit the bottom.
function scrollParentOf(node) {
    for (let el = node?.parentElement; el; el = el.parentElement) {
        const { overflowY } = getComputedStyle(el);
        if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight) return el;
    }
    return null;
}

/**
 * `useProgressiveReveal`, driven by scroll instead of a "Show more" button: put
 * `sentinelRef` on an element after the list and the next page mounts as it
 * nears the viewport.
 *
 * For lists that are already whole in memory (a Smogon tier's roster, a game's
 * dex) but far too long to mount at once — ~1000 cards is a second-long commit
 * on a phone, and every re-render of the parent walks all of them again.
 *
 * The observer is rebuilt whenever `limit` moves, because an observer only
 * reports *changes*: a sentinel still on screen after a page lands (short
 * cards, a tall phone) would otherwise never fire again. A fresh `observe()`
 * always reports the current state first.
 */
export function useInfiniteReveal(total, { step = 60, resetKey = '', rootMargin = '600px' } = {}) {
    const { limit, hasMore, showMore } = useProgressiveReveal(total, { initial: step, step, resetKey });
    const [sentinel, setSentinel] = useState(null);

    useEffect(() => {
        if (!sentinel || !hasMore || typeof IntersectionObserver === 'undefined') return undefined;
        const observer = new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting)) showMore();
        }, { root: scrollParentOf(sentinel), rootMargin });
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [sentinel, hasMore, showMore, rootMargin, limit]);

    return { limit, hasMore, sentinelRef: setSentinel };
}
