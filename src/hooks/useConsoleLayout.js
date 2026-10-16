import { useEffect, useState } from 'react';

import { useMediaQuery } from './useMediaQuery';

/**
 * How the Champion Challenge's console lays out: `'single'` — one DS screen
 * holding everything, HUD included (a desktop, Black & White's single-screen
 * battle) — or `'dual'` — the two DS screens stacked, the bottom one for touch
 * (a phone or a tablet in portrait).
 */
export const useConsoleLayout = () => (useMediaQuery('(min-width: 1024px)') ? 'single' : 'dual');

// In rem, as champion-challenge-ds.css sizes them (.ds-deck).
const RAIL_MIN = 15; // a rail of two, at its narrowest
const RAIL_ONE = 20; // the one rail: two columns of named cards
const GAP = 1.5; // the page gap at its widest

/**
 * Which rails fit beside a desktop's one screen, given the challenge column's
 * width and the window's height (the screen is as large as the height allows:
 * `--deck-console`). Rails may take room from the screen, not much of it: two
 * while it keeps 90% of its width, one while it keeps 80%.
 * @returns {'none'|'one'|'two'}
 */
export const railModeFor = ({ width, height, rem = 16 }) => {
    const natural = ((height - 9.5 * rem) * 4) / 3 + 1.5 * rem;
    if (!(natural > 0) || !(width > 0)) return 'none';
    const keeps = (rails) => (width - rails * rem) / natural;
    if (keeps(2 * (RAIL_MIN + GAP)) >= 0.9) return 'two';
    if (keeps(RAIL_ONE + GAP) >= 0.8) return 'one';
    return 'none';
};

/**
 * How many side rails a desktop's one screen gets (DsConsole `rails`):
 * `'two'` — teams on the left, the ranking on the right; `'one'` — both
 * stacked on the right; `'none'`. Measured on the challenge's own column (the
 * app's nav takes its share of the window) through a callback ref, so the
 * rails exist only when they are on screen and the ranking falls back to its
 * menu when they are not.
 *
 * @returns {[(node: HTMLElement|null) => void, 'none'|'one'|'two']}
 */
export const useRailMode = (enabled) => {
    const [node, setNode] = useState(null);
    const [mode, setMode] = useState('none');
    useEffect(() => {
        if (!node || !enabled || typeof ResizeObserver === 'undefined') return undefined;
        const measure = () => {
            const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
            setMode(railModeFor({ width: node.getBoundingClientRect().width, height: window.innerHeight, rem }));
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(node);
        window.addEventListener('resize', measure);
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', measure);
        };
    }, [node, enabled]);
    return [setNode, enabled ? mode : 'none'];
};
