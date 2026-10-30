import { firebaseConfig } from '../constants/firebase';
import { isCrawler } from '../utils/crawler';
import { readConsent, subscribeConsent } from '../utils/analyticsConsent';

/**
 * Product analytics (2026-10-21): Google Analytics through the Firebase app
 * the site already runs, keyed by its existing `measurementId`. Without one,
 * every call is a no-op.
 *
 * Off the boot path on purpose: the module loads after the page has, in idle
 * time, and events raised before then wait in a short queue. Crawlers are never
 * counted — they are most of a fresh site's "visits" and none of its users.
 *
 * Only with the visitor's consent (utils/analyticsConsent.js, 2026-10-30 —
 * LGPD): GA sets cookies, so nothing loads until they press Accept on the
 * banner. Events raised before an answer wait in the queue in memory, never
 * sent; a refusal drops them, and a consent withdrawn later turns collection
 * off and removes GA's cookies.
 *
 * The funnel it exists to answer — does a first visit turn into a team, a
 * share and a return? — is named in docs/modules/analytics.md; keep event
 * names snake_case and stable, GA4 reports are keyed by them.
 */

const QUEUE_LIMIT = 50;

let queue = [];
let logger = null;
let started = false;
let stopCollection = null;

/** Could this visit be measured at all — a browser, a measurement id, not a crawler. */
export const analyticsAvailable = () => {
    if (typeof window === 'undefined' || !firebaseConfig.measurementId) return false;
    return !isCrawler();
};

const enabled = () => analyticsAvailable() && readConsent() === 'granted';

/** GA's own cookies (_ga, _ga_<id>), on this host and its parent domain. */
function removeGaCookies() {
    const host = window.location.hostname;
    const domains = ['', host, `.${host.split('.').slice(-2).join('.')}`];
    document.cookie.split(';').map((c) => c.split('=')[0].trim()).filter((name) => name.startsWith('_ga')).forEach((name) => {
        domains.forEach((domain) => {
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain ? `; domain=${domain}` : ''}`;
        });
    });
}

function onConsentChange(value) {
    if (value === 'granted') {
        stopCollection?.(false);
        start();
        return;
    }
    queue = [];
    if (value === 'denied') {
        stopCollection?.(true);
        removeGaCookies();
    }
}

function start() {
    if (started) return;
    started = true;
    const load = async () => {
        try {
            const [{ firebaseApp }, mod] = await Promise.all([import('./firebase'), import('firebase/analytics')]);
            if (!(await mod.isSupported())) { queue = []; return; }
            if (readConsent() !== 'granted') { queue = []; started = false; return; }
            const analytics = mod.getAnalytics(firebaseApp);
            logger = (name, params) => mod.logEvent(analytics, name, params);
            stopCollection = (off) => {
                mod.setAnalyticsCollectionEnabled(analytics, !off);
                logger = off ? null : (name, params) => mod.logEvent(analytics, name, params);
            };
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

/** Starts the session (GA4's own page views) once the page has loaded — now
 *  if consent was given before, or the moment the banner's Accept is pressed. */
export function initAnalytics() {
    if (!analyticsAvailable()) return;
    subscribeConsent(onConsentChange);
    if (enabled()) start();
}

/** Records one product event. Safe to call anywhere, any time. */
export function track(name, params = {}) {
    if (!analyticsAvailable()) return;
    const consent = readConsent();
    if (consent === 'denied') return;
    if (consent === null) {
        // Not answered yet: keep it in memory, send it only if they accept.
        queue.push([name, params]);
        if (queue.length > QUEUE_LIMIT) queue.shift();
        return;
    }
    if (logger) {
        try { logger(name, params); } catch { /* never throw from analytics */ }
        return;
    }
    queue.push([name, params]);
    if (queue.length > QUEUE_LIMIT) queue.shift();
    start();
}
