// ============================================================
//  PokePuzzle account-migration helpers
//
//  When an anonymous user signs in / signs up, their PokePuzzle progress
//  lives under the anonymous uid's namespace (both localStorage and
//  Firestore). These helpers move that progress onto the now-authenticated
//  account using a "keep best" merge so nothing is ever lost.
//
//  A saved PokePuzzle state looks like:
//    { guesses: string[], gameStatus: 'IN_PROGRESS'|'WON'|'LOST',
//      targetId: number, unlockedTips: {...}, updatedAt: ISOString }
// ============================================================

// localStorage key scheme — MUST match PokePuzzleView's ppKey().
export const ppLocalKey = (uid, suffix) => `ptb:pokepuzzle:${uid || 'anon'}:${suffix}`;

// Higher = "further along". A finished game (WON/LOST) always beats an
// in-progress one; among equals, more guesses wins.
const progressRank = (state) => {
    if (!state) return -1;
    const finished = state.gameStatus === 'WON' || state.gameStatus === 'LOST';
    const guessCount = Array.isArray(state.guesses) ? state.guesses.length : 0;
    // Finished games get a large base so they outrank any in-progress count.
    return (finished ? 1000 : 0) + guessCount;
};

// Decide which of two saved states to keep. Returns the "better" one.
// Ties fall back to the more recently updated, then to `incoming` (the
// freshly-played anonymous game) so a just-finished session surfaces.
export const pickBestState = (existing, incoming) => {
    const rankExisting = progressRank(existing);
    const rankIncoming = progressRank(incoming);

    if (rankIncoming > rankExisting) return incoming;
    if (rankExisting > rankIncoming) return existing;

    // Equal rank → prefer the newer updatedAt, else the incoming one.
    const tExisting = Date.parse(existing?.updatedAt || '') || 0;
    const tIncoming = Date.parse(incoming?.updatedAt || '') || 0;
    return tIncoming >= tExisting ? incoming : existing;
};

// Collect all PokePuzzle suffixes saved in localStorage for a given uid.
// Returns e.g. ['ongoing', 'daily:2026-6-17', 'daily:summary'].
export const listLocalSuffixesForUid = (uid, storage = (typeof localStorage !== 'undefined' ? localStorage : null)) => {
    if (!storage) return [];
    const prefix = ppLocalKey(uid, '');
    const suffixes = [];
    for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key && key.startsWith(prefix)) {
            suffixes.push(key.slice(prefix.length));
        }
    }
    return suffixes;
};

const safeParse = (raw) => {
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
};

// Migrate every localStorage PokePuzzle entry from `fromUid` to `toUid`,
// merging with "keep best", then remove the source entries. Pure w.r.t.
// the injected `storage` so it can be unit-tested. The `daily:summary`
// broadcast key is intentionally skipped — it's derived, not source-of-truth.
export const migrateLocalProgress = (fromUid, toUid, storage = (typeof localStorage !== 'undefined' ? localStorage : null)) => {
    if (!storage || !fromUid || !toUid || fromUid === toUid) return [];

    const migrated = [];
    const suffixes = listLocalSuffixesForUid(fromUid, storage);

    suffixes.forEach((suffix) => {
        if (suffix === 'daily:summary') return; // derived broadcast, skip

        const fromKey = ppLocalKey(fromUid, suffix);
        const incoming = safeParse(storage.getItem(fromKey));
        if (!incoming) return;

        const toKey = ppLocalKey(toUid, suffix);
        const existing = safeParse(storage.getItem(toKey));
        const best = pickBestState(existing, incoming);

        try {
            storage.setItem(toKey, JSON.stringify(best));
            migrated.push(suffix);
        } catch { /* quota — best effort */ }
    });

    // Clear the source namespace once merged.
    suffixes.forEach((suffix) => {
        try { storage.removeItem(ppLocalKey(fromUid, suffix)); } catch { /* ignore */ }
    });

    return migrated;
};
