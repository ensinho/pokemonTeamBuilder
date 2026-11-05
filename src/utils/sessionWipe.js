/**
 * What leaving an account (sign out, account deleted) erases from this device.
 *
 * Everything in Web Storage is the trainer's — streak, check-ins, rewards,
 * journeys, drafts, game runs, the cached identity — except the few settings
 * that describe the *device* rather than the person: how the app looks and
 * reads, the cookie answer, sound. Those stay so the screen doesn't change
 * language or theme under the sign-out.
 *
 * Before this existed the guest account created on sign-out inherited the
 * previous trainer's state, and the preferences sync then wrote it into the
 * new account: the guest kept the streak and posted in the forum under the
 * old name (docs/wounds.md, 2026-11-05).
 *
 * sessionStorage is cleared whole except LEFT_SESSION_KEY, the hand-off that
 * tells the next page why it is a guest's.
 */

export const DEVICE_KEYS = new Set([
    'theme',
    'language',
    'ptbUiScale',
    'ptbShowTeraType',
    'ptbSearchShortcut',
    'ptb-sidebar-collapse-pref',
    'ptb-sidebar-open-groups',
    'ptbSavedTeamsLayout',
    'ptb:analyticsConsent',
    'ptb:landingSeen',
    'patchNotesVersion',
    'ptb:battleAnimatedSprites',
    'ptb:battle:music',
    'ptb:challenge:muted',
    'ptb:challenge:fast',
]);

// The PokéAPI cache (services/pokemonDataCache.js) is public data, not anyone's.
const DEVICE_PREFIXES = ['ptb:pokemon-data:'];

export const LEFT_SESSION_KEY = 'ptb:leftSession';

export const isDeviceKey = (key) => DEVICE_KEYS.has(key)
    || DEVICE_PREFIXES.some((prefix) => key.startsWith(prefix));

const keysOf = (storage) => {
    const keys = [];
    for (let i = 0; i < storage.length; i += 1) {
        const key = storage.key(i);
        if (key != null) keys.push(key);
    }
    return keys;
};

/**
 * @param {{local?: Storage|null, session?: Storage|null}} stores
 * @returns {string[]} the keys removed
 */
export function wipeUserStorage({ local = null, session = null } = {}) {
    const removed = [];
    try {
        if (local) {
            for (const key of keysOf(local)) {
                if (isDeviceKey(key)) continue;
                local.removeItem(key);
                removed.push(key);
            }
        }
    } catch (_) { /* storage blocked: nothing of theirs is readable either */ }
    try {
        if (session) {
            for (const key of keysOf(session)) {
                if (key === LEFT_SESSION_KEY) continue;
                session.removeItem(key);
                removed.push(key);
            }
        }
    } catch (_) { /* as above */ }
    return removed;
}

export function wipeBrowserUserStorage() {
    if (typeof window === 'undefined') return [];
    const get = (name) => { try { return window[name]; } catch (_) { return null; } };
    return wipeUserStorage({ local: get('localStorage'), session: get('sessionStorage') });
}
