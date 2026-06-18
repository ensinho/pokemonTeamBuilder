import { POKEBALL_PLACEHOLDER_URL } from '../constants/theme';

const RAW_SPRITE_BASE_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';

const toPokemonId = (value) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export const getPokemonFrontSpriteUrl = (pokemonId, { shiny = false } = {}) => {
    const resolvedId = toPokemonId(pokemonId);
    return resolvedId
        ? `${RAW_SPRITE_BASE_URL}/${shiny ? 'shiny/' : ''}${resolvedId}.png`
        : POKEBALL_PLACEHOLDER_URL;
};

export const getPokemonArtworkSpriteUrl = (pokemonId, { shiny = false } = {}) => {
    const resolvedId = toPokemonId(pokemonId);
    return resolvedId
        ? `${RAW_SPRITE_BASE_URL}/other/official-artwork/${shiny ? 'shiny/' : ''}${resolvedId}.png`
        : POKEBALL_PLACEHOLDER_URL;
};

export const getPokemonSavedShinyState = (pokemon) => Boolean(pokemon?.customization?.isShiny || pokemon?.isShiny);

/**
 * Resolve the sprite to DISPLAY for a pokémon.
 *
 * The app's default look is the pixel-art game sprite (`front_default`), derived
 * from the id — NOT the stored HD `official-artwork` photo. We derive from id at
 * display time so the style is consistent everywhere regardless of what sprite
 * URL happens to be stored on the object (index entry, Firestore doc, saved team).
 *
 * Pass `preferArtwork: true` to opt back into the HD artwork for a specific spot
 * (e.g. a hero image or silhouette).
 */
export const getPokemonDisplaySprite = (pokemon, {
    shiny = false,
    animated = false,
    preferArtwork = false,
} = {}) => {
    if (!pokemon) return POKEBALL_PLACEHOLDER_URL;

    if (preferArtwork) {
        return getPokemonArtworkSpriteUrl(pokemon.id, { shiny });
    }

    // Default everywhere: pixel-art game sprite derived from the id.
    // `animated` still prefers the gen-5 animated sprite when one was stored.
    if (animated) {
        const stored = shiny ? pokemon.animatedShinySprite : pokemon.animatedSprite;
        if (stored) return stored;
    }
    return getPokemonFrontSpriteUrl(pokemon.id, { shiny });
};

export const getTeamPokemonDisplaySprite = (pokemon, options = {}) => getPokemonDisplaySprite(pokemon, {
    ...options,
    shiny: getPokemonSavedShinyState(pokemon),
});