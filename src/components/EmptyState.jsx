import React from 'react';
import { POKEBALL_PLACEHOLDER_URL } from '../constants/theme';
import { Mascot } from './Mascot';

// The mascot's face for each kind of nothing (2026-11-06; before, the official
// Gengar sprite). `empty` peeks over the edge; `search` shrugs; `lost` is the
// 404's face; `error` worries. The words below still carry the message.
const FACES = {
    empty: { pose: 'espiando' },
    search: { pose: 'dandoDeOmbros', mood: 'desconfiado', loop: 'float' },
    lost: { pose: 'pataNoQueixo', mood: 'perdido', loop: 'float' },
    error: { mood: 'preocupado', loop: 'float' },
};

/**
 * EmptyState — friendly empty/error placeholder.
 * Replaces ad-hoc "No X found." paragraphs scattered across the app.
 *
 * Props:
 *   title     — required short headline
 *   message   — secondary copy
 *   action    — optional { label, onClick, icon } primary CTA (icon renders after the label)
 *   secondaryAction — optional { label, onClick } quiet second way out ("Entrar" beside "Criar conta")
 *   spriteSrc — optional context sprite; when omitted, shows the mascot
 *   mascot    — which face it makes: 'empty' (default) | 'search' | 'lost' | 'error'
 *   compact   — smaller variant for inline empty grids
 *
 * Box-free at every width (v3): the page is the canvas, so an empty view is the
 * page speaking — the mascot, a heading, a line, one action.
 */
export function EmptyState({ title, message, action, secondaryAction, spriteSrc, compact = false, mascot = 'empty' }) {
    const face = FACES[mascot] || FACES.empty;
    const sizeImg = compact ? 'w-16 h-16' : 'w-24 h-24 md:w-32 md:h-32';

    return (
        <div className={`empty-state ${compact ? 'is-compact' : ''}`}>
            <div className="empty-state__illustration-container" data-pose={spriteSrc ? undefined : face.pose}>
                {spriteSrc ? (
                    <img
                        src={spriteSrc}
                        alt=""
                        aria-hidden="true"
                        className={`empty-state__illustration ${sizeImg} object-contain select-none`}
                        onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                    />
                ) : (
                    <Mascot size={compact ? 'lg' : 'xl'} framing="body" mood={face.mood} pose={face.pose} loop={face.loop} interactive stage />
                )}
            </div>
            <h3 className="empty-state__title">{title}</h3>
            {message && <p className="empty-state__message">{message}</p>}
            {action && !secondaryAction && (
                <button
                    type="button"
                    onClick={action.onClick}
                    className="empty-state__action btn btn-primary"
                >
                    {action.label}
                    {action.icon}
                </button>
            )}
            {action && secondaryAction && (
                <div className="empty-state__actions">
                    <button type="button" onClick={action.onClick} className="btn btn-primary">
                        {action.label}
                        {action.icon}
                    </button>
                    <button type="button" onClick={secondaryAction.onClick} className="btn btn-ghost">
                        {secondaryAction.label}
                    </button>
                </div>
            )}
        </div>
    );
}
