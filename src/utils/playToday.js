/**
 * "Jogue hoje" on the first-visit landing (2026-11-15, Enzo picked option A
 * of the proposal: a band under the hero, the Champion then the PokéPuzzle,
 * with how many played today). Pure: the band (components/landing/
 * LandingPlayToday.jsx) asks this module what to say.
 */

import { getDaysSinceLaunch } from './pokePuzzle.js';

/** The games of the band, in Enzo's order; the tier list closes it. */
export const PLAY_TODAY_GAMES = ['challenge', 'pokepuzzle', 'quiz', 'tierList'];

/** `11h07`, `0h45` — the time left until `resetAt`, never negative. */
export function countdownLabel(now, resetAt) {
    const minutes = Math.max(0, Math.floor((resetAt - now) / 60000));
    return `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}`;
}

/** Today's PokéPuzzle number for a local day key (`2026-11-15`), as the game numbers it. */
export const puzzleNumberOn = (dayKey) => getDaysSinceLaunch(dayKey) + 1;

/**
 * The crowd line under a game: a count when someone played, an invitation
 * when nobody has yet (a "0 jogaram" reads as a dead site), nothing while
 * the counters are still loading. Returns `{ key, n }` for the translator.
 */
export function crowdLine(count) {
    if (count == null) return null;
    const n = Number(count) || 0;
    if (n <= 0) return { key: 'beFirst', n: 0 };
    return { key: n === 1 ? 'playedOne' : 'played', n };
}
