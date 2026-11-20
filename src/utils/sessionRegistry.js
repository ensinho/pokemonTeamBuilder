/**
 * Central teardown registry & cross-tab session-end broadcaster.
 *
 * Guarantees zero memory/listener leaks when signing out or switching
 * accounts: every Firestore `onSnapshot` listener or store reset registered
 * here is invoked synchronously *before* `signOut(auth)`, and any other open
 * browser tab receives a `session-ended` signal via BroadcastChannel (with a
 * localStorage `storage` event fallback).
 */

const CHANNEL_NAME = 'ptb:auth-session';
export const SESSION_ENDED_STORAGE_KEY = 'ptb:sessionEndedSignal';

const cleanupFns = new Set();

/**
 * Register a synchronous teardown callback (e.g. Firestore unsubscribe or
 * store reset) to run when the current auth session ends.
 *
 * @param {() => void} fn
 * @returns {() => void} unregister handle
 */
export function registerSessionCleanup(fn) {
    if (typeof fn !== 'function') return () => {};
    cleanupFns.add(fn);
    return () => {
        cleanupFns.delete(fn);
    };
}

/**
 * Run and clear every registered teardown callback synchronously. Individual
 * errors are isolated so one failing unsubscribe never blocks the rest.
 *
 * @returns {number} number of callbacks executed
 */
export function runSessionCleanup() {
    const callbacks = Array.from(cleanupFns);
    cleanupFns.clear();
    let count = 0;
    for (const fn of callbacks) {
        try {
            fn();
            count += 1;
        } catch (err) {
            console.error('Session cleanup callback failed:', err);
        }
    }
    return count;
}

export function getRegisteredCleanupCount() {
    return cleanupFns.size;
}

/**
 * Notify all other open tabs of this origin that the user signed out or
 * deleted their account so they immediately tear down privileged state.
 */
export function broadcastSessionEnd(kind = 'signOut') {
    const payload = { type: 'session-ended', kind, ts: Date.now() };
    try {
        if (typeof BroadcastChannel !== 'undefined') {
            const channel = new BroadcastChannel(CHANNEL_NAME);
            channel.postMessage(payload);
            channel.close();
        }
    } catch (_) {
        // Ignore environments where BroadcastChannel is unavailable/blocked.
    }
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(SESSION_ENDED_STORAGE_KEY, JSON.stringify(payload));
            window.localStorage.removeItem(SESSION_ENDED_STORAGE_KEY);
        }
    } catch (_) {
        // Ignore storage errors in restricted contexts.
    }
}

/**
 * Subscribe to cross-tab session-end notifications. Returns an unsubscribe
 * function.
 *
 * @param {(payload: { kind: string, ts: number }) => void} onEnd
 * @returns {() => void}
 */
export function subscribeSessionEnd(onEnd) {
    if (typeof onEnd !== 'function' || typeof window === 'undefined') {
        return () => {};
    }

    let lastHandledTs = 0;
    const notify = (data) => {
        if (!data || data.type !== 'session-ended') return;
        const ts = Number(data.ts || 0);
        if (ts && ts === lastHandledTs) return;
        lastHandledTs = ts || Date.now();
        onEnd({ kind: data.kind || 'signOut', ts: lastHandledTs });
    };

    let channel = null;
    try {
        if (typeof BroadcastChannel !== 'undefined') {
            channel = new BroadcastChannel(CHANNEL_NAME);
            channel.onmessage = (event) => notify(event?.data);
        }
    } catch (_) {
        channel = null;
    }

    const onStorage = (event) => {
        if (event.key !== SESSION_ENDED_STORAGE_KEY || !event.newValue) return;
        try {
            notify(JSON.parse(event.newValue));
        } catch (_) {
            notify({ type: 'session-ended', kind: 'signOut', ts: Date.now() });
        }
    };
    window.addEventListener('storage', onStorage);

    return () => {
        window.removeEventListener('storage', onStorage);
        if (channel) {
            try {
                channel.close();
            } catch (_) {
                // ignore
            }
        }
    };
}
