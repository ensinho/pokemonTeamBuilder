import React, { useState, useCallback } from 'react';
import { POKEBALL_PLACEHOLDER_URL } from '../constants/theme';

/**
 * Sprite — Pokémon sprite with fixed aspect, placeholder fallback,
 * and a 220ms fade-in once the real image loads. Prevents layout shift
 * and the "pop-in unstyled" flicker that happens with bare <img>.
 *
 * Pass through any extra className for sizing (w-16 h-16 etc).
 *
 * `artworkSrc` — optional HD official-artwork URL. When the pixel sprite
 * loads as a tiny placeholder (naturalWidth ≤ 40, i.e. the PokeAPI blank
 * 40×40 image served for forms without a sprite), we silently switch to
 * the artwork URL so the card never shows the pokéball fallback.
 */
export const Sprite = React.memo(function Sprite({
    src,
    alt = '',
    className = '',
    fallback = POKEBALL_PLACEHOLDER_URL,
    artworkSrc = null,
    eager = false,
}) {
    const [loaded, setLoaded] = useState(false);
    const [errored, setErrored] = useState(false);
    const [usedArtwork, setUsedArtwork] = useState(false);

    const handleLoad = useCallback((e) => {
        // If the sprite resolved to the PokeAPI blank placeholder (40×40),
        // and we have an artwork URL to try, switch to it instead.
        if (artworkSrc && !usedArtwork && e.currentTarget.naturalWidth <= 40) {
            setUsedArtwork(true);
            return; // don't mark as loaded yet — artwork img will fire its own onLoad
        }
        setLoaded(true);
    }, [artworkSrc, usedArtwork]);

    const handleError = useCallback(() => {
        // On error: try artwork first if available, otherwise fall back to pokéball.
        if (artworkSrc && !usedArtwork) {
            setUsedArtwork(true);
            return;
        }
        if (!errored) setErrored(true);
        setLoaded(true);
    }, [artworkSrc, usedArtwork, errored]);

    const finalSrc = errored || !src ? fallback : usedArtwork ? artworkSrc : src;

    return (
        <span className={`relative inline-block overflow-hidden ${className}`}>
            {/* Subtle Pokéball placeholder until the real sprite paints. */}
            {!loaded && (
                <span
                    aria-hidden="true"
                    className="absolute inset-0 flex items-center justify-center opacity-30"
                >
                    <img src={POKEBALL_PLACEHOLDER_URL} alt="" className="w-1/2 h-1/2 object-contain" />
                </span>
            )}
            <img
                src={finalSrc}
                alt={alt}
                loading={eager ? 'eager' : 'lazy'}
                decoding="async"
                onLoad={handleLoad}
                onError={handleError}
                className={`sprite-img w-full h-full transition-opacity duration-200 ${loaded ? 'opacity-100 sprite-fade' : 'opacity-0'}`}
            />
        </span>
    );
});
