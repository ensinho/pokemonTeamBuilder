/**
 * A finished daily game, as a few URL-safe characters: the `?r=` of a shared
 * link (`/pokepuzzle?r=…`, `/challenge?r=…`). api/render-meta.js reads it to
 * title the preview, and api/og.js to draw it, so the link someone posts shows
 * *their* result instead of the generic card (2026-10-24).
 *
 * Two rules:
 * - **No answer, ever.** A PokéPuzzle code carries the shape of the attempt
 *   (one c/p/a per letter, like the emoji grid), never a letter of the
 *   Pokémon — the daily puzzle is the same for everyone (pokePuzzleShare.js).
 * - **No free text.** A code is digits and a handful of letters, decoded
 *   strictly; anything else decodes to null and the page keeps its usual card.
 *   Nobody can put words of their own into an image on this domain.
 *
 * Self-reported, like a shared board: the ranking is where results are
 * authoritative. Node-safe (no imports) for the serverless side.
 */

const MAX_ROW = 20;
const MAX_ATTEMPTS = 12;

// ── PokéPuzzle ──────────────────────────────────────────────────────────────
// `{day}.{w|l}.{max}.{rows}`: day 0 = free play; rows joined by `-`, one
// c (correct) / p (present) / a (absent) per letter. `12.w.8.apcaa-ccccc`.

/** @param {{ puzzleNumber: number|null, won: boolean, maxAttempts: number, rows: string[] }} share */
export function encodePuzzleResult(share) {
    if (!share?.rows?.length) return '';
    const day = Number.isInteger(share.puzzleNumber) && share.puzzleNumber > 0 ? share.puzzleNumber : 0;
    return [day, share.won ? 'w' : 'l', share.maxAttempts, share.rows.join('-')].join('.');
}

export function decodePuzzleResult(code) {
    const parts = typeof code === 'string' ? code.split('.') : [];
    if (parts.length !== 4) return null;
    const [dayText, outcome, maxText, rowsText] = parts;
    if (!/^\d{1,5}$/.test(dayText) || !/^[wl]$/.test(outcome) || !/^\d{1,2}$/.test(maxText)) return null;
    const maxAttempts = Number(maxText);
    const rows = rowsText.split('-');
    if (maxAttempts < 1 || maxAttempts > MAX_ATTEMPTS || rows.length > maxAttempts) return null;
    const width = rows[0].length;
    if (!width || width > MAX_ROW || rows.some((row) => row.length !== width || !/^[cpa]+$/.test(row))) return null;
    const solved = (row) => /^c+$/.test(row);
    const won = outcome === 'w';
    // A win ends on the solved row and only there; a loss used every attempt.
    if (won && (!solved(rows[rows.length - 1]) || rows.slice(0, -1).some(solved))) return null;
    if (!won && (rows.length !== maxAttempts || rows.some(solved))) return null;
    const day = Number(dayText);
    return { puzzleNumber: day > 0 ? day : null, won, maxAttempts, attempts: rows.length, rows };
}

// ── Champion Challenge ──────────────────────────────────────────────────────
// `{yyyymmdd}.{w|l}.{turns}.{remaining}.{score}.{streak}.{difficulty|x}.{curve}`,
// curve = the win-chance sparkline as digits 0–7 (at most 16).

const DIFFICULTIES = ['dp', 'platinum', 'rematch', 'world'];
const SPARK_BLOCKS = '▁▂▃▄▅▆▇█';

/** @param {{ dayKey: string, won: boolean, turns, remaining, score, streak, difficulty, spark: string }} share */
export function encodeChallengeResult(share) {
    if (!share || !/^\d{4}-\d{2}-\d{2}$/.test(share.dayKey || '')) return '';
    const curve = [...(share.spark || '')].map((block) => SPARK_BLOCKS.indexOf(block)).filter((i) => i >= 0).join('');
    return [
        share.dayKey.replaceAll('-', ''),
        share.won ? 'w' : 'l',
        share.turns || 0,
        share.remaining || 0,
        share.score || 0,
        share.streak || 0,
        DIFFICULTIES.includes(share.difficulty) ? share.difficulty : 'x',
        curve,
    ].join('.');
}

export function decodeChallengeResult(code) {
    const parts = typeof code === 'string' ? code.split('.') : [];
    if (parts.length !== 8) return null;
    const [day, outcome, turns, remaining, score, streak, difficulty, curve] = parts;
    if (!/^\d{8}$/.test(day) || !/^[wl]$/.test(outcome)) return null;
    if (![turns, remaining, score, streak].every((n) => /^\d{1,5}$/.test(n))) return null;
    if (!(difficulty === 'x' || DIFFICULTIES.includes(difficulty)) || !/^[0-7]{0,16}$/.test(curve)) return null;
    const dayKey = `${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6)}`;
    if (Number.isNaN(Date.parse(`${dayKey}T00:00:00Z`))) return null;
    const won = outcome === 'w';
    const left = Number(remaining);
    if (left > 6 || (won && left < 1) || Number(turns) > 999) return null;
    return {
        dayKey,
        won,
        turns: Number(turns),
        remaining: won ? left : 0,
        score: Math.min(Number(score), 99999),
        streak: Math.min(Number(streak), 9999),
        difficulty: difficulty === 'x' ? null : difficulty,
        curve: [...curve].map((digit) => Number(digit) / 7),
    };
}
