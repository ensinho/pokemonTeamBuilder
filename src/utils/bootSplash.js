/**
 * Boot-splash timing.
 *
 * Desktop keeps the original behaviour: the splash is a ~900 ms courtesy beat
 * over an auth state that the snapshot already resolved optimistically.
 *
 * Phones are the problem case. `isAuthReady` flips true the moment the
 * stale-while-revalidate snapshot is read (see useAuthStore), so on a slow
 * mobile connection the splash used to leave while the real
 * `onAuthStateChanged` round-trip and the reference-data fetch were still in
 * flight — the app painted with the cached identity and then visibly
 * re-rendered into the reconciled one, with half-empty lists in between.
 *
 * So on mobile the splash holds until boot is actually *settled* (auth
 * reconciled against Firebase, reference data in the store), with a floor so
 * the hand-off never flickers and a ceiling so a failed or stalled request can
 * never strand the user on the splash.
 */

/** Desktop hold: unchanged. */
export const SPLASH_MIN_MS = 900;

/** Mobile floor: the splash is visible at least this long. */
export const SPLASH_MOBILE_MIN_MS = 1800;

/** Mobile ceiling: hard dismiss even if boot never settles. */
export const SPLASH_MOBILE_MAX_MS = 6000;

/**
 * How much longer the splash should stay up.
 *
 * @param {object} opts
 * @param {boolean} opts.isMobile     phone/tablet viewport
 * @param {number}  opts.elapsedMs    time since the app started booting
 * @param {boolean} opts.isBootSettled auth reconciled AND reference data loaded
 * @returns {number} milliseconds to wait before dismissing the splash
 */
export function splashHoldMs({ isMobile, elapsedMs, isBootSettled }) {
    const elapsed = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;

    if (!isMobile) return Math.max(0, SPLASH_MIN_MS - elapsed);

    // Not settled yet: wait out the ceiling. The caller re-runs this when
    // `isBootSettled` flips, which collapses the wait down to the floor.
    if (!isBootSettled) return Math.max(0, SPLASH_MOBILE_MAX_MS - elapsed);

    return Math.max(0, SPLASH_MOBILE_MIN_MS - elapsed);
}

/**
 * Progress-bar target for the splash, so the bar tracks the real wait instead
 * of racing to 100% and sitting there while the app is still loading.
 *
 * @returns {{ width: number, durationMs: number }}
 */
export function splashProgress({ isMobile, isBootSettled }) {
    if (!isMobile) return { width: 100, durationMs: SPLASH_MIN_MS };
    if (!isBootSettled) return { width: 90, durationMs: SPLASH_MOBILE_MIN_MS };
    return { width: 100, durationMs: 320 };
}
