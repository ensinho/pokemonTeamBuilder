import { useCallback, useSyncExternalStore } from 'react';

/**
 * Live result of a CSS media query, e.g. `useMediaQuery(maxWidthBelow('lg'))`.
 *
 * `useSyncExternalStore` rather than a `useState` + resize listener: the value
 * is read from `matchMedia` at render, so it can never be observed stale for a
 * frame after a rotation, and there is no initial-state guess to correct later
 * (the 2026-09 "collapsed drawer on mobile" wound was exactly that guess).
 * Server snapshot is `false` — the app is client-only, but it keeps tests and
 * any prerender path from touching `window`.
 */
export function useMediaQuery(query) {
    const subscribe = useCallback((onChange) => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
        const mql = window.matchMedia(query);
        mql.addEventListener('change', onChange);
        return () => mql.removeEventListener('change', onChange);
    }, [query]);

    const getSnapshot = () => (
        typeof window !== 'undefined'
        && typeof window.matchMedia === 'function'
        && window.matchMedia(query).matches
    );

    return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
