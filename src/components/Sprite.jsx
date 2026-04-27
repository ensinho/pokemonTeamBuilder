import React, { useState, useCallback } from 'react';
import { POKEBALL_PLACEHOLDER_URL } from '../constants/theme';

/**
 * Sprite — Pokémon sprite with fixed aspect, placeholder fallback,
 * and a 220ms fade-in once the real image loads. Prevents layout shift
 * and the "pop-in unstyled" flicker that happens with bare <img>.
 *
 * Pass through any extra className for sizing (w-16 h-16 etc).
 */
export const Sprite = React.memo(function Sprite({
    src,
    alt = '',
    className = '',
    fallback = POKEBALL_PLACEHOLDER_URL,
    eager = false,
}) {
    const [loaded, setLoaded] = useState(false);
    const [errored, setErrored] = useState(false);

    const handleLoad = useCallback(() => setLoaded(true), []);
    const handleError = useCallback(() => {
        // Avoid infinite loop if the placeholder itself fails.
        if (!errored) setErrored(true);
        setLoaded(true);
    }, [errored]);

    const finalSrc = errored || !src ? fallback : src;

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
