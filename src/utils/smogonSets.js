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

// Inverse of titleCaseSlug: any display name — Showdown ("Will-O-Wisp",
// "King's Shield") or already-slugged — to the PokéAPI slug used by the
// /moves/:name and /abilities/:name routes.
export const toApiSlug = (name = '') => String(name)
    .toLowerCase()
    .trim()
    .replace(/[.'’:,%]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');

// "4 HP / 252 SpA / 252 Spe" — only the invested stats, in canonical order.
export function formatEvSpread(evs = {}) {
    const parts = EV_ORDER.filter((k) => (evs[k] || 0) > 0).map((k) => `${evs[k]} ${STAT_SHORT[k]}`);
    return parts.join(' / ');
}

// The spread as the set's own game writes it: a Pokémon Champions set (which
// carries its original Stat Points in `sp`) reads "2 HP / 32 SpA / 32 Spe SP",
// everything else in EVs. Applying a set always uses the converted `evs`.
export function formatSetSpread(set = {}) {
    const { unit, text } = setSpreadParts(set);
    return text && unit === 'SP' ? `${text} SP` : text;
}

// The same, split for a labelled row ("SP: 2 HP / 32 SpA" / "EVs: 252 HP …"),
// so a label never says EVs over a Stat Point spread.
export function setSpreadParts(set = {}) {
    return set?.sp
        ? { unit: 'SP', text: formatEvSpread(set.sp) }
        : { unit: 'EVs', text: formatEvSpread(set?.evs) };
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
 *
 * Sets are written for the base species. `own` says what this exact Pokémon is,
 * so a form keeps a legal build: an ability it does not have is not applied
 * (Mega Heracross stays Skill Link under a "Guts" set), a move it cannot learn
 * is left out, and a Mega forme keeps the stone that makes it one.
 *
 * @param {object} set   - a normalized set from smogon.json
 * @param {object} current - the member's current customization
 * @param {{ abilities?: string[], moves?: string[], megaStone?: string|null }} [own]
 */
export function applySmogonSet(set, current = {}, own = {}) {
    const abilities = own.abilities?.length ? new Set(own.abilities) : null;
    const learnable = own.moves?.length ? new Set(own.moves) : null;
    const ability = set.ability && (!abilities || abilities.has(set.ability)) ? set.ability : current.ability;
    const moves = primaryMoves(set).filter((move) => !learnable || learnable.has(move));
    return {
        ...current,
        item: own.megaStone || set.item || '',
        ability,
        nature: set.nature || current.nature || 'serious',
        teraType: (set.tera && set.tera[0]) || current.teraType,
        moves,
        evs: { ...ZERO_EVS, ...(set.evs || {}) },
        ivs: { ...MAX_IVS, ...(set.ivs || {}) },
    };
}
