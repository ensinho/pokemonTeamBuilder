/**
 * Boot-splash timing.
 *
 * Phones are the problem case. `isAuthReady` flips true the moment the
 * stale-while-revalidate snapshot is read (see useAuthStore), so on a slow
 * mobile connection the splash used to leave while the real
 * `onAuthStateChanged` round-trip and the reference-data fetch were still in
 * flight — the app painted with the cached identity and then visibly
 * re-rendered into the reconciled one, with half-empty lists in between.
 * So on mobile the splash holds until boot is actually *settled* (auth
 * reconciled against Firebase, reference data in the store), with a ceiling so
 * a failed or stalled request can never strand the user on the splash.
 * Desktop waits only on `isAuthReady`, as it always has.
 *
 * What changed on 2026-10-06 is the floor. It used to be a fixed hold —
 * 900 ms on desktop, 1800 ms on a phone — counted from boot, so a warm start
 * that was ready in 200 ms still stared at a logo for up to 1.8 s on every
 * open. A floor exists only to stop a flicker, and a flicker needs the splash
 * to have been *seen*. So the splash now fades in after SPLASH_REVEAL_MS (the
 * `.boot-splash` animation delay in app-shell.css — keep the two equal): a
 * boot that settles before then never shows it at all, and one that runs past
 * it keeps the splash up for at least SPLASH_MIN_VISIBLE_MS so it can't blink.
 */

import { INTRO_FULL_MS, INTRO_LEGIBLE_MS } from './brandIntro.js';

/** The splash is invisible until this point (the brand intro's start delay). */
export const SPLASH_REVEAL_MS = 300;

/**
 * Once revealed, the splash stays at least this long, so it never blinks.
 * Since the brand intro (2026-11-22) this is the moment its wordmark is
 * legible: the app is never held for the show, only for a readable name.
 */
export const SPLASH_MIN_VISIBLE_MS = INTRO_LEGIBLE_MS;

/** The device has seen the whole intro once (a DEVICE_KEYS entry: how the app opens here). */
export const BRAND_INTRO_SEEN_KEY = 'ptb:brandIntroSeen';

/**
 * How long a revealed splash stays at least: the first intro on a device plays
 * to its end (every piece landed), every later one only until the name reads.
 */
export function introMinVisibleMs(seenBefore) {
    return seenBefore ? INTRO_LEGIBLE_MS : INTRO_FULL_MS;
}

/** Mobile ceiling: hard dismiss even if boot never settles. */
export const SPLASH_MOBILE_MAX_MS = 6000;

/**
 * How much longer the splash should stay up, given that the boot gate for this
 * device has opened (desktop: `isAuthReady`; mobile: also `isBootSettled`).
 *
 * @param {object} opts
 * @param {boolean} opts.isMobile     phone/tablet viewport
 * @param {number}  opts.elapsedMs    time since the app started booting
 * @param {boolean} opts.isBootSettled auth reconciled AND reference data loaded
 * @param {number}  [opts.minVisibleMs] how long a revealed splash stays (introMinVisibleMs)
 * @returns {number} milliseconds to wait before dismissing the splash
 */
export function splashHoldMs({ isMobile, elapsedMs, isBootSettled, minVisibleMs = SPLASH_MIN_VISIBLE_MS }) {
    const elapsed = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;

    // Not settled yet: wait out the ceiling. The caller re-runs this when
    // `isBootSettled` flips, which collapses the wait.
    if (isMobile && !isBootSettled) return Math.max(0, SPLASH_MOBILE_MAX_MS - elapsed);

    // Ready before the splash faded in: leave without ever showing it.
    if (elapsed < SPLASH_REVEAL_MS) return 0;

    // Seen: stay until the floor (counted from boot) so it never blinks.
    return Math.max(0, SPLASH_REVEAL_MS + minVisibleMs - elapsed);
}

/**
 * Whether this boot skips the splash altogether (2026-10-30): a first visit
 * arriving on Home sees the landing, which shows nothing of an account and
 * needs no reference data — its copy and demo are canon constants. Holding
 * it behind the splash (on a phone, until auth reconciled and generations
 * loaded) was most of the landing's Largest Contentful Paint. Anything that
 * reads Firestore still waits on `isAuthReady`; only the curtain goes.
 *
 * Every other boot keeps the splash: a returning visitor's Home is their own
 * data, and a deep link is a view that may read it.
 *
 * @param {object} opts
 * @param {string} opts.appPath      the route, without the language prefix
 * @param {boolean} opts.isReturning an earlier visit left its marks (utils/landing.js)
 */
export function skipsBootSplash({ appPath, isReturning }) {
    return appPath === '/' && !isReturning;
}

