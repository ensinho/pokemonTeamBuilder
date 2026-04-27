import { useEffect, useRef } from 'react';

/**
 * Modal a11y essentials:
 *  - Closes on Escape key
 *  - Moves focus into the dialog on mount
 *  - Restores focus to the previously-focused element on unmount
 *
 * Apply the returned ref to the dialog's outermost focusable element and
 * give that element role="dialog" aria-modal="true" + an aria-label/labelledby.
 */
export function useModalA11y(onClose) {
    const dialogRef = useRef(null);
    const previouslyFocusedRef = useRef(null);

    useEffect(() => {
        previouslyFocusedRef.current = document.activeElement;
        const node = dialogRef.current;
        if (node) {
            const focusable = node.querySelector(
                'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            );
            (focusable || node).focus?.();
        }
        const onKey = (e) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                onClose?.();
            }
        };
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('keydown', onKey);
            const prev = previouslyFocusedRef.current;
            if (prev && typeof prev.focus === 'function') {
                prev.focus();
            }
        };
    }, [onClose]);

    return dialogRef;
}
