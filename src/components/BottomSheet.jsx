import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useModalA11y } from '../hooks/useModalA11y';
import '../styles/bottom-sheet.css';

/**
 * BottomSheet — mobile-first sheet that slides up from the bottom.
 * The standard mobile pattern for filters / secondary actions.
 *
 * Mount it only while open (parent guards with `{open && <BottomSheet .../>}`)
 * so the slide-up + focus-in run each time it opens.
 *
 * Props: onClose, title, children.
 */
export function BottomSheet({ onClose, title, children }) {
    const dialogRef = useModalA11y(onClose);

    // Lock body scroll while the sheet is open.
    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, []);

    return createPortal(
        <div className="bottom-sheet" role="presentation">
            <div className="bottom-sheet__backdrop" onClick={onClose} />
            <div
                className="bottom-sheet__panel"
                role="dialog"
                aria-modal="true"
                aria-label={title}
                ref={dialogRef}
                tabIndex={-1}
            >
                <div className="bottom-sheet__handle" aria-hidden="true" />
                <div className="bottom-sheet__header">
                    <h2 className="bottom-sheet__title">{title}</h2>
                    <button type="button" className="bottom-sheet__close" onClick={onClose} aria-label="Close">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="bottom-sheet__body custom-scrollbar">{children}</div>
            </div>
        </div>,
        document.body
    );
}
