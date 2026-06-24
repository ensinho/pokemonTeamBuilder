import fs from 'node:fs/promises';
import path from 'node:path';

// Builds public/data/smogon.json from pkmn's mirror of Smogon's analysis + set
// data (https://pkmn.github.io/smogon/data/). This is the EXPERT-CURATED layer
// that complements competitive-usage.json: where competitive-usage is "what
// champions actually ran" (real but thin, ~58 species), Smogon gives robust,
// full-coverage recommended sets + a written analysis ("why it's good") for the
// whole VGC meta. Together they make our competitive data both current and robust.
//
// We key everything by BASE national-dex id (like tournaments.json / sprites /
// /pokemon/:id links) so the app surfaces it with zero name-resolution at runtime.
// Run: node scripts/build-smogon.mjs

const SMOGON_BASE = 'https://pkmn.github.io/smogon/data';
const POKEAPI = (process.env.VITE_POKEAPI_BASE_URL || 'https://pokeapi.co/api/v2').replace(/\/+$/, '');
const DATA_DIR = path.join(process.cwd(), 'public', 'data');
const INDEX_FILE = path.join(DATA_DIR, 'pokemon-index.json');

// Formats in PRIORITY order: the most current/official VGC regulations win, then
// older VGC years, then Smogon's Doubles OU tier (same doubles mechanics as VGC,
// far broader coverage) backfills every species the VGC sets don't reach. A
// species' sets come from the FIRST format here that lists it — so a VGC mon keeps
// its VGC sets, while the long tail still gets robust doubles sets.
const FORMATS = [
    // Doubles first — same mechanics as VGC, so these sets are the most relevant
    // and become a species' primary source. Order also decides which set shows first.
    { file: 'gen9vgc2025', label: 'VGC 2025' },
    { file: 'gen9vgc2024', label: 'VGC 2024' },
    { file: 'gen9vgc2023', label: 'VGC 2023' },
    { file: 'gen9doublesou', label: 'Doubles OU' },
    { file: 'gen9nationaldexdoubles', label: 'Nat Dex Doubles' },
    // Singles tiers add coverage AND extra set options per species (clearly
    // labelled by tier), ordered most-mainstream first.
    { file: 'gen9battlestadiumsingles', label: 'Battle Stadium' },
    { file: 'gen9ou', label: 'OU' },
    { file: 'gen9anythinggoes', label: 'Anything Goes' },
    { file: 'gen9ubers', label: 'Ubers' },
    { file: 'gen9uu', label: 'UU' },
    { file: 'gen9ru', label: 'RU' },
    { file: 'gen9nu', label: 'NU' },
    { file: 'gen9pu', label: 'PU' },
    { file: 'gen9zu', label: 'ZU' },
    { file: 'gen9lc', label: 'Little Cup' },
    { file: 'gen9monotype', label: 'Monotype' },
    { file: 'gen9nationaldex', label: 'Nat Dex' },
    { file: 'gen9nationaldexubers', label: 'Nat Dex Ubers' },
    { file: 'gen9nationaldexuu', label: 'Nat Dex UU' },
    { file: 'gen9nationaldexmonotype', label: 'Nat Dex Mono' },
];

// Across ~460 species: keep up to this many DISTINCT sets each (aggregated from
// all formats), and clip the long analysis prose (the bulk of the bytes).
const MAX_SETS_PER_SPECIES = 4;
const MAX_DESC_CHARS = 320;

// ── name → base national-dex id resolution ──────────────────────────────────
// Showdown/Smogon display name -> PokéAPI slug candidates (most specific first),
// mirroring scripts/build-tournaments.mjs so resolution behaves identically.
const slugCandidates = (name) => {
    const base = String(name).toLowerCase().trim()
        .replace(/[.'’:]/g, '')
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
    const candidates = [base];
    const parts = base.split('-');
    while (parts.length > 1) { parts.pop(); candidates.push(parts.join('-')); }
    return [...new Set(candidates)];
};

const slugify = (name = '') => String(name).toLowerCase().trim()
    .replace(/[.'’:]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

const loadIndexMap = async () => {
    // slug -> base species id, resolved offline from the baked pokemon index.
    const raw = JSON.parse(await fs.readFile(INDEX_FILE, 'utf8'));
    const map = new Map();
    for (const p of raw.pokemons || []) {
        if (p?.name && Number.isInteger(p.id)) map.set(p.name, p.id);
    }
    return map;
};

// Base-species id for names whose PokéAPI base form carries a suffix (so the
// bare slug 404s) — e.g. "Tornadus" -> tornadus-incarnate (641). We key by base
// national-dex id, so mapping straight to the id is exact.
const ALIAS_ID = {
    tornadus: 641, thundurus: 642, landorus: 645, enamorus: 905,
    urshifu: 892, indeedee: 876, basculegion: 902, maushold: 925,
    tatsugiri: 978, oinkologne: 916, palafin: 964, dudunsparce: 982,
    mimikyu: 778, keldeo: 647, giratina: 487, lycanroc: 745,
    toxtricity: 849, meloetta: 648, minior: 774, meowstic: 678,
    eiscue: 875, morpeko: 877, zacian: 888, zamazenta: 889,
    shaymin: 492, oricorio: 741, pyroar: 668, darmanitan: 555,
    zygarde: 718, aegislash: 681, wishiwashi: 746, gourgeist: 711,
    pumpkaboo: 710, sinistea: 854, polteageist: 855, basculin: 550,
};

const speciesCache = new Map();
const makeResolver = (indexMap) => async (name) => {
    if (speciesCache.has(name)) return speciesCache.get(name);
    let resolved = null;
    for (const slug of slugCandidates(name)) {
        if (indexMap.has(slug)) { resolved = indexMap.get(slug); break; }
        if (ALIAS_ID[slug]) { resolved = ALIAS_ID[slug]; break; }
    }
    // Forms missing from the baked index (e.g. Ogerpon-Wellspring) fall back to
    // PokéAPI, which still hands us the BASE species id for stable sprites/links.
    if (!resolved) {
        for (const slug of slugCandidates(name)) {
            try {
                const data = await (await fetch(`${POKEAPI}/pokemon/${slug}`)).json();
                if (data?.id) {
                    const speciesId = data.species?.url
                        ? Number.parseInt(data.species.url.split('/').filter(Boolean).pop(), 10)
                        : data.id;
                    resolved = Number.isInteger(speciesId) ? speciesId : data.id;
                    break;
                }
            } catch (_) { /* try next candidate */ }
        }
    }
    speciesCache.set(name, resolved);
    return resolved;
};

// ── HTML → plain text (analyses prose is HTML; we strip it at build time so the
// app never has to sanitize/inject markup at runtime) ───────────────────────
const ENTITIES = {
    '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'",
    '&apos;': "'", '&nbsp;': ' ', '&mdash;': '—', '&ndash;': '–', '&hellip;': '…',
};
const stripHtml = (html = '') => {
    if (!html) return '';
    return html
        .replace(/<\s*br\s*\/?\s*>/gi, ' ')
        .replace(/<\/(p|h[1-6]|li|div)>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
        .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
        .replace(/&[a-z]+;/gi, (m) => ENTITIES[m.toLowerCase()] ?? m)
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{2,}/g, '\n')
        .split('\n').map((l) => l.trim()).filter(Boolean).join('\n')
        .trim();
};

// Clip prose to ~MAX_DESC_CHARS, cutting at a sentence/word boundary + ellipsis.
const clip = (text = '') => {
    if (text.length <= MAX_DESC_CHARS) return text;
    const slice = text.slice(0, MAX_DESC_CHARS);
    const cut = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('\n'), slice.lastIndexOf(' '));
    return `${slice.slice(0, cut > 0 ? cut + 1 : MAX_DESC_CHARS).trim()}…`;
};

// ── set normalization ────────────────────────────────────────────────────────
// Smogon stat keys -> the app's customization keys (special-attack, etc.).
const EV_KEYS = { hp: 'hp', atk: 'attack', def: 'defense', spa: 'special-attack', spd: 'special-defense', spe: 'speed' };
const ZERO_EVS = { hp: 0, attack: 0, defense: 0, 'special-attack': 0, 'special-defense': 0, speed: 0 };
const MAX_IVS = { hp: 31, attack: 31, defense: 31, 'special-attack': 31, 'special-defense': 31, speed: 31 };

const mapStats = (obj, base) => {
    const out = { ...base };
    for (const [k, v] of Object.entries(obj || {})) {
        const key = EV_KEYS[k];
        if (key) out[key] = v;
    }
    return out;
};

// Smogon move slots are "Move" | ["Move A", "Move B"] (alternatives). Normalize
// every slot to an array of slugs so the UI/apply logic is uniform.
const normMoves = (moves = []) => moves
    .map((slot) => (Array.isArray(slot) ? slot : [slot]).map(slugify).filter(Boolean))
    .filter((slot) => slot.length);

const asArray = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);

// Smogon lists alternatives as arrays (e.g. item: ["Focus Sash","Choice Specs"]).
// We keep the FIRST as the primary (used by one-click "apply set") and surface
// the rest for display.
const normalizeSet = (name, raw, description) => {
    const itemOpts = asArray(raw.item).map(slugify).filter(Boolean);
    return {
        name,
        item: itemOpts[0] || '',
        itemAlts: itemOpts.slice(1),
        ability: slugify(asArray(raw.ability)[0] || ''),
        nature: String(asArray(raw.nature)[0] || 'serious').toLowerCase(),
        tera: asArray(raw.teratypes).map((t) => String(t).toLowerCase()),
        moves: normMoves(raw.moves),
        evs: mapStats(raw.evs, ZERO_EVS),
        ivs: mapStats(raw.ivs, MAX_IVS),
        level: raw.level || null,
        description: clip(stripHtml(description)) || '',
    };
};

const fetchJson = async (url) => {
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) throw new Error(`fetch ${res.status}: ${url}`);
    return res.json();
};

const main = async () => {
    const generatedAt = new Date().toISOString();
    const indexMap = await loadIndexMap();
    const resolve = makeResolver(indexMap);

    const byId = {};
    let resolvedCount = 0;
    const unresolved = new Set();

    for (const fmt of FORMATS) {
        let sets;
        let analyses = {};
        try {
            sets = await fetchJson(`${SMOGON_BASE}/sets/${fmt.file}.json`);
        } catch (err) {
            console.warn(`Skipping ${fmt.file} sets (${err.message})`);
            continue;
        }
        try {
            analyses = await fetchJson(`${SMOGON_BASE}/analyses/${fmt.file}.json`);
        } catch (_) { /* analyses optional — sets still carry value */ }

        console.log(`${fmt.label}: ${Object.keys(sets).length} species…`);

        for (const [speciesName, setMap] of Object.entries(sets)) {
            const id = await resolve(speciesName);
            if (!id) { unresolved.add(speciesName); continue; }

            const analysis = analyses[speciesName] || {};
            const setDescriptions = analysis.sets || {};

            // Aggregate sets ACROSS formats so a species gets several distinct
            // options (e.g. a VGC set + an OU set), each tagged with its source.
            // The first format to list a species sets its name/overview/primary gen.
            if (!byId[id]) {
                byId[id] = { name: speciesName, gen: fmt.label, overview: clip(stripHtml(analysis.overview)), sets: [], _sigs: new Set() };
                resolvedCount += 1;
            }
            const rec = byId[id];
            if (!rec.overview && analysis.overview) rec.overview = clip(stripHtml(analysis.overview));
            if (rec.sets.length >= MAX_SETS_PER_SPECIES) continue;

            for (const [setName, raw] of Object.entries(setMap)) {
                if (rec.sets.length >= MAX_SETS_PER_SPECIES) break;
                const s = normalizeSet(setName, raw, setDescriptions[setName]?.description);
                if (!s.moves.length) continue;
                // De-dupe near-identical builds (same item + same lead move of each slot).
                const sig = `${s.item}|${s.moves.map((slot) => slot[0]).join(',')}`;
                if (rec._sigs.has(sig)) continue;
                rec._sigs.add(sig);
                s.source = fmt.label;
                rec.sets.push(s);
            }
        }
    }

    for (const id of Object.keys(byId)) {
        delete byId[id]._sigs;
        if (!byId[id].sets.length) { delete byId[id]; resolvedCount -= 1; }
    }

    if (resolvedCount === 0) {
        console.warn('No Smogon species resolved — keeping the existing smogon.json.');
        return;
    }
    if (unresolved.size) {
        console.log(`Could not resolve ${unresolved.size} species (skipped): ${[...unresolved].slice(0, 12).join(', ')}${unresolved.size > 12 ? '…' : ''}`);
    }

    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(
        path.join(DATA_DIR, 'smogon.json'),
        `${JSON.stringify({ generatedAt, source: `${SMOGON_BASE}/`, formats: FORMATS.map((f) => f.label), species: resolvedCount, byId }, null, 2)}\n`,
        'utf8'
    );
    console.log(`Wrote Smogon analysis + sets for ${resolvedCount} species to public/data/smogon.json`);
};

// Build-safe: a fetch failure must never fail the build/deploy — the last good
// committed smogon.json stays in place and the site ships with it.
main().catch((err) => {
    console.error('Smogon refresh failed (keeping existing data):', err?.message || err);
    process.exitCode = 0;
});
