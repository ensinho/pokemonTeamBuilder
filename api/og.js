// GET /api/og — every link-preview picture the site draws (PNG, 1200 × 630).
// One endpoint for all of them keeps the function count where it is
// (CLAUDE.md, 12 per deploy). The trees are api/_lib/ogImage.js.
//
//   ?page=<key>          a section page (`/builder`, `/games`…); `home` also
//                        takes `&format=square` (1200 × 1200)
//   ?pokemon=<id>        a Pokémon's page          ?type=<type>   a type's page
//   ?move=<id> | ?ability=<id> | ?item=<id>   a dex page (Showdown id)
//   ?guide=<slug>        a guide                   ?tteam=<id>    a tournament team
//   ?team=<id>           a shared team (`/t/:id`)
//   ?puzzle= | ?challenge= | ?tierlist=   a shared result (utils/resultShareCode.js)
//   &lang=pt             the copy's language
//
// Static imports are builtins and dependency-free local modules only (the
// battle-turn rule, CLAUDE.md): satori and resvg load inside the handler, so a
// failure anywhere answers with the site's default card instead of killing
// the function. Any miss — unknown id, slow Firestore, a render error — is a
// 302 to /og-image.png, never a broken image in someone's chat.

import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fetchSharedTeam } from './_lib/sharedTeam.js';
import {
    CHAMPION_ACE, GUIDE_ART, HOME_CARD_IDS, OG_SIZE, OG_SQUARE, PAGE_CARDS, RESULT_DECODERS,
    abilityCardTree, artworkUrl, decodeTierList, guideCardTree, homeCardTree, itemCardTree, keepFittingCells,
    moveCardTree, pageCardIds, pageCardTree, pokemonCardTree, resultCardTree, strongestOfType, teamCardTree,
    tierListCardIds, tierListCardTree, tournamentTeamCardTree, typeCardTree, guideMeta,
} from './_lib/ogImage.js';

const require = createRequire(import.meta.url);
const IMAGE_TIMEOUT_MS = 2500;

let depsPromise = null;
const loadDeps = () => {
    if (!depsPromise) {
        depsPromise = (async () => {
            const [{ default: satori }, resvg, wasm, regular, bold] = await Promise.all([
                import('satori'),
                import('@resvg/resvg-wasm'),
                readFile(require.resolve('@resvg/resvg-wasm/index_bg.wasm')),
                readFile(require.resolve('@fontsource/space-grotesk/files/space-grotesk-latin-500-normal.woff')),
                readFile(require.resolve('@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff')),
            ]);
            await resvg.initWasm(wasm);
            const fonts = [
                { name: 'Space Grotesk', data: regular, weight: 500, style: 'normal' },
                { name: 'Space Grotesk', data: bold, weight: 700, style: 'normal' },
            ];
            return { satori, Resvg: resvg.Resvg, fonts };
        })().catch((err) => { depsPromise = null; throw err; });
    }
    return depsPromise;
};

// ── Files on disk: dist/ in a deployment (vercel.json includeFiles),
// public/ or src/ in a local run. Each read once per instance. ─────────────

const firstFile = async (candidates, encoding) => {
    for (const file of candidates) {
        try { return await readFile(path.join(process.cwd(), file), encoding); } catch { /* try the next place */ }
    }
    return null;
};
const memo = (load) => { let p = null; return () => (p ||= load()); };
const dataUri = (bytes, mime) => (bytes ? `data:${mime};base64,${bytes.toString('base64')}` : null);

const TYPE_FILES = ['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'];
const TYPE_IDS_SAFE = new Set(TYPE_FILES);

/** The wordmark, the mascot and the type icons, as data URIs. */
const loadAssets = memo(async () => {
    const [wordmark, mascot, ...icons] = await Promise.all([
        firstFile(['dist/logo-wordmark.svg', 'public/logo-wordmark.svg']),
        firstFile(['dist/android-chrome-512x512.png', 'public/android-chrome-512x512.png']),
        ...TYPE_FILES.map((type) => firstFile([`src/assets/typeIcons/${type[0].toUpperCase()}${type.slice(1)}_icon_LA.png`])),
    ]);
    return {
        wordmark: dataUri(wordmark, 'image/svg+xml'),
        mascot: dataUri(mascot, 'image/png'),
        typeIcons: Object.fromEntries(TYPE_FILES.map((type, i) => [type, dataUri(icons[i], 'image/png')]).filter(([, uri]) => uri)),
    };
});
const safeAssets = async () => { try { return await loadAssets(); } catch { return {}; } };

const loadJson = (name) => memo(async () => {
    const raw = await firstFile([`dist/data/${name}`, `public/data/${name}`], 'utf8');
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
});
const loadIndexFile = loadJson('pokemon-index.json');
const loadBattleDex = loadJson('battle-dex.json');
const loadSeoDex = loadJson('seo-dex.json');
const loadTournaments = loadJson('tournaments.json');
const loadPokemonIndex = async () => (await loadIndexFile())?.pokemons || [];

/** One artwork as a data URI, or null if it is slow or missing. */
async function fetchImage(url, fetchImpl = globalThis.fetch) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);
    try {
        const res = await fetchImpl(url, { signal: controller.signal });
        if (!res.ok) return null;
        const bytes = Buffer.from(await res.arrayBuffer());
        return `data:image/png;base64,${bytes.toString('base64')}`;
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
}

/** dex ids → Map(id → data URI). */
async function fetchArtworks(ids, fetchImpl) {
    const unique = [...new Set(ids.filter(Boolean))];
    const fetched = await Promise.all(unique.map((id) => fetchImage(artworkUrl({ id }), fetchImpl)));
    return new Map(unique.map((id, i) => [id, fetched[i]]));
}

/** A satori tree → PNG bytes. */
async function draw(tree, size = OG_SIZE) {
    const { satori, Resvg, fonts } = await loadDeps();
    const svg = await satori(tree, { ...size, fonts });
    return new Resvg(svg, { fitTo: { mode: 'width', value: size.width } }).render().asPng();
}

// ── The renderers (exported for the tests and scripts/build-og-images.mjs) ──

/** The PNG for a team, or null. */
export async function renderTeamCard(team, language = 'en', { fetchImpl } = {}) {
    const [images, assets] = await Promise.all([
        Promise.all(team.pokemons.map((p) => fetchImage(artworkUrl(p), fetchImpl))),
        safeAssets(),
    ]);
    return draw(teamCardTree(team, images, language, assets));
}

/** The PNG for a decoded tier list (`?tierlist=`). */
export async function renderTierListCard(data, language = 'en', { fetchImpl } = {}) {
    const [images, assets] = await Promise.all([fetchArtworks(tierListCardIds(data), fetchImpl), safeAssets()]);
    return draw(tierListCardTree(data, images, language, assets));
}

/** The PNG for a decoded daily result. */
export async function renderResultCard(kind, data, language = 'en', { fetchImpl } = {}) {
    const [images, assets] = await Promise.all([
        kind === 'challenge' ? fetchArtworks([CHAMPION_ACE], fetchImpl) : new Map(),
        safeAssets(),
    ]);
    return draw(resultCardTree(kind, data, language, assets, images));
}

/** The PNG for a section page, or null for a key with no card. */
export async function renderPageCard(key, language = 'en', { fetchImpl, square = false } = {}) {
    if (!PAGE_CARDS[key]) return null;
    const ids = key === 'home' ? HOME_CARD_IDS : pageCardIds(key);
    const [images, assets] = await Promise.all([fetchArtworks(ids, fetchImpl), safeAssets()]);
    if (key === 'home') return draw(homeCardTree(images, language, assets, square ? OG_SQUARE : OG_SIZE), square ? OG_SQUARE : OG_SIZE);
    return draw(pageCardTree(key, images, language, assets));
}

/** The PNG for a Pokémon's page (`/pokemon/:name`), or null for an unknown id. */
export async function renderPokemonCard(id, language = 'en', { fetchImpl } = {}) {
    const pokemon = (await loadPokemonIndex()).find((p) => p.id === Number(id));
    if (!pokemon) return null;
    const [image, assets] = await Promise.all([fetchImage(artworkUrl(pokemon), fetchImpl), safeAssets()]);
    return draw(pokemonCardTree(pokemon, image, language, assets));
}

/** The PNG for a type's page (`/types/:type`), or null for an unknown type. */
export async function renderTypeCard(type, language = 'en', { fetchImpl } = {}) {
    if (!TYPE_IDS_SAFE.has(type)) return null;
    const top = strongestOfType(await loadPokemonIndex(), type);
    const [images, assets] = await Promise.all([Promise.all(top.map((p) => fetchImage(artworkUrl(p), fetchImpl))), safeAssets()]);
    return draw(typeCardTree(type, top, images, language, assets));
}

const dexKey = (text) => String(text || '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** The PNG for a move, ability or item page, or null for an unknown id. */
export async function renderDexCard(kind, id, language = 'en', { fetchImpl } = {}) {
    const key = dexKey(id);
    if (!key) return null;
    if (kind === 'move') {
        const move = (await loadBattleDex())?.moves?.[key];
        return move ? draw(moveCardTree(move, language, await safeAssets())) : null;
    }
    const seo = await loadSeoDex();
    if (kind === 'ability') {
        const ability = seo?.abilities?.[key];
        if (!ability) return null;
        const holders = (ability[2] || []).slice(0, 3);
        const [images, assets] = await Promise.all([fetchArtworks(holders, fetchImpl), safeAssets()]);
        return draw(abilityCardTree(ability, holders.map((h) => images.get(h) || null), language, assets));
    }
    const item = seo?.items?.[key];
    if (!item) return null;
    const slug = item[0].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const [sprite, assets] = await Promise.all([
        fetchImage(`https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/items/${slug}.png`, fetchImpl),
        safeAssets(),
    ]);
    return draw(itemCardTree(item, sprite, language, assets));
}

/** The PNG for a guide, or null for an unknown slug. */
export async function renderGuideCard(slug, language = 'en', { fetchImpl } = {}) {
    const guide = guideMeta(slug, language);
    if (!guide) return null;
    const ids = (GUIDE_ART[slug] || { ids: [448] }).ids;
    const [images, assets] = await Promise.all([fetchArtworks(ids, fetchImpl), safeAssets()]);
    return draw(guideCardTree(guide, images, language, assets));
}

/** The PNG for a tournament team (`/tournaments/team/:id`), or null. */
export async function renderTournamentTeamCard(id, language = 'en', { fetchImpl } = {}) {
    const team = (await loadTournaments())?.teams?.find((t) => t.id === id);
    if (!team?.pokemons?.length) return null;
    const index = new Map((await loadPokemonIndex()).map((p) => [p.id, p]));
    const members = team.pokemons.map((p) => ({ ...p, name: p.name.toLowerCase(), types: index.get(p.id)?.types || [] }));
    const [images, assets] = await Promise.all([Promise.all(members.map((p) => fetchImage(artworkUrl(p), fetchImpl))), safeAssets()]);
    return draw(tournamentTeamCardTree({ ...team, pokemons: members }, images, language, assets));
}

const sendPng = (res, png, cacheControl) => {
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', cacheControl);
    return res.status(200).send(Buffer.from(png));
};

// A reference card changes only when a deploy changes the data under it.
const REFERENCE_CACHE = 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400';
// The code *is* the picture: the same URL always draws the same card.
const IMMUTABLE_CACHE = 'public, max-age=604800, s-maxage=2592000, immutable';

const fallback = (res) => {
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
    res.setHeader('Location', '/og-image.png');
    return res.status(302).end();
};

const REFERENCE_PARAMS = {
    page: (value, language, url) => renderPageCard(value, language, { square: url.searchParams.get('format') === 'square' }),
    pokemon: (value, language) => renderPokemonCard(value, language),
    type: (value, language) => renderTypeCard(value, language),
    move: (value, language) => renderDexCard('move', value, language),
    ability: (value, language) => renderDexCard('ability', value, language),
    item: (value, language) => renderDexCard('item', value, language),
    guide: (value, language) => renderGuideCard(value, language),
    tteam: (value, language) => renderTournamentTeamCard(value, language),
};

export default async function handler(req, res) {
    try {
        const url = new URL(req.url, 'https://pokemonbuilder.app');
        const language = url.searchParams.get('lang') === 'pt' ? 'pt' : 'en';
        for (const [param, render] of Object.entries(REFERENCE_PARAMS)) {
            if (!url.searchParams.has(param)) continue;
            const png = await render(url.searchParams.get(param), language, url);
            return png ? sendPng(res, png, REFERENCE_CACHE) : fallback(res);
        }
        if (url.searchParams.has('tierlist')) {
            const decoded = decodeTierList(url.searchParams.get('tierlist'));
            // A chart cell keeps only a Pokémon its rule allows (the index decides).
            const index = decoded?.kind === 'chart' ? new Map((await loadPokemonIndex()).map((p) => [p.id, p])) : null;
            const data = index ? keepFittingCells(decoded, (id) => index.get(id)) : decoded;
            if (!data) return fallback(res);
            return sendPng(res, await renderTierListCard(data, language), IMMUTABLE_CACHE);
        }
        for (const [kind, decode] of Object.entries(RESULT_DECODERS)) {
            if (!url.searchParams.has(kind)) continue;
            const data = decode(url.searchParams.get(kind));
            if (!data) return fallback(res);
            return sendPng(res, await renderResultCard(kind, data, language), IMMUTABLE_CACHE);
        }
        const team = await fetchSharedTeam(url.searchParams.get('team') || '');
        if (!team) return fallback(res);
        // A shared team never changes once written (firestore.rules: update is
        // admin-only), so its picture can live at the edge for a week.
        return sendPng(res, await renderTeamCard(team, language), REFERENCE_CACHE);
    } catch (err) {
        console.error('og image failed:', err?.message || err);
        return fallback(res);
    }
}
