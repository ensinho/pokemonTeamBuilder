import React from 'react';
import { POKEBALL_PLACEHOLDER_URL } from '../constants/theme';
import { GengarPresence } from './GengarPresence';

/**
 * EmptyState — friendly empty/error placeholder.
 * Replaces ad-hoc "No X found." paragraphs scattered across the app.
 *
 * Props:
 *   title     — required short headline
 *   message   — secondary copy
 *   action    — optional { label, onClick, icon } primary CTA (icon renders after the label)
 *   spriteSrc — optional context sprite; when omitted, shows the signature
 *               floating Gengar (the app's default "nothing here" mascot)
 *   compact   — smaller variant for inline empty grids
 */
export function EmptyState({ title, message, action, spriteSrc, compact = false }) {
    const sizeImg = compact ? 'w-16 h-16' : 'w-24 h-24 md:w-32 md:h-32';
    const sizePad = compact ? 'py-6' : 'py-12';

    return (
        <div className={`empty-state flex flex-col mt-12 items-center justify-center text-center ${sizePad} ${compact ? 'is-compact' : ''}`}>
            <div className="empty-state__illustration-container relative mb-3">
                {spriteSrc ? (
                    <img
                        src={spriteSrc}
                        alt=""
                        aria-hidden="true"
                        className={`empty-state__illustration ${sizeImg} object-contain opacity-80 select-none`}
                        onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                    />
                ) : (
                    <GengarPresence variant="idle" size={compact ? 72 : 116} />
                )}
            </div>
            <h3 className="empty-state__title text-base md:text-lg font-bold text-fg mb-1">{title}</h3>
            {message && <p className="empty-state__message text-sm text-muted max-w-xs">{message}</p>}
            {action && (
                <button
                    type="button"
                    onClick={action.onClick}
                    className="empty-state__action mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-white bg-primary hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-fg"
                >
                    {action.label}
                    {action.icon}
                </button>
            )}
        </div>
    );
}
