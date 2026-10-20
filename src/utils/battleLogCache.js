/**
 * A friend battle's log, kept on this device between visits.
 *
 * The log is append-only and owner-read-only (`playerLogs/{uid}/rounds/{seq}`),
 * so what this device has already received never changes. Reopening a battle
 * used to read every round document again; with this the screen paints at once
 * from the cache and the listener asks only for rounds from `upTo` on — a
 * 30-turn battle reopened costs the rounds it missed, not thirty documents.
 *
 * localStorage, best-effort (every access wrapped): the server is the record,
 * so a missing or cleared cache only costs the old full read. The newest
 * `MAX_BATTLES` are kept; a full storage drops the rest and tries once more.
 */

const PREFIX = 'ptb:battle-log:v1:';
const MAX_BATTLES = 8;

const keyFor = (uid, battleId) => `${PREFIX}${uid}:${battleId}`;

/** @returns {{lines: string[], upTo: number} | null} */
export const readCachedLog = (uid, battleId) => {
    if (!uid || !battleId) return null;
    try {
        const raw = localStorage.getItem(keyFor(uid, battleId));
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed?.lines) || !Number.isInteger(parsed?.upTo) || parsed.upTo < 1) return null;
        return { lines: parsed.lines, upTo: parsed.upTo };
    } catch (_) {
        return null;
    }
};

const cachedKeys = () => {
    const keys = [];
    for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (key?.startsWith(PREFIX)) keys.push(key);
    }
    return keys;
};

const savedAtOf = (key) => {
    try {
        return JSON.parse(localStorage.getItem(key))?.savedAt || 0;
    } catch (_) {
        return 0;
    }
};

/** Keep the newest `keep` battles (other than `except`). */
const prune = (keep, except) => {
    const others = cachedKeys().filter((key) => key !== except)
        .sort((a, b) => savedAtOf(b) - savedAtOf(a));
    others.slice(keep).forEach((key) => localStorage.removeItem(key));
};

/** Save the gap-free prefix of a battle's log (`upTo` rounds). */
export const writeCachedLog = (uid, battleId, { lines, upTo }) => {
    if (!uid || !battleId || !Array.isArray(lines) || !(upTo > 0)) return false;
    const key = keyFor(uid, battleId);
    const value = JSON.stringify({ lines, upTo, savedAt: Date.now() });
    try {
        localStorage.setItem(key, value);
        prune(MAX_BATTLES - 1, key);
        return true;
    } catch (_) {
        try {
            prune(0, key);
            localStorage.setItem(key, value);
            return true;
        } catch (__) {
            return false;
        }
    }
};

export const forgetCachedLog = (uid, battleId) => {
    try {
        localStorage.removeItem(keyFor(uid, battleId));
    } catch (_) { /* best-effort */ }
};
