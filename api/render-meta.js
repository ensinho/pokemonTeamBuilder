import fs from 'fs';
import path from 'path';
import { escapeHtml, fetchTopicMeta, topicIdFromUrl } from './_lib/forumMeta.js';
import { renderSnapshot } from './_lib/seoSnapshot.js';
import { fetchSharedTeam, sharedTeamIdFrom } from './_lib/sharedTeam.js';
import { LANGUAGES, LOCALE_TAG, OG_LOCALE, alternateUrls, localizePath, splitLocalePath } from '../src/utils/localePath.js';
import { SITE_URL, jsonLdScript, pageMeta, structuredData } from '../src/utils/seoPages.js';
import { tournamentPresence } from '../src/utils/tournamentPresence.js';
import { bestTeamsSummary } from '../src/utils/bestTeams.js';
import { decodeChallengeResult, decodePuzzleResult } from '../src/utils/resultShareCode.js';

// Cache the pokemon index + tournament teams in memory across lambda invocations
let pokemons = [];
try {
    const jsonPath = path.join(process.cwd(), 'dist', 'data', 'pokemon-index.json');
    if (fs.existsSync(jsonPath)) {
        const data = fs.readFileSync(jsonPath, 'utf8');
        pokemons = JSON.parse(data).pokemons || [];
        console.log(`Loaded ${pokemons.length} Pokémon for dynamic meta tags.`);
    } else {
        console.warn("pokemon-index.json not found in dist, meta titles may use fallbacks.");
    }
} catch (e) {
    console.error("Failed to load pokemon-index.json in render-meta:", e);
}

let tournamentTeams = [];
try {
    const jsonPath = path.join(process.cwd(), 'dist', 'data', 'tournaments.json');
    if (fs.existsSync(jsonPath)) {
        const data = fs.readFileSync(jsonPath, 'utf8');
        tournamentTeams = JSON.parse(data).teams || [];
    }
} catch (e) {
    console.error("Failed to load tournaments.json in render-meta:", e);
}

function findPokemon(param) {
    if (!param) return null;
    let clean = param;
    try { clean = decodeURIComponent(param); } catch { /* keep the raw slug */ }
    clean = clean.toLowerCase().trim().replace(/\s+/g, '-');
    if (/^\d+$/.test(clean)) {
        const id = parseInt(clean, 10);
        return pokemons.find(p => p.id === id) || null;
    }
    return pokemons.find(p => p.name.toLowerCase() === clean) || null;
}

const RESULT_DECODERS = {
    '/pokepuzzle': ['puzzle', decodePuzzleResult],
    '/challenge': ['challenge', decodeChallengeResult],
};

function findTeam(id) {
    if (!id) return null;
    return tournamentTeams.find(t => t.id === id) || null;
}

/**
 * The page for one request: the shell with this route's title, description,
 * canonical, hreflang alternates, Open Graph, JSON-LD and prerendered text,
 * all in the language its URL names (`/pt/...` is Portuguese, everything else
 * English — never the Accept-Language header, so a crawler indexes each
 * version at its own URL). Pure apart from the data passed in, so the test
 * can drive it without a filesystem.
 */
export function buildPage(shell, { urlPath, search = '', topicMeta = null, sharedTeam = null, data = {} } = {}) {
    const findP = data.findPokemon || findPokemon;
    const findT = data.findTeam || findTeam;
    const allPokemons = data.pokemons || pokemons;
    const allTeams = data.tournamentTeams || tournamentTeams;
    let html = shell;

    const { language, appPath: rawAppPath } = splitLocalePath(urlPath);
    // `/pokedex/` and `/pokedex` are one page.
    let appPath = rawAppPath.length > 1 ? rawAppPath.replace(/\/+$/, '') : rawAppPath;
    // A legacy share link (/builder?team=id) is that team's page now: same
    // card, and the page's URL as its canonical.
    if (sharedTeam && appPath === '/builder') appPath = `/t/${sharedTeam.id}`;
    const segments = appPath.split('/').filter(Boolean);

    const context = {};
    if ((segments[0] === 'pokemon' || segments[0] === 'meta') && segments[1]) context.pokemon = findP(segments[1]);
    if (segments[0] === 'tournaments' && segments[1] === 'team' && segments[2]) context.team = findT(segments[2]);
    if (segments[0] === 't' && sharedTeam) context.sharedTeam = sharedTeam;
    // A shared daily result: its own card, the game's page underneath.
    const resultCode = new URLSearchParams(search).get('r');
    if (resultCode && RESULT_DECODERS[appPath]) {
        const [kind, decode] = RESULT_DECODERS[appPath];
        const decoded = decode(resultCode);
        if (decoded) context.result = { kind, code: resultCode, data: decoded };
    }

    const meta = pageMeta(appPath, language, context);
    let title = meta.title;
    let description = meta.description;
    let canonicalSearch = '';

    // A shared post unfurls as that post (forumMeta.js); any miss keeps the generic feed card.
    if (appPath === '/feed' && topicMeta) {
        title = topicMeta.title;
        description = topicMeta.description;
        canonicalSearch = `?topic=${encodeURIComponent(topicMeta.id)}`;
    }

    // Pages reachable by both numeric id and slug (/pokemon, /meta) declare the
    // slug form canonical, so both consolidate to one indexable URL per language.
    const canonicalUrl = `${SITE_URL}${localizePath(meta.canonicalPath, language)}${canonicalSearch}`;
    // A result link keeps its `?r=` in og:url: Facebook and WhatsApp re-read
    // the og:url page and would otherwise show the game's generic card. The
    // canonical stays the bare game page, so variants never get indexed.
    const url = canonicalSearch
        ? canonicalUrl
        : `${SITE_URL}${urlPath}${context.result ? `?r=${encodeURIComponent(context.result.code)}` : ''}`;
    const alternates = alternateUrls(SITE_URL, meta.canonicalPath, canonicalSearch);

    // Escaped, because a forum title is user text; replaced through a function,
    // because a replacement *string* expands `$&`/`$1` — a title containing
    // them would rewrite the page.
    const set = (pattern, tag) => { html = html.replace(pattern, () => tag); };
    const esc = { title: escapeHtml(title), description: escapeHtml(description), image: escapeHtml(meta.image), url: escapeHtml(url), canonical: escapeHtml(canonicalUrl) };
    set(/<html lang="[^"]*"/i, `<html lang="${LOCALE_TAG[language]}"`);
    set(/<title>[^<]*<\/title>/i, `<title>${esc.title}</title>`);
    set(/<meta name="description" content="[^"]*"\s*\/?>/i, `<meta name="description" content="${esc.description}" />`);
    set(/<link rel="canonical" href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${esc.canonical}" />`);

    set(/<meta property="og:title" content="[^"]*"\s*\/?>/i, `<meta property="og:title" content="${esc.title}" />`);
    set(/<meta property="og:description" content="[^"]*"\s*\/?>/i, `<meta property="og:description" content="${esc.description}" />`);
    set(/<meta property="og:image" content="[^"]*"\s*\/?>/i, `<meta property="og:image" content="${esc.image}" />`);
    set(/<meta property="og:url" content="[^"]*"\s*\/?>/i, `<meta property="og:url" content="${esc.url}" />`);

    set(/<meta name="twitter:title" content="[^"]*"\s*\/?>/i, `<meta name="twitter:title" content="${esc.title}" />`);
    set(/<meta name="twitter:description" content="[^"]*"\s*\/?>/i, `<meta name="twitter:description" content="${esc.description}" />`);
    set(/<meta name="twitter:image" content="[^"]*"\s*\/?>/i, `<meta name="twitter:image" content="${esc.image}" />`);

    const headExtras = [
        ...alternates.map((a) => `<link rel="alternate" hreflang="${a.hreflang}" href="${escapeHtml(a.href)}" />`),
        `<link rel="alternate" hreflang="x-default" href="${escapeHtml(alternates.find((a) => a.language === 'en').href)}" />`,
        `<meta property="og:locale" content="${OG_LOCALE[language]}" />`,
        ...LANGUAGES.filter((l) => l !== language).map((l) => `<meta property="og:locale:alternate" content="${OG_LOCALE[l]}" />`),
        ...structuredData(meta, language).map((block) => `<script type="application/ld+json">${jsonLdScript(block)}</script>`),
    ].join('\n    ');
    set(/<\/head>/i, `    ${headExtras}\n  </head>`);

    const presence = context.pokemon ? tournamentPresence(allTeams, context.pokemon.id) : null;
    const bestTeams = meta.key === 'bestTeams' ? bestTeamsSummary(allTeams) : null;
    const snapshot = renderSnapshot({ meta: { ...meta, title, description }, language, appPath, pokemon: context.pokemon, team: context.team, sharedTeam: context.sharedTeam, presence, bestTeams, pokemons: allPokemons });
    set(/<div id="root"><\/div>/i, `<div id="root">${snapshot}</div>`);

    return { html, language, meta };
}

export default async function handler(req, res) {
    const [urlPath, query = ''] = req.url.split('?');

    // Read the compiled index.html file
    let shell = '';
    const htmlPath = path.join(process.cwd(), 'dist', 'index.html');

    try {
        if (fs.existsSync(htmlPath)) {
            shell = fs.readFileSync(htmlPath, 'utf8');
        } else {
            console.error("Compiled index.html not found at:", htmlPath);
            return res.status(404).send("Application shell not found. Please trigger a deployment build.");
        }
    } catch (err) {
        console.error("Error reading index.html in serverless function:", err);
        return res.status(500).send("Internal Server Error: " + err.message);
    }

    // A page whose preview depends on a live lookup that missed (a timeout, a
    // cold start) must not pin the generic card in the edge cache for a day.
    let previewMissed = false;
    let topicMeta = null;
    const { appPath } = splitLocalePath(urlPath);
    if (appPath === '/feed') {
        const topicId = topicIdFromUrl(`/feed${query ? `?${query}` : ''}`);
        const fetched = topicId ? await fetchTopicMeta(topicId) : null;
        if (fetched) topicMeta = { ...fetched, id: topicId };
        else if (topicId) previewMissed = true;
    }
    let sharedTeam = null;
    const sharedTeamId = sharedTeamIdFrom(appPath.replace(/\/+$/, '') || '/', query);
    if (sharedTeamId) {
        sharedTeam = await fetchSharedTeam(sharedTeamId);
        if (!sharedTeam) previewMissed = true;
    }

    const { html } = buildPage(shell, { urlPath, search: query, topicMeta, sharedTeam });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    // Cache at the Edge for 1 day, stale-while-revalidate for 1 hour to allow rapid updates;
    // a missed preview is retried after a minute instead.
    res.setHeader('Cache-Control', previewMissed
        ? 'public, max-age=60, s-maxage=60'
        : 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=3600');

    return res.status(200).send(html);
}
