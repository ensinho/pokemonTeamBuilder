import React, { useEffect, useState } from 'react';
import { getPokemonAnimatedSpriteUrl, getPokemonArtworkSpriteUrl, getPokemonFrontSpriteUrl } from '../../utils/pokemonSprites';

/**
 * A Pokémon on the Home's hero as a SPRITE (2026-11-12, Enzo: "usar sprite
 * do pokémon do champion em vez de png… sempre priorizar o sprite"): the
 * animated battle sprite (Showdown's, by national id), pixels kept square,
 * so it stands in the same pixel world as the champion beside it. A form the
 * animated set lacks falls back to the still front sprite, then to the
 * official artwork — never a broken image.
 *
 * 50–110 KB a gif: for the hero's one or two spots, never a list.
 */
export function HeroSprite({ id, shiny = false, className = '', priority = false }) {
    const [step, setStep] = useState(0);
    useEffect(() => { setStep(0); }, [id, shiny]);
    const sources = [
        getPokemonAnimatedSpriteUrl(id, { shiny }),
        getPokemonFrontSpriteUrl(id, { shiny }),
        getPokemonArtworkSpriteUrl(id, { shiny }),
    ];
    return (
        <img
            src={sources[Math.min(step, sources.length - 1)]}
            alt=""
            decoding="async"
            fetchPriority={priority ? 'high' : undefined}
            draggable={false}
            onError={() => setStep((s) => (s < sources.length - 1 ? s + 1 : s))}
            className={`hero-sprite ${step === sources.length - 1 ? 'is-artwork' : ''} ${className}`}
        />
    );
}

export default HeroSprite;
