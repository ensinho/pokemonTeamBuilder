import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon } from '../icons';
import { useModalA11y } from '../../hooks/useModalA11y';
import { ForumExplorer } from './ForumExplorer';

// The slide-out lasts --duration-slow (250ms); the panel stays mounted for it.
const EXIT_MS = 250;
const DESKTOP_QUERY = '(min-width: 1024px)';

/**
 * The forum's map on a phone (2026-11-10): the explorer a desktop keeps as
 * its left column, behind ☰ — the side menu every feed app taught. Opening a
 * room, a category or a topic from it closes it.
 *
 * Mounted only while open or leaving, so the slide-in and the focus move run
 * each time; `useModalA11y` owns Escape and focus, the scrim closes on a tap.
 */
export function ForumDrawer({ open, onClose, t, ...explorerProps }) {
    const [phase, setPhase] = useState(open ? 'open' : 'closed');

    useEffect(() => {
        if (open) {
            setPhase('open');
            return undefined;
        }
        if (phase === 'closed') return undefined;
        setPhase('closing');
        const id = window.setTimeout(() => setPhase('closed'), EXIT_MS);
        return () => window.clearTimeout(id);
        // The phase follows `open`; reading it here must not restart the timer.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    // The page behind does not scroll while the drawer is open, and a
    // window that grows into the desktop layout has the column instead.
    useEffect(() => {
        if (!open) return undefined;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const desktop = window.matchMedia(DESKTOP_QUERY);
        const onChange = (e) => { if (e.matches) onClose(); };
        desktop.addEventListener('change', onChange);
        return () => {
            document.body.style.overflow = prev;
            desktop.removeEventListener('change', onChange);
        };
    }, [open, onClose]);

    if (phase === 'closed') return null;
    return createPortal(
        <ForumDrawerPanel isClosing={phase === 'closing'} onClose={onClose} t={t} explorerProps={explorerProps} />,
        document.body,
    );
}

function ForumDrawerPanel({ isClosing, onClose, t, explorerProps }) {
    const panelRef = useModalA11y(onClose);
    return (
        <div className={`forum-drawer ${isClosing ? 'is-closing' : ''}`} role="presentation">
            <div className="forum-drawer__scrim" onClick={onClose} />
            <div
                className="forum-drawer__panel"
                role="dialog"
                aria-modal="true"
                aria-label={t('forum.menuTitle')}
                ref={panelRef}
                tabIndex={-1}
                inert={isClosing}
            >
                <div className="forum-drawer__head">
                    <h2 className="forum-drawer__title">{t('forum.forumCrumb')}</h2>
                    <button type="button" className="btn btn-ghost btn-icon btn-sm touch-target" onClick={onClose} aria-label={t('forum.closeMenu')}>
                        <CloseIcon className="w-4 h-4" />
                    </button>
                </div>
                <ForumExplorer variant="drawer" onNavigate={onClose} t={t} {...explorerProps} />
            </div>
        </div>
    );
}
