import { describe, expect, it } from 'vitest';
import { REMINDER_SEEN_KEY, markReminderSeen, readReminderSeen, shouldOfferReminder } from './reminderOffer';

const fresh = { supported: true, iosInstallNeeded: false, permission: 'default', enabled: false, seen: false };

describe('shouldOfferReminder', () => {
    it('offers on a supported browser that has not been asked', () => {
        expect(shouldOfferReminder(fresh)).toBe(true);
    });

    it('stays quiet whenever the answer could change nothing', () => {
        expect(shouldOfferReminder({ ...fresh, supported: false })).toBe(false);
        expect(shouldOfferReminder({ ...fresh, iosInstallNeeded: true })).toBe(false);
        expect(shouldOfferReminder({ ...fresh, permission: 'granted' })).toBe(false);
        expect(shouldOfferReminder({ ...fresh, permission: 'denied' })).toBe(false);
        expect(shouldOfferReminder({ ...fresh, enabled: true })).toBe(false);
        expect(shouldOfferReminder({ ...fresh, seen: true })).toBe(false);
    });
});

describe('the seen mark', () => {
    it('round-trips and survives blocked storage', () => {
        const data = {};
        const storage = { getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v; } };
        expect(readReminderSeen(storage)).toBe(false);
        markReminderSeen(storage);
        expect(data[REMINDER_SEEN_KEY]).toBe('1');
        expect(readReminderSeen(storage)).toBe(true);
        const blocked = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); } };
        expect(readReminderSeen(blocked)).toBe(false);
        expect(() => markReminderSeen(blocked)).not.toThrow();
    });
});
