/**
 * Which of the day's games this trainer already played (2026-11-15, Enzo: the
 * daily loop — "Próximo do dia" that knows, the open dot and the pips in the
 * Mais sheet). Pure: a record in, what to show out. The record is kept on
 * the device (`hooks/useGamesToday.js`, `ptb:gamesToday`), written where a
 * game ends and wherever the Home already reads the day (the Champion's
 * summary, the PokéPuzzle's), so no new read is made for it.
 *
 * Four games a day since the second pass (2026-11-15, Enzo: "facilitar
 * todos — Champion Challenge, PokéPuzzle, Quizzes e Tier list… que joguem os
 * outros e joguem mais nos outros dias"): the quiz and the tier list each
 * have something new every day too — the day's category (`dailyQuiz.js`) and
 * the day's theme (`tierList.js` `dailyTierTemplate`) — so the day reads
 * "2 de 4" everywhere it is counted (the Jogos page, the Mais sheet, the
 * rail, "Próximo do dia").
 *
 * Each game keeps its own day: the Champion's turns at midnight in São Paulo
 * (`challengeDay.js`), the others' at the trainer's own midnight.
 */

import { dayKeyAt, nextResetAt as challengeResetAt } from './challengeDay.js';

/** The daily games, in the order the day is played (the Champion first — Enzo). */
export const DAILY_GAMES = ['challenge', 'pokepuzzle', 'quiz', 'tierList'];

/** The shell's own key for each game's page (AppLayout's `navigationGroups`). */
export const GAME_NAV_KEYS = { challenge: 'challenge', pokepuzzle: 'pokepuzzle', quiz: 'generationQuiz', tierList: 'tierList' };

/** The daily game a rail / Mais sheet item stands for, or null. */
export const gameOfNavKey = (navKey) => DAILY_GAMES.find((game) => GAME_NAV_KEYS[game] === navKey) || null;

const localDay = (ms) => {
    const d = new Date(ms);
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

/**
 * The trainer's own day as a count of days — what the day's quiz category
 * and tier theme rotate on, so everyone on the same calendar day gets the
 * same one whatever their time zone.
 */
export const localDayNumber = (ms) => {
    const d = new Date(ms);
    return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
};

/** The key of the day `ms` falls in, as that game counts days. */
export const gameDayKey = (game, ms) => (game === 'challenge' ? dayKeyAt(ms) : localDay(ms));

/** The instant that game's next day begins. */
export const gameResetAt = (game, ms) => {
    if (game === 'challenge') return challengeResetAt(ms);
    const d = new Date(ms);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
};

/** The first instant a new game opens: the earliest of the resets. */
export const nextGameResetAt = (ms) => Math.min(...DAILY_GAMES.map((game) => gameResetAt(game, ms)));

/** `{ challenge, pokepuzzle, quiz, tierList }` — true when the record holds today's day for it. */
export function gamesDoneToday(record, ms) {
    return Object.fromEntries(DAILY_GAMES.map((game) => [game, Boolean(record) && record[game] === gameDayKey(game, ms)]));
}

/** A note is a few short figures or ids — never text a trainer typed. */
const cleanNote = (note) => {
    if (!note || typeof note !== 'object') return null;
    const entries = Object.entries(note)
        .filter(([, value]) => Number.isFinite(value) || typeof value === 'boolean' || (typeof value === 'string' && value.length <= 80))
        .slice(0, 6);
    return entries.length ? Object.fromEntries(entries) : null;
};

/**
 * The record with `game` played today; an unknown game leaves it as it was.
 * `note` is what the Jogos page says back about it ("9/10", the theme
 * ranked) — kept beside the day, so yesterday's never reads as today's.
 */
export function withGameDone(record, game, ms, note = null) {
    if (!DAILY_GAMES.includes(game)) return record || {};
    const day = gameDayKey(game, ms);
    const next = { ...(record || {}), [game]: day };
    const kept = cleanNote(note);
    if (kept) next.notes = { ...(record?.notes || {}), [game]: { ...kept, day } };
    return next;
}

/** What was noted about `game` today, or null (never yesterday's). */
export function gameNoteToday(record, game, ms) {
    const note = record?.notes?.[game];
    if (!note || note.day !== gameDayKey(game, ms)) return null;
    return note;
}

/**
 * Two copies of the record — this device's and the account's (2026-11-17,
 * Enzo: the quiz and the tier list played in one browser read "Aberto hoje"
 * in another) — as one: a game played today in either is played; its note
 * comes from the copy that played it (this device first). Only today is
 * kept; a stale day of either copy is dropped, never revived.
 */
export function mergeGameRecords(local, remote, ms) {
    const merged = {};
    const notes = {};
    for (const game of DAILY_GAMES) {
        const today = gameDayKey(game, ms);
        const copies = [local, remote].filter((record) => record && typeof record === 'object' && record[game] === today);
        if (!copies.length) continue;
        merged[game] = today;
        const note = copies.map((record) => cleanNote(gameNoteToday(record, game, ms))).find(Boolean);
        if (note) notes[game] = { ...note, day: today };
    }
    if (Object.keys(notes).length) merged.notes = notes;
    return merged;
}

/** How much of the day is played: `{ played, total, complete }`. */
export function dayTally(done = {}) {
    const played = DAILY_GAMES.filter((game) => done[game]).length;
    return { played, total: DAILY_GAMES.length, complete: played === DAILY_GAMES.length };
}

/**
 * Where a finished screen sends the trainer next (`<NextGameCard>`).
 * `preferred` is the screen's own pick, `from` the screen itself.
 * - a daily game still open, the preferred one first, then the day's order:
 *   `{ kind: 'next', game }`;
 * - all four played: `{ kind: 'allDone' }` — the card says when the next
 *   games open and points at the Diário do dia;
 * - the only open one is this screen's (a practice battle, a list still
 *   being ranked): null — there is nowhere else to send anyone.
 */
export function nextGameFor({ preferred, from = null, done = {} }) {
    const open = [preferred, ...DAILY_GAMES]
        .filter((game, i, list) => DAILY_GAMES.includes(game) && list.indexOf(game) === i)
        .filter((game) => game !== from && !done[game]);
    if (open.length) return { kind: 'next', game: open[0] };
    if (DAILY_GAMES.every((game) => done[game])) return { kind: 'allDone', game: null };
    return null;
}
