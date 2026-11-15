/**
 * Which of the day's games this trainer already played (2026-11-15, Enzo: the
 * daily loop — "Próximo do dia" that knows, the open dot and the two pips in
 * the Mais sheet). Pure: a record in, what to show out. The record is kept on
 * the device (`hooks/useGamesToday.js`, `ptb:gamesToday`), written where a
 * game ends and wherever the Home already reads the day (the Champion's
 * summary, the PokéPuzzle's), so no new read is made for it.
 *
 * Each game keeps its own day: the Champion's turns at midnight in São Paulo
 * (`challengeDay.js`), the PokéPuzzle's at the trainer's own midnight.
 */

import { dayKeyAt, nextResetAt as challengeResetAt } from './challengeDay.js';

/** The daily games, in Enzo's order (the Champion, then the PokéPuzzle). */
export const DAILY_GAMES = ['challenge', 'pokepuzzle'];

const localDay = (ms) => {
    const d = new Date(ms);
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

/** The key of the day `ms` falls in, as that game counts days. */
export const gameDayKey = (game, ms) => (game === 'challenge' ? dayKeyAt(ms) : localDay(ms));

/** The instant that game's next day begins. */
export const gameResetAt = (game, ms) => {
    if (game === 'challenge') return challengeResetAt(ms);
    const d = new Date(ms);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
};

/** The first instant a new game opens: the earlier of the two resets. */
export const nextGameResetAt = (ms) => Math.min(...DAILY_GAMES.map((game) => gameResetAt(game, ms)));

/** `{ challenge, pokepuzzle }` — true when the record holds today's day for it. */
export function gamesDoneToday(record, ms) {
    return Object.fromEntries(DAILY_GAMES.map((game) => [game, Boolean(record) && record[game] === gameDayKey(game, ms)]));
}

/** The record with `game` played today; an unknown game leaves it as it was. */
export function withGameDone(record, game, ms) {
    if (!DAILY_GAMES.includes(game)) return record || {};
    return { ...(record || {}), [game]: gameDayKey(game, ms) };
}

/**
 * Where a finished screen sends the trainer next (`<NextGameCard>`).
 * `preferred` is the screen's own pick, `from` the screen itself.
 * - a daily game still open, the preferred one first: `{ kind: 'next', game }`;
 * - both played: `{ kind: 'allDone', game: 'tierList' }` (null on the tier list
 *   itself, which then only says when the next games open);
 * - the only open one is this screen's (a practice battle): the tier list.
 */
export function nextGameFor({ preferred, from = null, done = {} }) {
    const open = [preferred, ...DAILY_GAMES]
        .filter((game, i, list) => DAILY_GAMES.includes(game) && list.indexOf(game) === i)
        .filter((game) => game !== from && !done[game]);
    if (open.length) return { kind: 'next', game: open[0] };
    const tierList = from === 'tierList' ? null : 'tierList';
    if (DAILY_GAMES.every((game) => done[game])) return { kind: 'allDone', game: tierList };
    return tierList ? { kind: 'next', game: tierList } : null;
}
