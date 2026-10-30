// Where the app's hotlinked images come from — one place, so they can move.
//
// By default every sprite is hotlinked from its origin: PokeAPI's sprite repo
// through jsDelivr, and Showdown's sprite folder. Both are blocked by networks
// that filter "games" (schools, offices), and neither is ours. Setting
// VITE_ASSET_MIRROR_URL points them at our own copy instead — the Cloud Storage
// bucket filled by `npm run assets:mirror` (docs/modules/asset_mirror.md):
//
//   {mirror}/pokeapi/...   ← cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/...
//   {mirror}/showdown/...  ← play.pokemonshowdown.com/sprites/...
//
// The layout under each prefix is the origin's own, so a URL maps both ways by
// swapping the prefix. A file the mirror doesn't have yet (a new Pokémon, an
// item added later) falls back to its origin via installAssetFallback().

export const POKEAPI_SPRITES_ORIGIN = 'https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites';
export const SHOWDOWN_SPRITES_ORIGIN = 'https://play.pokemonshowdown.com/sprites';

const MIRROR_URL = String(import.meta.env?.VITE_ASSET_MIRROR_URL || '').trim().replace(/\/+$/, '');

const SOURCES = MIRROR_URL
    ? [
        { origin: POKEAPI_SPRITES_ORIGIN, mirror: `${MIRROR_URL}/pokeapi` },
        { origin: SHOWDOWN_SPRITES_ORIGIN, mirror: `${MIRROR_URL}/showdown` },
    ]
    : [];

export const isAssetMirrorEnabled = SOURCES.length > 0;

/** Base for PokeAPI sprites (`…/pokemon/25.png`, `…/items/leftovers.png`). */
export const POKEAPI_SPRITES_BASE = SOURCES[0]?.mirror ?? POKEAPI_SPRITES_ORIGIN;
/** Base for Showdown sprites (`…/trainers/cynthia.png`, `…/ani/pikachu.gif`). */
export const SHOWDOWN_SPRITES_BASE = SOURCES[1]?.mirror ?? SHOWDOWN_SPRITES_ORIGIN;

/** The mirrored URL for an origin URL; anything else comes back unchanged. */
export const toMirrorUrl = (url) => {
    if (typeof url !== 'string') return url;
    const source = SOURCES.find(({ origin }) => url.startsWith(`${origin}/`));
    return source ? source.mirror + url.slice(source.origin.length) : url;
};

/** The origin URL for a mirrored one, or null when `url` isn't on the mirror. */
export const toOriginUrl = (url) => {
    if (typeof url !== 'string') return null;
    const source = SOURCES.find(({ mirror }) => url.startsWith(`${mirror}/`));
    return source ? source.origin + url.slice(source.mirror.length) : null;
};

/**
 * One capture-phase listener for the whole document: an <img> whose mirrored
 * file is missing retries once at its origin. Image `error` events don't
 * bubble, but they do reach a capturing listener on the document — so no
 * component needs its own onError for this, and existing onError fallbacks
 * still run when the origin fails too.
 */
export function installAssetFallback(doc = globalThis.document) {
    if (!isAssetMirrorEnabled || !doc) return () => {};
    const onError = (event) => {
        const img = event.target;
        if (!(img instanceof HTMLImageElement) || img.dataset.assetFallback) return;
        const origin = toOriginUrl(img.currentSrc || img.src);
        if (!origin) return;
        event.stopImmediatePropagation();
        img.dataset.assetFallback = '1';
        img.src = origin;
    };
    doc.addEventListener('error', onError, true);
    return () => doc.removeEventListener('error', onError, true);
}
