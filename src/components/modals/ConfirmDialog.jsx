import React from 'react';

import { useModalA11y } from '../../hooks/useModalA11y';
import { useTranslation } from '../../hooks/useTranslation';

export function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmText }) {
    const { t } = useTranslation();
    const dialogRef = useModalA11y(isOpen ? onClose : undefined);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={onClose}
            role="presentation"
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-dialog-title"
                tabIndex={-1}
                className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-2xl focus:outline-none"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="space-y-2">
                    <h2 id="confirm-dialog-title" className="text-lg font-bold text-fg">
                        {title}
                    </h2>
                    <p className="text-sm leading-relaxed text-muted">
                        {message}
                    </p>
                </div>

                <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-semibold text-fg transition-colors hover:bg-surface-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            onConfirm?.();
                            onClose?.();
                        }}
                        className="inline-flex items-center justify-center rounded-lg bg-danger px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-fg"
                    >
                        {confirmText || t('common.confirm')}
                    </button>
                </div>
            </div>
        </div>
    );
}