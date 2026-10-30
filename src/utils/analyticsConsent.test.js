import { describe, expect, it } from 'vitest';
import { CONSENT_KEY, readConsent, writeConsent } from './analyticsConsent';

const memoryStore = () => {
    const data = new Map();
    return { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, String(v)) };
};
const brokenStore = {
    getItem: () => { throw new Error('denied'); },
    setItem: () => { throw new Error('denied'); },
};

// The answer Google Analytics waits for (LGPD, 2026-10-30).
describe('analytics consent', () => {
    it('is unanswered until the visitor answers, and ignores anything it did not write', () => {
        const store = memoryStore();
        expect(readConsent(store)).toBeNull();
        store.setItem(CONSENT_KEY, 'yes please');
        expect(readConsent(store)).toBeNull();
    });

    it('keeps the answer, and a later answer replaces it', () => {
        const store = memoryStore();
        writeConsent('granted', store);
        expect(readConsent(store)).toBe('granted');
        writeConsent('denied', store);
        expect(readConsent(store)).toBe('denied');
    });

    it('rejects a value that is not an answer', () => {
        expect(() => writeConsent('maybe', memoryStore())).toThrow();
    });

    it('still honours the answer on this page when storage refuses it', () => {
        writeConsent('denied', brokenStore);
        expect(readConsent(brokenStore)).toBe('denied');
    });
});
