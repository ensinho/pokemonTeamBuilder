import React from 'react';
import { POKEBALL_PLACEHOLDER_URL } from '../constants/theme';

/**
 * EmptyState — friendly empty/error placeholder.
 * Replaces ad-hoc "No X found." paragraphs scattered across the app.
 *
 * Props:
 *   title     — required short headline
 *   message   — secondary copy
 *   action    — optional { label, onClick } primary CTA
 *   spriteSrc — Pokémon sprite to use as illustration; defaults to Pokéball
 *   compact   — smaller variant for inline empty grids
 */
export function EmptyState({ title, message, action, spriteSrc, compact = false }) {
    const sprite = spriteSrc || POKEBALL_PLACEHOLDER_URL;
    const sizeImg = compact ? 'w-16 h-16' : 'w-24 h-24 md:w-32 md:h-32';
    const sizePad = compact ? 'py-6' : 'py-12';

    return (
        <div className={`flex flex-col items-center justify-center text-center ${sizePad}`}>
            <img
                src={sprite}
                alt=""
                aria-hidden="true"
                className={`${sizeImg} object-contain opacity-60 mb-3 select-none`}
                style={{ filter: 'grayscale(0.4)' }}
                onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
            />
            <h3 className="text-base md:text-lg font-bold text-fg mb-1">{title}</h3>
            {message && <p className="text-sm text-muted max-w-xs">{message}</p>}
            {action && (
                <button
                    type="button"
                    onClick={action.onClick}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-white bg-primary hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-fg"
                >
                    {action.label}
                </button>
            )}
        </div>
    );
}
