/**
 * localStorage that never throws. Web Storage throws when it is full (one
 * ~5 MB quota for the whole app) or blocked (cookies off, some private modes),
 * and a throw in a boot path or an effect takes the screen down with it
 * (docs/wounds.md, 2026-06-18 and 2026-11-05). Use these wherever a missing
 * value is acceptable — which, for a preference or a "seen" flag, is always.
 */
const store = () => {
    try { return typeof window !== 'undefined' ? window.localStorage : null; } catch (_) { return null; }
};

export function readLocal(key, fallback = null) {
    try {
        const value = store()?.getItem(key);
        return value ?? fallback;
    } catch (_) {
        return fallback;
    }
}

/** @returns {boolean} whether it was stored */
export function writeLocal(key, value) {
    try {
        const s = store();
        if (!s) return false;
        s.setItem(key, String(value));
        return true;
    } catch (_) {
        return false;
    }
}

export function removeLocal(key) {
    try { store()?.removeItem(key); } catch (_) { /* nothing to remove from */ }
}
