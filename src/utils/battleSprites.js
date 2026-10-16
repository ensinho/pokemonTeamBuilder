import { Sprites } from '@pkmn/img';

/**
 * Animated battle sprites, resolved through `@pkmn/img`.
 *
 * Rolling this by hand looked tempting — the URL is just
 * `…/sprites/ani{-back}{-shiny}/{name}.gif`. It isn't: Showdown's file names are
 * not a mechanical slug of the species. `Ho-Oh` is `hooh` (the hyphen vanishes)
 * while `Landorus-Therian` keeps its hyphen, and `Urshifu-Rapid-Strike` collapses
 * to `urshifu-rapidstrike`. Two broken images out of a four-name spot check, over
 * 1000+ species and forms. `@pkmn/img` is 42 KB gzipped inside the lazy battle
 * chunk and gets every one of them right, plus the frame dimensions.
 *
 * The images themselves are hotlinked and service-worker cached (see
 * vite.config.js). The host sends no CORS header, so they may only ever be used
 * as an `<img src>` — never fetched or drawn to a canvas.
 */

const FALLBACK = { url: null, w: 96, h: 96 };

/**
 * @param {string} species  as it appears in the protocol, e.g. 'Landorus-Therian'
 * @param {object} options
 * @param {boolean} options.back  the viewer's own Pokémon is seen from behind
 * @param {boolean} options.shiny
 * @param {boolean} options.animated  false falls back to the static gen-5 art
 */
export const getBattleSprite = (species, { back = false, shiny = false, animated = true } = {}) => {
    if (!species) return FALLBACK;
    try {
        const sprite = Sprites.getPokemon(species, {
            gen: animated ? 'ani' : 5,
            // `@pkmn/img` picks front/back from which side you claim to be.
            side: back ? 'p1' : 'p2',
            shiny,
        });
        return { url: sprite.url, w: sprite.w || FALLBACK.w, h: sprite.h || FALLBACK.h };
    } catch (_) {
        // An unknown species must not take the battlefield down with it.
        return FALLBACK;
    }
};

/** The sprite-feet table's key for a sprite URL: its file name. */
export const spriteKey = (url) => String(url || '').split('/').pop().replace(/\.png$/, '');

/**
 * The row of a 96 × 96 battle sprite its feet stand on, from the baked table
 * (`public/data/sprite-feet.json`); the table's default until it has loaded.
 */
export const spriteFeet = (table, url, { back = false } = {}) => {
    const fallback = back ? (table?.defaults?.back ?? 80) : (table?.defaults?.front ?? 80);
    const rows = table?.feet?.[spriteKey(url)];
    return rows?.[back ? 1 : 0] ?? fallback;
};

/**
 * DS-era battle sprite for the Champion Challenge: Showdown's Gen 4 art
 * (front, or `back` for the player's side), which `@pkmn/img` falls back to
 * Gen 5 for Pokémon born after Platinum (#493).
 */
export const getDsSprite = (species, { back = false, shiny = false } = {}) => {
    if (!species) return FALLBACK;
    try {
        const sprite = Sprites.getPokemon(species, { gen: 'gen4', side: back ? 'p1' : 'p2', shiny });
        return { url: sprite.url, w: sprite.w || FALLBACK.w, h: sprite.h || FALLBACK.h };
    } catch (_) {
        return FALLBACK;
    }
};

/** Small front-facing icon for the team bar. */
export const getBattleIcon = (species, { shiny = false } = {}) => {
    if (!species) return FALLBACK;
    try {
        const sprite = Sprites.getPokemon(species, { gen: 5, side: 'p2', shiny });
        return { url: sprite.url, w: sprite.w || 96, h: sprite.h || 96 };
    } catch (_) {
        return FALLBACK;
    }
};

/** Human-readable status label, e.g. 'brn' → 'BRN'. */
export const statusLabel = (status) => (status ? String(status).toUpperCase() : null);
