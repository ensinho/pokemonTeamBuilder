import React, { useEffect, useRef } from 'react';
import { CloseIcon, PokeballIcon } from '../icons';
import { useTranslation } from '../../hooks/useTranslation';

export function SyncPromptModal({ onSignUp, onSignIn, onDismiss }) {
    const { t } = useTranslation();
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
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 animate-fade-in sm:items-center"
            onMouseDown={(e) => { if (e.target === e.currentTarget) onDismiss?.(); }}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="sync-prompt-title"
                tabIndex={-1}
                className="w-full max-w-md rounded-xl bg-surface text-fg shadow-2xl animate-scale-in"
            >
                <header className="flex items-start justify-between gap-2 border-b border-surface-raised px-5 py-4">
                    <div className="flex items-center gap-2">
                        <span className="text-primary"><PokeballIcon /></span>
                        <h2 id="sync-prompt-title" className="text-lg font-bold text-primary">
                            {t('modals.syncPromptTitle')}
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onDismiss}
                        aria-label={t('common.close')}
                        className="rounded-md p-1 text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                        <CloseIcon />
                    </button>
                </header>

                <div className="px-5 py-4 space-y-3">
                    <p className="text-sm text-fg">
                        {t('modals.syncPromptDesc')}
                    </p>

                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                        <button
                            type="button"
                            onClick={onSignUp}
                            className="btn btn-primary flex-1 font-bold"
                        >
                            {t('modals.syncPromptRegister')}
                        </button>
                        <button
                            type="button"
                            onClick={onSignIn}
                            className="btn btn-outline flex-1 font-semibold"
                        >
                            {t('modals.syncPromptHasAccount')}
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={onDismiss}
                        className="mt-1 w-full rounded text-xs text-muted underline hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                        {t('modals.syncPromptDismiss')}
                    </button>
                </div>
            </div>
        </div>
    );
}
