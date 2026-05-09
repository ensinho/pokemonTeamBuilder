import React, { useEffect, useRef } from 'react';
import { CloseIcon, PokeballIcon } from '../icons';

/**
 * SyncPromptModal — friendly nudge shown after the user has spent
 * a little time on the page anonymously, suggesting they sync their
 * progress to an account so it survives across devices.
 *
 * Props:
 *  - onSignUp(): open the sign-up flow
 *  - onSignIn(): open the sign-in flow
 *  - onDismiss(): close and don't show again this session
 *  - colors: theme colors object
 */
export function SyncPromptModal({ onSignUp, onSignIn, onDismiss, colors }) {
    const dialogRef = useRef(null);
    const previouslyFocusedRef = useRef(null);

    useEffect(() => {
        previouslyFocusedRef.current = document.activeElement;
        const node = dialogRef.current;
        if (node) {
            const focusable = node.querySelector(
                'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
            );
            (focusable || node).focus?.();
        }
        const onKey = (e) => {
            if (e.key === 'Escape') { e.stopPropagation(); onDismiss?.(); }
        };
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('keydown', onKey);
            const prev = previouslyFocusedRef.current;
            if (prev && typeof prev.focus === 'function') prev.focus();
        };
    }, [onDismiss]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 animate-fade-in"
            style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
            onMouseDown={(e) => { if (e.target === e.currentTarget) onDismiss?.(); }}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="sync-prompt-title"
                tabIndex={-1}
                className="w-full max-w-md rounded-xl shadow-2xl animate-scale-in"
                style={{ backgroundColor: colors.card, color: colors.text }}
            >
                <header
                    className="flex items-start justify-between gap-2 px-5 py-4 border-b"
                    style={{ borderColor: colors.cardLight }}
                >
                    <div className="flex items-center gap-2">
                        <span style={{ color: colors.primary }}><PokeballIcon /></span>
                        <h2 id="sync-prompt-title" className="text-lg font-bold" style={{ color: colors.primary }}>
                            Save your progress?
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onDismiss}
                        aria-label="Dismiss"
                        className="p-1 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        style={{ color: colors.textMuted }}
                    >
                        <CloseIcon />
                    </button>
                </header>

                <div className="px-5 py-4 space-y-3">
                    <p className="text-sm" style={{ color: colors.text }}>
                        Looks like you're enjoying the team builder! Want to sync your teams,
                        favorites and theme so you can pick up where you left off on any device?
                    </p>
                    <p className="text-xs" style={{ color: colors.textMuted }}>
                        It's optional and takes 10 seconds. Your current data will be linked to the new account.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                        <button
                            type="button"
                            onClick={onSignUp}
                            className="flex-1 py-2 rounded-md font-bold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            style={{ backgroundColor: colors.primary }}
                        >
                            Create account
                        </button>
                        <button
                            type="button"
                            onClick={onSignIn}
                            className="flex-1 py-2 rounded-md font-semibold border focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            style={{ borderColor: colors.border, color: colors.text, backgroundColor: colors.cardLight }}
                        >
                            I already have one
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={onDismiss}
                        className="w-full text-xs underline mt-1 hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                        style={{ color: colors.textMuted }}
                    >
                        Maybe later
                    </button>
                </div>
            </div>
        </div>
    );
}
