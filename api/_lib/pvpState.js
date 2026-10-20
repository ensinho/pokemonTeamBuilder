/**
 * The PvP battle's private state, as one document: `battles/{id}/secret/state`.
 *
 * ## Why one document
 *
 * The resolver replays every battle from its seed and its choices. Those used
 * to live in `teams/{uid}` (two reads) and `choices/{round}_{uid}` (one read
 * *per choice ever made*, so a 30-turn battle read ~60 documents on every
 * request — and both clients make a request per round). One server-only
 * document holds all of it: two reads per choice instead of 4 + N.
 *
 * It also closes a leak. `choices/*` is readable by both players, so a
 * pending choice — "move 3", sitting there until the other side answers —
 * could be read by the opponent before they chose. `secret/*` has no rule at
 * all, which in Firestore means no client can read or write it; only the
 * admin SDK touches it.
 *
 * ## Race-free rounds
 *
 * A choice is recorded inside a transaction that reads the pending round and
 * decides, in the same step, whether the round is now complete. The request
 * that completes it *claims* the resolution (`claimedAt`), so two players
 * answering at the same instant can neither both resolve nor both leave it
 * unresolved — which is what the client's backoff poll used to cover. A claim
 * older than `CLAIM_STALE_MS` (a function that died mid-replay) can be taken
 * over by the next request.
 *
 * Pure: no Firestore, no sim. Tested in `pvpState.test.js`.
 */

/**
 * The ruleset of every PvP battle that starts from now on (the server sets it
 * when the battle begins). The same as the Champion Challenge's:
 *
 *  - **Anything Goes, not Custom Game.** Custom Game is a debug format that
 *    reports exact HP to both sides; Anything Goes carries HP Percentage Mod,
 *    so the opponent's HP is a percentage, as in the games (wounds.md,
 *    2026-10-14).
 *  - **No Team Preview.** The client answered it with "default" anyway; without
 *    it the first thing either player sees is a move.
 *  - **Terastal Clause.** The battle screen has no Tera button.
 *
 * Battles already running keep the format they started with — it is part of
 * the replay.
 */
export const PVP_FORMAT = 'gen9anythinggoes@@@!Team Preview,Sleep Clause Mod,Terastal Clause';

/** A claim on a round older than this belongs to a request that died. */
export const CLAIM_STALE_MS = 20_000;

export const SIDES = ['p1', 'p2'];

/** p1 is the challenger, always — a fixed mapping so replays never flip sides. */
export const sidesOf = (battle) => {
    const players = Array.isArray(battle?.players) ? battle.players : [];
    const p1 = battle?.challenger || null;
    return { p1, p2: players.find((id) => id !== p1) || null };
};

/** An empty pending round. */
export const emptyPending = (round) => ({ round, p1: null, p2: null, claimedAt: null });

/**
 * Which sides the sim is waiting on right now — `awaitingChoiceFrom`, written
 * from the sim's own per-side requests. Missing or empty (a battle that has not
 * bootstrapped) means both. Never assume both otherwise: after a faint only one
 * side is asked (wounds.md, 2026-07-27).
 */
export const sidesOwingChoice = (battle, sides) => {
    const awaiting = Array.isArray(battle?.awaitingChoiceFrom) ? battle.awaitingChoiceFrom : null;
    if (!awaiting || awaiting.length === 0) return { p1: true, p2: true };
    return { p1: awaiting.includes(sides.p1), p2: awaiting.includes(sides.p2) };
};

/**
 * Record one side's choice for the round and decide whether this request
 * resolves it.
 *
 * @param {object} input
 * @param {object|null} input.pending  the stored pending round (any round)
 * @param {number} input.round         the battle's current round
 * @param {{p1: boolean, p2: boolean}} input.owing
 * @param {'p1'|'p2'} input.side       the caller's side
 * @param {string|null} input.choice   null for a refresh
 * @param {number} input.now           ms
 * @returns {{pending: object, changed: boolean, recorded: boolean, complete: boolean, claimed: boolean}}
 */
export const recordChoice = ({ pending, round, owing, side, choice, now }) => {
    let next = pending && pending.round === round ? { ...emptyPending(round), ...pending } : emptyPending(round);
    let changed = !pending || pending.round !== round;
    let recorded = false;

    if (choice && owing[side] && !next[side]) {
        next = { ...next, [side]: choice };
        changed = true;
        recorded = true;
    }

    const complete = SIDES.every((s) => !owing[s] || Boolean(next[s]));
    const claimAge = next.claimedAt ? now - Date.parse(next.claimedAt) : Infinity;
    const claimed = complete && !(claimAge < CLAIM_STALE_MS);
    if (claimed) {
        next = { ...next, claimedAt: new Date(now).toISOString() };
        changed = true;
    }
    return { pending: next, changed, recorded, complete, claimed };
};

/** The round's answers as replay lines, in the fixed p1, p2 order the sim needs. */
export const roundLines = (pending, owing) => SIDES
    .filter((side) => owing[side] && pending?.[side])
    .map((side) => `>${side} ${pending[side]}`);

/**
 * Rebuild the replay history from the legacy `choices/{round}_{uid}` documents
 * — the one-time migration of a battle that started before `secret/state`.
 *
 * @param {Map<string, {choice: string}>} byId choice documents by id
 * @returns {{history: string[], pending: object}}
 */
export const historyFromChoices = (byId, sides, round) => {
    const history = [];
    for (let r = 0; r < round; r += 1) {
        for (const side of SIDES) {
            const entry = byId.get(`${r}_${sides[side]}`);
            if (entry?.choice) history.push(`>${side} ${entry.choice}`);
        }
    }
    const pending = emptyPending(round);
    for (const side of SIDES) {
        const entry = byId.get(`${round}_${sides[side]}`);
        if (entry?.choice) pending[side] = entry.choice;
    }
    return { history, pending };
};

/** Is this side's latest request the team-preview prompt? */
export const asksTeamPreview = (sideLines = []) => {
    for (let i = sideLines.length - 1; i >= 0; i -= 1) {
        if (!sideLines[i].startsWith('|request|')) continue;
        try {
            return Boolean(JSON.parse(sideLines[i].slice('|request|'.length))?.teamPreview);
        } catch {
            return false;
        }
    }
    return false;
};

/**
 * Display names handed to the sim. They come back in `|win|…`, so they must be
 * distinguishable — two trainers with the same name would make the winner
 * ambiguous.
 */
export const simNames = (battle, sides) => {
    const p1 = battle?.playerNames?.[sides.p1] || 'Player 1';
    const p2Raw = battle?.playerNames?.[sides.p2] || 'Player 2';
    return { p1, p2: p2Raw === p1 ? `${p2Raw} (2)` : p2Raw };
};
