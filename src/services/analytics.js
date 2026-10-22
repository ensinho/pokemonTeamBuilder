import { firebaseConfig } from '../constants/firebase';

/**
 * Product analytics (2026-10-21): Google Analytics through the Firebase app
 * the site already runs, keyed by its existing `measurementId`. Without one,
 * every call is a no-op.
 *
 * Off the boot path on purpose: the module loads after the page has, in idle
 * time, and events raised before then wait in a short queue. Crawlers are never
 * counted — they are most of a fresh site's "visits" and none of its users.
 *
 * The funnel it exists to answer — does a first visit turn into a team, a
 * share and a return? — is named in docs/modules/analytics.md; keep event
 * names snake_case and stable, GA4 reports are keyed by them.
 */

const BOT = /bot|crawl|spider|slurp|lighthouse|headless|preview|facebookexternalhit|whatsapp|discord/i;
const QUEUE_LIMIT = 50;

let queue = [];
let logger = null;
let started = false;

const enabled = () => {
    if (typeof window === 'undefined' || !firebaseConfig.measurementId) return false;
    try {
        return !BOT.test(navigator.userAgent || '');
    } catch {
        return false;
    }
};

function start() {
    if (started) return;
    started = true;
    const load = async () => {
        try {
            const [{ firebaseApp }, mod] = await Promise.all([import('./firebase'), import('firebase/analytics')]);
            if (!(await mod.isSupported())) { queue = []; return; }
            const analytics = mod.getAnalytics(firebaseApp);
            logger = (name, params) => mod.logEvent(analytics, name, params);
            queue.splice(0).forEach(([name, params]) => logger(name, params));
        } catch {
            // Analytics is never worth a broken page: blocked by an extension,
            // offline, unsupported — the app goes on without it.
            queue = [];
        }
    };
    const idle = () => (typeof window.requestIdleCallback === 'function'
        ? window.requestIdleCallback(load, { timeout: 4000 })
        : window.setTimeout(load, 1500));
    if (document.readyState === 'complete') idle();
    else window.addEventListener('load', idle, { once: true });
}

/** Starts the session (GA4's own page views) once the page has loaded. */
export function initAnalytics() {
    if (enabled()) start();
}

/** Records one product event. Safe to call anywhere, any time. */
export function track(name, params = {}) {
    if (!enabled()) return;
    if (logger) {
        try { logger(name, params); } catch { /* never throw from analytics */ }
        return;
    }
    queue.push([name, params]);
    if (queue.length > QUEUE_LIMIT) queue.shift();
    start();
}
