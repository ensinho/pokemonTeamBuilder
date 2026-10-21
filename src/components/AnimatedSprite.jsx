import React, { useState } from 'react';
import { getPokemonAnimatedSpriteUrl, getPokemonFrontSpriteUrl } from '../utils/pokemonSprites';

/** Data Saver on: the 1–3 KB still frame instead of a ~80 KB GIF. */
const saveData = () => {
    try {
        return Boolean(navigator.connection?.saveData);
    } catch {
        return false;
    }
};

/**
 * A Pokémon's animated battle sprite for showcase spots (the landing, a type's
 * page) — never for a list or grid, where fifty looping GIFs are an alarm and
 * megabytes. `still` shows the static pixel sprite instead (an unselected demo
 * card); so do reduced motion, Data Saver and a GIF that fails to load.
 */
export function AnimatedSprite({ id, still = false, className = '', alt = '', lazy = false }) {
    const [failed, setFailed] = useState(false);
    const staticSrc = getPokemonFrontSpriteUrl(id);
    const animate = !still && !failed && !saveData();
    const img = (
        <img
            src={animate ? getPokemonAnimatedSpriteUrl(id) : staticSrc}
            alt={alt}
            aria-hidden={alt ? undefined : 'true'}
            className={className}
            data-still={animate ? undefined : ''}
            loading={lazy ? 'lazy' : undefined}
            decoding="async"
            onError={animate ? () => setFailed(true) : undefined}
        />
    );
    if (!animate) return img;
    return (
        <picture>
            <source media="(prefers-reduced-motion: reduce)" srcSet={staticSrc} />
            {img}
        </picture>
    );
}
