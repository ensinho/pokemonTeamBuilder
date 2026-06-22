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

    console.log(`Resolving species ids for ${capped.length} teams…`);
    const teams = [];
    for (const tm of capped) {
        const pokemons = [];
        for (const monName of tm.monNames) {
            const id = await resolveSpeciesId(monName);
            if (id) pokemons.push({ id, name: monName });
        }
        if (pokemons.length < 4) continue; // skip teams we mostly couldn't resolve
        const { monNames, medal, ...rest } = tm;
        teams.push({ ...rest, featured: Boolean(medal), pokemons });
    }

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
};

// Build-safe: a scrape failure must never fail the build/deploy — the last good
// committed tournaments.json stays in place and the site ships with it.
main().catch((err) => {
    console.error('Tournament refresh failed (keeping existing data):', err?.message || err);
    process.exitCode = 0;
});
