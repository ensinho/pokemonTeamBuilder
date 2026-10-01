/**
 * Species Clause: a team may hold each species once.
 *
 * "Same Pokémon" is decided by national-dex species, not by the id a member
 * happens to carry — so Charizard and Mega Charizard X, Rotom and Rotom-Wash,
 * Raichu and Alolan Raichu all collide, exactly as they do in every official
 * format and on Pokémon Showdown. Comparing raw ids would let a regional form
 * (its own `/pokemon/{id}` in PokéAPI) sit next to its base.
 *
 * Pure: the only outside knowledge needed — which form id belongs to which
 * species — comes in as `baseIdOf`, built from the Pokémon index.
 */

const toId = (value) => {
    const numeric = Number(value);
    return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
};

/** `id -> base species id` for every alternate form in the index. */
export const buildBaseIdLookup = (pokemonIndex = []) => {
    const baseById = new Map();
    for (const entry of Array.isArray(pokemonIndex) ? pokemonIndex : []) {
        const id = toId(entry?.id);
        const baseId = toId(entry?.baseId);
        if (id && baseId) baseById.set(id, baseId);
    }
    return (id) => baseById.get(toId(id)) ?? null;
};

/**
 * The species a team member counts as. A member stamped with `speciesId` (every
 * member built since the clause was enforced) answers for itself; older saved
 * and shared members only carry `id`, so forms fall back to the index lookup.
 */
export const speciesIdOf = (member, baseIdOf) =>
    toId(member?.speciesId)
    ?? toId(member?.baseId)
    ?? toId(baseIdOf?.(member?.id))
    ?? toId(member?.id);

/**
 * Every species that appears more than once, in team order.
 * @returns {Array<{speciesId: number, indexes: number[], names: string[]}>}
 */
export const findDuplicateSpecies = (members = [], baseIdOf) => {
    const groups = new Map();
    (Array.isArray(members) ? members : []).forEach((member, index) => {
        const speciesId = speciesIdOf(member, baseIdOf);
        // A slot with no usable id cannot be compared to anything.
        if (!speciesId) return;
        if (!groups.has(speciesId)) groups.set(speciesId, { speciesId, indexes: [], names: [] });
        const group = groups.get(speciesId);
        group.indexes.push(index);
        group.names.push(member?.name || `#${speciesId}`);
    });
    return [...groups.values()].filter((group) => group.indexes.length > 1);
};

export const hasDuplicateSpecies = (members = [], baseIdOf) =>
    findDuplicateSpecies(members, baseIdOf).length > 0;

/**
 * Keep the first member of each species, in order, and report what was dropped —
 * an import should say which Pokémon it left out, not shrink a team in silence.
 */
export const dedupeBySpecies = (members = [], baseIdOf) => {
    const seen = new Set();
    const unique = [];
    const dropped = [];
    for (const member of Array.isArray(members) ? members : []) {
        const speciesId = speciesIdOf(member, baseIdOf);
        if (speciesId && seen.has(speciesId)) {
            dropped.push(member);
            continue;
        }
        if (speciesId) seen.add(speciesId);
        unique.push(member);
    }
    return { unique, dropped };
};

/** Whether `candidate` would repeat a species already on `members`. */
export const wouldDuplicateSpecies = (members = [], candidate, baseIdOf) => {
    const speciesId = speciesIdOf(candidate, baseIdOf);
    if (!speciesId) return false;
    return (Array.isArray(members) ? members : []).some((member) => speciesIdOf(member, baseIdOf) === speciesId);
};

/**
 * Forum messages with the Species Clause applied to what they carry.
 *
 * Posting a repeated-Pokémon team is refused at the source, but posts made
 * before the rule are still in the collection. Their team attachment is taken
 * off rather than shown; a post that was nothing but that team goes with it,
 * since an empty bubble would be all that is left.
 */
export const withoutDuplicateSharedTeams = (messages = [], baseIdOf) =>
    (Array.isArray(messages) ? messages : []).flatMap((message) => {
        if (!message?.sharedTeam || !hasDuplicateSpecies(message.sharedTeam.pokemons, baseIdOf)) return [message];
        const hasOtherContent = Boolean((message.text || '').trim() || message.battleInvite || message.sharedPuzzle);
        return hasOtherContent ? [{ ...message, sharedTeam: null }] : [];
    });
