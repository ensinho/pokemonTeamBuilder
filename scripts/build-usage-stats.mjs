import fs from 'node:fs/promises';
import path from 'node:path';

import { orderCutoffs, parseStatsListing, parseUsageTable } from './lib/smogonStats.mjs';

// Builds precise, per-format competitive usage from Smogon's monthly stats
// ("chaos" JSON): real usage %, held items, moves, abilities, EV spreads, Tera
// types and teammates — the same data Pikalytics surfaces. Covers the whole
// Smogon ladder: every current SV tier (OU → ZU, LC, Monotype, Doubles…), the
// National Dex family, the VGC / Pokémon Champions regulations, and past-gen OU.
//
// Two kinds of data per format, because they cost wildly different amounts:
//   · the DETAIL (chaos JSON, 5–30 MB a piece) is fetched once, at the format's
//     preferred rating cutoff — that's what the per-Pokémon page renders.
//   · the RANKING (the plain `<format>-<cutoff>.txt` table, a few hundred KB) is
//     fetched for EVERY cutoff the month published, so the Meta list can be
//     re-ranked at any ladder rating without a 30 MB download per cutoff.
//
// Output:
//   public/data/usage/<formatId>.json   — one compact file per format
//   public/data/usage-index.json        — the catalog + default the UI loads first
//
// Run: node scripts/build-usage-stats.mjs   (also runs in `prebuild`)

const POKEAPI = (process.env.VITE_POKEAPI_BASE_URL || 'https://pokeapi.co/api/v2').replace(/\/+$/, '');
const DATA_DIR = path.join(process.cwd(), 'public', 'data');
const USAGE_DIR = path.join(DATA_DIR, 'usage');
const STATS_BASE = 'https://www.smogon.com/stats';

// The ladders to surface, in the order the picker lists them. `group` is the
// picker's section; `kind` separates the VGC *regulations* (which the Team
// Builder's game/regulation picker offers, and which must stay a short list)
// from the Smogon *tiers* (which only the Meta pages browse).
//
// Listing an id that the month did not publish costs nothing: the discovery step
// below drops every format with no files, so speculative ids (a BSS series that
// may or may not be running, a tier that was folded away) are safe to keep here.
const FORMATS = [
    // VGC regulations — `kind: 'vgc'`, and the default the app opens on.
    { id: 'gen9championsvgc2026regmb', label: 'VGC Reg M-B', group: 'Pokémon Champions', kind: 'vgc' },
    { id: 'gen9championsvgc2026regma', label: 'VGC Reg M-A', group: 'Pokémon Champions', kind: 'vgc' },
    { id: 'gen9vgc2026regi', label: 'VGC 2026 Reg I', group: 'Scarlet & Violet', kind: 'vgc' },

    // Scarlet & Violet singles ladder.
    { id: 'gen9ou', label: 'OU', group: 'SV Singles', kind: 'tier' },
    { id: 'gen9ubers', label: 'Ubers', group: 'SV Singles', kind: 'tier' },
    { id: 'gen9ubersuu', label: 'Ubers UU', group: 'SV Singles', kind: 'tier' },
    { id: 'gen9uu', label: 'UU', group: 'SV Singles', kind: 'tier' },
    { id: 'gen9ru', label: 'RU', group: 'SV Singles', kind: 'tier' },
    { id: 'gen9nu', label: 'NU', group: 'SV Singles', kind: 'tier' },
    { id: 'gen9pu', label: 'PU', group: 'SV Singles', kind: 'tier' },
    { id: 'gen9zu', label: 'ZU', group: 'SV Singles', kind: 'tier' },
    { id: 'gen9lc', label: 'LC', group: 'SV Singles', kind: 'tier' },
    { id: 'gen9nfe', label: 'NFE', group: 'SV Singles', kind: 'tier' },
    { id: 'gen9monotype', label: 'Monotype', group: 'SV Singles', kind: 'tier' },
    { id: 'gen9anythinggoes', label: 'Anything Goes', group: 'SV Singles', kind: 'tier' },
    { id: 'gen91v1', label: '1v1', group: 'SV Singles', kind: 'tier' },
    { id: 'gen9cap', label: 'CAP', group: 'SV Singles', kind: 'tier' },

    // Scarlet & Violet doubles ladder.
    { id: 'gen9doublesou', label: 'Doubles OU', group: 'SV Doubles', kind: 'tier' },
    { id: 'gen9doublesuu', label: 'Doubles UU', group: 'SV Doubles', kind: 'tier' },

    // National Dex family.
    { id: 'gen9nationaldex', label: 'National Dex OU', group: 'National Dex', kind: 'tier' },
    { id: 'gen9nationaldexubers', label: 'National Dex Ubers', group: 'National Dex', kind: 'tier' },
    { id: 'gen9nationaldexuu', label: 'National Dex UU', group: 'National Dex', kind: 'tier' },
    { id: 'gen9nationaldexru', label: 'National Dex RU', group: 'National Dex', kind: 'tier' },
    { id: 'gen9nationaldexmonotype', label: 'National Dex Monotype', group: 'National Dex', kind: 'tier' },
    { id: 'gen9nationaldexdoubles', label: 'National Dex Doubles', group: 'National Dex', kind: 'tier' },
    { id: 'gen9nationaldexag', label: 'National Dex AG', group: 'National Dex', kind: 'tier' },

    // Cartridge singles (Battle Stadium). The series suffix rotates, so a few
    // candidates are listed and whichever exists this month wins.
    { id: 'gen9bssregi', label: 'Battle Stadium Reg I', group: 'Battle Stadium', kind: 'tier' },
    { id: 'gen9bssregh', label: 'Battle Stadium Reg H', group: 'Battle Stadium', kind: 'tier' },

    // Past generations — OU (plus the two biggest side ladders) per gen.
    { id: 'gen8ou', label: 'Gen 8 OU', group: 'Past generations', kind: 'tier' },
    { id: 'gen8ubers', label: 'Gen 8 Ubers', group: 'Past generations', kind: 'tier' },
    { id: 'gen8doublesou', label: 'Gen 8 Doubles OU', group: 'Past generations', kind: 'tier' },
    { id: 'gen7ou', label: 'Gen 7 OU', group: 'Past generations', kind: 'tier' },
    { id: 'gen7ubers', label: 'Gen 7 Ubers', group: 'Past generations', kind: 'tier' },
    { id: 'gen6ou', label: 'Gen 6 OU', group: 'Past generations', kind: 'tier' },
    { id: 'gen5ou', label: 'Gen 5 OU', group: 'Past generations', kind: 'tier' },
    { id: 'gen4ou', label: 'Gen 4 OU', group: 'Past generations', kind: 'tier' },
    { id: 'gen3ou', label: 'Gen 3 OU', group: 'Past generations', kind: 'tier' },
    { id: 'gen2ou', label: 'Gen 2 OU', group: 'Past generations', kind: 'tier' },
    { id: 'gen1ou', label: 'Gen 1 OU', group: 'Past generations', kind: 'tier' },
];

// Which rating cutoff the *detail* (chaos) download uses, most-preferred first.
// VGC keeps 1630 — the strong-ladder band whose ordering matches the public usage
// sites (e.g. Pikalytics). Smogon's own tiers publish 1695 as the headline band
// for OU-likes and 1630 elsewhere, so the tier list leads with those two.
const DETAIL_CUTOFFS = {
    vgc: [1630, 1760, 1500, 0],
    tier: [1695, 1630, 1760, 1825, 1500, 0],
};

// Cap on the per-cutoff ranking tables (the detail set is capped by MAX_SPECIES).
// 200 is past the point where a tier's usage numbers stop being meaningful.
const MAX_RANKED = 200;

// Smogon's chaos JSON keys everything by Showdown ID (lowercase, no separators:
// "sitrusberry", "fakeout"). These bulk dicts map ID → proper display name so we
// bake readable labels + correct sprite slugs. (Terastallization is absent from
// Pokémon Champions, so its Tera lists are just "nothing" and get dropped.)
// moves ship as JSON; items/abilities only as data-only JS modules
// (exports.BattleItems = {...}), which we evaluate for their { id: { name } } map.
const SHOWDOWN_MOVES = 'https://play.pokemonshowdown.com/data/moves.json';
const SHOWDOWN_ITEMS = 'https://play.pokemonshowdown.com/data/items.js';
const SHOWDOWN_ABILITIES = 'https://play.pokemonshowdown.com/data/abilities.js';
const SHOWDOWN_FORMATS = 'https://play.pokemonshowdown.com/data/formats-data.js';
const DICTS = { items: {}, moves: {}, abilities: {}, formats: {} };

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

// The committed Pokédex index already maps every slug (and every alternate form,
// via `baseId`) to a national-dex id. Consulting it first turns what used to be
// one PokéAPI round-trip per species into a local Map hit — which is what makes
// ~40 formats affordable: the whole catalog references well over a thousand
// distinct Showdown names, and PokéAPI is only asked about the leftovers.
const localSpecies = new Map();
const loadLocalSpeciesIndex = async () => {
    try {
        const raw = await fs.readFile(path.join(DATA_DIR, 'pokemon-index.json'), 'utf8');
        // Prefixes are collected separately and merged only where they are
        // unambiguous. The index keys Landorus by its default variant,
        // `landorus-incarnate`, so neither "Landorus-Therian" nor the bare
        // "landorus" the candidate list trims to would hit an exact-match map —
        // every therian, altered and origin form in every tier would fall
        // through to PokéAPI. Mapping `landorus` → 645 fixes that, but only
        // because exactly one index entry starts that way: `iron` and `urshifu`
        // cover several species each, so they are left out and resolved the slow,
        // certain way rather than guessed at.
        const prefixTargets = new Map();
        const addPrefixes = (slug, target) => {
            const parts = slug.split('-');
            while (parts.length > 1) {
                parts.pop();
                const prefix = parts.join('-');
                if (!prefixTargets.has(prefix)) prefixTargets.set(prefix, new Set());
                prefixTargets.get(prefix).add(target);
            }
        };

        for (const p of JSON.parse(raw).pokemons || []) {
            const target = p.baseId || p.id;
            if (!Number.isInteger(target)) continue;
            for (const key of [p.name, p.apiName]) {
                const slug = key ? slugCandidates(key)[0] : '';
                if (!slug) continue;
                if (!localSpecies.has(slug)) localSpecies.set(slug, target);
                addPrefixes(slug, target);
            }
        }

        let added = 0;
        for (const [prefix, targets] of prefixTargets) {
            if (targets.size !== 1 || localSpecies.has(prefix)) continue;
            localSpecies.set(prefix, [...targets][0]);
            added += 1;
        }
        buildCompactIndex();
        console.log(`  · species index: ${localSpecies.size} local slugs (${added} via unique prefixes), ${compactKeys.length} compact`);
        return;
    } catch (_) { /* optional — PokéAPI still resolves everything, just slower */ }
    console.log('  · species index: unavailable, resolving via PokéAPI');
};

// Showdown's formats-data keys species by its own id — lowercase, separators
// stripped: `greattusk`, `landorustherian`. The slug candidates above never
// match those, so the tierlist would resolve only single-word species and come
// back full of holes, which in the builder reads as "this legal Pokémon is not
// in the tier". This index answers the compact form.
const compactSpecies = new Map();
let compactKeys = [];
const compactOf = (s = '') => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

const buildCompactIndex = () => {
    for (const [slug, id] of localSpecies) {
        const key = compactOf(slug);
        if (key && !compactSpecies.has(key)) compactSpecies.set(key, id);
    }
    // Longest first, so `mrmime` wins over `mr` and `hooh` matches whole.
    compactKeys = [...compactSpecies.keys()].sort((a, b) => b.length - a.length);
};

/**
 * A Showdown species id → national-dex id. Exact match first; failing that, the
 * longest known species whose compact slug PREFIXES the id, which is how a form
 * resolves to its base (`landorustherian` → `landorus` → 645). The 4-character
 * floor keeps a two-letter stem from swallowing an unrelated species.
 */
const resolveShowdownId = (showdownId) => {
    const key = compactOf(showdownId);
    if (!key) return null;
    const exact = compactSpecies.get(key);
    if (exact) return exact;
    for (const candidate of compactKeys) {
        if (candidate.length >= 4 && key.startsWith(candidate)) return compactSpecies.get(candidate);
    }
    return null;
};

const speciesCache = new Map();
// Resolve a Showdown name → base national-dex id. Tries the local index first,
// then `/pokemon/{slug}` (which carries the species url), then
// `/pokemon-species/{slug}` — the latter resolves form-only defaults like
// "Basculegion" whose /pokemon/basculegion 404s (its default variant is
// basculegion-male). Only a genuine not-found is cached, so a transient PokéAPI
// hiccup never permanently drops a species.
const resolveSpeciesId = async (name) => {
    if (speciesCache.has(name)) return speciesCache.get(name);
    const candidates = slugCandidates(name);
    let sawError = false;

    for (const slug of candidates) {
        const local = localSpecies.get(slug);
        if (local) { speciesCache.set(name, local); return local; }
    }

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

/**
 * Which formats (and which rating cutoffs of each) the month actually published,
 * read once from the stats directory listing: every file there is
 * `<formatId>-<cutoff>.txt`. Doing this instead of probing means the FORMATS
 * catalog above can name ladders speculatively — anything absent simply never
 * comes back. Returns Map(formatId → ascending cutoffs).
 */
const discoverAvailable = async (month) => {
    try {
        const res = await fetch(`${STATS_BASE}/${month}/`);
        if (res.ok) return parseStatsListing(await res.text());
    } catch (_) { /* caller treats an empty map as "listing unavailable" */ }
    return new Map();
};

// Fetch a format's chaos JSON at the best available cutoff.
const fetchChaos = async (month, id, cutoffs) => {
    for (const cutoff of cutoffs) {
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

/**
 * One rating cutoff's plain usage table — the cheap counterpart to the chaos
 * download. `<format>-<cutoff>.txt` is a fixed-width ASCII table:
 *
 *   | Rank | Pokemon    | Usage %  | Raw    | %      | Real  | %      |
 *   | 1    | Great Tusk | 35.123%  | 123456 | 12.34% | 98765 | 11.11% |
 *
 * Returns { totalBattles, rows: [{ name, usage, raw }] } — usage as a percentage
 * so it needs no conversion, unlike the chaos JSON's 0–1 fraction.
 */
const fetchUsageTable = async (month, id, cutoff) => {
    try {
        const res = await fetch(`${STATS_BASE}/${month}/${id}-${cutoff}.txt`);
        if (!res.ok) return null;
        const parsed = parseUsageTable(await res.text(), MAX_RANKED);
        return parsed.rows.length ? parsed : null;
    } catch (_) { return null; }
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

// Species id → the tier it is ASSIGNED, which is a different question from the
// tier it is *used* in. The usage files only cover the ~150 species a chaos dump
// reaches, so they cannot answer "may I put this in an OU team" for a legal but
// niche pick — this can, and it is what the Team Builder's tier filter runs on.
//
// One small file (Showdown's formats-data) for the whole national dex, so it is
// baked here alongside the other Showdown-derived maps rather than earning its
// own script. `tier` is singles; `doublesTier` and `natDexTier` are recorded
// only when they differ, and the consumer falls back to `tier`.
const bakeTierLegality = async () => {
    const entries = Object.entries(DICTS.formats || {});
    if (!entries.length) { console.warn('  · tier-legality: none (keeping existing)'); return; }

    const byId = {};
    let unresolved = 0;

    entries.forEach(([slug, data]) => {
        const id = resolveShowdownId(slug);
        if (!id) { unresolved += 1; return; }
        if (!data) return;
        const tier = data.tier || null;
        const doubles = data.doublesTier || null;
        const natdex = data.natDexTier || null;
        if (!tier && !doubles && !natdex) return;
        // Several Showdown slugs collapse onto one national-dex id (the Rotom
        // appliances, Urshifu's two strikes). Keep the first — formats-data is
        // ordered by dex number, so that is the base form, whose tier is the one
        // a builder filtering by species means.
        if (byId[id]) return;
        byId[id] = { tier, ...(doubles ? { doubles } : {}), ...(natdex ? { natdex } : {}) };
    });

    const count = Object.keys(byId).length;
    if (!count) { console.warn('  · tier-legality: 0 resolved (keeping existing)'); return; }
    await fs.writeFile(
        path.join(DATA_DIR, 'tier-legality.json'),
        `${JSON.stringify({ generatedAt: new Date().toISOString(), count, byId })}\n`,
    );
    // Unresolved entries are a silent correctness hole: a species missing here
    // is simply absent from every tier filter that uses it, so the count is
    // reported rather than swallowed.
    console.log(`  ✓ tier-legality.json: ${count} species${unresolved ? ` (${unresolved} unresolved)` : ''}`);
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

/**
 * Every published rating cutoff of one format, as compact rankings the Meta list
 * can switch between instantly. Keyed by cutoff → { totalBattles, byId }, where
 * byId is `{ [speciesId]: { name, usage, rawCount } }`.
 *
 * Species that collapse onto one national-dex id (Urshifu's two strikes, the
 * Rotom appliances) keep the most-used form, matching how the detail set above
 * resolves them — the table is already sorted by usage, so first-wins does it.
 */
const buildCutoffRankings = async (month, fmt, cutoffs) => {
    const out = {};
    for (const cutoff of cutoffs) {
        const table = await fetchUsageTable(month, fmt.id, cutoff);
        if (!table) continue;
        const ids = await mapPool(table.rows, 8, (r) => resolveSpeciesId(r.name));
        const byId = {};
        table.rows.forEach((row, i) => {
            const id = ids[i];
            if (!id || byId[id]) return;
            byId[id] = { name: row.name, usage: Math.round(row.usage * 10) / 10, rawCount: row.raw };
        });
        if (Object.keys(byId).length) out[cutoff] = { totalBattles: table.totalBattles, byId };
    }
    return out;
};

// ── Build one format ─────────────────────────────────────────────────────────
const buildFormat = async (month, fmt, cutoffs) => {
    const chaos = await fetchChaos(month, fmt.id, cutoffs);
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

    // The other rating bands. The detail cutoff is included too, so the ranking
    // the UI reads is always the same shape whichever cutoff is selected.
    const rankings = await buildCutoffRankings(month, fmt, cutoffs);
    const cutoffList = [...new Set([...Object.keys(rankings).map(Number), cutoff])].sort((a, b) => a - b);

    const payload = {
        generatedAt: new Date().toISOString(),
        month,
        format: { ...fmt, cutoff, cutoffs: cutoffList },
        totalBattles,
        species: speciesCount,
        // Which band the per-Pokémon breakdown (items / moves / spreads / Tera /
        // teammates) was sampled at. Only the *rankings* vary by cutoff — the
        // detail is one download, and the UI says so rather than implying the
        // breakdown re-samples.
        detailCutoff: cutoff,
        byId,
        cutoffs: rankings,
    };
    await fs.mkdir(USAGE_DIR, { recursive: true });
    await fs.writeFile(path.join(USAGE_DIR, `${fmt.id}.json`), `${JSON.stringify(payload)}\n`);
    console.log(`  ✓ ${fmt.id} (detail ${cutoff}+, bands ${cutoffList.join('/')}): ${speciesCount} species, ${totalBattles} battles`);
    return {
        ...fmt,
        cutoff,
        cutoffs: cutoffList,
        totalBattles,
        species: speciesCount,
        file: `usage/${fmt.id}.json`,
    };
};

async function main() {
    const month = await discoverLatestMonth();
    if (!month) { console.warn('build-usage-stats: could not resolve a Smogon stats month; skipping.'); return; }
    console.log(`build-usage-stats: using ${STATS_BASE}/${month}/`);

    // Load the ID → display-name dictionaries once (readable labels + sprite slugs).
    [DICTS.items, DICTS.moves, DICTS.abilities, DICTS.formats] = await Promise.all([
        fetchShowdownJs(SHOWDOWN_ITEMS, 'BattleItems'),
        fetchDict(SHOWDOWN_MOVES),
        fetchShowdownJs(SHOWDOWN_ABILITIES, 'BattleAbilities'),
        fetchShowdownJs(SHOWDOWN_FORMATS, 'BattleFormatsData'),
    ]);

    await loadLocalSpeciesIndex();

    // Bake the item picker list + mega-stone map (independent of the usage build).
    await bakeBattleItems();
    await bakeMegaStones();
    await bakeTierLegality();

    // What this month actually published. An empty listing (Smogon reachable but
    // the index page unreadable) falls back to probing the preferred cutoffs, so
    // the build degrades to its previous behaviour rather than producing nothing.
    const available = await discoverAvailable(month);
    console.log(`  · listing: ${available.size} formats published`);

    // `--formats=gen9ou,gen9uu` builds just those, for a 30-second smoke test
    // before committing to the full catalog (~40 chaos dumps, a few hundred MB).
    // A partial run writes a partial index, so it is for checking the pipeline
    // works — not for producing the data the site ships.
    const only = (process.argv.find((a) => a.startsWith('--formats=')) || '')
        .slice('--formats='.length).split(',').map((s) => s.trim()).filter(Boolean);
    const wanted = only.length ? FORMATS.filter((f) => only.includes(f.id)) : FORMATS;
    if (only.length) console.warn(`  · --formats: building ${wanted.length} of ${FORMATS.length} (PARTIAL index — do not ship)`);

    const built = [];
    for (const fmt of wanted) {
        const preference = DETAIL_CUTOFFS[fmt.kind] || DETAIL_CUTOFFS.tier;
        const published = available.get(fmt.id);
        if (available.size && !published) continue; // not run this month — skip silently
        // The preferred bands the month has, in preference order, then any other
        // published band (highest first) so an unusual cutoff still works.
        const cutoffs = orderCutoffs(published, preference);
        try {
            const meta = await buildFormat(month, fmt, cutoffs);
            if (meta) built.push(meta);
        } catch (err) {
            console.warn(`  · ${fmt.id}: ${err.message}`);
        }
    }

    // Never clobber a good catalog with an empty run (e.g. Smogon briefly down).
    if (!built.length) { console.warn('build-usage-stats: no formats built; keeping existing data.'); return; }

    // The app opens on a VGC regulation (the audience the builder is aimed at),
    // falling back to whatever built first if no VGC ladder ran this month.
    const defaultFormat = built.find((f) => f.kind === 'vgc') || built[0];

    const index = {
        generatedAt: new Date().toISOString(),
        month,
        source: `${STATS_BASE}/${month}/`,
        default: defaultFormat.id,
        formats: built,
    };
    await fs.writeFile(path.join(DATA_DIR, 'usage-index.json'), `${JSON.stringify(index, null, 2)}\n`);
    console.log(`build-usage-stats: wrote ${built.length} formats + index (default ${index.default}).`);
}

main().catch((err) => { console.warn('build-usage-stats failed (non-fatal):', err.message); });
