// Which IVs a set actually wants — and so whether breeding a 6×31 is worth it.
//
// Most sets want 31 everywhere. Two stats are better at 0 for some sets:
//   - Speed, under Trick Room or with Gyro Ball (slower = stronger/first);
//   - Attack, on a set with no physical move (less confusion and Foul Play damage).
// Pure, so the editor only renders what this decides.

export const IV_STATS = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];
export const MAX_IV = 31;

const SLOW_MOVES = new Set(['trick-room', 'gyro-ball']);
// Transform copies the target's stats, so the user's own Attack never matters.
const NO_ATTACK_CARE = new Set(['transform']);

const slug = (name) => String(name || '').toLowerCase().trim().replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, '');

/**
 * @param {object} input
 * @param {Array<{name:string, category?:string|null}>} input.moves the chosen moves, with category when known
 * @returns {{ ivs: Record<string,number>, reasons: string[], verdict: 'six'|'five' }}
 *   reasons: 'trickRoom' | 'gyroBall' | 'special'; verdict 'six' = breed 6×31, 'five' = 5×31 and a 0.
 */
export const recommendIvs = ({ moves = [] } = {}) => {
    const ivs = Object.fromEntries(IV_STATS.map((s) => [s, MAX_IV]));
    const reasons = [];
    const slugs = moves.map((m) => slug(m?.name));

    if (slugs.includes('trick-room')) reasons.push('trickRoom');
    else if (slugs.includes('gyro-ball')) reasons.push('gyroBall');
    if (slugs.some((s) => SLOW_MOVES.has(s))) ivs.speed = 0;

    // Only decide Attack once every chosen move's category is known.
    const known = moves.filter((m) => m?.name);
    const allKnown = known.length > 0 && known.every((m) => m.category);
    const anyPhysical = known.some((m) => m.category === 'physical');
    if (allKnown && !anyPhysical && !slugs.some((s) => NO_ATTACK_CARE.has(s))) {
        ivs.attack = 0;
        reasons.push('special');
    }

    return { ivs, reasons, verdict: reasons.length ? 'five' : 'six' };
};

export const sameIvs = (a = {}, b = {}) => IV_STATS.every((s) => clampIv(a[s]) === clampIv(b[s]));

export const clampIv = (value) => {
    const n = Number.parseInt(value, 10);
    if (!Number.isFinite(n)) return MAX_IV;
    return Math.min(MAX_IV, Math.max(0, n));
};
