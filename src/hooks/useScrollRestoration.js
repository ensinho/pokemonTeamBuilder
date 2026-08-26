import { useEffect, useLayoutEffect, useRef } from 'react';

// Where the user was in each list, keyed by whatever the caller considers that
// list's identity. Session-scoped (module memory, not storage): coming back to
// a list within a visit should feel continuous; a fresh visit should start at
// the top.
const positions = new Map();

// The app shell scrolls its own container, not the window — `window.scrollTo`
// and native scroll restoration are both no-ops here.
const getAppScrollElement = () =>
    (typeof document === 'undefined' ? null : document.querySelector('.app-shell__content'));

/**
 * Remembers a scroll offset per list and puts the user back where they were.
 *
 * Restoring is deliberately conservative: it only fires when this exact list has
 * a remembered offset, only once per mount, and only once `ready` is true (the
 * list has to be rendered at full height or the browser clamps the offset).
 * A list the user has never scrolled restores nothing and behaves as before.
 *
 * @param {string} key       identity of the list — a different key is a different list
 * @param {object} options
 * @param {boolean} options.ready       list is rendered and measurable
 * @param {object} [options.containerRef] scroll container; defaults to the app shell
 */
export function useScrollRestoration(key, { ready = true, containerRef } = {}) {
    const restoredForKey = useRef(null);

    // Track the offset as the user scrolls. Reading it at unmount would be too
    // late — by then the route has changed and the container may be clamped.
    useEffect(() => {
        if (!key) return undefined;
        const element = containerRef?.current || getAppScrollElement();
        if (!element) return undefined;

        const handleScroll = () => {
            positions.set(key, element.scrollTop);
        };

        element.addEventListener('scroll', handleScroll, { passive: true });
        return () => element.removeEventListener('scroll', handleScroll);
    }, [key, containerRef, ready]);

    // Restore before paint so the user never sees the list at the top first.
    useLayoutEffect(() => {
        if (!key || !ready || restoredForKey.current === key) return;

        const element = containerRef?.current || getAppScrollElement();
        const target = positions.get(key);
        if (!element || !target) return;

        restoredForKey.current = key;
        element.scrollTop = target;

        // Images resolve their boxes a frame later; re-assert once if the browser
        // clamped us short of the target in the meantime.
        const raf = requestAnimationFrame(() => {
            if (element.scrollTop < target) element.scrollTop = target;
        });
        return () => cancelAnimationFrame(raf);
    }, [key, ready, containerRef]);
}
