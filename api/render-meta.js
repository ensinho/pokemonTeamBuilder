import fs from 'fs';
import path from 'path';
import { escapeHtml, fetchTopicMeta, topicIdFromUrl } from './_lib/forumMeta.js';
import { renderSnapshot } from './_lib/seoSnapshot.js';
import { fetchSharedTeam, sharedTeamIdFrom } from './_lib/sharedTeam.js';
import { LANGUAGES, LOCALE_TAG, OG_LOCALE, alternateUrls, localizePath, splitLocalePath } from '../src/utils/localePath.js';
import { SITE_NAME, SITE_URL, jsonLdScript, pageMeta, structuredData } from '../src/utils/seoPages.js';
import { translate } from '../src/utils/translateCore.js';
import { guideContent } from '../src/content/guides.js';
import { usageRows } from '../src/utils/metaFormats.js';
import { tournamentPresence } from '../src/utils/tournamentPresence.js';
import { bestTeamsSummary } from '../src/utils/bestTeams.js';
import { mostUsedBuild } from '../src/utils/mostUsedBuild.js';
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
let tournamentsGeneratedAt = null;
try {
    const jsonPath = path.join(process.cwd(), 'dist', 'data', 'tournaments.json');
    if (fs.existsSync(jsonPath)) {
        const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        tournamentTeams = data.teams || [];
        tournamentsGeneratedAt = data.generatedAt || null;
    }
} catch (e) {
    console.error("Failed to load tournaments.json in render-meta:", e);
}

// What a move, ability or item page says (2026-10-30): moves from the battle
// tooltips' dex, abilities and items from seo-dex.json (scripts/build-seo-dex.mjs).
// Keyed by Showdown id — the page slug without its hyphens.
let dex = null;
try {
    const dir = path.join(process.cwd(), 'dist', 'data');
    const battle = JSON.parse(fs.readFileSync(path.join(dir, 'battle-dex.json'), 'utf8'));
    const seo = JSON.parse(fs.readFileSync(path.join(dir, 'seo-dex.json'), 'utf8'));
    dex = { move: battle.moves || {}, ability: seo.abilities || {}, item: seo.items || {} };
} catch (e) {
    console.error("Failed to load the move/ability/item dex in render-meta:", e?.message || e);
}
const dexId = (slug) => {
    let text = slug || '';
    try { text = decodeURIComponent(text); } catch { /* keep the raw slug */ }
    return text.toLowerCase().replace(/[^a-z0-9]/g, '');
};

// The default format's usage (what the Pokémon page's "Most used build" card
// reads): usage-index.json names the format, usage/<id>.json holds it.
let defaultUsage = null;
try {
    const dir = path.join(process.cwd(), 'dist', 'data');
    const index = JSON.parse(fs.readFileSync(path.join(dir, 'usage-index.json'), 'utf8'));
    const file = path.join(dir, 'usage', `${index.default}.json`);
    if (index.default && fs.existsSync(file)) {
        const usage = JSON.parse(fs.readFileSync(file, 'utf8'));
        defaultUsage = {
            label: usage.format?.label || index.default,
            kind: usage.format?.kind || null,
            month: usage.month || index.month || null,
            totalBattles: usage.totalBattles || null,
            byId: usage.byId || {},
            // The ranking Meta & usage opens on (its default rating band).
            top: usageRows(usage, usage.detailCutoff ?? usage.format?.cutoff ?? null),
        };
    }
} catch (e) {
    console.error("Failed to load the default usage format in render-meta:", e?.message || e);
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

/**
 * App routes that exist but are nobody's search result — the visitor's own
 * pages (robots.txt already disallows most) and old addresses the app
 * redirects. Served with `noindex`; any other path the table does not know
 * is a 404.
 */
const NOINDEX_ROUTES = ['/favorites', '/teams', '/friends', '/battles', '/profile', '/admin', '/guesser', '/pokeroom'];
const isNoindexRoute = (appPath) => NOINDEX_ROUTES.some((r) => appPath === r || appPath.startsWith(`${r}/`));

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
    const usage = data.usage === undefined ? defaultUsage : data.usage;
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
    const allDex = data.dex === undefined ? dex : data.dex;
    const DETAIL = { moves: 'move', abilities: 'ability', items: 'item' };
    let entity = null;
    if (DETAIL[segments[0]] && segments[1] && !segments[2] && allDex) {
        const kind = DETAIL[segments[0]];
        const entry = allDex[kind]?.[dexId(segments[1])];
        if (entry) {
            entity = { kind, data: entry };
            context.name = entry[0];
        }
    }
    // A shared daily result: its own card, the game's page underneath.
    const resultCode = new URLSearchParams(search).get('r');
    if (resultCode && RESULT_DECODERS[appPath]) {
        const [kind, decode] = RESULT_DECODERS[appPath];
        const decoded = decode(resultCode);
        if (decoded) context.result = { kind, code: resultCode, data: decoded };
    }

    let meta = pageMeta(appPath, language, context);

    // Does the page exist, and should it be indexed? (2026-10-30: every path
    // answered 200 with an indexable page — /pokemon/notreal became
    // "Notreal: weaknesses, stats & builds".) Lookups only count as a miss
    // when their data loaded; a cold start without it keeps the old answer.
    let status = 200;
    let indexable = true;
    if (meta.isStatic || meta.key === 'type' || meta.key === 'guide' || meta.key === 'sharedTeamPage') {
        // exists
    } else if (meta.key === 'pokemon' || meta.key === 'metaPokemon') {
        if (!context.pokemon && allPokemons.length) status = 404;
    } else if (meta.key === 'tournamentTeam') {
        if (!context.team && allTeams.length) status = 404;
    } else if (meta.key === 'move' || meta.key === 'ability' || meta.key === 'item') {
        // The app still draws a page from PokéAPI for a slug the dex lacks
        // (a brand-new move, say), so it stays a page, but not an indexed one.
        if (!entity && allDex) indexable = false;
    } else if (meta.key === 'sharedTeam' || isNoindexRoute(appPath)) {
        indexable = false;
    } else {
        status = 404;
    }
    if (status === 404) {
        indexable = false;
        const t = (key) => translate(language, key);
        meta = { ...meta, key: 'notFound', title: `${t('seo.notFound.title')} | ${SITE_NAME}`, description: t('seo.notFound.description'), breadcrumbs: [] };
    }

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

    const guide = meta.key === 'guide' ? guideContent(meta.guide, language) : null;
    const headExtras = [
        ...alternates.map((a) => `<link rel="alternate" hreflang="${a.hreflang}" href="${escapeHtml(a.href)}" />`),
        `<link rel="alternate" hreflang="x-default" href="${escapeHtml(alternates.find((a) => a.language === 'en').href)}" />`,
        `<meta property="og:locale" content="${OG_LOCALE[language]}" />`,
        ...LANGUAGES.filter((l) => l !== language).map((l) => `<meta property="og:locale:alternate" content="${OG_LOCALE[l]}" />`),
        ...(indexable ? [] : ['<meta name="robots" content="noindex, follow" />']),
        ...structuredData(meta, language, { faq: guide?.faq }).map((block) => `<script type="application/ld+json">${jsonLdScript(block)}</script>`),
    ].join('\n    ');
    set(/<\/head>/i, `    ${headExtras}\n  </head>`);

    const presence = context.pokemon ? tournamentPresence(allTeams, context.pokemon.id) : null;
    const bestTeams = meta.key === 'bestTeams' ? bestTeamsSummary(allTeams) : null;
    const buildData = context.pokemon && usage ? mostUsedBuild(usage.byId[context.pokemon.id]) : null;
    const build = buildData ? { format: usage.label, data: buildData } : null;
    const notes = meta.key === 'bestTeams'
        ? { generatedAt: data.tournamentsGeneratedAt ?? tournamentsGeneratedAt }
        : meta.key === 'meta' && usage
            ? { format: usage.label, battles: usage.totalBattles, month: usage.month, kind: usage.kind }
            : null;
    const snapshot = renderSnapshot({
        meta: { ...meta, title, description }, language, appPath,
        pokemon: context.pokemon, team: context.team, sharedTeam: context.sharedTeam,
        presence, bestTeams, build, pokemons: allPokemons,
        entity, guide, usage: meta.key === 'meta' ? usage : null, notes, notFound: status === 404,
    });
    set(/<div id="root"><\/div>/i, `<div id="root">${snapshot}</div>`);

    return { html, language, meta, status, indexable };
}

export default async function handler(req, res) {
    const [urlPath, query = ''] = req.url.split('?');

    // Read the compiled index.html file
    // The pristine shell. dist/index.html is the English home already rendered
    // (scripts/lib/prerenderHome.mjs — Vercel serves "/" as that static file,
    // never through this function), so the template is saved beside it.
    let shell = '';
    const shellPath = path.join(process.cwd(), 'dist', 'shell.html');
    const htmlPath = fs.existsSync(shellPath) ? shellPath : path.join(process.cwd(), 'dist', 'index.html');

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

    const { html, status } = buildPage(shell, { urlPath, search: query, topicMeta, sharedTeam });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    // Cache at the Edge for 1 day, stale-while-revalidate for 1 hour to allow rapid updates;
    // a missed preview is retried after a minute instead.
    res.setHeader('Cache-Control', previewMissed
        ? 'public, max-age=60, s-maxage=60'
        : 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=3600');

    return res.status(status).send(html);
}
