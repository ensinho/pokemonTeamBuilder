import { flushSync } from 'react-dom';

/**
 * Opening a Pokémon from a list: its sprite travels from the card to the
 * detail screen's hero (design system v2 — a selection travels, it does not
 * teleport). A same-document View Transition: the card's sprite is named in the
 * old snapshot, the detail hero (`[data-vt-hero]`, see Sprite's `heroTarget`)
 * in the new one, and the browser morphs one into the other while the rest of
 * the page cross-fades. Styles in interactions.css.
 *
 * Plain navigation — exactly what happened before — when there is no source
 * element, no View Transitions, or the user prefers reduced motion.
 */

const HERO_NAME = 'pokemon-hero';
// How long the old screen may stay frozen waiting for the new hero to exist:
// the route chunk (prefetched on phones) and its first render. Past this the
// transition goes ahead as a plain cross-fade rather than holding the tap.
const HERO_WAIT_MS = 450;

function prefersReducedMotion() {
    return typeof window !== 'undefined'
        && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

/** Resolves with the first element matching `selector`, or null after
 *  `timeoutMs`. Polls with timers, not requestAnimationFrame: rendering — rAF
 *  included — is suppressed while a view transition's update is pending, so a
 *  rAF loop here would never run. */
export function waitForElement(selector, timeoutMs) {
    return new Promise((resolve) => {
        const deadline = Date.now() + timeoutMs;
        const check = () => {
            const element = document.querySelector(selector);
            if (element || Date.now() >= deadline) resolve(element || null);
            else setTimeout(check, 16);
        };
        check();
    });
}

export function navigateWithHero(navigate, to, options, sourceElement) {
    const canAnimate = Boolean(sourceElement)
        && typeof document !== 'undefined'
        && typeof document.startViewTransition === 'function'
        && !prefersReducedMotion();

    if (!canAnimate) {
        navigate(to, options);
        return;
    }

    const root = document.documentElement;
    sourceElement.style.viewTransitionName = HERO_NAME;
    root.setAttribute('data-hero-transition', '');

    const cleanup = () => {
        root.removeAttribute('data-hero-transition');
        sourceElement.style.viewTransitionName = '';
    };

    let transition;
    try {
        transition = document.startViewTransition(async () => {
            // The old snapshot is taken; the name moves to the new hero.
            sourceElement.style.viewTransitionName = '';
            flushSync(() => navigate(to, options));
            await waitForElement('[data-vt-hero]', HERO_WAIT_MS);
        });
    } catch {
        cleanup();
        navigate(to, options);
        return;
    }

    transition.ready?.catch(() => {});
    transition.finished?.then(cleanup, cleanup);
}
