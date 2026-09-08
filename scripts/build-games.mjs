import fs from 'node:fs/promises';
import path from 'node:path';

// Builds public/data/games.json: for each selectable game, the full set of
// national-dex species ids in that game's Pokédex PLUS the regional/battle form
// ids native to it (Alolan/Galarian/Hisuian/Paldean/Mega/Gmax). Reuses the
// already-baked pokemon-index.json for form data, so it only fetches the ~20
// regional Pokédex lists (fast). Run: node scripts/build-games.mjs

const POKEAPI = (process.env.VITE_POKEAPI_BASE_URL || 'https://pokeapi.co/api/v2').replace(/\/+$/, '');
const DATA_DIR = path.join(process.cwd(), 'public', 'data');
const NATIONAL_DEX_MAX = Number(process.env.POKEMON_CACHE_MAX_ID || 1025);

// Each game → the regional Pokédex(es) that define its species, and the form
// suffix groups that are "native" to it. Unknown pokédex names are skipped.
const GAMES = [
    { key: 'red-blue-yellow', label: 'Red / Blue / Yellow', generation: 'generation-i', pokedexes: ['kanto'], forms: [] },
    { key: 'gold-silver-crystal', label: 'Gold / Silver / Crystal', generation: 'generation-ii', pokedexes: ['original-johto'], forms: [] },
    { key: 'ruby-sapphire-emerald', label: 'Ruby / Sapphire / Emerald', generation: 'generation-iii', pokedexes: ['hoenn'], forms: [] },
    // Same Kanto 151 as Red/Blue/Yellow (PokéAPI lists `firered-leafgreen` among
    // that Pokédex's version groups), but gen III — so the abilities, natures and
    // split special stats a planner cares about come from the right generation.
    { key: 'firered-leafgreen', label: 'FireRed / LeafGreen', generation: 'generation-iii', pokedexes: ['kanto'], forms: [] },
    { key: 'diamond-pearl-platinum', label: 'Diamond / Pearl / Platinum', generation: 'generation-iv', pokedexes: ['extended-sinnoh', 'original-sinnoh'], forms: [] },
    { key: 'heartgold-soulsilver', label: 'HeartGold / SoulSilver', generation: 'generation-iv', pokedexes: ['updated-johto'], forms: [] },
    { key: 'black-white', label: 'Black / White', generation: 'generation-v', pokedexes: ['original-unova'], forms: [] },
    { key: 'black2-white2', label: 'Black 2 / White 2', generation: 'generation-v', pokedexes: ['updated-unova'], forms: [] },
    { key: 'x-y', label: 'X / Y', generation: 'generation-vi', pokedexes: ['kalos-central', 'kalos-coastal', 'kalos-mountain'], forms: ['mega'] },
    { key: 'oras', label: 'Omega Ruby / Alpha Sapphire', generation: 'generation-vi', pokedexes: ['updated-hoenn'], forms: ['mega', 'primal'] },
    { key: 'sun-moon', label: 'Sun / Moon', generation: 'generation-vii', pokedexes: ['original-alola'], forms: ['alola', 'mega', 'primal'] },
    { key: 'ultra-sun-ultra-moon', label: 'Ultra Sun / Ultra Moon', generation: 'generation-vii', pokedexes: ['updated-alola'], forms: ['alola', 'mega', 'primal'] },
    { key: 'lets-go', label: "Let's Go Pikachu / Eevee", generation: 'generation-vii', pokedexes: ['letsgo-kanto'], forms: ['alola'] },
    { key: 'sword-shield', label: 'Sword / Shield', generation: 'generation-viii', pokedexes: ['galar', 'isle-of-armor', 'crown-tundra'], forms: ['galar', 'gmax'] },
    { key: 'bdsp', label: 'Brilliant Diamond / Shining Pearl', generation: 'generation-viii', pokedexes: ['extended-sinnoh', 'original-sinnoh'], forms: [] },
    { key: 'legends-arceus', label: 'Legends: Arceus', generation: 'generation-viii', pokedexes: ['hisui'], forms: ['hisui'] },
    // Z-A ships two dexes: Lumiose (232) and Hyperspace (132), the Mega Dimension
    // DLC's — same shape as Sword/Shield's expansions. Closed roster: what those
    // two dexes list is what the game can hold, and its generation-ix National
    // section would otherwise offer ~1000 Pokémon that never appear in Lumiose.
    // NOTE: only the 48 PokéAPI Megas are attached, per `forms: ['mega']`. Z-A's
    // own new Megas live in pokemon-index.json at locally-assigned ids (10278+)
    // that `isOfficialForm` in utils/gameDex.js filters out of every real game —
    // see docs/wounds.md 2026-09-08 before changing that.
    { key: 'legends-za', label: 'Legends: Z-A', generation: 'generation-ix', pokedexes: ['lumiose-city', 'hyperspace'], forms: ['mega'], closedRoster: true },
    { key: 'scarlet-violet', label: 'Scarlet / Violet', generation: 'generation-ix', pokedexes: ['paldea', 'kitakami', 'blueberry'], forms: ['paldea'] },
    // Champions is battle-only: its 208-species Pokédex IS the whole legal roster,
    // with nothing transferable in from earlier generations — hence `closedRoster`.
    // Forms come from what the Reg M-A/M-B usage data actually shows being played:
    // regional variants (Alolan Ninetales, Hisuian Arcanine, Galarian Slowking,
    // Paldean Tauros…) and Mega Evolution (Venusaurite is the format's top item).
    // No Primal (Kyogre/Groudon aren't in the dex) and no Gmax (no Dynamax).
    { key: 'champions', label: 'Pokémon Champions', generation: 'generation-ix', pokedexes: ['champions'], forms: ['mega', 'alola', 'galar', 'hisui', 'paldea'], closedRoster: true },
];

const FORM_SUFFIX_RE = {
    mega: /-mega(-[xy])?$/,
    primal: /-primal$/,
    alola: /-alola$/,
    galar: /-galar$/,
    hisui: /-hisui$/,
    paldea: /-paldea$/,
    gmax: /-gmax$/,
};

const parseId = (url) => Number.parseInt(String(url).split('/').filter(Boolean).pop(), 10);

const fetchJson = async (pathOrUrl) => {
    const url = /^https?:\/\//i.test(pathOrUrl) ? pathOrUrl : `${POKEAPI}/${String(pathOrUrl).replace(/^\/+/, '')}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return res.json();
};

const titleCase = (s = '') => s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const pokedexCache = new Map();
// Returns { name (display), ids: [species ids IN REGIONAL DEX ORDER] } so the
// builder can render each sub-dex (e.g. Central/Coastal/Mountain Kalos) in the
// real in-game order rather than sorted by national number.
const getPokedex = async (key) => {
    if (pokedexCache.has(key)) return pokedexCache.get(key);
    let result = { name: titleCase(key), ids: [] };
    try {
        const data = await fetchJson(`/pokedex/${key}`);
        const enName = (data.names || []).find((n) => n.language?.name === 'en')?.name;
        const ids = (data.pokemon_entries || [])
            .slice()
            .sort((a, b) => (a.entry_number || 0) - (b.entry_number || 0))
            .map((e) => parseId(e.pokemon_species?.url))
            .filter((id) => Number.isInteger(id) && id > 0 && id <= NATIONAL_DEX_MAX);
        result = { name: enName || titleCase(key), ids: [...new Set(ids)] };
    } catch (_) {
        console.warn(`  (skipped pokédex "${key}")`);
    }
    pokedexCache.set(key, result);
    return result;
};

const main = async () => {
    const generatedAt = new Date().toISOString();

    // Read the already-baked index for the battle-form entries (apiName/isForm).
    const indexPath = path.join(DATA_DIR, 'pokemon-index.json');
    const index = JSON.parse(await fs.readFile(indexPath, 'utf8'));
    const forms = (index.pokemons || []).filter((p) => p.isForm && p.apiName);

    const games = [];
    for (const game of GAMES) {
        // One ordered section per regional Pokédex (kept SEPARATE + in order).
        const dexes = [];
        const speciesIds = new Set();
        for (const dexKey of game.pokedexes) {
            const { name, ids } = await getPokedex(dexKey);
            if (!ids.length) continue;
            dexes.push({ key: dexKey, name, speciesIds: ids });
            for (const id of ids) speciesIds.add(id);
        }
        if (speciesIds.size === 0) {
            console.warn(`No species found for ${game.key} — skipping.`);
            continue;
        }

        // Native battle-form ids (regional variants / megas / gmax). These are
        // surfaced INLINE next to their base species in the app, so we only record
        // their ids for membership/count here — not as a separate section. We drop
        // hypothetical (non-official) megas: real PokéAPI megas are ids 10033–10090.
        const formIds = [];
        for (const form of forms) {
            const matched = game.forms.some((suffix) => FORM_SUFFIX_RE[suffix]?.test(form.apiName));
            if (!matched) continue;
            if (/-mega(-[xy])?$/.test(form.apiName) && form.id > 10090) continue;
            // A closed roster cannot reach a form whose base species it doesn't
            // have: without this, "Pokémon Champions" would list Mega Mewtwo,
            // Mega Rayquaza and Mega Latios — the restricted legendaries the
            // format exists to exclude (48 of 102 matched forms were orphans).
            // Open games keep the looser behaviour: their bases are transferable.
            if (game.closedRoster && !speciesIds.has(form.baseId)) continue;
            formIds.push(form.id);
        }

        const pokemonIds = [...new Set([...speciesIds, ...formIds])].sort((a, b) => a - b);
        games.push({
            key: game.key,
            label: game.label,
            generation: game.generation,
            count: pokemonIds.length,
            formSuffixes: game.forms,
            // Only set when true, so the flag reads as an exception rather than a
            // field every game has to think about.
            ...(game.closedRoster ? { closedRoster: true } : {}),
            dexes,
            pokemonIds,
        });
        console.log(`  ${game.label}: ${dexes.map((d) => `${d.name}(${d.speciesIds.length})`).join(', ')} + ${formIds.length} forms = ${pokemonIds.length}`);
    }

    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(
        path.join(DATA_DIR, 'games.json'),
        `${JSON.stringify({ generatedAt, source: `${POKEAPI}/pokedex`, games }, null, 2)}\n`,
        'utf8'
    );
    console.log(`Wrote ${games.length} games to public/data/games.json`);
};

main().catch((err) => { console.error(err); process.exitCode = 1; });
