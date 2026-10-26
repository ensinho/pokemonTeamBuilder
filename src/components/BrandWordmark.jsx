import React from 'react';
import { SITE_NAME } from '../utils/seoPages';

const BASE = import.meta.env.BASE_URL;
const SMALL = `${BASE}logo-wordmark-480.webp`;
const LARGE = `${BASE}logo-wordmark.webp`;

/**
 * The PokemonBuilder wordmark (2026-10-26): the graffiti lettering, drawn on a
 * transparent ground with its own dark outline, so it reads the same on all
 * six themes. It names the product; the Gengar icon (`logo-mark.webp`) stays
 * the app's mark and favicon, and sits beside it wherever both appear.
 *
 * Two files: 480w (30 KB) for the rail and the splash, 960w for the landing.
 * `sizes` tells the browser how wide this one is drawn so it picks between them.
 */
export function BrandWordmark({ className = '', sizes = '10rem' }) {
    return (
        <img
            src={SMALL}
            srcSet={`${SMALL} 480w, ${LARGE} 960w`}
            sizes={sizes}
            width={480}
            height={119}
            alt={SITE_NAME}
            decoding="async"
            draggable={false}
            className={className}
        />
    );
}
