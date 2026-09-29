import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { SPRITE_BASE, SPRITE_SLOTS } from '../src/utils/offlinePokedex.js';

// Builds public/data/pokedex/ — the whole Pokédex, compact enough to download to
// every device so the detail page works offline for Pokémon never opened online:
//
//   pokedex/{indexId}.json  one per pokemon-index entry: the /pokemon record
//                           (stats + EV yield, abilities, learnsets per version
//                           group, sprite paths), its encounters, and — for the
//                           species' default Pokémon — the /pokemon-species record.
//   pokedex/shared.json     name tables, every learnable move (type, power, PP,
//                           TM per version group), machine → item, ability short
//                           effects, and every evolution chain.
//   pokedex/manifest.json   what the background downloader fetches: the files
//                           above plus the sprites the Pokédex shows by default
//                           (pixel normal/shiny for everyone, Gen 5 animated for
//                           ≤649). Precached, so each deploy knows its own pack.
//
// src/utils/offlinePokedex.js turns these back into PokéAPI-shaped objects; the
// data service falls back to them when the network can't answer. Only fields
// something in src/ reads are kept — a raw /pokemon record is 35–670 KB.
//
// Pokémon are fetched by `apiName`: the newer Megas' index ids (10278–10326) are
// other forms in PokéAPI (docs/wounds.md, 2026-09-08).
//
// Run: node scripts/build-offline-pokedex.mjs   (≈7k requests, a few minutes)

const POKEAPI_BASE_URL = (process.env.VITE_POKEAPI_BASE_URL || process.env.POKEAPI_BASE_URL || 'https://pokeapi.co/api/v2').replace(/\/+$/, '');
const DATA_DIR = path.join(process.cwd(), 'public', 'data');
const OUT_DIR = path.join(DATA_DIR, 'pokedex');
const SPRITE_PREFIX = /^https:\/\/raw\.githubusercontent\.com\/PokeAPI\/sprites\/master\/sprites\/pokemon\//;
const STAT_ORDER = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];
const GEN5_ANIMATED_MAX_ID = 649;
const CONCURRENCY = 12;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchJson = async (resource, attempts = 4) => {
    const url = /^https?:\/\//.test(resource) ? resource : `${POKEAPI_BASE_URL}/${resource.replace(/^\/+/, '')}`;
    for (let attempt = 1; ; attempt += 1) {
        try {
            const response = await fetch(url);
            if (response.status === 404) return null;
            if (!response.ok) throw new Error(`${response.status} ${url}`);
            return await response.json();
        } catch (error) {
            if (attempt >= attempts) throw error;
            await sleep(600 * attempt);
        }
    }
};

// Run `worker` over `items`, CONCURRENCY at a time, logging progress.
const mapPool = async (label, items, worker) => {
    const results = new Array(items.length);
    let next = 0;
    let done = 0;
    const run = async () => {
        while (next < items.length) {
            const index = next;
            next += 1;
            results[index] = await worker(items[index]);
            done += 1;
            if (done % 200 === 0 || done === items.length) console.log(`  ${label}: ${done}/${items.length}`);
        }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, run));
    return results;
};

const idFromUrl = (url) => Number.parseInt(String(url).split('/').filter(Boolean).pop(), 10);

const table = () => {
    const names = [];
    const lookup = new Map();
    const intern = (name) => {
        let index = lookup.get(name);
        if (index === undefined) {
            index = names.length;
            names.push(name);
            lookup.set(name, index);
        }
        return index;
    };
    return { names, intern };
};

const pick = (object, keys) => keys.reduce((value, key) => value?.[key], object);

const firstFlavor = (entries, language) => {
    const entry = (entries || []).find((e) => e.language?.name === language);
    return entry ? [entry.flavor_text, entry.version?.name || ''] : null;
};

// Evolution tree → [speciesName, speciesId, [children…]].
const compactChain = (node) => [
    node.species.name,
    idFromUrl(node.species.url),
    (node.evolves_to || []).map(compactChain),
];

const main = async () => {
    const index = JSON.parse(await fs.readFile(path.join(DATA_DIR, 'pokemon-index.json'), 'utf8'));
    const entries = (index.pokemons || []).filter((e) => Number.isInteger(e.id) && e.id > 0);

    const versionGroups = table();
    const learnMethods = table();
    const versions = table();
    const encounterMethods = table();
    const areas = table();
    const moves = table();
    const abilities = table();

    // 1. /pokemon + encounters for every index entry.
    const pokemonRecords = await mapPool('pokémon', entries, async (entry) => {
        const data = await fetchJson(`pokemon/${entry.apiName || entry.name}`);
        if (!data) return null;
        const encounters = await fetchJson(`pokemon/${data.id}/encounters`) || [];
        return { entry, data, encounters };
    });
    const missing = pokemonRecords.map((r, i) => (r ? null : entries[i].apiName)).filter(Boolean);
    if (missing.length > entries.length * 0.05) throw new Error(`${missing.length} Pokémon missing — keeping the existing pack.`);

    // 2. Species (one per distinct species), evolution chains, moves, machines, abilities.
    const speciesIds = [...new Set(pokemonRecords.filter(Boolean).map((r) => idFromUrl(r.data.species.url)))];
    const speciesList = await mapPool('species', speciesIds, (id) => fetchJson(`pokemon-species/${id}`));
    const speciesById = new Map(speciesList.filter(Boolean).map((s) => [s.id, s]));

    const chainIds = [...new Set([...speciesById.values()].map((s) => idFromUrl(s.evolution_chain?.url)).filter(Number.isInteger))];
    const chainList = await mapPool('evolution chains', chainIds, (id) => fetchJson(`evolution-chain/${id}`));

    const moveNames = [...new Set(pokemonRecords.filter(Boolean).flatMap((r) => r.data.moves.map((m) => m.move.name)))];
    const moveList = await mapPool('moves', moveNames, (name) => fetchJson(`move/${name}`));

    const machineIds = [...new Set(moveList.filter(Boolean).flatMap((m) => (m.machines || []).map((x) => idFromUrl(x.machine.url))))];
    const machineList = await mapPool('machines', machineIds, (id) => fetchJson(`machine/${id}`));

    const abilityNames = [...new Set(pokemonRecords.filter(Boolean).flatMap((r) => r.data.abilities.map((a) => a.ability.name)))];
    const abilityList = await mapPool('abilities', abilityNames, (name) => fetchJson(`ability/${name}`));

    // 3. Shared tables.
    const machines = {};
    machineList.forEach((m) => { if (m?.item?.name) machines[m.id] = m.item.name; });

    const moveData = [];
    moveNames.forEach((name, i) => {
        const m = moveList[i];
        const idx = moves.intern(name);
        moveData[idx] = m ? [
            m.type?.name || null,
            m.power ?? null,
            m.accuracy ?? null,
            m.pp ?? null,
            m.damage_class?.name || null,
            (m.machines || []).flatMap((x) => [versionGroups.intern(x.version_group.name), idFromUrl(x.machine.url)]),
        ] : null;
    });

    const abilityEffects = [];
    abilityNames.forEach((name, i) => {
        const a = abilityList[i];
        const effect = (a?.effect_entries || []).find((e) => e.language?.name === 'en');
        abilityEffects[abilities.intern(name)] = effect?.short_effect || effect?.effect || '';
    });

    const chains = {};
    chainList.forEach((c) => { if (c?.chain) chains[c.id] = compactChain(c.chain); });

    // index id ↔ PokéAPI id, where they differ (the locally-numbered Megas).
    const apiIdToIndexId = {};

    // 4. Per-Pokémon files.
    await fs.rm(OUT_DIR, { recursive: true, force: true });
    await fs.mkdir(OUT_DIR, { recursive: true });
    const spritePaths = new Set();
    const addSprite = (url) => {
        if (url && SPRITE_PREFIX.test(url)) spritePaths.add(url.replace(SPRITE_PREFIX, ''));
    };

    for (const record of pokemonRecords) {
        if (!record) continue;
        const { entry, data, encounters } = record;
        if (data.id !== entry.id) apiIdToIndexId[data.id] = entry.id;
        const stats = Object.fromEntries(data.stats.map((s) => [s.stat.name, [s.base_stat, s.effort]]));

        const spr = {};
        for (const [key, slot] of Object.entries(SPRITE_SLOTS)) {
            const url = pick(data.sprites, slot);
            if (url && SPRITE_PREFIX.test(url)) spr[key] = url.replace(SPRITE_PREFIX, '');
        }

        // What the Pokédex shows by default: the pixel sprite the grid derives
        // from the index id, the one PokéAPI names for this form, and the Gen 5
        // animated hero where one exists.
        spritePaths.add(`${entry.id}.png`);
        spritePaths.add(`shiny/${entry.id}.png`);
        addSprite(data.sprites.front_default);
        addSprite(data.sprites.front_shiny);
        if (idFromUrl(data.species.url) <= GEN5_ANIMATED_MAX_ID) {
            addSprite(pick(data.sprites, SPRITE_SLOTS.g5ad));
            addSprite(pick(data.sprites, SPRITE_SLOTS.g5as));
        }

        const file = {
            p: {
                id: data.id,
                n: data.name,
                h: data.height,
                w: data.weight,
                t: data.types.map((t) => t.type.name),
                s: STAT_ORDER.map((key) => stats[key] || [0, 0]),
                a: data.abilities.map((a) => [abilities.intern(a.ability.name), a.is_hidden ? 1 : 0]),
                sp: [data.species.name, idFromUrl(data.species.url)],
                m: data.moves.map((m) => [
                    moves.intern(m.move.name),
                    m.version_group_details.flatMap((d) => [
                        versionGroups.intern(d.version_group.name),
                        learnMethods.intern(d.move_learn_method.name),
                        d.level_learned_at,
                    ]),
                ]),
                spr,
            },
            e: encounters.map((enc) => [
                areas.intern(enc.location_area.name),
                enc.version_details.map((vd) => [
                    versions.intern(vd.version.name),
                    vd.encounter_details.map((d) => [encounterMethods.intern(d.method.name), d.chance, d.min_level, d.max_level]),
                ]),
            ]),
        };

        // The species record rides with its default Pokémon (index id == species id).
        const species = speciesById.get(entry.id);
        if (species && idFromUrl(data.species.url) === entry.id) {
            file.s = {
                id: species.id,
                n: species.name,
                g: (species.genera || []).find((x) => x.language?.name === 'en')?.genus || '',
                f: ['en', 'pt'].map((lang) => firstFlavor(species.flavor_text_entries, lang)).filter(Boolean)
                    .map((pair, i) => [i === 0 ? 'en' : 'pt', ...pair]),
                gr: species.gender_rate,
                eg: (species.egg_groups || []).map((x) => x.name),
                bh: species.base_happiness,
                gw: species.growth_rate?.name || null,
                hc: species.hatch_counter,
                cr: species.capture_rate,
                ec: idFromUrl(species.evolution_chain?.url) || null,
                ef: species.evolves_from_species ? [species.evolves_from_species.name, idFromUrl(species.evolves_from_species.url)] : null,
                v: (species.varieties || []).map((x) => [x.pokemon.name, idFromUrl(x.pokemon.url), x.is_default ? 1 : 0]),
                b: species.is_baby ? 1 : 0,
                l: species.is_legendary ? 1 : 0,
                my: species.is_mythical ? 1 : 0,
                gen: species.generation?.name || null,
                hab: species.habitat?.name || null,
                col: species.color?.name || null,
                sh: species.shape?.name || null,
            };
        }

        await fs.writeFile(path.join(OUT_DIR, `${entry.id}.json`), JSON.stringify(file), 'utf8');
    }

    const shared = {
        generatedAt: new Date().toISOString(),
        source: POKEAPI_BASE_URL,
        versionGroups: versionGroups.names,
        learnMethods: learnMethods.names,
        versions: versions.names,
        encounterMethods: encounterMethods.names,
        areas: areas.names,
        moves: moves.names,
        moveData,
        machines,
        abilities: abilities.names,
        abilityEffects,
        chains,
        apiIdToIndexId,
    };
    const sharedJson = JSON.stringify(shared);
    await fs.writeFile(path.join(OUT_DIR, 'shared.json'), sharedJson, 'utf8');

    const files = ['shared.json', ...pokemonRecords.filter(Boolean).map((r) => `${r.entry.id}.json`)];
    const hash = crypto.createHash('sha256');
    for (const name of files) hash.update(await fs.readFile(path.join(OUT_DIR, name)));
    const sprites = [...spritePaths].sort();
    hash.update(sprites.join('\n'));

    await fs.writeFile(path.join(OUT_DIR, 'manifest.json'), `${JSON.stringify({
        version: hash.digest('hex').slice(0, 16),
        generatedAt: shared.generatedAt,
        spriteBase: SPRITE_BASE,
        files,
        sprites,
    })}\n`, 'utf8');

    const bytes = (await Promise.all(files.map((name) => fs.stat(path.join(OUT_DIR, name))))).reduce((sum, s) => sum + s.size, 0);
    console.log(`Wrote ${files.length} files (${(bytes / 1e6).toFixed(1)} MB) and a manifest of ${sprites.length} sprites to ${path.relative(process.cwd(), OUT_DIR)}`);
    if (missing.length) console.warn(`Not on PokéAPI (skipped): ${missing.join(', ')}`);
};

main().catch((err) => {
    console.error('Offline Pokédex build failed:', err?.message || err);
    process.exitCode = 1;
});
