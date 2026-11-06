// The PokéPuzzle's day, together (2026-11-06, docs/plans/social-heart.md
// D1/D2): how many trainers needed 1…N guesses (`puzzleDays/{day}`, a few
// counters, world-readable) and each trainer's colour grid for their friends
// (`puzzleDays/{day}/players/{uid}`, signed-in readable). Never letters: a
// row is only c (right place) / p (in the word) / a (absent).

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const ROW_RE = /^[cpa]{1,12}$/;
export const MAX_GUESSES = 8; // PokePuzzleView MAX_ATTEMPTS
const DAY_MS = 86_400_000;

/** A submission, cleaned — or null when it is not a real result for a day near now. */
export function cleanSubmission(body, nowMs = Date.now()) {
    const day = String(body?.day || '');
    if (!DAY_RE.test(day)) return null;
    const dayMs = Date.parse(`${day}T12:00:00Z`);
    if (!Number.isFinite(dayMs) || Math.abs(dayMs - nowMs) > 1.5 * DAY_MS) return null;
    const rows = Array.isArray(body?.rows) ? body.rows.map(String) : [];
    if (!rows.length || rows.length > MAX_GUESSES || !rows.every((r) => ROW_RE.test(r))) return null;
    if (rows.some((r) => r.length !== rows[0].length)) return null;
    const won = rows[rows.length - 1].split('').every((c) => c === 'c');
    // A win ends the game: no fully-correct row before the last.
    if (rows.slice(0, -1).some((r) => r.split('').every((c) => c === 'c'))) return null;
    return { day, rows, won, guesses: rows.length };
}

/** The counter key a result increments: g1…g6, or `miss`. */
export const bucketOf = ({ won, guesses }) => (won ? `g${guesses}` : 'miss');

/** `{ g1…g8, miss, total }` → shares in percent (rounded), for the bars. */
export function distribution(day = {}) {
    const keys = [...Array.from({ length: MAX_GUESSES }, (_, i) => `g${i + 1}`), 'miss'];
    const total = keys.reduce((sum, k) => sum + (Number(day[k]) || 0), 0);
    return {
        total,
        bars: keys.map((key) => ({ key, count: Number(day[key]) || 0, share: total ? Math.round(((Number(day[key]) || 0) / total) * 100) : 0 })),
    };
}

/**
 * Record one trainer's result once: the player row and the counter move in
 * one transaction, and a second submission for the same day changes nothing.
 */
export async function submitPuzzleDay({ db, appId, uid, submission, profile = null }) {
    const dayRef = db.doc(`artifacts/${appId}/public/data/puzzleDays/${submission.day}`);
    const playerRef = dayRef.collection('players').doc(uid);
    return db.runTransaction(async (tx) => {
        const [daySnap, playerSnap] = await Promise.all([tx.get(dayRef), tx.get(playerRef)]);
        if (playerSnap.exists) return { recorded: false, day: daySnap.exists ? daySnap.data() : {} };
        const day = daySnap.exists ? daySnap.data() : {};
        const bucket = bucketOf(submission);
        const next = { ...day, [bucket]: (Number(day[bucket]) || 0) + 1, total: (Number(day.total) || 0) + 1 };
        tx.set(dayRef, next);
        tx.set(playerRef, {
            rows: submission.rows,
            won: submission.won,
            guesses: submission.guesses,
            name: String(profile?.displayName || 'Trainer').slice(0, 40),
            avatar: Number.isInteger(profile?.avatarPokemonId) ? profile.avatarPokemonId : null,
            sprite: typeof profile?.trainerSprite === 'string' ? profile.trainerSprite : null,
            at: new Date().toISOString(),
        });
        return { recorded: true, day: next };
    });
}
