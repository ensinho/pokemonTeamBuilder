import { createElement, useCallback, useEffect, useRef, useState } from 'react';
import { ShinyBurst } from '../components/ShinyBurst';

// Longest spark (620ms) plus its stagger; the burst unmounts after this.
const BURST_MS = 700;

function prefersReducedMotion() {
    return typeof window !== 'undefined'
        && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

/**
 * The shiny sparkle, once (design system v2, interactions.css). Call `fire()`
 * from the click that earned it — starring a Pokémon, flipping a sprite to
 * shiny — and render `burst` inside the control (which needs
 * `position: relative`). Add `is-bursting` to the control while `isBursting` is
 * true and its SVG pops on the pop spring.
 *
 * Only ever from a click. A favourite that arrives from Firestore on load, or
 * from another device, must not sparkle — a page of starred cards bursting at
 * once is the "celebrate everything" failure this system exists to avoid.
 */
export function useShinyBurst() {
    const [burstKey, setBurstKey] = useState(0);
    const timer = useRef(0);

    useEffect(() => () => clearTimeout(timer.current), []);

    const fire = useCallback(() => {
        if (prefersReducedMotion()) return;
        clearTimeout(timer.current);
        setBurstKey((key) => key + 1);
        timer.current = setTimeout(() => setBurstKey(0), BURST_MS);
    }, []);

    return {
        burst: burstKey > 0 ? createElement(ShinyBurst, { key: burstKey }) : null,
        isBursting: burstKey > 0,
        fire,
    };
}
