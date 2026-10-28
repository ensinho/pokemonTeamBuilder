import React from 'react';
import { SITE_NAME } from '../utils/seoPages';

const BASE = import.meta.env.BASE_URL;
const SMALL = `${BASE}logo-wordmark-480.webp`;
const LARGE = `${BASE}logo-wordmark.webp`;

/**
 * The PokemonBuilder wordmark (2026-10-28): brush lettering, "Pokemon" in
 * white and "Builder" in violet, drawn on a transparent ground inside its own
 * thick dark outline, so it reads the same on every theme, light ones
 * included. It names the product; the Gengar icon (`logo-mark.webp`) stays
 * the app's mark and favicon. The expanded rail shows the wordmark alone; the
 * splash and the landing pair it with the icon.
 *
 * Two files: 480w (20 KB) for the rail and the splash, 960w (49 KB) for the
 * landing. `sizes` tells the browser how wide this one is drawn so it picks
 * between them.
 */
export function BrandWordmark({ className = '', sizes = '10rem' }) {
    return (
        <img
            src={SMALL}
            srcSet={`${SMALL} 480w, ${LARGE} 960w`}
            sizes={sizes}
            width={480}
            height={112}
            alt={SITE_NAME}
            decoding="async"
            draggable={false}
            className={className}
        />
    );
}
