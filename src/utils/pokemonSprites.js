import { POKEBALL_PLACEHOLDER_URL } from '../constants/theme';

const RAW_SPRITE_BASE_URL = 'https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon';

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

    let resolvedId = toPokemonId(pokemon.id);
    if (pokemon.name?.startsWith('Mega ') || pokemon.name?.includes('-Mega')) {
        const spriteMatch = pokemon.sprite?.match(/\/(\d+)\.png/);
        if (spriteMatch) {
            const parsed = Number.parseInt(spriteMatch[1], 10);
            if (Number.isInteger(parsed) && parsed > 0) {
                resolvedId = parsed;
            }
        }
    }

    if (preferArtwork) {
        return getPokemonArtworkSpriteUrl(resolvedId, { shiny });
    }

    // Default everywhere: pixel-art game sprite derived from the id.
    // `animated` still prefers the gen-5 animated sprite when one was stored.
    if (animated) {
        const stored = shiny ? pokemon.animatedShinySprite : pokemon.animatedSprite;
        if (stored) return stored;
    }
    return getPokemonFrontSpriteUrl(resolvedId, { shiny });
};

export const getTeamPokemonDisplaySprite = (pokemon, options = {}) => getPokemonDisplaySprite(pokemon, {
    ...options,
    shiny: getPokemonSavedShinyState(pokemon),
});

/**
 * Resolves the correct Mega Form/Evolution details (including ID) for a given Pokémon,
 * utilizing its base ID, name, held item, the pokemon index, and the mega stones map.
 */
export function resolveMegaPokemonEntry(p, pokemonIndex, byStone) {
    if (!p) return { id: null, name: '', spriteId: null };

    const baseId = Number(p.id || p.baseId);
    let resolvedId = baseId;
    let displayName = p.name || '';

    // 1. Resolve by Item (Mega Stone)
    if (p.item && byStone) {
        const itemKey = String(p.item).toLowerCase().replace(/[.'’:]/g, '').replace(/\s+/g, '-').trim();
        const stoneMega = byStone[itemKey];
        if (stoneMega && stoneMega.baseId === baseId) {
            resolvedId = stoneMega.spriteId || baseId;
            displayName = stoneMega.form || displayName;
            return { id: baseId, name: displayName, spriteId: resolvedId };
        }
    }

    // 2. Resolve by Name (e.g. Froslass-Mega)
    const cleanName = String(p.name || '').toLowerCase().replace(/[.'’:]/g, '').replace(/\s+/g, '-').trim();
    if (cleanName.includes('mega') && pokemonIndex && pokemonIndex.length) {
        // Try exact match on apiName or name
        let matched = pokemonIndex.find(idx => 
            idx.apiName?.toLowerCase() === cleanName || 
            idx.name?.toLowerCase() === cleanName || 
            idx.name?.toLowerCase().replace(/\s+/g, '-') === cleanName
        );
        if (!matched) {
            // Try matching form by baseId and has "mega" in apiName
            matched = pokemonIndex.find(idx => 
                idx.baseId === baseId && 
                idx.isForm && 
                idx.apiName?.toLowerCase().includes('mega')
            );
        }
        if (matched) {
            resolvedId = matched.id;
            displayName = matched.name;
            return { id: baseId, name: displayName, spriteId: resolvedId };
        }
    }

    return { id: baseId, name: displayName, spriteId: resolvedId };
}