/**
 * The visitor's answer about analytics cookies (2026-10-30, LGPD): 'granted',
 * 'denied', or null while they have not answered. Google Analytics
 * (services/analytics.js) loads only after 'granted'; everything else the
 * site keeps in the browser — preferences, the anonymous sign-in, the data
 * cache — is what the site needs to work and asks for no consent.
 *
 * Per device, in localStorage, like the theme. The banner (ConsentBanner)
 * asks once; the Privacy page's switch changes the answer.
 */

export const CONSENT_KEY = 'ptb:analyticsConsent';
export const CONSENT_EVENT = 'ptb:analytics-consent';
const VALUES = new Set(['granted', 'denied']);
// The answer for this page when storage refuses it (some private modes), so
// the banner still closes and analytics still honours it until a reload.
let memory = null;

const storage = () => {
    try {
        return typeof window !== 'undefined' ? window.localStorage : null;
    } catch {
        return null;
    }
};

/** 'granted' | 'denied' | null. A blocked or unreadable storage is "not answered". */
export function readConsent(store = storage()) {
    try {
        const value = store?.getItem(CONSENT_KEY);
        if (VALUES.has(value)) return value;
    } catch { /* fall through to this page's answer */ }
    return memory;
}

/** Saves the answer and tells the page (analytics, the banner, the switch). */
export function writeConsent(value, store = storage()) {
    if (!VALUES.has(value)) throw new Error(`Unknown consent value: ${value}`);
    memory = value;
    try { store?.setItem(CONSENT_KEY, value); } catch { /* private mode: `memory` holds it for this page */ }
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));
    }
}

/** Calls `listener(value)` on every change, here or in another tab; returns the unsubscribe. */
export function subscribeConsent(listener) {
    if (typeof window === 'undefined') return () => {};
    const onLocal = (event) => listener(event.detail);
    const onStorage = (event) => { if (event.key === CONSENT_KEY) listener(readConsent()); };
    window.addEventListener(CONSENT_EVENT, onLocal);
    window.addEventListener('storage', onStorage);
    return () => {
        window.removeEventListener(CONSENT_EVENT, onLocal);
        window.removeEventListener('storage', onStorage);
    };
}
