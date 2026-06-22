// Game logo "cover" art for the Team Builder game picker.
//
// PATTERN — adding/replacing a logo:
//   Drop a `<game-key>.png` (transparent, ~480px wide) in this folder. It is
//   auto-registered below via Vite's import.meta.glob — no edits needed here.
//   `_pokemon.png` is the generic franchise logo used for "All games" and as
//   the fallback when a specific game's logo is missing.
//
// Keys must match the `key` field in public/data/games.json (see
// scripts/build-games.mjs), e.g. "scarlet-violet", "red-blue-yellow".

const modules = import.meta.glob('./*.png', { eager: true, import: 'default' });

const LOGOS = {};
let pokemonLogo = '';
for (const [path, url] of Object.entries(modules)) {
    const name = path.replace(/^\.\//, '').replace(/\.png$/i, '');
    if (name === '_pokemon') pokemonLogo = url;
    else LOGOS[name] = url;
}

/** Generic Pokémon franchise logo (used for the "All games" cover + fallback). */
export const POKEMON_LOGO = pokemonLogo;

/** True if a dedicated cover logo exists for this game key. */
export const hasGameLogo = (key) => Boolean(LOGOS[key]);

/** Cover logo for a game key, falling back to the franchise logo. */
export const getGameLogo = (key) => LOGOS[key] || pokemonLogo;

// Signature accent colour per generation — drives the cover ring/glow so each
// game family feels distinct without needing a hand-tuned colour per title.
export const GAME_ACCENTS = {
    'generation-i': '#E3350D',
    'generation-ii': '#D4A017',
    'generation-iii': '#00A878',
    'generation-iv': '#5C6BC0',
    'generation-v': '#5E6470',
    'generation-vi': '#2E73C8',
    'generation-vii': '#F0803C',
    'generation-viii': '#3B5BA5',
    'generation-ix': '#9B4DCA',
};

export const getGameAccent = (generation) => GAME_ACCENTS[generation] || '#6390F0';
