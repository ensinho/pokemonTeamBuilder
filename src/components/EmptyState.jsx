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
 *
 * Box-free at every width (v3): the page is the canvas, so an empty view is the
 * page speaking — the Gengar, a heading, a line, one action.
 */
export function EmptyState({ title, message, action, spriteSrc, compact = false }) {
    const sizeImg = compact ? 'w-16 h-16' : 'w-24 h-24 md:w-32 md:h-32';

    return (
        <div className={`empty-state ${compact ? 'is-compact' : ''}`}>
            <div className="empty-state__illustration-container">
                {spriteSrc ? (
                    <img
                        src={spriteSrc}
                        alt=""
                        aria-hidden="true"
                        className={`empty-state__illustration ${sizeImg} object-contain select-none`}
                        onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                    />
                ) : (
                    <GengarPresence variant="idle" size={compact ? 72 : 116} />
                )}
            </div>
            <h3 className="empty-state__title">{title}</h3>
            {message && <p className="empty-state__message">{message}</p>}
            {action && (
                <button
                    type="button"
                    onClick={action.onClick}
                    className="empty-state__action btn btn-primary"
                >
                    {action.label}
                    {action.icon}
                </button>
            )}
        </div>
    );
}
