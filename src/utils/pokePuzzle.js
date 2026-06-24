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
