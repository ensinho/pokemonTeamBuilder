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

export const getPokemonDisplaySprite = (pokemon, {
    shiny = false,
    animated = false,
    preferArtwork = false,
} = {}) => {
    if (!pokemon) return POKEBALL_PLACEHOLDER_URL;

    const fallbackSprite = preferArtwork
        ? getPokemonArtworkSpriteUrl(pokemon.id, { shiny })
        : getPokemonFrontSpriteUrl(pokemon.id, { shiny });

    if (animated) {
        if (shiny) {
            return pokemon.animatedShinySprite || pokemon.shinySprite || fallbackSprite;
        }
        return pokemon.animatedSprite || pokemon.sprite || fallbackSprite;
    }

    if (shiny) {
        return pokemon.shinySprite || pokemon.animatedShinySprite || fallbackSprite;
    }

    return pokemon.sprite || pokemon.animatedSprite || fallbackSprite;
};

export const getTeamPokemonDisplaySprite = (pokemon, options = {}) => getPokemonDisplaySprite(pokemon, {
    ...options,
    shiny: getPokemonSavedShinyState(pokemon),
});