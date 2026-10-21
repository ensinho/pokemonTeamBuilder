import fs from 'node:fs/promises';
import path from 'node:path';
import { LANGUAGES, LOCALE_TAG, localizePath } from '../src/utils/localePath.js';
import { TYPE_IDS } from '../src/utils/seoPages.js';

// Builds public/sitemap.xml so search engines can discover every Pokémon,
// competitive-usage, and tournament-team page without relying on crawling
// alone. Reads the data files other prebuild scripts already produce, so this
// must run last in the `prebuild` chain (package.json).
// Run: node scripts/build-sitemap.mjs
//
// Every page is listed once per language (`/x` and `/pt/x`, utils/localePath.js),
// each entry naming all its versions through xhtml:link hreflang alternates —
// Google's sitemap form of the same set api/render-meta.js puts in each page.

const SITE_URL = 'https://pokemonbuilder.app';
const DATA_DIR = path.join(process.cwd(), 'public', 'data');
const PUBLIC_DIR = path.join(process.cwd(), 'public');

// Static, publicly indexable routes. Excludes anything user-account-specific
// (/favorites, /teams, /teams/:id, /profile, /admin) — those show a different
// visitor's own private data at the same URL, so there's nothing for a
// logged-out crawler to index there.
const STATIC_ROUTES = [
    { loc: '/', changefreq: 'daily', priority: '1.0' },
    { loc: '/pokedex', changefreq: 'weekly', priority: '0.8' },
    { loc: '/builder', changefreq: 'weekly', priority: '0.8' },
    { loc: '/meta', changefreq: 'daily', priority: '0.8' },
    { loc: '/tournaments', changefreq: 'daily', priority: '0.7' },
    { loc: '/moves', changefreq: 'monthly', priority: '0.6' },
    { loc: '/abilities', changefreq: 'monthly', priority: '0.6' },
    { loc: '/items', changefreq: 'monthly', priority: '0.6' },
    { loc: '/gyms', changefreq: 'monthly', priority: '0.6' },
    { loc: '/damage-calculator', changefreq: 'monthly', priority: '0.6' },
    { loc: '/speed-tiers', changefreq: 'monthly', priority: '0.6' },
    { loc: '/quiz', changefreq: 'monthly', priority: '0.5' },
    { loc: '/journeys', changefreq: 'monthly', priority: '0.5' },
    { loc: '/pokepuzzle', changefreq: 'monthly', priority: '0.5' },
    { loc: '/challenge', changefreq: 'daily', priority: '0.5' },
    { loc: '/feed', changefreq: 'daily', priority: '0.5' },
    { loc: '/types', changefreq: 'monthly', priority: '0.7' },
];

const readJson = async (...parts) => {
    try {
        return JSON.parse(await fs.readFile(path.join(...parts), 'utf8'));
    } catch {
        return null;
    }
};

const xmlEscape = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const absolute = (loc, language) => xmlEscape(SITE_URL + localizePath(loc, language));

const alternates = (loc) => [
    ...LANGUAGES.map((language) => `    <xhtml:link rel="alternate" hreflang="${LOCALE_TAG[language]}" href="${absolute(loc, language)}"/>`),
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${absolute(loc, LANGUAGES[0])}"/>`,
].join('\n');

const urlEntries = ({ loc, changefreq, priority }) => LANGUAGES.map((language) => `  <url>
    <loc>${absolute(loc, language)}</loc>
${alternates(loc)}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`).join('\n');

const main = async () => {
    const entries = [...STATIC_ROUTES];

    const pokemonIndex = await readJson(DATA_DIR, 'pokemon-index.json');
    const pokemons = pokemonIndex?.pokemons || [];
    for (const p of pokemons) {
        if (p?.name) entries.push({ loc: `/pokemon/${p.name}`, changefreq: 'monthly', priority: '0.6' });
    }

    // /meta/:name only for Pokémon that actually have usage data in some format —
    // an empty usage page for an unused Pokémon is thin content not worth indexing.
    const usageIndex = await readJson(DATA_DIR, 'usage-index.json');
    if (usageIndex?.formats?.length && pokemons.length) {
        const nameById = new Map(pokemons.map((p) => [String(p.id), p.name]));
        const usedIds = new Set();
        for (const fmt of usageIndex.formats) {
            const fmtData = fmt?.file ? await readJson(DATA_DIR, fmt.file) : null;
            for (const id of Object.keys(fmtData?.byId || {})) usedIds.add(id);
        }
        for (const id of usedIds) {
            const name = nameById.get(id);
            if (name) entries.push({ loc: `/meta/${name}`, changefreq: 'weekly', priority: '0.6' });
        }
    }

    for (const type of TYPE_IDS) {
        entries.push({ loc: `/types/${type}`, changefreq: 'monthly', priority: '0.7' });
    }

    // /items/:name for the battle items the Items page lists — not every one
    // of PokéAPI's 2000 (key items, TMs), which would be thin pages.
    const battleItems = await readJson(DATA_DIR, 'battle-items.json');
    for (const item of battleItems?.items || []) {
        if (item?.slug) entries.push({ loc: `/items/${item.slug}`, changefreq: 'monthly', priority: '0.4' });
    }

    const tournaments = await readJson(DATA_DIR, 'tournaments.json');
    for (const team of tournaments?.teams || []) {
        if (team?.id) entries.push({ loc: `/tournaments/team/${team.id}`, changefreq: 'monthly', priority: '0.5' });
    }

    // /moves/:name and /abilities/:name detail pages. There is no local index
    // with the API name slugs (move-types.json keys are normalized), so ask
    // PokéAPI for the lists directly; skip silently when offline — the script
    // is failure-safe and the rest of the sitemap still gets written.
    const fetchApiNames = async (url) => {
        try {
            const res = await fetch(url);
            if (!res.ok) return [];
            const data = await res.json();
            return (data?.results || []).map((r) => r?.name).filter(Boolean);
        } catch {
            return [];
        }
    };
    for (const name of await fetchApiNames('https://pokeapi.co/api/v2/move?limit=1000')) {
        entries.push({ loc: `/moves/${name}`, changefreq: 'monthly', priority: '0.5' });
    }
    for (const name of await fetchApiNames('https://pokeapi.co/api/v2/ability?limit=500')) {
        entries.push({ loc: `/abilities/${name}`, changefreq: 'monthly', priority: '0.5' });
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.map(urlEntries).join('\n')}
</urlset>
`;

    await fs.mkdir(PUBLIC_DIR, { recursive: true });
    await fs.writeFile(path.join(PUBLIC_DIR, 'sitemap.xml'), xml, 'utf8');
    console.log(`Wrote ${entries.length} pages × ${LANGUAGES.length} languages to public/sitemap.xml`);
};

// Build-safe: never fail the build/deploy over an optional enrichment.
main().catch((err) => {
    console.error('Sitemap build failed (keeping existing sitemap.xml):', err?.message || err);
    process.exitCode = 0;
});
