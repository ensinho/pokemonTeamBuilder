import React from 'react';
import { getPokemonFrontSpriteUrl } from '../utils/pokemonSprites';
import { trainerSpriteUrl } from '../hooks/useTrainerSprites';

/**
 * The image *inside* a trainer avatar frame — not the frame itself.
 *
 * Every call site already owns its own circular container (`.forum-message-avatar`,
 * `.home-timeline-avatar`, the sidebar's inline-styled span), each with its own
 * sizing and responsive rules. This component only decides which sprite to draw,
 * so those frames keep working untouched.
 *
 * Which of the two an avatar uses is the *user's* choice, resolved upstream — see
 * `useAuthStore.publicAvatar()`. Callers pass the already-resolved pair, so this
 * component never second-guesses the preference; it just draws whichever it got.
 *
 * Trainer sprites are 80×80 squares while Pokémon front sprites are 96×96 with
 * heavy transparent padding (which is why the containers crop and offset them),
 * so the trainer variant carries an `avatar-sprite--trainer` class that each
 * container uses to neutralise that framing.
 */
export function AvatarSprite({
    pokemonId = null,
    isShiny = false,
    trainerSprite = null,
    alt = '',
    className = '',
    fallback = null,
}) {
    if (trainerSprite) {
        return (
            <img
                src={trainerSpriteUrl(trainerSprite)}
                alt={alt}
                loading="lazy"
                decoding="async"
                className={`avatar-sprite--trainer ${className}`.trim()}
                onError={(event) => { event.currentTarget.style.display = 'none'; }}
            />
        );
    }

    if (pokemonId) {
        return (
            <img
                src={getPokemonFrontSpriteUrl(pokemonId, { shiny: isShiny })}
                alt={alt}
                loading="lazy"
                decoding="async"
                className={className}
                onError={(event) => { event.currentTarget.style.display = 'none'; }}
            />
        );
    }

    return fallback;
}
