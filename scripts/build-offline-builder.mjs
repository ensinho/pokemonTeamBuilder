import fs from 'node:fs/promises';
import path from 'node:path';

// Builds public/data/offline-builder.json — everything the Team Builder needs to
// add and edit a Pokémon with no network: per-Pokémon abilities, learnable moves
// and base stats for every entry in pokemon-index.json, plus type / power /
// accuracy / PP / category for every move those lists mention.
//
// The service worker precaches this file, and src/services/pokemonDataCache.js
// reads it when the device is offline or the live sources come back empty. It is
// deliberately a *fallback*: the Pokédex detail page and the Moves list still want
// PokéAPI's fuller records (flavour text, learnedBy, machines) when online.
//
// Pokémon are fetched by `apiName`, never by index id: the newer Megas carry
// locally-assigned ids (10278–10326) that belong to unrelated forms in PokéAPI
// (docs/wounds.md, 2026-09-08), so an id lookup would bake the wrong Pokémon.
//
// Shape (names are interned into tables; entries hold indexes into them):
//   { abilities: [name], moves: [name], moveData: [[type, power, accuracy, pp, category] | null],
//     pokemon: { [indexId]: { n: apiName, t: [type], s: [hp, atk, def, spa, spd, spe],
//                             a: [[abilityIndex, isHidden 0|1]], m: [moveIndex] } } }
//
// Run: node scripts/build-offline-builder.mjs   (after `npm run data:cache` changes the index)

const POKEAPI_BASE_URL = (process.env.VITE_POKEAPI_BASE_URL || process.env.POKEAPI_BASE_URL || 'https://pokeapi.co/api/v2').replace(/\/+$/, '');
const SHOWDOWN_MOVES = 'https://play.pokemonshowdown.com/data/moves.json';
const DATA_DIR = path.join(process.cwd(), 'public', 'data');
const OUT_FILE = path.join(DATA_DIR, 'offline-builder.json');
const STAT_ORDER = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];
const CONCURRENCY = 10;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchJson = async (url, attempts = 3) => {
    for (let attempt = 1; ; attempt += 1) {
        try {
            const response = await fetch(url);
            if (response.status === 404) return null;
            if (!response.ok) throw new Error(`${response.status} ${url}`);
            return await response.json();
        } catch (error) {
            if (attempt >= attempts) throw error;
            await sleep(500 * attempt);
        }
    }
};

// Moves the two sources spell differently (Showdown follows the Gen 8 rename).
const SHOWDOWN_ALIASES = { 'vice-grip': 'visegrip' };

// "U-turn" → "uturn", "will-o-wisp" → "willowisp": Showdown's id for a PokéAPI slug.
const toShowdownId = (slug) => SHOWDOWN_ALIASES[slug] || String(slug).toLowerCase().replace(/[^a-z0-9]/g, '');

const intern = (table, lookup, name) => {
    let index = lookup.get(name);
    if (index === undefined) {
        index = table.length;
        table.push(name);
        lookup.set(name, index);
    }
    return index;
};

const main = async () => {
    const index = JSON.parse(await fs.readFile(path.join(DATA_DIR, 'pokemon-index.json'), 'utf8'));
    const entries = (index.pokemons || []).filter((entry) => Number.isInteger(entry.id) && entry.id > 0);
    if (!entries.length) throw new Error('pokemon-index.json is empty — run `npm run data:cache` first.');

    const abilities = [];
    const abilityLookup = new Map();
    const moves = [];
    const moveLookup = new Map();
    const pokemon = {};
    const missing = [];

    for (let i = 0; i < entries.length; i += CONCURRENCY) {
        const batch = entries.slice(i, i + CONCURRENCY);
        const results = await Promise.all(batch.map((entry) =>
            fetchJson(`${POKEAPI_BASE_URL}/pokemon/${entry.apiName || entry.name}`)));

        batch.forEach((entry, offset) => {
            const data = results[offset];
            if (!data) {
                missing.push(`${entry.id} ${entry.apiName || entry.name}`);
                return;
            }
            const stats = Object.fromEntries((data.stats || []).map((s) => [s.stat?.name, s.base_stat]));
            pokemon[entry.id] = {
                n: data.name,
                t: (data.types || []).map((t) => t.type?.name).filter(Boolean),
                s: STAT_ORDER.map((key) => stats[key] ?? 0),
                a: (data.abilities || [])
                    .filter((a) => a.ability?.name)
                    .map((a) => [intern(abilities, abilityLookup, a.ability.name), a.is_hidden ? 1 : 0]),
                m: (data.moves || [])
                    .filter((m) => m.move?.name)
                    .map((m) => intern(moves, moveLookup, m.move.name)),
            };
        });

        console.log(`  pokémon: ${Math.min(i + CONCURRENCY, entries.length)}/${entries.length}`);
        await sleep(100);
    }

    // Guard against a half-baked file replacing a good one (PokéAPI outage mid-run).
    if (missing.length > entries.length * 0.05) {
        throw new Error(`${missing.length} of ${entries.length} Pokémon could not be fetched — keeping the existing file.`);
    }

    const showdown = await fetchJson(SHOWDOWN_MOVES);
    const moveData = moves.map((name) => {
        const move = showdown?.[toShowdownId(name)];
        if (!move?.type) return null;
        return [
            move.type.toLowerCase(),
            move.basePower || null,
            move.accuracy === true ? null : move.accuracy ?? null,
            move.pp ?? null,
            String(move.category || '').toLowerCase() || null,
        ];
    });

    await fs.writeFile(OUT_FILE, `${JSON.stringify({
        generatedAt: new Date().toISOString(),
        source: { pokemon: POKEAPI_BASE_URL, moves: SHOWDOWN_MOVES },
        abilities,
        moves,
        moveData,
        pokemon,
    })}\n`, 'utf8');

    const unmatchedMoves = moves.filter((_, i) => !moveData[i]);
    console.log(`Wrote ${Object.keys(pokemon).length} Pokémon, ${abilities.length} abilities, ${moves.length} moves to ${path.relative(process.cwd(), OUT_FILE)}`);
    if (missing.length) console.warn(`Not on PokéAPI (skipped): ${missing.join(', ')}`);
    if (unmatchedMoves.length) console.warn(`Moves without Showdown data (${unmatchedMoves.length}): ${unmatchedMoves.join(', ')}`);
};

main().catch((err) => {
    console.error('Offline builder data failed:', err?.message || err);
    process.exitCode = 1;
});
