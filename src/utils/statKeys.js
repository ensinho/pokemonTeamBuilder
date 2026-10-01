/**
 * One vocabulary for the six stats.
 *
 * The app keys spreads by PokéAPI's stat names (`special-attack`), while every
 * Showdown-derived source — tournament pastes, ladder usage — uses the short
 * forms (`spa`). A spread merged across the two ends up holding both
 * `special-attack: 0` and `spa: 252`, and whichever reader comes next sees only
 * its own half. Normalise at the boundary instead.
 */

export const STAT_KEYS = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];

export const STAT_SHOWDOWN_LABEL = {
    hp: 'HP',
    attack: 'Atk',
    defense: 'Def',
    'special-attack': 'SpA',
    'special-defense': 'SpD',
    speed: 'Spe',
};

const STAT_ALIASES = {
    hp: 'hp',
    atk: 'attack', attack: 'attack',
    def: 'defense', defense: 'defense',
    spa: 'special-attack', spatk: 'special-attack', specialattack: 'special-attack',
    spd: 'special-defense', spdef: 'special-defense', specialdefense: 'special-defense',
    spe: 'speed', speed: 'speed',
};

/** Any spelling of a stat ("SpA", "special-attack", "spatk") to the app's key, or null. */
export const toStatKey = (raw) => STAT_ALIASES[String(raw ?? '').toLowerCase().replace(/[^a-z]/g, '')] || null;

/**
 * A spread with all six app keys and integer values. Unknown keys are dropped
 * and junk values fall back to `fallback` (0 for EVs, 31 for IVs). When a stat
 * is given under two spellings, the one that is not the default wins — that is
 * the half-merged case above, where one of the two is only a placeholder.
 */
export const normalizeSpread = (spread, fallback = 0) => {
    const out = Object.fromEntries(STAT_KEYS.map((key) => [key, fallback]));
    const seen = new Set();
    for (const [rawKey, rawValue] of Object.entries(spread || {})) {
        const key = toStatKey(rawKey);
        const value = Math.floor(Number(rawValue));
        if (!key || !Number.isFinite(value) || value < 0) continue;
        if (seen.has(key) && value === fallback) continue;
        out[key] = value;
        seen.add(key);
    }
    return out;
};
