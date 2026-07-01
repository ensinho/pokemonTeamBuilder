import fs from 'node:fs/promises';
import path from 'node:path';

// Builds precise, per-regulation competitive usage from Smogon's monthly stats
// ("chaos" JSON): real usage %, held items, moves, abilities, EV spreads, Tera
// types and teammates — the same data Pikalytics surfaces. Focused on the current
// VGC + Pokémon Champions ladders (older reg sets are retired from the ladder, so
// only the 2026 formats have current data).
//
// Output:
//   public/data/usage/<formatId>.json   — one compact file per regulation
//   public/data/usage-index.json        — the catalog + default the UI loads first
//
// Run: node scripts/build-usage-stats.mjs   (also runs in `prebuild`)

const POKEAPI = (process.env.VITE_POKEAPI_BASE_URL || 'https://pokeapi.co/api/v2').replace(/\/+$/, '');
const DATA_DIR = path.join(process.cwd(), 'public', 'data');
const USAGE_DIR = path.join(DATA_DIR, 'usage');
const STATS_BASE = 'https://www.smogon.com/stats';

// The regulation ladders to surface, newest first (the first is the default).
// Grouped for the UI's <optgroup>s. Smogon format id ↔ human label.
const FORMATS = [
    { id: 'gen9championsvgc2026regmb', label: 'VGC Reg M-B', group: 'Pokémon Champions' },
    { id: 'gen9championsvgc2026regma', label: 'VGC Reg M-A', group: 'Pokémon Champions' },
    { id: 'gen9vgc2026regi', label: 'VGC 2026 Reg I', group: 'Scarlet & Violet' },
];

// Rating cutoff preference (falls back down if a format lacks the top file).
// 1630 is the strong-ladder tier whose ordering matches the public usage sites
// (e.g. Pikalytics) — a big enough sample to be stable without diluting with
// low-rated games.
const CUTOFFS = [1630, 1760, 1500, 0];

// Smogon's chaos JSON keys everything by Showdown ID (lowercase, no separators:
// "sitrusberry", "fakeout"). These bulk dicts map ID → proper display name so we
// bake readable labels + correct sprite slugs. (Terastallization is absent from
// Pokémon Champions, so its Tera lists are just "nothing" and get dropped.)
// moves ship as JSON; items/abilities only as data-only JS modules
// (exports.BattleItems = {...}), which we evaluate for their { id: { name } } map.
const SHOWDOWN_MOVES = 'https://play.pokemonshowdown.com/data/moves.json';
const SHOWDOWN_ITEMS = 'https://play.pokemonshowdown.com/data/items.js';
const SHOWDOWN_ABILITIES = 'https://play.pokemonshowdown.com/data/abilities.js';
const DICTS = { items: {}, moves: {}, abilities: {} };

const fetchDict = async (url) => {
    try { const r = await fetch(url, { redirect: 'follow' }); if (r.ok) return await r.json(); } catch (_) { /* optional */ }
    return {};
};

// Evaluate a Showdown data-only JS module (`exports.<name> = { ... }`) → its map.
// Safe: these client files contain literal data only (no functions or globals).
const fetchShowdownJs = async (url, exportName) => {
    try {
        const r = await fetch(url, { redirect: 'follow' });
        if (!r.ok) return {};
        const text = await r.text();
        const sandbox = {};
        // eslint-disable-next-line no-new-func
        new Function('exports', text)(sandbox);
        return sandbox[exportName] || {};
    } catch (_) { return {}; }
};
const prettyId = (id = '') => id.charAt(0).toUpperCase() + id.slice(1);
const nameFromDict = (dict, id) => (dict[id] && dict[id].name) || prettyId(id);

// Per-mon caps (keep the baked files small; the meta rarely needs more).
const CAP = { items: 8, moves: 14, abilities: 4, spreads: 6, tera: 6, teammates: 10 };
const MAX_SPECIES = 150; // top-N by usage per format

// ── Species resolution (Showdown display name → base national-dex id) ────────
const slugCandidates = (name) => {
    const base = name.toLowerCase().trim()
        .replace(/[.'’:]/g, '')
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
    const candidates = [base];
    const parts = base.split('-');
    while (parts.length > 1) { parts.pop(); candidates.push(parts.join('-')); }
    return [...new Set(candidates)];
};

// Fetch JSON with a couple of retries. Distinguishes a definitive 404 (species
// genuinely absent under this slug → try the next candidate) from a transient
// error (network / 429 / 5xx → worth retrying, and must NOT poison the cache).
const fetchJsonRetry = async (url, attempts = 3) => {
    for (let i = 0; i < attempts; i += 1) {
        try {
            const res = await fetch(url);
            if (res.status === 404) return { notFound: true };
            if (res.ok) return { json: await res.json() };
        } catch (_) { /* retry */ }
        await new Promise((r) => setTimeout(r, 250 * (i + 1)));
    }
    return { error: true };
};

const speciesCache = new Map();
// Resolve a Showdown name → base national-dex id. Tries `/pokemon/{slug}` (which
// carries the species url), then `/pokemon-species/{slug}` — the latter resolves
// form-only defaults like "Basculegion" whose /pokemon/basculegion 404s (its
// default variant is basculegion-male). Only a genuine not-found is cached, so a
// transient PokéAPI hiccup never permanently drops a species.
const resolveSpeciesId = async (name) => {
    if (speciesCache.has(name)) return speciesCache.get(name);
    const candidates = slugCandidates(name);
    let sawError = false;

    for (const slug of candidates) {
        const r = await fetchJsonRetry(`${POKEAPI}/pokemon/${slug}`);
        if (r.json?.id) {
            const sid = r.json.species?.url
                ? Number.parseInt(r.json.species.url.split('/').filter(Boolean).pop(), 10)
                : r.json.id;
            const id = Number.isInteger(sid) ? sid : r.json.id;
            speciesCache.set(name, id);
            return id;
        }
        if (r.error) sawError = true;
    }
    for (const slug of candidates) {
        const r = await fetchJsonRetry(`${POKEAPI}/pokemon-species/${slug}`);
        if (r.json?.id) { speciesCache.set(name, r.json.id); return r.json.id; }
        if (r.error) sawError = true;
    }

    if (!sawError) speciesCache.set(name, null); // definitively absent — cache the miss
    return null;
};

// Small concurrency pool so the many PokéAPI lookups don't run one-at-a-time.
async function mapPool(items, limit, fn) {
    const out = new Array(items.length);
    let i = 0;
    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (i < items.length) {
            const idx = i++;
            out[idx] = await fn(items[idx], idx);
        }
    });
    await Promise.all(workers);
    return out;
}

const itemSlug = (name = '') => name.toLowerCase().trim()
    .replace(/[.'’:]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

const EV_ORDER = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];

// "Adamant:4/252/0/0/0/252" → { nature: 'Adamant', evs: { hp:4, atk:252, spe:252 } }
const parseSpread = (raw = '') => {
    const [nature, rest] = raw.split(':');
    if (!rest) return null;
    const nums = rest.split('/').map((n) => Number(n) || 0);
    const evs = {};
    EV_ORDER.forEach((k, i) => { if (nums[i] > 0) evs[k] = nums[i]; });
    return { nature: nature || 'Serious', evs };
};

// Sort a Smogon "{name: weight}" record → capped [{name, count}] (rounded weight).
const topEntries = (record = {}, cap, { drop = [] } = {}) =>
    Object.entries(record)
        .filter(([name, w]) => w > 0 && !drop.includes(name))
        .sort((a, b) => b[1] - a[1])
        .slice(0, cap)
        .map(([name, w]) => ({ name, count: Math.round(w) }));

// ── Smogon month discovery + fetch ───────────────────────────────────────────
const discoverLatestMonth = async () => {
    try {
        const res = await fetch(`${STATS_BASE}/`);
        if (res.ok) {
            const html = await res.text();
            const months = [...html.matchAll(/href="(\d{4}-\d{2})\/"/g)].map((m) => m[1]);
            if (months.length) return months.sort().at(-1);
        }
    } catch (_) { /* fall through to guesses */ }
    // Fallback: walk back a few months from a recent anchor until one resolves.
    const now = new Date();
    for (let back = 1; back <= 6; back += 1) {
        const d = new Date(now.getFullYear(), now.getMonth() - back, 1);
        const guess = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        try {
            const res = await fetch(`${STATS_BASE}/${guess}/`);
            if (res.ok) return guess;
        } catch (_) { /* keep walking */ }
    }
    return null;
};

// Fetch a format's chaos JSON at the best available cutoff.
const fetchChaos = async (month, id) => {
    for (const cutoff of CUTOFFS) {
        try {
            const res = await fetch(`${STATS_BASE}/${month}/chaos/${id}-${cutoff}.json`);
            if (res.ok) {
                const json = await res.json();
                if (json?.data) return { json, cutoff };
            }
        } catch (_) { /* try next cutoff */ }
    }
    return null;
};

// ── Battle-relevant items + mega-stone map (derived from Showdown data) ──────
// The reference items.json is the full 2000-entry PokéAPI dump (mulch, fossils,
// TMs…). Showdown's BattleItems is exactly the held-in-battle set, so we bake a
// focused, sprite-able list for the editor's item picker.
const bakeBattleItems = async () => {
    const items = Object.values(DICTS.items || {})
        .filter((it) => it && it.name && !it.isPokeball)
        .map((it) => ({ slug: itemSlug(it.name), name: it.name }))
        .filter((it) => it.slug)
        .sort((a, b) => a.name.localeCompare(b.name));
    if (!items.length) { console.warn('  · battle-items: none (keeping existing)'); return; }
    await fs.writeFile(
        path.join(DATA_DIR, 'battle-items.json'),
        `${JSON.stringify({ generatedAt: new Date().toISOString(), count: items.length, items })}\n`,
    );
    console.log(`  ✓ battle-items.json: ${items.length} items`);
};

const formSlugFromName = (name = '') => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Mega-stone → { base species id, mega form sprite id + types }, so equipping a
// stone can morph the team member into its Mega form on the active team.
const bakeMegaStones = async () => {
    const entries = Object.entries(DICTS.items || {}).filter(([, v]) => v && v.megaStone);
    if (!entries.length) { console.warn('  · mega-stones: none (keeping existing)'); return; }
    const byStone = {};
    await mapPool(entries, 6, async ([, v]) => {
        const [base, form] = Object.entries(v.megaStone)[0] || [];
        if (!form) return;
        const [baseId, formData] = await Promise.all([
            resolveSpeciesId(base),
            fetchJsonRetry(`${POKEAPI}/pokemon/${formSlugFromName(form)}`),
        ]);
        const spriteId = formData.json?.id || null;
        const types = (formData.json?.types || []).map((t) => t.type?.name).filter(Boolean);
        if (!baseId || !spriteId) return;
        byStone[itemSlug(v.name)] = { base, baseId, form, spriteId, types };
    });
    if (!Object.keys(byStone).length) { console.warn('  · mega-stones: 0 resolved (keeping existing)'); return; }
    await fs.writeFile(
        path.join(DATA_DIR, 'mega-stones.json'),
        `${JSON.stringify({ generatedAt: new Date().toISOString(), byStone })}\n`,
    );
    console.log(`  ✓ mega-stones.json: ${Object.keys(byStone).length} stones`);
};

// ── Build one format ─────────────────────────────────────────────────────────
const buildFormat = async (month, fmt) => {
    const chaos = await fetchChaos(month, fmt.id);
    if (!chaos) { console.warn(`  · ${fmt.id}: no chaos data`); return null; }
    const { json, cutoff } = chaos;
    const totalBattles = json.info?.['number of battles'] || 0;

    // Rank species by weighted usage, keep the top slice.
    const ranked = Object.entries(json.data)
        .map(([name, d]) => ({ name, d, usage: d.usage || 0 }))
        .sort((a, b) => b.usage - a.usage)
        .slice(0, MAX_SPECIES);

    // Pre-resolve every referenced name (species + teammates) once, pooled.
    const names = new Set();
    for (const { name, d } of ranked) {
        names.add(name);
        for (const tm of Object.keys(d.Teammates || {})) names.add(tm);
    }
    const nameList = [...names];
    const ids = await mapPool(nameList, 6, (n) => resolveSpeciesId(n));
    const idByName = new Map(nameList.map((n, i) => [n, ids[i]]));

    const byId = {};
    for (const { name, d } of ranked) {
        const id = idByName.get(name);
        if (!id) continue;
        // Several Showdown forms (mega / gendered) collapse onto one base species
        // id. Since `ranked` is sorted by usage desc, the first to claim an id is
        // the most-used form — keep it (and its name) and skip the rest so a minor
        // form can't overwrite and understate the species' usage.
        if (byId[id]) continue;

        // W = the mon's total weighted count (every set has exactly one ability),
        // the shared denominator for item/move/ability/spread/tera/teammate %.
        const abilityVals = Object.values(d.Abilities || {});
        const W = abilityVals.reduce((a, b) => a + b, 0) || d['Raw count'] || 0;
        if (W <= 0) continue;

        const spreads = Object.entries(d.Spreads || {})
            .filter(([, w]) => w > 0)
            .sort((a, b) => b[1] - a[1])
            .slice(0, CAP.spreads)
            .map(([raw, w]) => { const p = parseSpread(raw); return p ? { ...p, count: Math.round(w) } : null; })
            .filter(Boolean);

        const seenTm = new Set();
        const teammates = Object.entries(d.Teammates || {})
            .filter(([, w]) => w > 0)
            .sort((a, b) => b[1] - a[1])
            .map(([tmName, w]) => ({ id: idByName.get(tmName), name: tmName, count: Math.round(w) }))
            .filter((t) => {
                if (!t.id || t.id === id || seenTm.has(t.id)) return false;
                seenTm.add(t.id);
                return true;
            })
            .slice(0, CAP.teammates);

        byId[id] = {
            name,
            usage: Math.round((d.usage || 0) * 1000) / 10, // metagame usage %, 1 dp
            rawCount: d['Raw count'] || 0,
            n: Math.round(W),
            items: topEntries(d.Items, CAP.items, { drop: ['nothing', ''] })
                .map((it) => { const nm = nameFromDict(DICTS.items, it.name); return { name: nm, slug: itemSlug(nm), count: it.count }; }),
            abilities: topEntries(d.Abilities, CAP.abilities)
                .map((ab) => ({ name: nameFromDict(DICTS.abilities, ab.name), count: ab.count })),
            moves: topEntries(d.Moves, CAP.moves, { drop: ['', 'nothing', 'other'] })
                .map((mv) => ({ name: nameFromDict(DICTS.moves, mv.name), count: mv.count })),
            spreads,
            // Tera IDs → capitalized type ("ghost" → "Ghost"); "nothing" dropped
            // (Champions has no Tera), so those formats simply omit the Tera panel.
            tera: topEntries(d['Tera Types'], CAP.tera, { drop: ['nothing', ''] })
                .map((t) => ({ name: prettyId(t.name), count: t.count })),
            teammates,
        };
    }

    const speciesCount = Object.keys(byId).length;
    if (!speciesCount) { console.warn(`  · ${fmt.id}: 0 species resolved`); return null; }

    const payload = {
        generatedAt: new Date().toISOString(),
        month,
        format: { ...fmt, cutoff },
        totalBattles,
        species: speciesCount,
        byId,
    };
    await fs.mkdir(USAGE_DIR, { recursive: true });
    await fs.writeFile(path.join(USAGE_DIR, `${fmt.id}.json`), `${JSON.stringify(payload)}\n`);
    console.log(`  ✓ ${fmt.id} (${cutoff}+): ${speciesCount} species, ${totalBattles} battles`);
    return { ...fmt, cutoff, totalBattles, species: speciesCount, file: `usage/${fmt.id}.json` };
};

async function main() {
    const month = await discoverLatestMonth();
    if (!month) { console.warn('build-usage-stats: could not resolve a Smogon stats month; skipping.'); return; }
    console.log(`build-usage-stats: using ${STATS_BASE}/${month}/`);

    // Load the ID → display-name dictionaries once (readable labels + sprite slugs).
    [DICTS.items, DICTS.moves, DICTS.abilities] = await Promise.all([
        fetchShowdownJs(SHOWDOWN_ITEMS, 'BattleItems'),
        fetchDict(SHOWDOWN_MOVES),
        fetchShowdownJs(SHOWDOWN_ABILITIES, 'BattleAbilities'),
    ]);

    // Bake the item picker list + mega-stone map (independent of the usage build).
    await bakeBattleItems();
    await bakeMegaStones();

    const built = [];
    for (const fmt of FORMATS) {
        try {
            const meta = await buildFormat(month, fmt);
            if (meta) built.push(meta);
        } catch (err) {
            console.warn(`  · ${fmt.id}: ${err.message}`);
        }
    }

    // Never clobber a good catalog with an empty run (e.g. Smogon briefly down).
    if (!built.length) { console.warn('build-usage-stats: no formats built; keeping existing data.'); return; }

    const index = {
        generatedAt: new Date().toISOString(),
        month,
        source: `${STATS_BASE}/${month}/`,
        default: built[0].id,
        formats: built,
    };
    await fs.writeFile(path.join(DATA_DIR, 'usage-index.json'), `${JSON.stringify(index, null, 2)}\n`);
    console.log(`build-usage-stats: wrote ${built.length} formats + index (default ${index.default}).`);
}

main().catch((err) => { console.warn('build-usage-stats failed (non-fatal):', err.message); });
