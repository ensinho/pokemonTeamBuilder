import React, { useEffect, useRef } from 'react';
import { AnchoredPopover } from '../AnchoredPopover';

/**
 * The forum's "Anexar" menu. Portalled and placed above its button, because
 * both composers sit at the bottom of a clipped container — the reply dock at
 * the foot of the thread, the actions row at the foot of the topic modal. As
 * an absolutely positioned child it opened below the button, outside the
 * visible area, so the button looked like it did nothing.
 */
export function AttachMenuPopover({ isOpen, onClose, anchorRef, ariaLabel, children }) {
    const popoverRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return undefined;
        const handlePointerDown = (event) => {
            if (anchorRef.current?.contains(event.target) || popoverRef.current?.contains(event.target)) return;
            onClose();
        };
        const handleKeyDown = (event) => {
            if (event.key !== 'Escape') return;
            // Close the menu, not the modal the menu sits in.
            event.stopPropagation();
            onClose();
            anchorRef.current?.focus();
        };
        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown, true);
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown, true);
        };
    }, [isOpen, onClose, anchorRef]);

    return (
        <AnchoredPopover
            isOpen={isOpen}
            anchorRef={anchorRef}
            popoverRef={popoverRef}
            placement="top"
            offset={6}
            ariaLabel={ariaLabel}
            className="comment-composer__attach-menu"
        >
            {children}
        </AnchoredPopover>
    );
}
