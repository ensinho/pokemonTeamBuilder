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
 * caller stands. Entries keep the uid only as `me: true` for the caller —
 * the page needs to find you, not to know everyone else's account id.
 */
export const publicRanks = (doc, uid, top = 10) => {
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
            me: Boolean(uid) && entry.uid === uid,
        }));
        mine[board] = placeOf(ranks, board, uid);
    }
    return { dayKey: ranks.dayKey, boards, mine, played: ranks.played, wins: ranks.wins };
};
