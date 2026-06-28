import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsonPath = path.resolve(__dirname, '../public/data/gym-leaders.json');
const pokemonCachePath = path.resolve(__dirname, './cache_pokemons.json');
const movesCachePath = path.resolve(__dirname, './cache_moves.json');

// Ensure scratch directory exists
const scratchDir = path.dirname(pokemonCachePath);
if (!fs.existsSync(scratchDir)) {
  fs.mkdirSync(scratchDir, { recursive: true });
}

// Load Caches
let pokemonCache = {};
if (fs.existsSync(pokemonCachePath)) {
  pokemonCache = JSON.parse(fs.readFileSync(pokemonCachePath, 'utf8'));
}
let movesCache = {};
if (fs.existsSync(movesCachePath)) {
  movesCache = JSON.parse(fs.readFileSync(movesCachePath, 'utf8'));
}

function saveCaches() {
  fs.writeFileSync(pokemonCachePath, JSON.stringify(pokemonCache, null, 2));
  fs.writeFileSync(movesCachePath, JSON.stringify(movesCache, null, 2));
}

// Mapping of gym-leaders.json official game keys to PokéAPI version groups
const VERSION_GROUPS = {
  'red-blue': 'red-blue',
  'lets-go': 'lets-go-pikachu-eevee',
  'gold-silver': 'gold-silver',
  'heartgold-soulsilver': 'heartgold-soulsilver',
  'ruby-sapphire': 'ruby-sapphire',
  'omega-ruby-alpha-sapphire': 'omega-ruby-alpha-sapphire',
  'diamond-pearl': 'diamond-pearl',
  'platinum': 'platinum',
  'brilliant-diamond-shining-pearl': 'brilliant-diamond-shining-pearl',
  'black-white': 'black-white',
  'black-white-2': 'black-2-white-2',
  'x-y': 'x-y',
  'sun-moon': 'sun-moon',
  'ultra-sun-ultra-moon': 'ultra-sun-ultra-moon',
  'sword-shield': 'sword-shield',
  'scarlet-violet': 'scarlet-violet'
};

function slugify(name) {
  let s = name.toLowerCase().trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents (Flabébé -> flabebe)
    .replace(/♀/g, '-f')
    .replace(/♂/g, '-m')
    .replace(/[.'’:]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
  if (s === 'farfetchd') return 'farfetchd';
  if (s === 'sirfetchd') return 'sirfetchd';
  if (s === 'mr-mime') return 'mr-mime';
  if (s === 'mime-jr') return 'mime-jr';
  if (s === 'type-null') return 'type-null';
  return s;
}

async function fetchWithRetry(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url);
      if (res.status === 404) return { status: 404 };
      if (res.ok) return res.json();
    } catch (e) {
      console.warn(`Retry ${i+1} failed for ${url}:`, e.message);
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  throw new Error(`Failed to fetch ${url} after 3 retries`);
}

async function getPokemonDetails(name) {
  const baseSlug = slugify(name);
  if (pokemonCache[baseSlug]) return pokemonCache[baseSlug];

  const slugsToTry = [
    baseSlug,
    `${baseSlug}-midday`,       // lycanroc
    `${baseSlug}-amped`,        // toxtricity
    `${baseSlug}-average`,      // pumpkaboo, gourgeist
    `${baseSlug}-normal`,       // deoxys
    `${baseSlug}-red-striped`,  // basculin
    `${baseSlug}-single-strike`,// urshifu
    `${baseSlug}-shield`,       // aegislash
    `${baseSlug}-incarnate`,    // landorus, tornadus
    `${baseSlug}-solo`,         // wishiwashi
    `${baseSlug}-meteor`,       // minior
    `${baseSlug}-male`,         // meowstic, indeedee
    `${baseSlug}-female`,       // meowstic, indeedee
    `${baseSlug}-disguised`,    // mimikyu
    `${baseSlug}-ice`,          // eiscue
    `${baseSlug}-full-belly`,   // morpeko
    `${baseSlug}-teal-mask`,    // ogerpon
    `${baseSlug}-red-meteor`,   // minior
    `${baseSlug}-standard`,     // darmanitan
    `${baseSlug}-altered`,      // giratina
    `${baseSlug}-two-segment`,  // dudunsparce
    `${baseSlug}-zero`,         // palafin
    `${baseSlug}-family-of-four`,// maushold
    `${baseSlug}-chest`         // gimmighoul
  ];

  for (const slug of slugsToTry) {
    const url = `https://pokeapi.co/api/v2/pokemon/${slug}`;
    console.log(`Fetching Pokémon details for ${name} using slug: ${slug}...`);
    const data = await fetchWithRetry(url);
    if (data && data.status !== 404) {
      pokemonCache[baseSlug] = data;
      saveCaches();
      return data;
    }
  }

  console.error(`ERROR: Could not find Pokémon details for ${name} (slug: ${baseSlug})`);
  return null;
}

async function getMoveType(moveName) {
  const slug = slugify(moveName);
  if (movesCache[slug]) return movesCache[slug];

  const url = `https://pokeapi.co/api/v2/move/${slug}`;
  console.log(`Fetching Move details for: ${moveName} (slug: ${slug})...`);
  const data = await fetchWithRetry(url);
  if (data && data.status !== 404) {
    const type = data.type?.name || 'normal';
    movesCache[slug] = type;
    saveCaches();
    return type;
  }

  console.warn(`WARNING: Could not find move details for ${moveName}, falling back to normal type.`);
  movesCache[slug] = 'normal';
  saveCaches();
  return 'normal';
}

async function run() {
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`gym-leaders.json not found at ${jsonPath}`);
  }

  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  console.log(`Loaded gym-leaders.json with ${data.games.length} games.`);

  for (const game of data.games) {
    console.log(`\nProcessing game: ${game.label} (${game.key}, ${game.kind})...`);

    const vg = VERSION_GROUPS[game.key];
    const isHackrom = game.kind === 'hackrom';

    for (const leader of game.leaders) {
      console.log(`  Trainer: ${leader.name} (${leader.gym || ''})`);

      for (const mon of leader.team) {
        if (isHackrom) {
          // Conversion for Hackroms: convert moves array from string[] to {name, type}[]
          if (Array.isArray(mon.moves) && mon.moves.length > 0) {
            const mappedMoves = [];
            for (const move of mon.moves) {
              if (typeof move === 'string') {
                const type = await getMoveType(move);
                mappedMoves.push({ name: move, type });
              } else {
                mappedMoves.push(move); // already converted
              }
            }
            mon.moves = mappedMoves;
          }
        } else {
          // Enrichment for Official Games: query PokéAPI for level-up moves and move types
          const detail = await getPokemonDetails(mon.name);
          if (!detail) {
            mon.moves = [];
            continue;
          }

          const levelCap = mon.level || leader.levelCap || 50;

          // Find level-up moves for this version group at or below levelCap
          const candidates = [];
          for (const m of detail.moves) {
            const vgDetail = m.version_group_details.find(d => 
              d.version_group.name === vg && 
              d.move_learn_method.name === 'level-up'
            );
            if (vgDetail && vgDetail.level_learned_at <= levelCap) {
              candidates.push({
                name: m.move.name,
                level: vgDetail.level_learned_at
              });
            }
          }

          // Sort level-up moves: highest level first, secondary alphabetical
          candidates.sort((a, b) => b.level - a.level || a.name.localeCompare(b.name));

          // Select top 4 most recently learned moves
          const selectedMoveNames = candidates.slice(0, 4).map(c => c.name);

          // Get types for the selected moves
          const enrichedMoves = [];
          for (const moveName of selectedMoveNames) {
            const type = await getMoveType(moveName);
            enrichedMoves.push({ name: moveName, type });
          }

          mon.moves = enrichedMoves;
        }
      }
    }
  }

  // Write updated data
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2) + '\n');
  console.log(`\nSUCCESS: Enriched database written to ${jsonPath}`);
}

run().catch(console.error);
