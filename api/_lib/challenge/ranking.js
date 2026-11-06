/**
 * The daily ranking (F6): one public document per challenge day,
 * `public/data/challengeRanks/{day}`, with two boards — the Time do dia (the
 * fair one: everyone had the same rental team) and Livre (your own teams, any
 * tier). Only an official win enters a board; every official finish counts
 * towards `played`. Practice never touches it.
 *
 * Written only by the server, inside the transaction that ends the run, so a
 * place can't be claimed from the console (firestore.rules: read-only). Pure
 * functions over plain data, like `outcome.js`.
 */

export const RANK_LIMIT = 50;
export const BOARDS = ['daily', 'free'];

/** A run's board, from how its team was chosen. */
export const boardOf = (teamSource) => (teamSource === 'daily' ? 'daily' : 'free');

export const emptyRanks = (dayKey) => ({
    dayKey,
    boards: { daily: [], free: [] },
    played: { daily: 0, free: 0 },
    wins: { daily: 0, free: 0 },
    updatedAt: null,
});

const shortText = (value) => (typeof value === 'string' && value.length > 0 && value.length <= 48 ? value : null);

/**
 * What a row shows of its trainer — their public profile as it was when they
 * won (`publicProfiles/{uid}`, world-readable already): avatar, frame, title,
 * level. A day's board lasts a day, so a stamp never goes stale for long, and
 * the screen gets a face without ever learning the uid. Ids are only shaped
 * here; the client keeps the ones its catalogue knows (rewards.js validEquip).
 */
export const rankProfileOf = (profile) => {
    if (!profile || typeof profile !== 'object') return null;
    const pokemonId = Number.isInteger(profile.avatarPokemonId) && profile.avatarPokemonId > 0 && profile.avatarPokemonId < 20000
        ? profile.avatarPokemonId
        : null;
    return {
        avatarPokemonId: pokemonId,
        avatarIsShiny: profile.avatarIsShiny === true,
        trainerSprite: shortText(profile.trainerSprite),
        frameId: shortText(profile.frameId),
        titleId: shortText(profile.titleId),
        level: Number.isInteger(profile.trainerLevel) && profile.trainerLevel > 0 ? profile.trainerLevel : null,
    };
};

/** Higher score first; then the quicker win; then whoever finished first. */
const byPlace = (a, b) => b.score - a.score || a.turns - b.turns || String(a.at).localeCompare(String(b.at));

/**
 * The ranking after one official finish. A player already on the board is
 * never entered twice (an official run ends once; this is the belt to that).
 */
export const nextRanks = (doc, { dayKey, teamSource, uid, name, status, result, at, profile = null }) => {
    const base = doc && doc.boards ? doc : emptyRanks(dayKey);
    const board = boardOf(teamSource);
    const list = base.boards[board] || [];
    const won = status === 'won';
    const entries = won && !list.some((entry) => entry.uid === uid)
        ? [...list, { uid, name, score: result?.score ?? 0, turns: result?.turns ?? 0, remaining: result?.remaining ?? 0, at, profile: rankProfileOf(profile) }]
            .sort(byPlace)
            .slice(0, RANK_LIMIT)
        : list;
    const boards = { ...base.boards, [board]: entries };
    return {
        ...base,
        boards,
        players: playersOf(boards),
        played: { ...base.played, [board]: (base.played?.[board] || 0) + 1 },
        wins: { ...base.wins, [board]: (base.wins?.[board] || 0) + (won ? 1 : 0) },
        updatedAt: at,
    };
};

/** Every uid on a board — the field account deletion finds a player's days by (`array-contains`). */
const playersOf = (boards) => [...new Set(BOARDS.flatMap((board) => (boards[board] || []).map((entry) => entry.uid)))];

/**
 * The ranking without one player — account deletion. Their rows go; the day's
 * counts stay (they are totals, nobody's in particular).
 */
export const forgetPlayer = (doc, uid) => {
    if (!doc?.boards) return doc;
    const boards = Object.fromEntries(BOARDS.map((board) => [board, (doc.boards[board] || []).filter((entry) => entry.uid !== uid)]));
    return { ...doc, boards, players: playersOf(boards) };
};

/** A player's 1-based place on a board, or null (didn't win, or outside the top). */
export const placeOf = (ranks, board, uid) => {
    const index = (ranks?.boards?.[board] || []).findIndex((entry) => entry.uid === uid);
    return index < 0 ? null : index + 1;
};

/**
 * What the screen gets: the top of each board, the counts, and where the
 * caller stands. The uid travels only for an entry with a public profile
 * (2026-11-05: the trainer card opens from the row) — that profile is
 * already world-readable at `publicProfiles/{uid}`, so nothing new is learnt.
 * A guest's win keeps it hidden; the caller is found by `me: true`.
 */
export const publicRanks = (doc, uid, top = 10, friendUids = null) => {
    const ranks = doc && doc.boards ? doc : null;
    if (!ranks) return null;
    const boards = {};
    const mine = {};
    for (const board of BOARDS) {
        const list = ranks.boards[board] || [];
        boards[board] = list.slice(0, top).map((entry) => ({
            name: entry.name,
            score: entry.score,
            turns: entry.turns,
            remaining: entry.remaining,
            at: entry.at || null,
            profile: entry.profile || null,
            uid: entry.profile && entry.uid ? entry.uid : null,
            me: Boolean(uid) && entry.uid === uid,
        }));
        mine[board] = placeOf(ranks, board, uid);
    }
    const out = { dayKey: ranks.dayKey, boards, mine, played: ranks.played, wins: ranks.wins };
    // Sua liga (2026-11-06): the caller and their friends, anywhere in the
    // top 50, each with their real place. Only for a caller with friends.
    if (uid && Array.isArray(friendUids) && friendUids.length) out.friends = friendBoards(ranks, uid, friendUids);
    return out;
};

/** The caller's and their friends' rows of each board, with their places. */
export const friendBoards = (ranks, uid, friendUids = []) => {
    const circle = new Set([uid, ...friendUids]);
    const result = {};
    for (const board of BOARDS) {
        result[board] = (ranks?.boards?.[board] || [])
            .map((entry, index) => ({ entry, place: index + 1 }))
            .filter(({ entry }) => circle.has(entry.uid))
            .map(({ entry, place }) => ({
                name: entry.name,
                score: entry.score,
                turns: entry.turns,
                remaining: entry.remaining,
                at: entry.at || null,
                profile: entry.profile || null,
                uid: entry.profile && entry.uid ? entry.uid : null,
                me: entry.uid === uid,
                place,
            }));
    }
    return result;
};

/**
 * Friends the caller just passed on a board (2026-11-06, "Ana passou você"):
 * ahead of the caller before this finish — or the caller was not on it — and
 * behind them now.
 */
export const passedFriends = (prevRanks, nextRanks, board, uid, friendUids = []) => {
    const before = (prevRanks?.boards?.[board] || []).map((e) => e.uid);
    const after = (nextRanks?.boards?.[board] || []).map((e) => e.uid);
    const meBefore = before.indexOf(uid);
    const meAfter = after.indexOf(uid);
    if (meAfter === -1) return [];
    return friendUids.filter((f) => {
        const fb = before.indexOf(f);
        const fa = after.indexOf(f);
        if (fb === -1 || fa === -1) return false;
        const wasAhead = meBefore === -1 || fb < meBefore;
        return wasAhead && fa > meAfter;
    });
};
