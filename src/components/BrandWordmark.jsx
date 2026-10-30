import React from 'react';
import { SITE_NAME } from '../utils/seoPages';

const SRC = `${import.meta.env.BASE_URL}logo-wordmark.svg`;

/**
 * The PokemonBuilder wordmark (2026-10-28): brush lettering, "Pokemon" in
 * white and "Builder" in violet, drawn on a transparent ground inside its own
 * thick dark outline, so it reads the same on every theme, light ones
 * included. It names the product; the Gengar icon (`logo-mark.webp`) stays
 * the app's mark and favicon. The expanded rail shows the wordmark alone; the
 * splash and the landing pair it with the icon.
 *
 * One vector file (2026-10-30), traced from the 2169px original: sharp at any
 * width and pixel density, ~32 KB gzipped, so there is no `srcSet` to pick
 * between resolutions.
 */
export function BrandWordmark({ className = '' }) {
    return (
        <img
            src={SRC}
            width={2022}
            height={483}
            alt={SITE_NAME}
            decoding="async"
            draggable={false}
            className={className}
        />
    );
}
