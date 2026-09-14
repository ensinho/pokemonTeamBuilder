// Identity of a Pokédex/Builder result list: same signature means the same
// ordered list of Pokémon, so a remembered page count and scroll offset still
// point at the same thing.
//
// The Pokédex and the Builder share one store, and the store refetches whenever
// the user leaves the Pokédex for a detail page (the mode flips) — so the
// signature has to separate the two modes as well as the filters.

const normalizeTypes = (types) => Array.from(types || []).map(String).sort().join('+');

export function buildListSignature({
    mode = 'builder',
    generation = 'all',
    game = 'all',
    types,
    typeMatchMode = 'any',
    search = '',
    favoritesOnly = false,
} = {}) {
    return [
        mode,
        generation || 'all',
        game || 'all',
        normalizeTypes(types),
        // Same types, different reading — Fire+Water as AND is not the list
        // Fire+Water as OR, so it must not inherit its page count or scroll.
        typeMatchMode === 'all' ? 'and' : 'or',
        (search || '').trim().toLowerCase(),
        favoritesOnly ? 'fav' : 'all',
    ].join('|');
}
