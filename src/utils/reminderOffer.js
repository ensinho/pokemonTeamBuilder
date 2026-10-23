/**
 * The "remind me tomorrow" offer (2026-10-21): asked once, right after a win —
 * the moment a daily game is most worth coming back to. Pure, so the rule is
 * tested apart from the browser APIs it reads.
 */
export const REMINDER_SEEN_KEY = 'ptb:reminderOfferSeen';

/**
 * Offer only when the answer can still change something: push works here, the
 * browser has not been asked yet (granted needs nothing, denied cannot be
 * asked again from a page), notifications are not already on, and this
 * visitor has not answered the offer before.
 */
export function shouldOfferReminder({ supported, iosInstallNeeded, permission, enabled, seen } = {}) {
    return Boolean(supported) && !iosInstallNeeded && permission === 'default' && !enabled && !seen;
}

export function readReminderSeen(storage) {
    try {
        return storage?.getItem(REMINDER_SEEN_KEY) === '1';
    } catch {
        return false;
    }
}

export function markReminderSeen(storage) {
    try {
        storage?.setItem(REMINDER_SEEN_KEY, '1');
    } catch {
        /* blocked storage: the offer may come back after the next win */
    }
}
