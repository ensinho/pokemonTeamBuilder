import { useCallback, useRef } from 'react';

/** The DS screen's native width, in DS pixels. */
export const DS_WIDTH = 256;

/**
 * Sets `--px` (one DS pixel, in CSS px) on a DS screen element from its width,
 * so everything inside is laid out in DS pixels: `calc(16 * var(--px))`.
 * A CSS variable, not React state — resizing never re-renders the scene.
 *
 * A callback ref, not an effect on a ref object: the console swaps its screen
 * elements (one screen ↔ two at the desktop breakpoint), and a run-once effect
 * kept measuring the element that had gone — the new one fell back to 2 px.
 */
export function useScreenScale() {
    const observer = useRef(null);
    return useCallback((el) => {
        observer.current?.disconnect();
        observer.current = null;
        if (!el) return;
        const apply = (width) => el.style.setProperty('--px', `${Math.max(0.5, width / DS_WIDTH)}px`);
        apply(el.getBoundingClientRect().width);
        observer.current = new ResizeObserver((entries) => apply(entries[0].contentRect.width));
        observer.current.observe(el);
    }, []);
}
