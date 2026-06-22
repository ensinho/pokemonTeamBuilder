import fs from 'node:fs/promises';
import path from 'node:path';
import { formDisplayName } from '../src/utils/pokemonForms.js';

const POKEAPI_BASE_URL = (process.env.VITE_POKEAPI_BASE_URL || process.env.POKEAPI_BASE_URL || 'https://pokeapi.co/api/v2').replace(/\/+$/, '');
const DATA_DIR = path.join(process.cwd(), 'public', 'data');
const DETAILS_DIR = path.join(DATA_DIR, 'pokemon-details');
const NATIONAL_DEX_MAX = Number(process.env.POKEMON_CACHE_MAX_ID || 1025);

const args = process.argv.slice(2);
const hasArg = (name) => args.includes(name);
const getArgValue = (name) => {
    const direct = args.find((arg) => arg.startsWith(`${name}=`));
    if (direct) return direct.slice(name.length + 1);
    const index = args.indexOf(name);
    return index >= 0 ? args[index + 1] : '';
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchJson = async (resourcePath) => {
    const url = /^https?:\/\//i.test(resourcePath)
        ? resourcePath
        : `${POKEAPI_BASE_URL}/${String(resourcePath).replace(/^\/+/, '')}`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`PokeAPI request failed with ${response.status}: ${url}`);
    }
    return response.json();
};

const writeJson = async (filePath, data) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
};

const parseIdFromUrl = (url) => Number.parseInt(String(url).split('/').filter(Boolean).pop(), 10);

const parseDetailsArg = () => {
    if (hasArg('--all-details')) {
        return Array.from({ length: NATIONAL_DEX_MAX }, (_, index) => index + 1);
    }

    const value = getArgValue('--details');
    if (!value) return [];

    const ids = new Set();
    value.split(',').map((part) => part.trim()).filter(Boolean).forEach((part) => {
        const [startRaw, endRaw] = part.split('-');
        const start = Number.parseInt(startRaw, 10);
        const end = Number.parseInt(endRaw || startRaw, 10);
        if (!Number.isInteger(start) || !Number.isInteger(end)) return;
        for (let id = Math.min(start, end); id <= Math.max(start, end); id += 1) {
            if (id > 0 && id <= NATIONAL_DEX_MAX) ids.add(id);
        }
    });
    return Array.from(ids).sort((a, b) => a - b);
};

const generationRanges = {
    'generation-i': { start: 1, end: 151 },
    'generation-ii': { start: 152, end: 251 },
    'generation-iii': { start: 252, end: 386 },
    'generation-iv': { start: 387, end: 493 },
    'generation-v': { start: 494, end: 649 },
    'generation-vi': { start: 650, end: 721 },
    'generation-vii': { start: 722, end: 809 },
    'generation-viii': { start: 810, end: 905 },
    'generation-ix': { start: 906, end: 1025 },
};

const getGenerationName = (id) => {
    const match = Object.entries(generationRanges).find(([, range]) => id >= range.start && id <= range.end);
    return match?.[0] || 'unknown';
};

const flattenEvolutionChain = (chain) => {
    const evolutions = [];
    const walk = (node, stage = 1) => {
        const id = parseIdFromUrl(node.species.url);
        evolutions.push({
            id: String(id),
            name: node.species.name,
            stage,
            genIntroduced: getGenerationName(id).replace('generation-', 'Gen ').toUpperCase(),
            evolutionDetails: node.evolution_details?.[0] || null,
        });

        (node.evolves_to || []).forEach((child) => walk(child, stage + 1));
    };
    walk(chain);
    return evolutions;
};

const getForms = async (speciesData) => {
    const forms = [];
    const varieties = (speciesData.varieties || []).filter((variety) => !variety.is_default).slice(0, 8);
    for (const variety of varieties) {
        try {
            const formData = await fetchJson(variety.pokemon.url);
            forms.push({
                // Forms carry their OWN id + types so they can be navigated to and added
                // to a team like a base Pokémon (mirrors src/utils/pokemonForms.js).
                id: formData.id,
                name: variety.pokemon.name,
                types: formData.types.map((entry) => entry.type.name),
                sprite: formData.sprites.other?.['official-artwork']?.front_default || formData.sprites.front_default || null,
            });
        } catch (_) {
            // Optional flavor data. Keep the cache usable when one form fails.
        }
    }
    return forms;
};

const buildPokemonDetail = async (id) => {
    const [pokemonData, speciesData] = await Promise.all([
        fetchJson(`/pokemon/${id}`),
        fetchJson(`/pokemon-species/${id}`),
    ]);

    const evolutions = speciesData.evolution_chain?.url
        ? flattenEvolutionChain((await fetchJson(speciesData.evolution_chain.url)).chain)
        : [];
    const currentEvolution = evolutions.find((evolution) => Number.parseInt(evolution.id, 10) === id);
    const evolutionStage = currentEvolution?.stage || 1;
    const isFullyEvolved = !evolutions.some((evolution) => evolution.stage > evolutionStage);
    const forms = await getForms(speciesData);

    return {
        id: pokemonData.id,
        name: pokemonData.name,
        generation: getGenerationName(pokemonData.id),
        types: pokemonData.types.map((entry) => entry.type.name),
        sprite: pokemonData.sprites.other?.['official-artwork']?.front_default || pokemonData.sprites.front_default || null,
        shinySprite: pokemonData.sprites.other?.['official-artwork']?.front_shiny || pokemonData.sprites.front_shiny || null,
        animatedSprite: pokemonData.sprites.versions?.['generation-v']?.['black-white']?.animated?.front_default || pokemonData.sprites.front_default || null,
        animatedShinySprite: pokemonData.sprites.versions?.['generation-v']?.['black-white']?.animated?.front_shiny || pokemonData.sprites.front_shiny || null,
        height: pokemonData.height / 10,
        weight: pokemonData.weight / 10,
        stats: pokemonData.stats.map((entry) => ({ name: entry.stat.name, base_stat: entry.base_stat })),
        abilities: pokemonData.abilities.map((entry) => ({
            name: entry.ability.name,
            url: entry.ability.url,
            is_hidden: entry.is_hidden,
        })),
        moves: pokemonData.moves.map((entry) => ({ name: entry.move.name, url: entry.move.url })),
        evolution_chain_url: speciesData.evolution_chain?.url || null,
        evolutions,
        evolutionStage,
        isFullyEvolved,
        forms,
        isLegendary: speciesData.is_legendary,
        isMythical: speciesData.is_mythical,
        habitat: speciesData.habitat?.name || 'Unknown',
        genderRate: speciesData.gender_rate,
        baseHappiness: speciesData.base_happiness,
        captureRate: speciesData.capture_rate,
        growthRate: speciesData.growth_rate?.name || 'Unknown',
    };
};

// Compact base-stat map keyed by the short names the app uses everywhere.
// Powers the Speed Tiers table and the damage calculator without a per-row fetch.
const toBaseStats = (stats = []) => {
    const map = {};
    for (const entry of stats) {
        const key = entry.stat?.name;
        if (key) map[key] = entry.base_stat;
    }
    return {
        hp: map.hp ?? 0,
        attack: map.attack ?? 0,
        defense: map.defense ?? 0,
        'special-attack': map['special-attack'] ?? 0,
        'special-defense': map['special-defense'] ?? 0,
        speed: map.speed ?? 0,
    };
};

// Fetch just the lightweight list fields (types + base stats) for one pokémon.
// Generation is derived from the id, so no extra request is needed for it.
const fetchPokemonListEntry = async (entry) => {
    const id = parseIdFromUrl(entry.url);
    try {
        const data = await fetchJson(entry.url);
        return {
            id,
            name: entry.name,
            url: entry.url,
            types: data.types.map((t) => t.type.name),
            generation: getGenerationName(id),
            baseStats: toBaseStats(data.stats),
        };
    } catch (_) {
        // Keep the entry usable even if its fetch fails — types/baseStats default to empty.
        return { id, name: entry.name, url: entry.url, types: [], generation: getGenerationName(id), baseStats: null };
    }
};

// Enrich the whole index with types, in small concurrent batches to be gentle on PokéAPI.
const buildEnrichedIndex = async (rawResults, { concurrency = 10, delayMs = 100 } = {}) => {
    const valid = rawResults.filter((entry) => Number.isInteger(parseIdFromUrl(entry.url)));
    const out = [];
    for (let i = 0; i < valid.length; i += concurrency) {
        const slice = valid.slice(i, i + concurrency);
        const enriched = await Promise.all(slice.map(fetchPokemonListEntry));
        out.push(...enriched);
        console.log(`  index: ${out.length}/${valid.length} pokémon enriched with types`);
        if (i + concurrency < valid.length) await sleep(delayMs);
    }
    return out.sort((a, b) => a.id - b.id);
};

// "Battle forms" = alternate formes with their own types/stats worth a grid card:
// megas, primals, regional variants and gigantamax. We deliberately EXCLUDE purely
// cosmetic formes (Pikachu caps, Alcremie creams, Vivillon patterns, Rotom appliances,
// Deoxys/Wormadam formes…) which would just clutter the dex with near-duplicates.
const BATTLE_FORM_SUFFIX = /-(mega(-[xy])?|primal|alola|galar|hisui|paldea|gmax)$/;
const isBattleForm = (name) => BATTLE_FORM_SUFFIX.test(name);

// Build lightweight index entries for battle forms so they appear in the Pokédex /
// Team Builder grids. A form carries its OWN id+types but inherits its base species'
// generation (so Mega Charizard still filters under Gen I). `baseId` links it home.
const buildFormIndex = async (allPokemonResults, { concurrency = 10, delayMs = 100 } = {}) => {
    const formEntries = allPokemonResults.filter((entry) => {
        const id = parseIdFromUrl(entry.url);
        return Number.isInteger(id) && id > NATIONAL_DEX_MAX && isBattleForm(entry.name);
    });

    const out = [];
    for (let i = 0; i < formEntries.length; i += concurrency) {
        const slice = formEntries.slice(i, i + concurrency);
        const enriched = await Promise.all(slice.map(async (entry) => {
            const id = parseIdFromUrl(entry.url);
            try {
                const data = await fetchJson(entry.url);
                const baseId = data.species?.url ? parseIdFromUrl(data.species.url) : null;
                return {
                    id,
                    name: formDisplayName(entry.name, data.species?.name),
                    apiName: entry.name,
                    url: entry.url,
                    types: data.types.map((t) => t.type.name),
                    generation: getGenerationName(baseId || id),
                    baseId,
                    isForm: true,
                    baseStats: toBaseStats(data.stats),
                };
            } catch (_) {
                return null;
            }
        }));
        out.push(...enriched.filter(Boolean));
        console.log(`  forms: ${out.length}/${formEntries.length} battle forms enriched`);
        if (i + concurrency < formEntries.length) await sleep(delayMs);
    }
    return out.sort((a, b) => a.id - b.id);
};

const main = async () => {
    const generatedAt = new Date().toISOString();
    const detailIds = parseDetailsArg();
    await fs.mkdir(DATA_DIR, { recursive: true });

    const [generations, items, natures, pokemonIndex] = await Promise.all([
        fetchJson('/generation'),
        fetchJson('/item?limit=2000'),
        fetchJson('/nature'),
        // Full list incl. form ids (>10000) so we can surface battle forms in the grids.
        fetchJson('/pokemon?limit=100000'),
    ]);

    await Promise.all([
        writeJson(path.join(DATA_DIR, 'generations.json'), {
            generatedAt,
            source: `${POKEAPI_BASE_URL}/generation`,
            generations: generations.results.map((entry) => entry.name),
            results: generations.results,
        }),
        writeJson(path.join(DATA_DIR, 'items.json'), {
            generatedAt,
            source: `${POKEAPI_BASE_URL}/item?limit=2000`,
            items: items.results,
        }),
        writeJson(path.join(DATA_DIR, 'natures.json'), {
            generatedAt,
            source: `${POKEAPI_BASE_URL}/nature`,
            natures: natures.results,
        }),
    ]);

    // The base national-dex entries (ids 1..NATIONAL_DEX_MAX) — forms are handled separately.
    const baseResults = pokemonIndex.results.filter((entry) => {
        const id = parseIdFromUrl(entry.url);
        return Number.isInteger(id) && id > 0 && id <= NATIONAL_DEX_MAX;
    });

    // Enrich the index with `types` (and derived `generation`) so the Pokédex/Team Builder
    // lists can load entirely from this static file instead of querying Firestore.
    console.log('Enriching pokemon index with types (this fetches each pokémon once)...');
    const enrichedPokemons = await buildEnrichedIndex(baseResults, {
        concurrency: 10,
        delayMs: hasArg('--no-delay') ? 0 : 100,
    });

    // Battle forms (megas, primals, regionals, gigantamax) get their own grid cards.
    console.log('Enriching battle forms (megas / regionals / gigantamax)...');
    const formPokemons = await buildFormIndex(pokemonIndex.results, {
        concurrency: 10,
        delayMs: hasArg('--no-delay') ? 0 : 100,
    });

    const allIndexEntries = [...enrichedPokemons, ...formPokemons].sort((a, b) => a.id - b.id);
    await writeJson(path.join(DATA_DIR, 'pokemon-index.json'), {
        generatedAt,
        source: `${POKEAPI_BASE_URL}/pokemon?limit=100000`,
        baseCount: enrichedPokemons.length,
        formCount: formPokemons.length,
        pokemons: allIndexEntries,
    });

    const generatedDetailIds = [];
    if (detailIds.length > 0) {
        await fs.mkdir(DETAILS_DIR, { recursive: true });
        for (const id of detailIds) {
            const detail = await buildPokemonDetail(id);
            await writeJson(path.join(DETAILS_DIR, `${id}.json`), detail);
            generatedDetailIds.push(id);
            if (!hasArg('--no-delay')) await sleep(150);
        }
    }

    await writeJson(path.join(DATA_DIR, 'cache-manifest.json'), {
        version: 1,
        generatedAt,
        source: POKEAPI_BASE_URL,
        maxNationalDexId: NATIONAL_DEX_MAX,
        files: {
            generations: 'generations.json',
            items: 'items.json',
            natures: 'natures.json',
            pokemonIndex: 'pokemon-index.json',
            pokemonDetails: hasArg('--all-details') ? 'all' : generatedDetailIds,
        },
    });

    console.log(`Pokemon cache generated in ${path.relative(process.cwd(), DATA_DIR)}`);
    console.log(`Reference files: generations, items, natures, pokemon-index`);
    console.log(`Pokemon detail files: ${generatedDetailIds.length}`);
};

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});