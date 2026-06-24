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

    // Keep the latest onClose without re-running the focus effect. Callers often
    // pass an inline arrow (e.g. `() => setX(null)`) that changes identity on
    // every parent render; if that drove the effect, any parent re-render while
    // the modal is open (e.g. updating a shared cache as the user types) would
    // re-run the mount logic and yank focus back to the dialog — stealing it
    // from inputs after a single keystroke.
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

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
                onCloseRef.current?.();
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
    }, []);

    return dialogRef;
}
