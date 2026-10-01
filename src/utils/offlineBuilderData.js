// Decoders for public/data/offline-builder.json (built by
// scripts/build-offline-builder.mjs). The file interns ability and move names
// into tables to stay small enough to precache; these turn an entry back into
// the same "fat" shapes the live sources produce, so callers can't tell which
// one answered.

const STAT_ORDER = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];

const resourceUrl = (pokeApiBase, kind, name) =>
    `${String(pokeApiBase).replace(/\/+$/, '')}/${kind}/${name}/`;

/**
 * The Team Builder's pokémon shape (see normalizePokemonApiData): id, name,
 * types, abilities[{name,url,is_hidden}], moves[{name,url}], stats[{name,base_stat}].
 * Sprites are left to the caller — they derive from the id.
 */
export function decodeOfflinePokemon(data, pokemonId, pokeApiBase) {
    const entry = data?.pokemon?.[pokemonId];
    if (!entry) return null;
    const abilities = Array.isArray(data.abilities) ? data.abilities : [];
    const moves = Array.isArray(data.moves) ? data.moves : [];

    return {
        id: Number(pokemonId),
        name: entry.n,
        types: Array.isArray(entry.t) ? entry.t : [],
        abilities: (entry.a || [])
            .map(([index, hidden]) => abilities[index] && ({
                name: abilities[index],
                url: resourceUrl(pokeApiBase, 'ability', abilities[index]),
                is_hidden: Boolean(hidden),
            }))
            .filter(Boolean),
        moves: (entry.m || [])
            .map((index) => moves[index] && ({
                name: moves[index],
                url: resourceUrl(pokeApiBase, 'move', moves[index]),
            }))
            .filter(Boolean),
        stats: STAT_ORDER.map((name, i) => ({ name, base_stat: entry.s?.[i] ?? 0 })),
    };
}

/**
 * getMoveDetails' shape. `learnedBy` and `machines` are not baked — only the
 * Moves list reads them, and it is an online page.
 */
export function decodeOfflineMove(data, moveName) {
    const moves = Array.isArray(data?.moves) ? data.moves : [];
    const index = moves.indexOf(moveName);
    const row = index >= 0 ? data.moveData?.[index] : null;
    if (!row) return null;
    const [type, power, accuracy, pp, damageClass] = row;
    return {
        name: moveName,
        type,
        power,
        accuracy,
        pp,
        damage_class: damageClass,
        machines: [],
        learnedBy: [],
    };
}
