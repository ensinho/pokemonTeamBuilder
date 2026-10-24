// GET /api/og?team=<id>&lang=pt — a shared team's link-preview image (PNG,
// 1200 × 630), so a share in WhatsApp or Discord shows the six instead of the
// generic card. render-meta points og:image here for /t/:id.
// GET /api/og?puzzle=<code> | ?challenge=<code> — a shared daily result
// (utils/resultShareCode.js): the PokéPuzzle board or the Champion Challenge
// outcome, for `/pokepuzzle?r=` and `/challenge?r=`. One endpoint for all
// three keeps the function count where it is (CLAUDE.md, 12 per deploy).
//
// Static imports are builtins and dependency-free local modules only (the
// battle-turn rule, CLAUDE.md): satori and resvg load inside the handler, so a
// failure anywhere answers with the site's default card instead of killing
// the function. Any miss — unknown team, slow Firestore, a render error — is a
// 302 to /og-image.png, never a broken image in someone's chat.

import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fetchSharedTeam } from './_lib/sharedTeam.js';
import { OG_SIZE, RESULT_DECODERS, artworkUrl, pokemonCardTree, resultCardTree, strongestOfType, teamCardTree, typeCardTree } from './_lib/ogImage.js';

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

/** The PNG for a team, or null. Exported for the test and a local preview. */
export async function renderTeamCard(team, language = 'en', { fetchImpl } = {}) {
    const { satori, Resvg, fonts } = await loadDeps();
    const images = await Promise.all(team.pokemons.map((p) => fetchImage(artworkUrl(p), fetchImpl)));
    const svg = await satori(teamCardTree(team, images, language), { ...OG_SIZE, fonts });
    return new Resvg(svg, { fitTo: { mode: 'width', value: OG_SIZE.width } }).render().asPng();
}

/** The PNG for a decoded daily result. Exported for the test. */
export async function renderResultCard(kind, data, language = 'en') {
    const { satori, Resvg, fonts } = await loadDeps();
    const svg = await satori(resultCardTree(kind, data, language), { ...OG_SIZE, fonts });
    return new Resvg(svg, { fitTo: { mode: 'width', value: OG_SIZE.width } }).render().asPng();
}

// The baked index (render-meta reads the same file): dist/ in a deployment
// (vercel.json includeFiles), public/ in a local run. Read once per instance.
let indexPromise = null;
const loadPokemonIndex = () => {
    if (!indexPromise) {
        indexPromise = (async () => {
            for (const dir of ['dist', 'public']) {
                try {
                    const raw = await readFile(path.join(process.cwd(), dir, 'data', 'pokemon-index.json'), 'utf8');
                    return JSON.parse(raw).pokemons || [];
                } catch { /* try the next place */ }
            }
            return [];
        })();
    }
    return indexPromise;
};

/** The PNG for a Pokémon's page (`/pokemon/:name`), or null for an unknown id. */
export async function renderPokemonCard(id, language = 'en', { fetchImpl } = {}) {
    const pokemon = (await loadPokemonIndex()).find((p) => p.id === Number(id));
    if (!pokemon) return null;
    const { satori, Resvg, fonts } = await loadDeps();
    const image = await fetchImage(artworkUrl(pokemon), fetchImpl);
    const svg = await satori(pokemonCardTree(pokemon, image, language), { ...OG_SIZE, fonts });
    return new Resvg(svg, { fitTo: { mode: 'width', value: OG_SIZE.width } }).render().asPng();
}

/** The PNG for a type's page (`/types/:type`), or null for an unknown type. */
export async function renderTypeCard(type, language = 'en', { fetchImpl } = {}) {
    if (!TYPE_IDS_SAFE.has(type)) return null;
    const { satori, Resvg, fonts } = await loadDeps();
    const top = strongestOfType(await loadPokemonIndex(), type);
    const images = await Promise.all(top.map((p) => fetchImage(artworkUrl(p), fetchImpl)));
    const svg = await satori(typeCardTree(type, top, images, language), { ...OG_SIZE, fonts });
    return new Resvg(svg, { fitTo: { mode: 'width', value: OG_SIZE.width } }).render().asPng();
}

const TYPE_IDS_SAFE = new Set(['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy']);

const sendPng = (res, png, cacheControl) => {
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', cacheControl);
    return res.status(200).send(Buffer.from(png));
};

// A reference card changes only when a deploy changes the data under it.
const REFERENCE_CACHE = 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400';

const fallback = (res) => {
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
    res.setHeader('Location', '/og-image.png');
    return res.status(302).end();
};

export default async function handler(req, res) {
    try {
        const url = new URL(req.url, 'https://pokemonbuilder.app');
        const language = url.searchParams.get('lang') === 'pt' ? 'pt' : 'en';
        if (url.searchParams.has('pokemon')) {
            const png = await renderPokemonCard(url.searchParams.get('pokemon'), language);
            return png ? sendPng(res, png, REFERENCE_CACHE) : fallback(res);
        }
        if (url.searchParams.has('type')) {
            const png = await renderTypeCard(url.searchParams.get('type'), language);
            return png ? sendPng(res, png, REFERENCE_CACHE) : fallback(res);
        }
        for (const [kind, decode] of Object.entries(RESULT_DECODERS)) {
            if (!url.searchParams.has(kind)) continue;
            const data = decode(url.searchParams.get(kind));
            if (!data) return fallback(res);
            const png = await renderResultCard(kind, data, language);
            res.setHeader('Content-Type', 'image/png');
            // The code *is* the picture: the same URL always draws the same card.
            res.setHeader('Cache-Control', 'public, max-age=604800, s-maxage=2592000, immutable');
            return res.status(200).send(Buffer.from(png));
        }
        const team = await fetchSharedTeam(url.searchParams.get('team') || '');
        if (!team) return fallback(res);
        const png = await renderTeamCard(team, language);
        res.setHeader('Content-Type', 'image/png');
        // A shared team never changes once written (firestore.rules: update is
        // admin-only), so its picture can live at the edge for a week.
        res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400');
        return res.status(200).send(Buffer.from(png));
    } catch (err) {
        console.error('og image failed:', err?.message || err);
        return fallback(res);
    }
}
