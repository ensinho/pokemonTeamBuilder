import { flushSync } from 'react-dom';

/**
 * A theme change spreads as a growing circle from the control that asked for
 * it (design system v2). Same-document View Transition: the browser snapshots
 * the page, `apply` switches the theme, and interactions.css animates the new
 * snapshot's clip-path out from the origin.
 *
 * Falls back to an instant switch — exactly the old behaviour — when there is
 * no origin (a theme restored from the profile on boot is not an event), when
 * the engine has no View Transitions, or when the user prefers reduced motion.
 */

/** The centre of the control that was pressed — so a keyboard press, which has
 *  no pointer position, spreads from the same place a click would. */
export function originFromEvent(event) {
    const target = event?.currentTarget;
    if (target && typeof target.getBoundingClientRect === 'function') {
        const rect = target.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
    if (event && Number.isFinite(event.clientX) && Number.isFinite(event.clientY)) {
        return { x: event.clientX, y: event.clientY };
    }
    return null;
}

/** The circle that covers the whole viewport from (x, y): its distance to the
 *  farthest corner. Anything smaller leaves an old-theme corner at the end. */
export function revealRadius(x, y, width, height) {
    return Math.hypot(Math.max(x, width - x), Math.max(y, height - y));
}

function prefersReducedMotion() {
    return typeof window !== 'undefined'
        && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

export function runThemeTransition(apply, origin) {
    const canAnimate = typeof document !== 'undefined'
        && origin
        && typeof document.startViewTransition === 'function'
        && !prefersReducedMotion();

    if (!canAnimate) {
        apply();
        return;
    }

    const root = document.documentElement;
    const { x, y } = origin;
    root.style.setProperty('--theme-reveal-x', `${x}px`);
    root.style.setProperty('--theme-reveal-y', `${y}px`);
    root.style.setProperty('--theme-reveal-r', `${revealRadius(x, y, window.innerWidth, window.innerHeight)}px`);
    root.setAttribute('data-theme-transition', '');

    const cleanup = () => root.removeAttribute('data-theme-transition');

    let transition;
    try {
        // flushSync: the new snapshot is taken when this callback returns, so
        // React has to have committed the components that still read theme
        // colours from props — otherwise they would flip after the reveal.
        transition = document.startViewTransition(() => flushSync(apply));
    } catch {
        cleanup();
        apply();
        return;
    }

    // A transition skipped by a newer one rejects `ready`; that is expected,
    // not an error worth a console line.
    transition.ready?.catch(() => {});
    transition.finished?.then(cleanup, cleanup);
}
