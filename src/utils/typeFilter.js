// How a multi-type selection reads.
//
// Picking Fire and Water used to mean "Fire OR Water" with no way to say
// otherwise, so the people looking for the handful of Pokémon that are *both*
// had to scroll ~180 results to find them. The two readings are both useful, so
// the selection carries a mode instead of assuming one.
export const TYPE_MATCH_ANY = 'any';   // OR — has at least one selected type
export const TYPE_MATCH_ALL = 'all';   // AND — has every selected type

export const isTypeMatchMode = (mode) => mode === TYPE_MATCH_ANY || mode === TYPE_MATCH_ALL;

/**
 * Does a Pokémon's type list satisfy the active type filter?
 *
 * An empty selection matches everything — "no filter", not "nothing".
 * Anything other than `TYPE_MATCH_ALL` falls back to OR, so a missing or stale
 * mode behaves the way the filter always used to.
 *
 * @param {string[]} pokemonTypes  the Pokémon's own types
 * @param {string[]|Set<string>} selectedTypes  the types the user picked
 * @param {string} mode  TYPE_MATCH_ANY | TYPE_MATCH_ALL
 */
export function matchesTypeFilter(pokemonTypes, selectedTypes, mode = TYPE_MATCH_ANY) {
    const wanted = Array.isArray(selectedTypes) ? selectedTypes : Array.from(selectedTypes || []);
    if (wanted.length === 0) return true;

    const owned = pokemonTypes || [];
    // AND on more than two types can never match — a Pokémon has at most two —
    // but that is the honest answer to what was asked, not a case to special-case.
    return mode === TYPE_MATCH_ALL
        ? wanted.every((type) => owned.includes(type))
        : wanted.some((type) => owned.includes(type));
}
