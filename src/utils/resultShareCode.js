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
// `{day}.{w|l}.{max}.{rows}[.h{hints}]`: day 0 = free play; rows joined by
// `-`, one c (correct) / p (present) / a (absent) per letter; the letter
// hints taken, when any (2026-11-11 — a code without them is a game without
// them, so every older link still reads). `12.w.8.apcaa-ccccc.h2`.

/** @param {{ puzzleNumber: number|null, won: boolean, maxAttempts: number, rows: string[], hints?: number }} share */
export function encodePuzzleResult(share) {
    if (!share?.rows?.length) return '';
    const day = Number.isInteger(share.puzzleNumber) && share.puzzleNumber > 0 ? share.puzzleNumber : 0;
    const hints = Number.isInteger(share.hints) && share.hints > 0 ? Math.min(share.hints, 9) : 0;
    return [day, share.won ? 'w' : 'l', share.maxAttempts, share.rows.join('-'), ...(hints ? [`h${hints}`] : [])].join('.');
}

export function decodePuzzleResult(code) {
    const parts = typeof code === 'string' ? code.split('.') : [];
    if (parts.length !== 4 && parts.length !== 5) return null;
    const [dayText, outcome, maxText, rowsText, hintsText] = parts;
    if (hintsText !== undefined && !/^h[1-9]$/.test(hintsText)) return null;
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
    const hints = hintsText ? Number(hintsText.slice(1)) : 0;
    return { puzzleNumber: day > 0 ? day : null, won, maxAttempts, attempts: rows.length, rows, hints };
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

// ── Quiz duel (2026-11-06, docs/plans/social-heart.md D3) ───────────────────
// `{mask}.{found}.{total}`: the generations as a bitmask (I = 1 … IX = 256),
// how many the sharer found and out of how many. The link opens the same quiz
// with that mark to beat. Never names, never free text.

export const QUIZ_GENERATIONS = [
    'generation-i', 'generation-ii', 'generation-iii', 'generation-iv', 'generation-v',
    'generation-vi', 'generation-vii', 'generation-viii', 'generation-ix',
];

/** @param {{ generations: string[], found: number, total: number }} duel */
export function encodeQuizDuel(duel) {
    const mask = (duel?.generations || []).reduce((m, key) => {
        const i = QUIZ_GENERATIONS.indexOf(key);
        return i >= 0 ? m | (1 << i) : m;
    }, 0);
    if (!mask || !Number.isInteger(duel.total) || duel.total < 1) return '';
    const found = Math.max(0, Math.min(duel.total, Math.floor(duel.found || 0)));
    return [mask.toString(36), found, duel.total].join('.');
}

export function decodeQuizDuel(code) {
    const parts = typeof code === 'string' ? code.split('.') : [];
    if (parts.length !== 3 || !/^[0-9a-z]{1,3}$/.test(parts[0]) || !/^\d{1,4}$/.test(parts[1]) || !/^\d{1,4}$/.test(parts[2])) return null;
    const mask = parseInt(parts[0], 36);
    const found = Number(parts[1]);
    const total = Number(parts[2]);
    if (!mask || mask >= (1 << QUIZ_GENERATIONS.length) || total < 1 || found > total) return null;
    const generations = QUIZ_GENERATIONS.filter((_, i) => mask & (1 << i));
    return { generations, found, total };
}
