import React from 'react';
import { createPortal } from 'react-dom';
import { useModalA11y } from '../../hooks/useModalA11y';
import { CloseIcon } from '../icons';

/**
 * The phone's PokéPuzzle standings (2026-11-12, Enzo: "no mobile seguir por
 * menu lateral"): the day, the trainer's record and the weekly league in a
 * drawer from the right edge, so they never stack under a board that can
 * already be eight rows tall. The drawer scrolls on its own; the page keeps
 * its one scroll.
 *
 * Not a `.modal-panel`: below 640px that becomes a bottom sheet, and this
 * one is a side drawer at every width. `useModalA11y` still owns Escape,
 * focus and the exit (`.modal-scrim.is-exiting`).
 */
export function PuzzleStandingsDrawer({ onClose, t, children }) {
    const panelRef = useModalA11y(onClose);
    return createPortal(
        <div className="modal-scrim pp-drawer-scrim" onClick={onClose}>
            <div
                ref={panelRef}
                className="pp-drawer"
                role="dialog"
                aria-modal="true"
                aria-label={t('pokepuzzle.day.open')}
                tabIndex={-1}
                onClick={(event) => event.stopPropagation()}
            >
                <header className="pp-drawer__head">
                    <h2 className="pp-drawer__title">{t('pokepuzzle.day.openShort')}</h2>
                    <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label={t('pokepuzzle.day.close')}>
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </header>
                <div className="pp-drawer__body custom-scrollbar">
                    {children}
                </div>
            </div>
        </div>,
        document.body,
    );
}
