/**
 * The Champion Challenge's share text — the PokéPuzzle's habit: a few lines
 * that read anywhere (a chat, a post), no spoiler of her team, and a link back.
 * The win-chance curve travels as a sparkline of block characters.
 */

const BLOCKS = '▁▂▃▄▅▆▇█';
const MAX_SPARK = 16;

/** The curve as at most 16 block characters, low to high chance. */
export const sparkline = (curve = []) => {
    if (!curve.length) return '';
    const step = curve.length > MAX_SPARK ? curve.length / MAX_SPARK : 1;
    const picks = [];
    for (let i = 0; i < Math.min(curve.length, MAX_SPARK); i += 1) picks.push(curve[Math.min(curve.length - 1, Math.round(i * step))]);
    // Always end on the final value, whatever the sampling skipped.
    picks[picks.length - 1] = curve[curve.length - 1];
    return picks.map((p) => BLOCKS[Math.max(0, Math.min(BLOCKS.length - 1, Math.round((Number(p) || 0) * (BLOCKS.length - 1))))]).join('');
};

/**
 * The share text. Every visible word comes through `t`, so it follows the
 * language; the pieces it can't know (the formatted date, the board's label)
 * are passed in.
 */
export const buildShareText = ({ t, date, difficulty, status, result = {}, streak = 0, place = null, boardLabel = '', curve = [], url }) => {
    const lines = [t('challenge.share.head', { date, difficulty })];
    lines.push(status === 'won'
        ? t('challenge.share.won', { turns: result.turns ?? 0, remaining: result.remaining ?? 0, score: result.score ?? 0 })
        : t('challenge.share.lost', { turns: result.turns ?? 0 }));
    const extras = [];
    if (streak > 0) extras.push(t('challenge.share.streak', { n: streak }));
    if (place) extras.push(t('challenge.share.place', { place, board: boardLabel }));
    if (extras.length) lines.push(extras.join(' · '));
    const spark = sparkline(curve);
    if (spark) lines.push(spark);
    if (url) lines.push(url);
    return lines.join('\n');
};

const DIFFICULTIES = new Set(['dp', 'platinum', 'rematch', 'world']);
const BOARD_KEYS = new Set(['daily', 'free']);
const SPARK_CHARS = new RegExp(`^[${BLOCKS}]{0,${MAX_SPARK}}$`);
const count = (value, max) => {
    const n = Math.round(Number(value));
    return Number.isFinite(n) ? Math.max(0, Math.min(max, n)) : 0;
};

/**
 * The forum attachment (`sharedChallenge`): what the result card draws —
 * the day, the outcome and its figures, the curve as blocks. Nothing about
 * her team or yours. Self-reported, like a shared PokéPuzzle board: the
 * ranking (server-written) is where results are authoritative.
 */
export const buildChallengeShare = ({ dayKey, difficulty, status, result = {}, streak = 0, place = null, board = null, curve = [] }) => ({
    v: 1,
    dayKey: String(dayKey || ''),
    difficulty: DIFFICULTIES.has(difficulty) ? difficulty : null,
    won: status === 'won',
    turns: count(result.turns, 999),
    remaining: count(result.remaining, 6),
    score: count(result.score, 99999),
    streak: count(streak, 9999),
    place: place ? count(place, 999) : null,
    board: BOARD_KEYS.has(board) ? board : null,
    spark: sparkline(curve),
});

/**
 * A `sharedChallenge` read back from the forum — written by whoever posted,
 * so every field is checked and clamped before it is drawn. Null if it isn't one.
 */
export const readChallengeShare = (payload) => {
    if (!payload || payload.v !== 1) return null;
    return {
        dayKey: /^\d{4}-\d{2}-\d{2}$/.test(payload.dayKey) ? payload.dayKey : null,
        difficulty: DIFFICULTIES.has(payload.difficulty) ? payload.difficulty : null,
        won: payload.won === true,
        turns: count(payload.turns, 999),
        remaining: count(payload.remaining, 6),
        score: count(payload.score, 99999),
        streak: count(payload.streak, 9999),
        place: payload.place ? count(payload.place, 999) || null : null,
        board: BOARD_KEYS.has(payload.board) ? payload.board : null,
        spark: typeof payload.spark === 'string' && SPARK_CHARS.test(payload.spark) ? payload.spark : '',
    };
};
