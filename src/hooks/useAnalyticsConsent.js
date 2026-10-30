import { useSyncExternalStore } from 'react';
import { readConsent, subscribeConsent, writeConsent } from '../utils/analyticsConsent';

/** `[consent, setConsent]` — 'granted' | 'denied' | null, live across the page and tabs. */
export function useAnalyticsConsent() {
    const consent = useSyncExternalStore(subscribeConsent, readConsent, () => null);
    return [consent, writeConsent];
}
