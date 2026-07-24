import fs from 'node:fs/promises';
import path from 'node:path';

// Builds public/data/trainer-sprites.json — the roster of trainer sprites a user
// can pick as their avatar. Source: Showdown's own client roster
// (`BattleAvatarNumbers` in battle-dex-data.js), which is the authoritative list
// of what exists under /sprites/trainers/{id}.png. There is no directory index
// endpoint, so parsing that map is the only reliable way to enumerate them.
//
// Run: node scripts/build-trainer-sprites.mjs   (also wired into `prebuild`)

const SRC = 'https://play.pokemonshowdown.com/js/battle-dex-data.js';
const DATA_DIR = path.join(process.cwd(), 'public', 'data');
const OUT = path.join(DATA_DIR, 'trainer-sprites.json');

// Generation suffixes Showdown appends to older art (`hiker-gen4`,
// `youngster-gen4dp`). Split off so the label stays readable and the UI can
// group or filter by era.
// Trailing part can carry a game code too: `-gen4dp`, `-gen5bw2`.
const GEN_SUFFIX = /-gen(\d)[a-z0-9]*$/;

// Showdown ids are unseparated role words (`acetrainersnowf`, `galacticgruntf`).
// Rather than hand-maintain ~300 labels, greedily split the stem against this
// token list, longest match first. Anything that doesn't tokenize is a character
// name (`cynthia`, `eusine`) and gets title-cased whole.
// Compound role tokens whose readable form has a space (or an accent).
const TOKEN_LABELS = {
  acetrainer: 'Ace Trainer', aromalady: 'Aroma Lady', battlegirl: 'Battle Girl',
  beautysalon: 'Beauty Salon', birdkeeper: 'Bird Keeper', blackbelt: 'Black Belt',
  bugcatcher: 'Bug Catcher', bugmaniac: 'Bug Maniac', cooltrainer: 'Cool Trainer',
  crasherwake: 'Crasher Wake', doubleteam: 'Double Team', dragontamer: 'Dragon Tamer',
  firebreather: 'Fire Breather', hexmaniac: 'Hex Maniac', lorekeeper: 'Lore Keeper',
  ninjaboy: 'Ninja Boy', nurseryaide: 'Nursery Aide', parasollady: 'Parasol Lady',
  pokefan: 'Poké Fan', pokekid: 'Poké Kid', pokemonbreeder: 'Pokémon Breeder',
  pokemonranger: 'Pokémon Ranger', pokemontrainer: 'Pokémon Trainer',
  richboy: 'Rich Boy', rocketgrunt: 'Rocket Grunt', ruinmaniac: 'Ruin Maniac',
  schoolboy: 'School Boy', schoolgirl: 'School Girl', schoolkid: 'School Kid',
  shadowtriad: 'Shadow Triad', youngcouple: 'Young Couple',
};

// Single-word tokens — either standalone roles or modifiers that combine with
// the compounds above (`galactic` + `grunt`, `acetrainer` + `snow`).
const PLAIN_TOKENS = [
  'preschooler', 'interviewers', 'interviewer', 'backpacker', 'burglar', 'cameraman', 'clerk',
  'cyclist', 'engineer', 'fisherman', 'gentleman', 'guitarist', 'hooligans',
  'infielder', 'janitor', 'juggler', 'kindler', 'madame', 'medium', 'officer',
  'painter', 'picnicker', 'policeman', 'psychic', 'rancher', 'ranger', 'roughneck',
  'sailor', 'scientist', 'socialite', 'striker', 'swimmer', 'teacher', 'tuber',
  'twins', 'veteran', 'waiter', 'waitress', 'worker', 'youngster',
  'galactic', 'plasma', 'rocket', 'aqua', 'magma', 'flare', 'skull', 'yell',
  'grunt', 'admin', 'boss', 'couple', 'snow', 'ice', 'desert', 'sandwich',
  'boy', 'girl', 'lady', 'man', 'woman', 'kid', 'team',
];

const TOKENS_BY_LENGTH = [...Object.keys(TOKEN_LABELS), ...PLAIN_TOKENS]
  .sort((a, b) => b.length - a.length);

// Multi-word character names the tokenizer can't know about.
const NAMED = {
  brycenman: 'Brycen-Man',
  sistersandbrother: 'Sisters & Brother',
};

const titleCase = (word) => TOKEN_LABELS[word]
  || word.charAt(0).toUpperCase() + word.slice(1);

// Split `acetrainersnow` → ['acetrainer', 'snow']. Returns null when the stem
// isn't fully consumed by known tokens, so callers can fall back.
const tokenize = (stem) => {
  const out = [];
  let rest = stem;
  while (rest.length) {
    const token = TOKENS_BY_LENGTH.find((t) => rest.startsWith(t));
    if (!token) return null;
    out.push(token);
    rest = rest.slice(token.length);
  }
  return out;
};

// `acetrainerf-gen4dp` → { label: 'Ace Trainer', female: true, gen: 4 }
const describe = (id) => {
  let stem = id;
  let gen = null;

  const genMatch = stem.match(GEN_SUFFIX);
  if (genMatch) {
    gen = Number(genMatch[1]);
    stem = stem.slice(0, genMatch.index);
  }

  // Showdown marks the female variant with a trailing `f` on the role name.
  // Only strip it when what remains still tokenizes, so real names ending in
  // `f` are left alone.
  let female = false;
  let base = stem;
  if (stem.endsWith('f') && !NAMED[stem] && tokenize(stem.slice(0, -1))) {
    female = true;
    base = stem.slice(0, -1);
  }

  let label = NAMED[base];
  if (!label) {
    const tokens = base.includes('-') ? null : tokenize(base);
    label = tokens
      ? tokens.map(titleCase).join(' ')
      : base.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  return { label, female, gen };
};

const main = async () => {
  const res = await fetch(SRC, { redirect: 'follow' });
  if (!res.ok) throw new Error(`fetch ${res.status}`);
  const source = await res.text();

  const block = source.match(/BattleAvatarNumbers\s*=\s*\{([\s\S]*?)\n\};/);
  if (!block) throw new Error('BattleAvatarNumbers not found — upstream format changed');

  const trainers = [];
  const seen = new Set();
  for (const match of block[1].matchAll(/(\d+)\s*:\s*'([^']+)'/g)) {
    const id = match[2];
    // `#1001`-style ids are Showdown's custom/staff avatars: they live outside
    // /sprites/trainers/ and aren't ours to offer.
    if (id.startsWith('#')) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    trainers.push({ id, ...describe(id) });
  }

  if (trainers.length === 0) {
    console.warn('No trainer sprites parsed — keeping existing trainer-sprites.json.');
    return;
  }

  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(
    OUT,
    `${JSON.stringify({
      generatedAt: new Date().toISOString(),
      source: SRC,
      spriteBaseUrl: 'https://play.pokemonshowdown.com/sprites/trainers',
      count: trainers.length,
      trainers,
    }, null, 2)}\n`,
    'utf8',
  );
  console.log(`Wrote ${trainers.length} trainer sprites to public/data/trainer-sprites.json`);
};

// Build-safe: never fail the build/deploy over an optional enrichment.
main().catch((err) => {
  console.error('Trainer-sprite refresh failed (keeping existing data):', err?.message || err);
  process.exitCode = 0;
});
