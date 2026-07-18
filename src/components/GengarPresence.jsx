import React from 'react';
import { getPokemonFrontSpriteUrl } from '../utils/pokemonSprites';
import '../styles/gengar-presence.css';

const GENGAR_ID = 94;

/**
 * GengarPresence — the app's signature ghost moment.
 * A floating Gengar with a pulsing aura + shrinking shadow. Use for
 * loading and empty states to carry the brand personality.
 *
 * Props:
 *   size    — sprite box size in px (default 96)
 *   variant — 'idle' (empty states) | 'loading' (quicker breath)
 *   label   — optional caption; also sets the accessible status label
 */
export function GengarPresence({ size = 96, variant = 'idle', label, className = '' }) {
    return (
        <div
            className={`gengar-presence gengar-presence--${variant} ${className}`}
            style={{ '--gp-size': `${size}px` }}
            role={variant === 'loading' ? 'status' : undefined}
            aria-label={variant === 'loading' ? (label || 'Loading') : undefined}
        >
            <div className="gengar-presence__stage">
                <span className="gengar-presence__aura" aria-hidden="true" />
                <img
                    src={getPokemonFrontSpriteUrl(GENGAR_ID)}
                    alt=""
                    aria-hidden="true"
                    draggable="false"
                    className="gengar-presence__sprite image-pixelated"
                />
                <span className="gengar-presence__shadow" aria-hidden="true" />
            </div>
            {label && <p className="gengar-presence__label">{label}</p>}
        </div>
    );
}
