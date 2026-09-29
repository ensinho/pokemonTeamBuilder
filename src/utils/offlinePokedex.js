// Decoders for the offline Pokédex pack (public/data/pokedex/, built by
// scripts/build-offline-pokedex.mjs). Each rebuilds the PokéAPI response shape a
// caller already reads — /pokemon, /pokemon-species, /encounters,
// /evolution-chain, /move, /machine — trimmed to the fields something in src/
// uses. Keeping the shape is what lets the detail hook, the forms builder, the
// quizzes and PokéRoom work offline without knowing the pack exists.

export const SPRITE_BASE = 'https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/';

const STAT_ORDER = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];

// Sprite slot key → path inside a /pokemon `sprites` object. Shared with the
// build script, which stores each slot as a path relative to SPRITE_BASE.
export const SPRITE_SLOTS = {
    fd: ['front_default'],
    fs: ['front_shiny'],
    ad: ['other', 'official-artwork', 'front_default'],
    as: ['other', 'official-artwork', 'front_shiny'],
    g1: ['versions', 'generation-i', 'red-blue', 'front_default'],
    g2d: ['versions', 'generation-ii', 'crystal', 'front_default'],
    g2s: ['versions', 'generation-ii', 'crystal', 'front_shiny'],
    g2gd: ['versions', 'generation-ii', 'gold', 'front_default'],
    g2gs: ['versions', 'generation-ii', 'gold', 'front_shiny'],
    g3d: ['versions', 'generation-iii', 'emerald', 'front_default'],
    g3s: ['versions', 'generation-iii', 'emerald', 'front_shiny'],
    g3rd: ['versions', 'generation-iii', 'ruby-sapphire', 'front_default'],
    g3rs: ['versions', 'generation-iii', 'ruby-sapphire', 'front_shiny'],
    g4d: ['versions', 'generation-iv', 'platinum', 'front_default'],
    g4s: ['versions', 'generation-iv', 'platinum', 'front_shiny'],
    g4dd: ['versions', 'generation-iv', 'diamond-pearl', 'front_default'],
    g4ds: ['versions', 'generation-iv', 'diamond-pearl', 'front_shiny'],
    g5d: ['versions', 'generation-v', 'black-white', 'front_default'],
    g5s: ['versions', 'generation-v', 'black-white', 'front_shiny'],
    g5ad: ['versions', 'generation-v', 'black-white', 'animated', 'front_default'],
    g5as: ['versions', 'generation-v', 'black-white', 'animated', 'front_shiny'],
    g6d: ['versions', 'generation-vi', 'x-y', 'front_default'],
    g6s: ['versions', 'generation-vi', 'x-y', 'front_shiny'],
    g6od: ['versions', 'generation-vi', 'omega-ruby-alpha-sapphire', 'front_default'],
    g6os: ['versions', 'generation-vi', 'omega-ruby-alpha-sapphire', 'front_shiny'],
    g7d: ['versions', 'generation-vii', 'ultra-sun-ultra-moon', 'front_default'],
    g7s: ['versions', 'generation-vii', 'ultra-sun-ultra-moon', 'front_shiny'],
    g7i: ['versions', 'generation-vii', 'icons', 'front_default'],
    g8d: ['versions', 'generation-viii', 'brilliant-diamond-shining-pearl', 'front_default'],
    g8i: ['versions', 'generation-viii', 'icons', 'front_default'],
    g9d: ['versions', 'generation-ix', 'scarlet-violet', 'front_default'],
};

const named = (base, kind, name, id = name) => ({ name, url: `${String(base).replace(/\/+$/, '')}/${kind}/${id}/` });

// Every slot exists (null when absent) so chained reads like
// `versions['generation-v']['black-white'].animated.front_default` never throw.
const buildSprites = (spr = {}) => {
    const sprites = {};
    for (const [key, slot] of Object.entries(SPRITE_SLOTS)) {
        let node = sprites;
        slot.slice(0, -1).forEach((part) => {
            node[part] = node[part] || {};
            node = node[part];
        });
        node[slot[slot.length - 1]] = spr[key] ? `${SPRITE_BASE}${spr[key]}` : null;
    }
    return sprites;
};

/** Which pack file holds a Pokémon: requests carry PokéAPI ids (from URLs) or index ids (from routes). */
export function pokedexFileId(shared, { apiId = null, indexId = null } = {}) {
    if (Number.isInteger(indexId)) return indexId;
    if (!Number.isInteger(apiId)) return null;
    return shared?.apiIdToIndexId?.[apiId] ?? apiId;
}

/** A /pokemon record. */
export function decodePokedexPokemon(file, shared, pokeApiBase) {
    const p = file?.p;
    if (!p || !shared) return null;
    const vg = shared.versionGroups || [];
    const methods = shared.learnMethods || [];
    return {
        id: p.id,
        name: p.n,
        height: p.h,
        weight: p.w,
        types: (p.t || []).map((name, i) => ({ slot: i + 1, type: named(pokeApiBase, 'type', name) })),
        stats: STAT_ORDER.map((name, i) => ({
            base_stat: p.s?.[i]?.[0] ?? 0,
            effort: p.s?.[i]?.[1] ?? 0,
            stat: named(pokeApiBase, 'stat', name),
        })),
        abilities: (p.a || []).map(([index, hidden], i) => ({
            ability: named(pokeApiBase, 'ability', shared.abilities?.[index]),
            is_hidden: Boolean(hidden),
            slot: i + 1,
        })).filter((a) => a.ability.name),
        species: named(pokeApiBase, 'pokemon-species', p.sp?.[0], p.sp?.[1]),
        moves: (p.m || []).map(([index, flat = []]) => {
            const details = [];
            for (let i = 0; i + 2 < flat.length; i += 3) {
                details.push({
                    version_group: named(pokeApiBase, 'version-group', vg[flat[i]]),
                    move_learn_method: named(pokeApiBase, 'move-learn-method', methods[flat[i + 1]]),
                    level_learned_at: flat[i + 2],
                });
            }
            return { move: named(pokeApiBase, 'move', shared.moves?.[index]), version_group_details: details };
        }).filter((m) => m.move.name),
        sprites: buildSprites(p.spr),
    };
}

/** A /pokemon-species record, or null for a file that doesn't carry one (forms). */
export function decodePokedexSpecies(file, pokeApiBase) {
    const s = file?.s;
    if (!s) return null;
    return {
        id: s.id,
        name: s.n,
        genera: s.g ? [{ genus: s.g, language: { name: 'en' } }] : [],
        flavor_text_entries: (s.f || []).map(([language, text, version]) => ({
            flavor_text: text,
            language: { name: language },
            version: { name: version },
        })),
        gender_rate: s.gr,
        egg_groups: (s.eg || []).map((name) => named(pokeApiBase, 'egg-group', name)),
        base_happiness: s.bh,
        growth_rate: s.gw ? named(pokeApiBase, 'growth-rate', s.gw) : null,
        hatch_counter: s.hc,
        capture_rate: s.cr,
        evolution_chain: s.ec ? { url: `${String(pokeApiBase).replace(/\/+$/, '')}/evolution-chain/${s.ec}/` } : null,
        evolves_from_species: s.ef ? named(pokeApiBase, 'pokemon-species', s.ef[0], s.ef[1]) : null,
        varieties: (s.v || []).map(([name, id, isDefault]) => ({
            is_default: Boolean(isDefault),
            pokemon: named(pokeApiBase, 'pokemon', name, id),
        })),
        is_baby: Boolean(s.b),
        is_legendary: Boolean(s.l),
        is_mythical: Boolean(s.my),
        generation: s.gen ? { name: s.gen } : null,
        habitat: s.hab ? { name: s.hab } : null,
        color: s.col ? { name: s.col } : null,
        shape: s.sh ? { name: s.sh } : null,
    };
}

/** A /pokemon/{id}/encounters response. */
export function decodePokedexEncounters(file, shared) {
    if (!file || !shared) return null;
    return (file.e || []).map(([area, versionDetails]) => ({
        location_area: { name: shared.areas?.[area] },
        version_details: versionDetails.map(([version, details]) => ({
            version: { name: shared.versions?.[version] },
            max_chance: Math.max(0, ...details.map((d) => d[1] || 0)),
            encounter_details: details.map(([method, chance, minLevel, maxLevel]) => ({
                method: { name: shared.encounterMethods?.[method] },
                chance,
                min_level: minLevel,
                max_level: maxLevel,
                condition_values: [],
            })),
        })),
    }));
}

/** An /evolution-chain/{id} response. */
export function decodePokedexChain(shared, chainId, pokeApiBase) {
    const root = shared?.chains?.[chainId];
    if (!root) return null;
    const toNode = ([name, id, children]) => ({
        species: named(pokeApiBase, 'pokemon-species', name, id),
        evolution_details: [],
        evolves_to: (children || []).map(toNode),
    });
    return { id: Number(chainId), chain: toNode(root) };
}

/** getMoveDetails' shape, with PokéAPI-style `machines` so TM lookups still work. */
export function decodePokedexMove(shared, moveName, pokeApiBase) {
    const index = (shared?.moves || []).indexOf(moveName);
    const row = index >= 0 ? shared.moveData?.[index] : null;
    if (!row) return null;
    const [type, power, accuracy, pp, damageClass, machinePairs = []] = row;
    const machines = [];
    for (let i = 0; i + 1 < machinePairs.length; i += 2) {
        machines.push({
            machine: { url: `${String(pokeApiBase).replace(/\/+$/, '')}/machine/${machinePairs[i + 1]}/` },
            version_group: { name: shared.versionGroups?.[machinePairs[i]] },
        });
    }
    return { name: moveName, type, power, accuracy, pp, damage_class: damageClass, machines, learnedBy: [] };
}

/** A /machine/{id} response — only `item.name` is read (the TM label). */
export function decodePokedexMachine(shared, machineId) {
    const item = shared?.machines?.[machineId];
    return item ? { id: Number(machineId), item: { name: item } } : null;
}

/** The English short effect for an ability, or null. */
export function decodePokedexAbilityEffect(shared, abilityName) {
    const index = (shared?.abilities || []).indexOf(abilityName);
    return index >= 0 ? shared.abilityEffects?.[index] || null : null;
}

/**
 * The downloader's work list for a pack manifest: every data file (via
 * `dataUrl`, so it matches the URL the data service reads) then every sprite.
 */
export function planPokedexDownload(manifest, dataUrl) {
    const spriteBase = manifest?.spriteBase || SPRITE_BASE;
    return [
        ...(manifest?.files || []).map((name) => ({ kind: 'data', url: dataUrl(name) })),
        ...(manifest?.sprites || []).map((spritePath) => ({ kind: 'sprite', url: `${spriteBase}${spritePath}` })),
    ];
}
