import { daysBetween, previousDayKey } from './day.js';

/**
 * Results, score and the day streak. Pure functions over plain data, so the
 * endpoint, the Home card and the tests agree on one definition.
 *
 * The streak counts consecutive days with a **win in the official attempt**
 * (premise A2): playing and losing doesn't keep it alive, and practice
 * rematches never touch it.
 */

const HISTORY_DAYS = 60;

/** Win: 1000 + 150 per Pokémon left + their average HP% − 5 per turn. Loss: 0. */
export const scoreOf = ({ won, remaining, hpPct, turns }) => (won
    ? Math.max(0, Math.round(1000 + 150 * remaining + hpPct - 5 * turns))
    : 0);

/** The result block of a finished run, from the engine's outcome. */
export const resultOf = (out, status) => {
    const won = status === 'won';
    const result = {
        turns: out.turns,
        remaining: out.remaining.p1,
        hpPct: out.hpPct.p1,
    };
    return { ...result, score: scoreOf({ won, ...result }) };
};

export const emptyStats = (uid) => ({
    uid,
    played: 0,
    wins: 0,
    losses: 0,
    streak: 0,
    bestStreak: 0,
    lastPlayedDay: null,
    lastWonDay: null,
    history: {},
});

/**
 * Stats after an official run ends. A day counts once, however many officials
 * it had (one per board, ranking.js): the first finish records it, and a later
 * one can only turn a lost day into a won one — never the other way round.
 */
export const nextStats = (stats, { dayKey, status, practice = false }) => {
    const base = stats || emptyStats(null);
    const before = base.history?.[dayKey];
    const won = status === 'won';
    if (practice || before === 'won' || (before && !won)) return base;

    // A loss earlier today zeroed the streak; a win now picks up the one it broke.
    const carried = before ? (base.brokenStreak || 0) : base.streak;
    const streak = won ? (base.lastWonDay === previousDayKey(dayKey) ? carried + 1 : 1) : 0;
    const history = { ...(base.history || {}), [dayKey]: status };
    for (const day of Object.keys(history)) {
        if (daysBetween(day, dayKey) >= HISTORY_DAYS) delete history[day];
    }
    return {
        ...base,
        played: base.played + (before ? 0 : 1),
        wins: base.wins + (won ? 1 : 0),
        losses: base.losses + (won ? 0 : 1) - (before ? 1 : 0),
        streak,
        bestStreak: Math.max(base.bestStreak, streak),
        brokenStreak: won ? 0 : base.streak,
        lastPlayedDay: dayKey,
        lastWonDay: won ? dayKey : base.lastWonDay,
        history,
    };
};

/**
 * One champion's stats inside the trainer's stats document. Cynthia's are the
 * document itself (as they were before there was a second champion); another
 * champion's live under `champions.{id}`, so the document's rules and account
 * deletion stay as they are.
 */
export const statsOf = (doc, championId, uid) => {
    if (!championId || championId === 'cynthia') return doc || emptyStats(uid);
    return doc?.champions?.[championId] || emptyStats(uid);
};

/** The stats document with one champion's stats replaced. */
export const withStats = (doc, championId, next, uid) => {
    if (!championId || championId === 'cynthia') return { ...next, uid: next.uid || uid };
    const base = doc || emptyStats(uid);
    return { ...base, uid: base.uid || uid, champions: { ...(base.champions || {}), [championId]: next } };
};

/**
 * The streak as it stands today. A stored streak whose last win is older than
 * yesterday is already broken — nobody has to play for it to drop to zero.
 */
export const effectiveStreak = (stats, todayKey) => {
    if (!stats?.lastWonDay) return 0;
    if (stats.lastWonDay === todayKey || stats.lastWonDay === previousDayKey(todayKey)) return stats.streak;
    return 0;
};
