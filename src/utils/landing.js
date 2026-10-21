/**
 * Who sees the landing on Home (2026-10-21). A first visit — and every crawl,
 * which is always a first visit — gets the pitch; anyone who has been here
 * before, or who already has teams or an account, gets their own Home.
 *
 * "Been here before" is read from what an earlier visit leaves behind: the
 * auth snapshot (written at every sign-in, anonymous ones included), an active
 * team id, or the landing's own "seen" mark set by any of its buttons.
 */
export const LANDING_SEEN_KEY = 'ptb:landingSeen';

/** Storage keys that only a previous visit writes. */
export const RETURNING_VISITOR_KEYS = [LANDING_SEEN_KEY, 'ptb:authSnapshot', 'ptbActiveTeamId'];

export function shouldShowLanding({ returning = false, hasTeams = false, isAnonymous = true } = {}) {
    return !returning && !hasTeams && isAnonymous !== false;
}

/** Whether storage shows an earlier visit. Blocked storage reads as a first visit. */
export function isReturningVisitor(storage) {
    try {
        return RETURNING_VISITOR_KEYS.some((key) => storage?.getItem(key) != null);
    } catch {
        return false;
    }
}

export function markLandingSeen(storage) {
    try {
        storage?.setItem(LANDING_SEEN_KEY, '1');
    } catch {
        /* blocked storage: the landing simply shows again next time */
    }
}

/**
 * The demo's pool: six well-known Pokémon whose typings make the analysis
 * visible at once (Charizard and Gyarados share Rock and Electric). Canon data,
 * so the landing never waits on the index to load.
 */
export const DEMO_POOL = [
    { id: 6, name: 'charizard', types: ['fire', 'flying'] },
    { id: 130, name: 'gyarados', types: ['water', 'flying'] },
    { id: 282, name: 'gardevoir', types: ['psychic', 'fairy'] },
    { id: 445, name: 'garchomp', types: ['dragon', 'ground'] },
    { id: 727, name: 'incineroar', types: ['fire', 'dark'] },
    { id: 598, name: 'ferrothorn', types: ['grass', 'steel'] },
];

export const DEMO_START = [6, 130, 282];

/** Toggle one id in the demo selection, keeping between 1 and 6 members, in pool order. */
export function toggleDemoMember(selected, id) {
    const has = selected.includes(id);
    if (has && selected.length === 1) return selected;
    const next = has ? selected.filter((x) => x !== id) : [...selected, id];
    return DEMO_POOL.map((p) => p.id).filter((x) => next.includes(x));
}
