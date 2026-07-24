import fs from 'node:fs/promises';
import path from 'node:path';

// Builds the UNIFIED competitive-usage dataset for the Team Builder + Meta pages
// from REAL tournament results on the free Limitless VGC API, then completes each
// entry with the EV spreads + Tera types the API doesn't expose (grafted from the
// Smogon per-regulation usage files built by build-usage-stats.mjs).
//
// Why Limitless leads: it exposes full decklists (item/ability/moves/nature/tera)
// PLUS a per-player win/loss record and final placing, across ~17k M-B teams —
// two orders of magnitude more than the old 120-team pokepaste mine, and with a
// real WIN-RATE signal we can't get from raw ladder usage. Smogon fills the two
// gaps Limitless has (EV spreads + Tera).
//
// Output (one file per regulation, keyed by the SAME format ids the UI selects):
//   public/data/usage/<smogonFormatId>.json   (extended in place — adds winRate)
//   public/data/competitive-usage.json         (the default/current regulation,
//                                                kept for back-compat consumers)
//
// Run: node scripts/build-limitless-usage.mjs   (wired into `prebuild`)

const LIMITLESS = 'https://play.limitlesstcg.com/api';
const POKEAPI = (process.env.VITE_POKEAPI_BASE_URL || 'https://pokeapi.co/api/v2').replace(/\/+$/, '');
const DATA_DIR = path.join(process.cwd(), 'public', 'data');
const USAGE_DIR = path.join(DATA_DIR, 'usage');

// Per-regulation caps so the baked files stay lean (the UI never needs more).
const MAX_TOURNAMENTS = Number(process.env.LIMITLESS_MAX_TOURNAMENTS || 80); // biggest events first
const MIN_PLAYERS = Number(process.env.LIMITLESS_MIN_PLAYERS || 8);          // skip tiny lobbies
const MAX_SPECIES = 150;
const CAP = { items: 8, moves: 14, abilities: 4, spreads: 6, tera: 6, teammates: 10 };

// Map the app's Smogon format ids ↔ the Limitless `format` token. The UI already
// selects by the Smogon id, so we bake under that id; the token is how we pull the
// matching tournaments. `null` token → format has no Limitless coverage (skip).
// Derived, not hardcoded per-reg: any Champions "…regm<x>" id maps to token
// "M-<X>", so a future Reg M-C is picked up automatically once its Smogon file
// exists. Scarlet/Violet regs use an "SV<letter>" token on Limitless (Reg I → SVI).
const limitlessTokenFor = (formatId = '') => {
    const champ = formatId.match(/regm([a-z])/i);
    if (champ) return `M-${champ[1].toUpperCase()}`;
    const sv = formatId.match(/reg([a-z])$/i);
    if (sv) return `SV${sv[1].toUpperCase()}`;
    return null;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const fetchJson = async (url, attempts = 3) => {
    for (let i = 0; i < attempts; i += 1) {
        try {
            const res = await fetch(url, { headers: { 'User-Agent': 'pokemonbuilder.app data pipeline' }, redirect: 'follow' });
            if (res.status === 404) return { notFound: true };
            if (res.ok) return { json: await res.json() };
        } catch (_) { /* retry */ }
        await sleep(300 * (i + 1));
    }
    return { error: true };
};

// Limitless-specific fetch: the API rate-limits, and firing all of a regulation's
// standings calls flat-out gets later regulations throttled to nothing. So we (a)
// serialize Limitless calls through a tiny paced queue, and (b) honour 429 /
// Retry-After with exponential backoff over more attempts. This keeps every
// regulation building in one pass instead of the first one starving the rest.
const LIMITLESS_GAP_MS = Number(process.env.LIMITLESS_GAP_MS || 120); // min spacing between calls
let limitlessChain = Promise.resolve();
const fetchLimitless = (url, attempts = 5) => {
    const run = (async () => {
        for (let i = 0; i < attempts; i += 1) {
            try {
                const res = await fetch(url, { headers: { 'User-Agent': 'pokemonbuilder.app data pipeline' }, redirect: 'follow' });
                if (res.status === 404) return { notFound: true };
                if (res.status === 429) {
                    const retryAfter = Number(res.headers.get('retry-after')) || 0;
                    await sleep(Math.max(retryAfter * 1000, 800 * 2 ** i));
                    continue;
                }
                if (res.ok) return { json: await res.json() };
                if (res.status >= 500) { await sleep(500 * 2 ** i); continue; }
            } catch (_) { await sleep(500 * 2 ** i); continue; }
            await sleep(400 * (i + 1));
        }
        return { error: true };
    });
    // Chain so calls are spaced out, not fired concurrently.
    const scheduled = limitlessChain.then(() => run());
    limitlessChain = scheduled.then(() => sleep(LIMITLESS_GAP_MS), () => sleep(LIMITLESS_GAP_MS));
    return scheduled;
};

// ── Species resolution (Limitless deck id / display name → base national-dex id) ─
// Limitless uses base species slugs ("charizard", "arcanine-hisui", "basculegion-f")
// and denotes Mega via the held item ("Charizardite Y"), which matches how the app
// tracks mega forms — so resolving to the BASE id is exactly right.
const slugCandidates = (raw) => {
    const base = String(raw).toLowerCase().trim()
        .replace(/[.'’:♀♂]/g, '')
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
    const candidates = [base];
    const parts = base.split('-');
    while (parts.length > 1) { parts.pop(); candidates.push(parts.join('-')); }
    return [...new Set(candidates.filter(Boolean))];
};

const speciesCache = new Map();
const resolveSpeciesId = async (deckId, name) => {
    const key = deckId || name;
    if (speciesCache.has(key)) return speciesCache.get(key);
    let sawError = false;
    for (const slug of [...slugCandidates(deckId || ''), ...slugCandidates(name || '')]) {
        const r = await fetchJson(`${POKEAPI}/pokemon/${slug}`);
        if (r.json?.id) {
            const sid = r.json.species?.url
                ? Number.parseInt(r.json.species.url.split('/').filter(Boolean).pop(), 10)
                : r.json.id;
            const id = Number.isInteger(sid) ? sid : r.json.id;
            speciesCache.set(key, id);
            return id;
        }
        if (r.error) sawError = true;
    }
    if (!sawError) speciesCache.set(key, null); // definitively absent — cache the miss
    return null;
};

async function mapPool(items, limit, fn) {
    const out = new Array(items.length);
    let i = 0;
    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx], idx); }
    });
    await Promise.all(workers);
    return out;
}

const itemSlug = (name = '') => name.toLowerCase().trim()
    .replace(/[.'’:]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

const topEntries = (map, cap) => [...map.entries()]
    .filter(([k]) => k)
    .sort((a, b) => b[1] - a[1])
    .slice(0, cap)
    .map(([name, count]) => ({ name, count }));

// ── Fetch every completed VGC tournament for a Limitless token ────────────────
// A page FETCH error (network/5xx, already retried inside fetchJson) must not be
// read as "end of list" — that would silently truncate a regulation to nothing on
// a transient blip. Only an empty/short *successful* page ends pagination.
const listTournaments = async (token) => {
    const all = [];
    for (let page = 1; page <= 16; page += 1) {
        const r = await fetchLimitless(`${LIMITLESS}/tournaments?game=VGC&format=${encodeURIComponent(token)}&limit=50&page=${page}`);
        if (r.error) { console.warn(`  · ${token}: page ${page} fetch failed after retries — skipping page`); continue; }
        const batch = r.json;
        if (!Array.isArray(batch) || !batch.length) break; // genuine end of list
        all.push(...batch);
        if (batch.length < 50) break;
    }
    // Biggest lobbies first (most signal), skip tiny ones, then cap.
    return all
        .filter((t) => (t.players || 0) >= MIN_PLAYERS)
        .sort((a, b) => (b.players || 0) - (a.players || 0))
        .slice(0, MAX_TOURNAMENTS);
};

// Aggregate one regulation's standings into per-species usage + win-rate + the
// same item/ability/move/teammate/spread shape the app already consumes.
const aggregateRegulation = async (token) => {
    const tournaments = await listTournaments(token);
    if (!tournaments.length) return null;

    const bump = (m, k) => { if (k) m.set(k, (m.get(k) || 0) + 1); };
    // species deck-id/name → counters (resolved to national-dex id at the end)
    const agg = new Map();
    const teammates = new Map(); // key → Map(otherKey → count)
    let teamsAnalyzed = 0;

    for (const tour of tournaments) {
        const r = await fetchLimitless(`${LIMITLESS}/tournaments/${tour.id}/standings`);
        const standings = r.json;
        if (!Array.isArray(standings)) continue;

        for (const entry of standings) {
            const deck = entry.decklist;
            if (!Array.isArray(deck) || !deck.length) continue;
            teamsAnalyzed += 1;
            const rec = entry.record || {};
            const wins = rec.wins || 0;
            const games = wins + (rec.losses || 0);
            // Placement weight: winners' choices count a little more (soft, capped).
            const place = entry.placing || 9999;
            const weight = place <= 8 ? 3 : place <= 32 ? 2 : 1;

            const keys = [...new Set(deck.map((p) => p.id || p.name))];
            for (const p of deck) {
                const key = p.id || p.name;
                if (!key) continue;
                if (!agg.has(key)) {
                    agg.set(key, {
                        name: p.name || key, deckId: p.id || null,
                        teams: 0, wins: 0, games: 0, weighted: 0,
                        items: new Map(), abilities: new Map(), moves: new Map(), tera: new Map(),
                    });
                }
                const e = agg.get(key);
                e.teams += 1; e.wins += wins; e.games += games; e.weighted += weight;
                bump(e.items, p.item);
                bump(e.abilities, p.ability);
                bump(e.tera, p.tera);
                for (const mv of p.attacks || []) bump(e.moves, mv);
            }
            for (const a of keys) {
                if (!teammates.has(a)) teammates.set(a, new Map());
                const tm = teammates.get(a);
                for (const b of keys) if (a !== b) tm.set(b, (tm.get(b) || 0) + 1);
            }
        }
    }

    if (!teamsAnalyzed) return null;

    // Rank by weighted usage, keep the top slice, then resolve species ids once.
    const ranked = [...agg.entries()]
        .sort((a, b) => b[1].weighted - a[1].weighted)
        .slice(0, MAX_SPECIES);

    // Resolve ids for every ranked species + its teammates (once, pooled).
    const allKeys = new Set();
    for (const [key, e] of ranked) { allKeys.add(key); const tm = teammates.get(key); if (tm) for (const k of tm.keys()) allKeys.add(k); }
    const keys = [...allKeys];
    const nameByKey = new Map([...agg].map(([k, e]) => [k, e.name]));
    const ids = await mapPool(keys, 6, (k) => resolveSpeciesId(agg.get(k)?.deckId || k, nameByKey.get(k) || k));
    const idByKey = new Map(keys.map((k, i) => [k, ids[i]]));

    const byId = {};
    for (const [key, e] of ranked) {
        const id = idByKey.get(key);
        if (!id || byId[id]) continue; // first (most-used) form claims the base id
        const winRate = e.games ? Math.round((1000 * e.wins) / e.games) / 10 : null;
        const usage = Math.round((1000 * e.teams) / teamsAnalyzed) / 10;

        const seenTm = new Set();
        const tmList = [...(teammates.get(key) || new Map())]
            .sort((a, b) => b[1] - a[1])
            .map(([k, count]) => ({ id: idByKey.get(k), name: nameByKey.get(k) || k, count }))
            .filter((t) => { if (!t.id || t.id === id || seenTm.has(t.id)) return false; seenTm.add(t.id); return true; })
            .slice(0, CAP.teammates);

        byId[id] = {
            name: e.name,   // species display name (consumed by Meta & Usage + suggestions)
            n: e.teams,
            teams: e.teams,
            usage,          // % of analyzed teams running this species
            winRate,        // % games won by teams running it (null if no records)
            weighted: e.weighted,
            items: topEntries(e.items, CAP.items).map((it) => ({ ...it, slug: itemSlug(it.name) })),
            abilities: topEntries(e.abilities, CAP.abilities),
            tera: topEntries(e.tera, CAP.tera),
            moves: topEntries(e.moves, CAP.moves),
            spreads: [],    // filled from Smogon below (Limitless has no EV data)
            teammates: tmList,
        };
    }

    return { byId, teamsAnalyzed, tournaments: tournaments.length, species: Object.keys(byId).length };
};

// Graft Smogon's EV spreads + Tera onto the Limitless entries (the two fields the
// tournament API doesn't expose). Smogon leads ONLY for these; everything else
// stays Limitless. Read the per-format file built by build-usage-stats.mjs.
const fillFromSmogon = async (formatId, byId) => {
    let smogon = null;
    try { smogon = JSON.parse(await fs.readFile(path.join(USAGE_DIR, `${formatId}.json`), 'utf8')); } catch (_) { /* optional */ }
    if (!smogon?.byId) return { spreads: 0, tera: 0 };
    let spreads = 0; let tera = 0;
    for (const [id, e] of Object.entries(byId)) {
        const s = smogon.byId[id];
        if (!s) continue;
        if (Array.isArray(s.spreads) && s.spreads.length) { e.spreads = s.spreads.slice(0, CAP.spreads); spreads += 1; }
        // Only borrow Tera when Limitless had none (Champions has no Tera anyway).
        if ((!e.tera || !e.tera.length) && Array.isArray(s.tera) && s.tera.length) { e.tera = s.tera.slice(0, CAP.tera); tera += 1; }
    }
    return { spreads, tera };
};

async function main() {
    const generatedAt = new Date().toISOString();

    // The regulations to build come from the usage index (Smogon's catalog) — so
    // whatever formats build-usage-stats.mjs produced (incl. a future Reg M-C) we
    // enrich here, no separate list to maintain.
    let index = null;
    try { index = JSON.parse(await fs.readFile(path.join(DATA_DIR, 'usage-index.json'), 'utf8')); } catch (_) { /* none yet */ }
    const formats = index?.formats || [];
    if (!formats.length) { console.warn('build-limitless-usage: no usage-index.json formats; run build-usage-stats first. Skipping.'); return; }

    let builtAny = false;
    for (const fmt of formats) {
        const token = limitlessTokenFor(fmt.id);
        if (!token) { console.log(`  · ${fmt.id}: no Limitless token — skipping`); continue; }
        try {
            const reg = await aggregateRegulation(token);
            if (!reg || !reg.species) { console.warn(`  · ${fmt.id} (${token}): no Limitless data — keeping existing`); continue; }
            const filled = await fillFromSmogon(fmt.id, reg.byId);

            // Re-write the per-format usage file: Limitless byId as the source of
            // truth, Smogon spreads/Tera merged in. Keep Smogon's format/month meta.
            let existing = {};
            try { existing = JSON.parse(await fs.readFile(path.join(USAGE_DIR, `${fmt.id}.json`), 'utf8')); } catch (_) { /* new */ }
            const payload = {
                generatedAt,
                month: existing.month || null,
                format: existing.format || { id: fmt.id, label: fmt.label, group: fmt.group },
                source: 'limitless tournament standings + smogon spreads',
                totalBattles: existing.totalBattles || 0,
                teamsAnalyzed: reg.teamsAnalyzed,
                tournaments: reg.tournaments,
                species: reg.species,
                byId: reg.byId,
            };
            await fs.mkdir(USAGE_DIR, { recursive: true });
            await fs.writeFile(path.join(USAGE_DIR, `${fmt.id}.json`), `${JSON.stringify(payload)}\n`);
            builtAny = true;
            console.log(`  ✓ ${fmt.id} (${token}): ${reg.species} species from ${reg.teamsAnalyzed} teams / ${reg.tournaments} tournaments (spreads:${filled.spreads}, tera:${filled.tera})`);

            // The default regulation also feeds the back-compat competitive-usage.json.
            if (fmt.id === (index.default || formats[0].id)) {
                await fs.writeFile(
                    path.join(DATA_DIR, 'competitive-usage.json'),
                    `${JSON.stringify({ generatedAt, source: 'limitless tournament standings', species: reg.species, totalTeams: reg.teamsAnalyzed, byId: reg.byId }, null, 2)}\n`,
                );
                console.log(`  ✓ competitive-usage.json ← ${fmt.id} (${reg.teamsAnalyzed} teams)`);
            }
        } catch (err) {
            console.warn(`  · ${fmt.id}: ${err?.message || err}`);
        }
    }

    if (!builtAny) console.warn('build-limitless-usage: nothing built; existing data kept.');
}

// Build-safe: a scrape failure must never fail the build/deploy.
main().catch((err) => { console.warn('build-limitless-usage failed (non-fatal):', err?.message || err); process.exitCode = 0; });
