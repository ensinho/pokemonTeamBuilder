import fs from 'node:fs/promises';
import path from 'node:path';

// Builds public/data/tournaments.json from the community-maintained VGCPastes
// "Featured Teams" sheets — real teams with tournament placements (results only).
// Source: https://docs.google.com/spreadsheets/d/1axlwmzPA49rYkqXh7zHvAtSP-TKbM0ijGYBPRflLSWw
//
// We resolve each Showdown-style species name to its BASE national-dex id (so the
// app's id-based sprites + /pokemon/:id links always resolve) and bake a compact
// JSON. Run: node scripts/build-tournaments.mjs

const SHEET_ID = '1axlwmzPA49rYkqXh7zHvAtSP-TKbM0ijGYBPRflLSWw';
const POKEAPI = (process.env.VITE_POKEAPI_BASE_URL || 'https://pokeapi.co/api/v2').replace(/\/+$/, '');
const DATA_DIR = path.join(process.cwd(), 'public', 'data');
const MAX_TEAMS = Number(process.env.TOURNAMENTS_MAX || 120);

// Fallback Featured Teams tabs (teams with results only), used only if the live
// tab discovery below fails. Discovery keeps us robust to new regulations.
const FALLBACK_TABS = [
    { gid: '1863148622', format: 'Reg I' },
    { gid: '417374305', format: 'Reg M-A' },
];

const WORKBOOK_HTML = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/htmlview`;

// Turn a sheet title like "VGCPastes Repository (Regulation I Featured Teams!)"
// into a compact format badge ("Reg I", "Reg M-A").
const deriveFormat = (title = '') => {
    const inParens = title.match(/\(([^)]+)\)/);
    let s = (inParens ? inParens[1] : title)
        .replace(/featured teams!?/i, '')
        .replace(/repository/i, '')
        .trim();
    s = s.replace(/^Regulation\s+/i, 'Reg ').replace(/^Champions\s+/i, 'Reg ');
    return s.replace(/\s+/g, ' ').trim() || 'VGC';
};

// Column indices within a Featured Teams row (0-based), reverse-engineered from the sheet.
const COL = { title: 2, medal: 3, player: 4, paste: 25, date: 30, tournament: 31, placement: 32, source: 35, author: 36, monStart: 38, monEnd: 43 };

const csvUrl = (gid) => `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${gid}`;

function parseCSV(text) {
    const rows = []; let row = [], field = '', q = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (q) {
            if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
            else field += c;
        } else if (c === '"') q = true;
        else if (c === ',') { row.push(field); field = ''; }
        else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
        else if (c !== '\r') field += c;
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    return rows;
}

const fetchText = async (url) => {
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) throw new Error(`fetch ${res.status}: ${url}`);
    return res.text();
};

// Showdown display name -> PokéAPI slug candidates (most specific first).
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

const speciesCache = new Map();
// Resolve a Showdown name to a base national-dex id (1..1025) for stable sprites.
const resolveSpeciesId = async (name) => {
    if (speciesCache.has(name)) return speciesCache.get(name);
    let resolved = null;
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
    speciesCache.set(name, resolved);
    return resolved;
};

const cleanPlacement = (raw = '') => raw.replace(/\s+/g, ' ').trim();

// ── Pokepaste mining ─────────────────────────────────────────────────────
// Each tournament team links a Pokepaste with the FULL competitive sets
// (held item, ability, tera type, moves). We fetch the structured paste and
// aggregate, per species, how often each item/ability/tera/move actually shows
// up across real tournament teams — turning suggestions from heuristics into
// measured meta usage.

const itemSlug = (name = '') => name.toLowerCase().trim()
    .replace(/[.'’:]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

// Showdown EV/IV stat labels → our compact keys.
const STAT_KEY = { HP: 'hp', Atk: 'atk', Def: 'def', SpA: 'spa', SpD: 'spd', Spe: 'spe' };

// Parse "252 HP / 4 Def / 252 SpD" → { hp: 252, def: 4, spd: 252 } (only listed).
const parseStatLine = (raw = '') => {
    const out = {};
    for (const part of raw.split('/')) {
        const m = part.trim().match(/^(\d+)\s+(HP|Atk|Def|SpA|SpD|Spe)$/i);
        if (!m) continue;
        const label = Object.keys(STAT_KEY).find((s) => s.toLowerCase() === m[2].toLowerCase());
        if (label) out[STAT_KEY[label]] = Number(m[1]);
    }
    return out;
};

// Parse one Showdown set block → full set incl. nature/EVs/IVs/level.
const parseSet = (block) => {
    const lines = block.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return null;

    const head = lines[0];
    let namePart = head;
    let item = null;
    const at = head.lastIndexOf(' @ ');
    if (at !== -1) {
        namePart = head.slice(0, at).trim();
        item = head.slice(at + 3).trim();
    }

    // Species sits either as the leading token or inside a (non-gender) paren
    // when the mon is nicknamed: "Nicky (Garchomp) (M) @ Item".
    const parens = [...namePart.matchAll(/\(([^)]+)\)/g)].map((m) => m[1].trim());
    const nonGender = parens.filter((p) => !/^(M|F)$/i.test(p));
    const species = nonGender.length
        ? nonGender[nonGender.length - 1]
        : namePart.replace(/\([^)]*\)/g, '').trim();

    let ability = null;
    let tera = null;
    let nature = null;
    let level = null;
    let evs = null;
    let ivs = null;
    const moves = [];
    for (const l of lines.slice(1)) {
        if (/^Ability:/i.test(l)) ability = l.replace(/^Ability:/i, '').trim();
        else if (/^Tera Type:/i.test(l)) tera = l.replace(/^Tera Type:/i, '').trim();
        else if (/^Level:/i.test(l)) { const n = parseInt(l.replace(/^Level:/i, ''), 10); if (Number.isFinite(n)) level = n; }
        else if (/\bNature$/i.test(l)) nature = l.replace(/\s*Nature$/i, '').trim();
        else if (/^EVs:/i.test(l)) { const e = parseStatLine(l.replace(/^EVs:/i, '')); if (Object.keys(e).length) evs = e; }
        else if (/^IVs:/i.test(l)) { const iv = parseStatLine(l.replace(/^IVs:/i, '')); if (Object.keys(iv).length) ivs = iv; }
        else if (/^-\s*/.test(l)) moves.push(l.replace(/^-\s*/, '').trim());
    }

    return {
        species,
        item: item && !/^none$/i.test(item) ? item : null,
        ability: ability || null,
        tera: tera || null,
        nature: nature || null,
        level: level || null,
        evs,
        ivs,
        moves,
    };
};

const fetchPaste = async (url) => {
    if (!url) return [];
    const jsonUrl = url.replace(/\/+$/, '') + '/json';
    try {
        const data = await (await fetch(jsonUrl, { redirect: 'follow' })).json();
        if (typeof data?.paste !== 'string') return [];
        return data.paste.split(/\r?\n\s*\r?\n/).map(parseSet).filter(Boolean);
    } catch (_) {
        return [];
    }
};

// Run an async fn over items with a bounded concurrency pool.
const mapPool = async (items, limit, fn) => {
    let i = 0;
    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (i < items.length) {
            const idx = i;
            i += 1;
            await fn(items[idx], idx);
        }
    });
    await Promise.all(workers);
};

const topEntries = (map, limit) => [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

// Build a team's roster from the sheet names, ENRICHED with the full competitive
// set (item/ability/tera/nature/EVs/IVs/level/moves) mined from its pokepaste.
// Names + order + ids stay exactly as before; sets are attached by matching the
// resolved species id, so a click can show what the player actually ran.
const buildEnrichedRoster = async (monNames, pokepaste) => {
    // Resolve the authoritative sheet roster first (stable ids/names/order).
    const roster = [];
    for (const monName of monNames) {
        const id = await resolveSpeciesId(monName);
        if (id) roster.push({ id, name: monName });
    }

    // Parse the pokepaste and queue sets by species id (handles duplicates).
    const sets = await fetchPaste(pokepaste);
    const setsById = new Map();
    for (const set of sets) {
        const id = await resolveSpeciesId(set.species);
        if (!id) continue;
        if (!setsById.has(id)) setsById.set(id, []);
        setsById.get(id).push(set);
    }

    // Merge each roster entry with its matching set.
    const pokemons = roster.map((mon) => {
        const queue = setsById.get(mon.id);
        const set = queue && queue.length ? queue.shift() : null;
        if (!set) return mon;
        return {
            ...mon,
            item: set.item || undefined,
            ability: set.ability || undefined,
            tera: set.tera || undefined,
            nature: set.nature || undefined,
            level: set.level || undefined,
            evs: set.evs || undefined,
            ivs: set.ivs || undefined,
            moves: set.moves.length ? set.moves : undefined,
        };
    });
    return pokemons;
};

const spreadKey = (mon) => {
    if (!mon.nature && !mon.evs) return null;
    return JSON.stringify({ nature: mon.nature || null, evs: mon.evs || null });
};

// Aggregate per-species competitive usage from the ENRICHED tournament rosters:
// real item/ability/tera/move/EV-spread frequencies + most-common teammates +
// how many teams each species appears on (→ usage %). Pure over the baked data.
const aggregateUsage = (teams) => {
    const bump = (m, k) => { if (k) m.set(k, (m.get(k) || 0) + 1); };
    const agg = new Map();      // id → counters
    const teammates = new Map(); // id → Map(otherId → count)
    const nameById = new Map();

    teams.forEach((team, ti) => {
        const mons = team.pokemons || [];
        const ids = [...new Set(mons.map((p) => p.id))];
        for (const p of mons) {
            nameById.set(p.id, p.name);
            if (!agg.has(p.id)) {
                agg.set(p.id, { n: 0, teams: new Set(), items: new Map(), abilities: new Map(), tera: new Map(), moves: new Map(), spreads: new Map() });
            }
            const e = agg.get(p.id);
            e.n += 1;
            e.teams.add(ti);
            bump(e.items, p.item);
            bump(e.abilities, p.ability);
            bump(e.tera, p.tera);
            for (const mv of p.moves || []) bump(e.moves, mv);
            const sk = spreadKey(p);
            if (sk) e.spreads.set(sk, (e.spreads.get(sk) || 0) + 1);
        }
        for (const a of ids) {
            if (!teammates.has(a)) teammates.set(a, new Map());
            const tm = teammates.get(a);
            for (const b of ids) if (a !== b) tm.set(b, (tm.get(b) || 0) + 1);
        }
    });

    const byId = {};
    for (const [id, e] of agg) {
        if (e.n === 0) continue;
        const tm = teammates.get(id) || new Map();
        byId[id] = {
            n: e.n,
            teams: e.teams.size,
            items: topEntries(e.items, 5).map(([name, count]) => ({ name, slug: itemSlug(name), count })),
            abilities: topEntries(e.abilities, 3).map(([name, count]) => ({ name, count })),
            tera: topEntries(e.tera, 5).map(([name, count]) => ({ name, count })),
            moves: topEntries(e.moves, 12).map(([name, count]) => ({ name, count })),
            spreads: topEntries(e.spreads, 3).map(([key, count]) => ({ ...JSON.parse(key), count })),
            teammates: topEntries(tm, 8).map(([tid, count]) => ({ id: tid, name: nameById.get(tid) || `#${tid}`, count })),
        };
    }
    return byId;
};

// Discover every "Featured Teams" tab (results-only) in the workbook, so new
// regulations/championships are picked up automatically without a code change.
const discoverFeaturedTabs = async () => {
    try {
        const html = await fetchText(WORKBOOK_HTML);
        const gids = [...new Set([...html.matchAll(/gid=(\d+)/g)].map((m) => m[1]))];
        const found = [];
        for (const gid of gids) {
            try {
                // Tiny probe (first rows only) to read the tab title cheaply.
                const probe = await fetchText(`${csvUrl(gid)}&tq=${encodeURIComponent('limit 2')}`);
                const title = parseCSV(probe).flat().find((c) => /Repository\s*\(/i.test(c)) || '';
                if (/featured/i.test(title)) found.push({ gid, format: deriveFormat(title) });
            } catch (_) { /* skip unreadable tab */ }
        }
        return found;
    } catch (_) {
        return [];
    }
};

const main = async () => {
    const generatedAt = new Date().toISOString();
    const rawTeams = [];

    const discovered = await discoverFeaturedTabs();
    const tabs = discovered.length ? discovered : FALLBACK_TABS;
    console.log(`Using ${tabs.length} featured tab(s): ${tabs.map((t) => t.format).join(', ')}`);

    for (const tab of tabs) {
        console.log(`Fetching tab ${tab.gid} (${tab.format})…`);
        const rows = parseCSV(await fetchText(csvUrl(tab.gid)));
        for (const row of rows) {
            const mons = [];
            for (let c = COL.monStart; c <= COL.monEnd; c++) {
                const v = (row[c] || '').trim();
                if (v) mons.push(v);
            }
            const tournament = (row[COL.tournament] || '').trim();
            const placement = cleanPlacement(row[COL.placement] || '');
            // A valid featured-team row has a full roster + a real tournament + placement.
            if (mons.length < 6 || !tournament || !placement || /tournament/i.test(tournament)) continue;

            rawTeams.push({
                title: (row[COL.title] || '').trim(),
                player: (row[COL.player] || '').trim(),
                author: (row[COL.author] || '').trim(),
                tournament,
                placement,
                date: (row[COL.date] || '').trim(),
                format: tab.format,
                pokepaste: (row[COL.paste] || '').trim(),
                sourceUrl: (row[COL.source] || '').trim(),
                medal: (row[COL.medal] || '').trim(),
                monNames: mons,
            });
        }
    }

    // Most recent first, then cap.
    rawTeams.sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0));
    const capped = rawTeams.slice(0, MAX_TEAMS);
    if (rawTeams.length > MAX_TEAMS) {
        console.log(`Capping ${rawTeams.length} teams to the ${MAX_TEAMS} most recent.`);
    }

    // Stable, unique, URL-safe team id (drives the /tournaments/team/:id route).
    const usedIds = new Set();
    const teamId = (tm, idx) => {
        const pasteSlug = (tm.pokepaste || '').replace(/\/+$/, '').split('/').pop();
        let base = pasteSlug && /^[a-z0-9]+$/i.test(pasteSlug)
            ? pasteSlug
            : itemSlug(`${tm.tournament}-${tm.player || tm.author}-${tm.date}`) || `team-${idx}`;
        let id = base;
        let n = 2;
        while (usedIds.has(id)) id = `${base}-${n++}`;
        usedIds.add(id);
        return id;
    };

    console.log(`Resolving rosters + mining sets for ${capped.length} teams…`);
    const teams = [];
    let done = 0;
    await mapPool(capped, 6, async (tm, idx) => {
        const pokemons = await buildEnrichedRoster(tm.monNames, tm.pokepaste);
        done += 1;
        if (done % 25 === 0) console.log(`  …${done}/${capped.length} teams`);
        if (pokemons.length < 4) return; // skip teams we mostly couldn't resolve
        const { monNames, medal, ...rest } = tm;
        teams.push({ id: teamId(tm, idx), ...rest, featured: Boolean(medal), pokemons, _order: idx });
    });
    // mapPool completes out of order — restore the date-sorted order from `capped`.
    teams.sort((a, b) => a._order - b._order);
    for (const t of teams) delete t._order;

    // Never clobber a good dataset with an empty one (e.g. source briefly down).
    if (teams.length === 0) {
        console.warn('No teams resolved — keeping the existing tournaments.json.');
        return;
    }

    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(
        path.join(DATA_DIR, 'tournaments.json'),
        `${JSON.stringify({ generatedAt, source: `https://docs.google.com/spreadsheets/d/${SHEET_ID}`, count: teams.length, teams }, null, 2)}\n`,
        'utf8'
    );
    console.log(`Wrote ${teams.length} tournament teams to public/data/tournaments.json`);

    // Aggregate per-species competitive usage from the enriched rosters (item /
    // ability / tera / move / EV-spread frequencies + teammates + usage %). Never
    // let this fail the dataset write above — it's an enrichment, not a gate.
    try {
        const byId = aggregateUsage(teams);
        const speciesCount = Object.keys(byId).length;
        if (speciesCount > 0) {
            await fs.writeFile(
                path.join(DATA_DIR, 'competitive-usage.json'),
                `${JSON.stringify({ generatedAt, source: 'pokepaste sets from tournament teams', species: speciesCount, totalTeams: teams.length, byId }, null, 2)}\n`,
                'utf8'
            );
            console.log(`Wrote competitive usage for ${speciesCount} species (of ${teams.length} teams) to public/data/competitive-usage.json`);
        } else {
            console.warn('No competitive usage mined — keeping existing competitive-usage.json.');
        }
    } catch (err) {
        console.warn('Competitive usage mining failed (keeping existing):', err?.message || err);
    }
};

// Build-safe: a scrape failure must never fail the build/deploy — the last good
// committed tournaments.json stays in place and the site ships with it.
main().catch((err) => {
    console.error('Tournament refresh failed (keeping existing data):', err?.message || err);
    process.exitCode = 0;
});
