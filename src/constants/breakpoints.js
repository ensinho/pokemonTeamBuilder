// Canonical responsive breakpoints (px).
//
// Single source of truth shared with tailwind.config.js `screens` and the
// documented values in src/index.css. Use these instead of hardcoding pixel
// widths in JS (e.g. `window.innerWidth < 1024`), so the tablet/laptop tiers
// stay consistent with the CSS layer.
//
//   sm  640  — large phone / tablet portrait
//   md  768  — tablet landscape
//   lg  1024 — small laptop / cheap monitor start (desktop chrome begins here)
//   xl  1280 — desktop
//   2xl 1536 — large desktop
export const BREAKPOINTS = Object.freeze({
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
});

/** True when the viewport is narrower than the given breakpoint. SSR-safe. */
export function isBelow(bp) {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < BREAKPOINTS[bp];
}

/** True when the viewport is at least as wide as the given breakpoint. SSR-safe. */
export function isAtLeast(bp) {
    if (typeof window === 'undefined') return false;
    return window.innerWidth >= BREAKPOINTS[bp];
}

/**
 * Returns a `(max-width: Npx)` media-query string for the pixel BELOW a
 * breakpoint — matches the `max-width` convention used in the CSS files
 * (e.g. `lg` -> "(max-width: 1023px)"). Handy for window.matchMedia().
 */
export function maxWidthBelow(bp) {
    return `(max-width: ${BREAKPOINTS[bp] - 1}px)`;
}
