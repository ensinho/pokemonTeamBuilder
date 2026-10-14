import React from 'react';
import { createPortal } from 'react-dom';
import '../../../styles/auth-dialog.css';
import { CloseIcon, PokeballIcon } from '../../icons';
import { useModalA11y } from '../../../hooks/useModalA11y';
import { useTranslation } from '../../../hooks/useTranslation';

/**
 * The frame every account dialog shares: a hero that says what is happening,
 * the form beside it. `variant` picks the place — 'account' (sign in),
 * 'password', 'delete' — through one CSS token (auth-dialog.css).
 * While `locked` (a request in flight) nothing dismisses it: Escape, the
 * scrim and the close button all wait, so a half-done deletion can't be
 * walked away from mid-way.
 *
 * Portalled to <body>: Profile opens two of these from inside a card, and a
 * card's containment made `position: fixed` resolve against the card — the
 * dialog rendered squeezed inside it.
 */
export function AuthDialogShell({ variant, labelledBy, hero, onClose, locked = false, children }) {
    const { t } = useTranslation();
    const dialogRef = useModalA11y(locked ? undefined : onClose);

    return createPortal(
        <div
            className="modal-scrim"
            onMouseDown={(e) => { if (e.target === e.currentTarget && !locked) onClose?.(); }}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={labelledBy}
                aria-busy={locked || undefined}
                tabIndex={-1}
                className={`modal-panel modal-panel--2xl auth-dialog auth-dialog--${variant}`}
            >
                <div className="auth-dialog__grid">
                    <aside className="auth-dialog__hero" data-sheet-handle>
                        {hero}
                        <PokeballIcon className="auth-dialog__motif" aria-hidden="true" />
                    </aside>
                    <div className="auth-dialog__body">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={locked}
                            aria-label={t('common.close')}
                            className="modal-close auth-dialog__close"
                        >
                            <CloseIcon />
                        </button>
                        {children}
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
}

/** The hero's content: art, then the words, then optional points. */
export function AuthHero({ eyebrow, title, titleId, lead, art, points = [] }) {
    return (
        <>
            {art && <div className="auth-dialog__art">{art}</div>}
            <p className="auth-dialog__eyebrow">{eyebrow}</p>
            <h2 id={titleId} className="auth-dialog__title">{title}</h2>
            {lead && <p className="auth-dialog__lead">{lead}</p>}
            {points.length > 0 && (
                <ul className="auth-dialog__points">
                    {points.map((point) => {
                        const PointIcon = point.Icon;
                        return (
                            <li key={point.text} className="auth-dialog__point">
                                <PointIcon aria-hidden="true" />
                                <span>{point.text}</span>
                            </li>
                        );
                    })}
                </ul>
            )}
        </>
    );
}

/** A Pokémon on its battle platform. */
export function AuthStage({ src, alt = '' }) {
    return (
        <div className="auth-dialog__stage">
            <img src={src} alt={alt} className="auth-dialog__sprite" loading="lazy" />
        </div>
    );
}

/** The step bar: which of N steps the user is on. */
export function AuthSteps({ steps, current }) {
    const index = steps.findIndex((s) => s.id === current);
    return (
        <ol className="auth-steps" style={{ '--auth-steps': steps.length }}>
            {steps.map((step, i) => (
                <li
                    key={step.id}
                    className={`auth-steps__item ${i < index ? 'is-done' : ''} ${i === index ? 'is-current' : ''}`}
                    aria-current={i === index ? 'step' : undefined}
                >
                    {step.label}
                </li>
            ))}
        </ol>
    );
}
