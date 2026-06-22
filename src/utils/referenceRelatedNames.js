// Builds the `getRelatedNames` resolver the reference list views (Moves /
// Abilities) hand to useReferenceList. When the search term exactly names a
// Pokémon, it resolves that Pokémon's record and returns the names of its
// moves or abilities — so searching "pikachu" surfaces "thunderbolt" /
// "static". Returns null for anything that isn't a Pokémon, leaving the plain
// name filter untouched.

const nameOf = (entry) => (typeof entry === 'string' ? entry : entry?.name);

/**
 * @param {Array<{id:number,name:string,apiName?:string,isForm?:boolean}>} pokemonIndex
 * @param {(id:number)=>Promise<object|null>} resolvePokemonDetail
 * @param {'moves'|'abilities'} field
 * @returns {(normalized:string)=>Promise<string[]|null>}
 */
export function makePokemonRelatedNamesResolver(pokemonIndex, resolvePokemonDetail, field) {
    return async (normalized) => {
        if (!normalized || !Array.isArray(pokemonIndex) || pokemonIndex.length === 0) return null;
        const match = pokemonIndex.find(
            (p) => p.name === normalized || p.apiName === normalized,
        );
        if (!match) return null;

        const detail = await resolvePokemonDetail(match.id);
        const list = detail?.[field];
        if (!Array.isArray(list)) return null;
        return list.map(nameOf).filter(Boolean);
    };
}
