// Seeded random number generator (LCG)
const seededRandom = (seed) => {
    let s = seed;
    return () => {
        s = (s * 9301 + 49297) % 233280;
        return s / 233280;
    };
};

// Memoized shuffled indices by pool length to avoid redundant shuffles
const shuffleCache = new Map();
const getShuffledIndices = (length, seed) => {
    const cacheKey = `${length}:${seed}`;
    if (shuffleCache.has(cacheKey)) {
        return shuffleCache.get(cacheKey);
    }
    const indices = Array.from({ length }, (_, i) => i);
    const rand = seededRandom(seed);
    for (let i = length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    shuffleCache.set(cacheKey, indices);
    return indices;
};

const parseDateString = (dateString) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
};

export const getDaysSinceLaunch = (dateString) => {
    const launch = new Date(2026, 5, 16); // June 16, 2026 (0-indexed month 5)
    launch.setHours(0, 0, 0, 0);
    
    const current = parseDateString(dateString);
    current.setHours(0, 0, 0, 0);
    
    const diffMs = current.getTime() - launch.getTime();
    return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
};

/**
 * Seeded daily index selector with historical overrides and a deterministic shuffle.
 * Guarantees that every Pokemon in the allowed pool is visited once before repeating.
 * 
 * @param {string} dateString - Format YYYY-MM-DD or YYYY-M-D
 * @param {Array} allowedPool - The pool of standard Pokemon (id <= 1025)
 * @returns {number} The index of today's Pokemon in allowedPool
 */
export const getDailyPokemonIndex = (dateString, allowedPool) => {
    if (!allowedPool || allowedPool.length === 0) return 0;

    // Explicit absolute overrides for past daily puzzles to preserve historical records
    const overrides = {
        '2026-6-16': 'bisharp',
        '2026-06-16': 'bisharp',
        '2026-6-17': 'pawniard',
        '2026-06-17': 'pawniard',
        '2026-6-18': 'golurk',
        '2026-06-18': 'golurk',
        '2026-6-19': 'golett',
        '2026-06-19': 'golett',
        '2026-6-20': 'klang',
        '2026-06-20': 'klang',
        '2026-6-21': 'klink',
        '2026-06-21': 'klink',
        '2026-6-22': 'ferrothorn',
        '2026-06-22': 'ferrothorn',
        '2026-6-23': 'ferroseed',
        '2026-06-23': 'ferroseed',
        '2026-6-24': 'galvantula',
        '2026-06-24': 'galvantula'
    };

    const targetName = overrides[dateString];
    if (targetName) {
        const idx = allowedPool.findIndex(p => p.name.toLowerCase() === targetName);
        if (idx !== -1) return idx;
    }

    const dayIndex = getDaysSinceLaunch(dateString);
    const PUZZLE_SEED = 42875; // Stable random seed
    const shuffledIndices = getShuffledIndices(allowedPool.length, PUZZLE_SEED);
    return shuffledIndices[dayIndex % allowedPool.length];
};

/**
 * Per-letter feedback for one guess, Wordle's duplicate-letter algorithm:
 * exact matches are taken first, then the remaining letters are matched against
 * what is left of the target, so a guess with two A's against a target with one
 * gets a single yellow rather than two.
 *
 * Lived inside PokePuzzleView until the forum share needed the same answer —
 * two copies of this would drift, and a drifting grid is a wrong grid.
 *
 * @returns {Array<'correct'|'present'|'absent'>} one entry per guess letter
 */
export const checkLetters = (guess = '', target = '') => {
    const result = Array(guess.length).fill('absent');
    const remaining = {};

    for (let i = 0; i < guess.length; i += 1) {
        if (guess[i] === target[i]) {
            result[i] = 'correct';
        } else if (target[i] !== undefined) {
            remaining[target[i]] = (remaining[target[i]] || 0) + 1;
        }
    }

    for (let i = 0; i < guess.length; i += 1) {
        if (result[i] === 'correct') continue;
        if (remaining[guess[i]] > 0) {
            result[i] = 'present';
            remaining[guess[i]] -= 1;
        }
    }

    return result;
};

// ── Letter hints (2026-11-11) ───────────────────────────────────────────────
// A hint gives away one letter of the answer in its place — a green tile the
// trainer did not earn. How many were taken is part of the result: it is
// saved with the game and travels with every share (the text, the image, the
// forum card, the `?r=` link), so "3/8 · 2 hints" never passes for a clean 3/8.

/** Hints a name of this length allows: one per three letters, between 1 and 3. */
export const maxLetterHints = (length = 0) => Math.max(1, Math.min(3, Math.floor(length / 3)));

/** Positions some guess already has right (a green tile). */
export const knownPositions = (guesses = [], target = '') => {
    const known = new Set();
    for (const guess of guesses) {
        for (let i = 0; i < target.length; i += 1) {
            if (guess[i] === target[i]) known.add(i);
        }
    }
    return known;
};

/** A stable shuffle of `0..length-1` per answer, so a day's hints come in the same order for everyone. */
const hintOrder = (target) => {
    let seed = 7;
    for (const char of target) seed = (seed * 31 + char.charCodeAt(0)) % 233280;
    const order = Array.from({ length: target.length }, (_, i) => i);
    const rand = seededRandom(seed || 1);
    for (let i = order.length - 1; i > 0; i -= 1) {
        const j = Math.floor(rand() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
    }
    return order;
};

/**
 * The position the next hint reveals, or -1 when none may be given: a letter
 * no guess has right and no hint has shown, never the last one unknown (a
 * hint helps find the Pokémon; it never names it), and never past the cap.
 *
 * @param {string} target   normalized answer
 * @param {string[]} guesses normalized guesses so far
 * @param {number[]} hints  positions already revealed
 */
export const nextHintPosition = (target = '', guesses = [], hints = []) => {
    if (!target || hints.length >= maxLetterHints(target.length)) return -1;
    const known = knownPositions(guesses, target);
    const shown = new Set(hints);
    const open = hintOrder(target).filter((i) => !known.has(i) && !shown.has(i));
    return open.length >= 2 ? open[0] : -1;
};

/** Hinted positions that still belong to this answer, deduplicated (a saved game is data, not trust). */
export const cleanHints = (hints, length) => (Array.isArray(hints)
    ? [...new Set(hints.filter((i) => Number.isInteger(i) && i >= 0 && i < length))].slice(0, maxLetterHints(length))
    : []);
