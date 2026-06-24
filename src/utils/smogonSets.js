// Helpers for the Smogon recommended-set data (public/data/smogon.json, loaded
// via useSmogonData). Display formatting + one-click "apply this set" into a
// team member's customization object (matches useActiveTeamStore's shape).

const STAT_SHORT = {
    hp: 'HP', attack: 'Atk', defense: 'Def',
    'special-attack': 'SpA', 'special-defense': 'SpD', speed: 'Spe',
};
const EV_ORDER = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];

const ZERO_EVS = { hp: 0, attack: 0, defense: 0, 'special-attack': 0, 'special-defense': 0, speed: 0 };
const MAX_IVS = { hp: 31, attack: 31, defense: 31, 'special-attack': 31, 'special-defense': 31, speed: 31 };

export const titleCaseSlug = (slug = '') =>
    slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

// "4 HP / 252 SpA / 252 Spe" — only the invested stats, in canonical order.
export function formatEvSpread(evs = {}) {
    const parts = EV_ORDER.filter((k) => (evs[k] || 0) > 0).map((k) => `${evs[k]} ${STAT_SHORT[k]}`);
    return parts.join(' / ');
}

// Non-default IVs (Smogon zeroes Atk on special attackers, Spe under Trick Room).
export function formatIvNotes(ivs = {}) {
    const parts = EV_ORDER.filter((k) => (ivs[k] ?? 31) !== 31).map((k) => `${ivs[k]} ${STAT_SHORT[k]}`);
    return parts.join(' / ');
}

// Each move slot is an array of alternatives; the first is the primary pick.
export const primaryMoves = (set) =>
    (set?.moves || []).map((slot) => slot[0]).filter(Boolean).slice(0, 4);

/**
 * Merge a Smogon set onto a member's existing customization, preserving fields
 * the set doesn't specify (e.g. isShiny). Returns a NEW customization object.
 * @param {object} set   - a normalized set from smogon.json
 * @param {object} current - the member's current customization
 */
export function applySmogonSet(set, current = {}) {
    return {
        ...current,
        item: set.item || '',
        ability: set.ability || current.ability,
        nature: set.nature || current.nature || 'serious',
        teraType: (set.tera && set.tera[0]) || current.teraType,
        moves: primaryMoves(set),
        evs: { ...ZERO_EVS, ...(set.evs || {}) },
        ivs: { ...MAX_IVS, ...(set.ivs || {}) },
    };
}
