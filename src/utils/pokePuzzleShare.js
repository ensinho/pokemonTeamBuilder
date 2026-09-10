import { checkLetters } from './pokePuzzle';

/**
 * The forum-shareable form of a finished PokéPuzzle.
 *
 * **It must never carry the answer.** The daily puzzle is the same for everyone,
 * so a share that named the Pokémon — or included a guess, which for a win *is*
 * the Pokémon — would spoil the day for the whole forum. What travels is the
 * shape of the attempt: one row per guess, one letter-status per character.
 * That is exactly what the clipboard share has always posted, and it is why
 * `buildPuzzleShare` takes the target but never returns it.
 */

/** Compact per-letter codes, so a row is a string rather than an array. */
const CODE = { correct: 'c', present: 'p', absent: 'a' };
export const STATUS_BY_CODE = { c: 'correct', p: 'present', a: 'absent' };

const EMOJI = { c: '🟩', p: '🟨', a: '⬛' };

/**
 * @param {object} game
 * @param {string[]} game.guesses     normalized guesses, in order
 * @param {string} game.target        normalized answer — used, never emitted
 * @param {number} game.maxAttempts
 * @param {boolean} game.won
 * @param {'daily'|'free'} game.mode
 * @param {number|null} game.puzzleNumber  which day it was, when known
 * @returns {object|null} payload for a forum message, or null if nothing to share
 */
export function buildPuzzleShare({
    guesses = [],
    target = '',
    maxAttempts = 8,
    won = false,
    mode = 'daily',
    puzzleNumber = null,
} = {}) {
    // The board only ever accepts a guess exactly as long as the answer, so a
    // mismatch cannot come from play — but a ragged row would render a broken
    // grid for everyone in the thread, so it is dropped rather than trusted.
    const rows = (Array.isArray(guesses) ? guesses : [])
        .filter((guess) => typeof guess === 'string' && guess.length === target.length && guess.length > 0)
        .map((guess) => checkLetters(guess, target).map((status) => CODE[status] || 'a').join(''));

    if (rows.length === 0) return null;

    return {
        mode: mode === 'free' ? 'free' : 'daily',
        attempts: rows.length,
        maxAttempts,
        won: Boolean(won),
        // The answer's length is public information — the board shows it from
        // the first render — so the row width gives nothing away.
        wordLength: rows[0].length,
        puzzleNumber: Number.isFinite(puzzleNumber) ? puzzleNumber : null,
        rows,
    };
}

/** The familiar emoji grid, for plain-text contexts (topic previews, clipboard). */
export function puzzleShareToEmoji(share) {
    if (!share?.rows?.length) return '';
    return share.rows
        .map((row) => row.split('').map((code) => EMOJI[code] || EMOJI.a).join(''))
        .join('\n');
}

/** "4/8" — or "X/8" for a loss, the way these results are always written. */
export function puzzleShareScore(share) {
    if (!share) return '';
    return `${share.won ? share.attempts : 'X'}/${share.maxAttempts}`;
}
