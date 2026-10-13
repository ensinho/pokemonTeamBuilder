import React, { useId } from 'react';
import { createPortal } from 'react-dom';

import { useModalA11y } from '../hooks/useModalA11y';
import { useTranslation } from '../hooks/useTranslation';
import { CloseIcon } from './icons';
import '../styles/game-history.css';

/**
 * The run/day history of a game (PokéPuzzle, Generation Quiz, PokéQuiz) as the
 * app's one dialog: `.modal-scrim > .modal-panel` with useModalA11y, so it gets
 * Escape, focus in and back, drag-to-dismiss as a sheet on phones and the exit
 * animation. The three games each hand-rolled a right-hand drawer with none of
 * those. Render it conditionally — it is open while mounted.
 */
export function GameHistoryDialog({ title, onClose, onScroll, children }) {
    const { t } = useTranslation();
    const titleId = useId();
    const panelRef = useModalA11y(onClose);

    return createPortal(
        <div className="modal-scrim" onClick={onClose} role="presentation">
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                className="modal-panel modal-panel--md game-history"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="modal-header">
                    <h2 id={titleId} className="modal-title">{title}</h2>
                    <button type="button" className="modal-close" onClick={onClose} aria-label={t('common.close')}>
                        <CloseIcon />
                    </button>
                </div>
                <div className="modal-body game-history__body" onScroll={onScroll}>
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
}
