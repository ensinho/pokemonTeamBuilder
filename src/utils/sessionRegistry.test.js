import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    registerSessionCleanup,
    runSessionCleanup,
    getRegisteredCleanupCount,
    broadcastSessionEnd,
    subscribeSessionEnd,
    SESSION_ENDED_STORAGE_KEY,
} from './sessionRegistry';

describe('sessionRegistry', () => {
    beforeEach(() => {
        runSessionCleanup();
    });

    it('runs every registered cleanup once and clears the registry', () => {
        const a = vi.fn();
        const b = vi.fn();
        registerSessionCleanup(a);
        const unregisterB = registerSessionCleanup(b);

        expect(getRegisteredCleanupCount()).toBe(2);
        unregisterB();
        expect(getRegisteredCleanupCount()).toBe(1);

        const ran = runSessionCleanup();
        expect(ran).toBe(1);
        expect(a).toHaveBeenCalledTimes(1);
        expect(b).not.toHaveBeenCalled();
        expect(getRegisteredCleanupCount()).toBe(0);

        // Idempotent second call
        expect(runSessionCleanup()).toBe(0);
    });

    it('isolates errors so a failing cleanup never blocks subsequent teardowns', () => {
        const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const bad = vi.fn(() => { throw new Error('boom'); });
        const good = vi.fn();

        registerSessionCleanup(bad);
        registerSessionCleanup(good);

        const ran = runSessionCleanup();
        expect(bad).toHaveBeenCalledTimes(1);
        expect(good).toHaveBeenCalledTimes(1);
        expect(ran).toBe(1);
        expect(getRegisteredCleanupCount()).toBe(0);
        errSpy.mockRestore();
    });

    it('broadcasts and subscribes to cross-tab session-end via storage fallback', () => {
        const onEnd = vi.fn();
        const listeners = new Map();
        const fakeWindow = {
            addEventListener: (type, fn) => listeners.set(type, fn),
            removeEventListener: (type) => listeners.delete(type),
            localStorage: {
                setItem: vi.fn(),
                removeItem: vi.fn(),
            },
        };
        const origWindow = globalThis.window;
        globalThis.window = fakeWindow;

        try {
            const unsub = subscribeSessionEnd(onEnd);
            broadcastSessionEnd('signOut');

            expect(fakeWindow.localStorage.setItem).toHaveBeenCalledWith(
                SESSION_ENDED_STORAGE_KEY,
                expect.stringContaining('"session-ended"'),
            );
            expect(fakeWindow.localStorage.removeItem).toHaveBeenCalledWith(SESSION_ENDED_STORAGE_KEY);

            const storageHandler = listeners.get('storage');
            storageHandler({
                key: SESSION_ENDED_STORAGE_KEY,
                newValue: JSON.stringify({ type: 'session-ended', kind: 'signOut', ts: 12345 }),
            });
            expect(onEnd).toHaveBeenCalledWith({ kind: 'signOut', ts: 12345 });

            // Duplicate ts is deduplicated
            storageHandler({
                key: SESSION_ENDED_STORAGE_KEY,
                newValue: JSON.stringify({ type: 'session-ended', kind: 'signOut', ts: 12345 }),
            });
            expect(onEnd).toHaveBeenCalledTimes(1);

            unsub();
            expect(listeners.has('storage')).toBe(false);
        } finally {
            globalThis.window = origWindow;
        }
    });
});
