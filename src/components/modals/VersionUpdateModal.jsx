import React from 'react';
import { CloseIcon, RefreshIcon } from '../icons';
import { useTranslation } from '../../hooks/useTranslation';
import { useModalA11y } from '../../hooks/useModalA11y';

export function VersionUpdateModal({ onRefresh, onDismiss }) {
    const { t } = useTranslation();
    const dialogRef = useModalA11y(onDismiss);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 animate-fade-in"
            onMouseDown={(e) => { if (e.target === e.currentTarget) onDismiss?.(); }}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="version-update-title"
                tabIndex={-1}
                className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-2xl animate-scale-in focus:outline-none"
            >
                <header className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-primary">
                            <RefreshIcon className="w-5 h-5 animate-spin-slow" />
                        </div>
                        <h2 id="version-update-title" className="text-lg font-extrabold text-fg">
                            {t('modals.versionTitle')}
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onDismiss}
                        aria-label={t('common.close')}
                        className="rounded-md p-1.5 text-muted hover:bg-surface-raised hover:text-fg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                        <CloseIcon />
                    </button>
                </header>

                <div className="mt-4 space-y-4">
                    <p className="text-sm leading-relaxed text-muted">
                        {t('modals.versionDesc')}
                    </p>

                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-1">
                        <button
                            type="button"
                            onClick={onDismiss}
                            className="btn btn-outline px-5 py-2.5"
                        >
                            {t('modals.versionLater')}
                        </button>
                        <button
                            type="button"
                            onClick={onRefresh}
                            className="btn btn-primary flex items-center justify-center gap-2 px-6 py-2.5 font-bold text-white transition-opacity hover:opacity-90 active:opacity-75"
                        >
                            <RefreshIcon className="w-4 h-4 shrink-0" />
                            {t('modals.versionRefresh')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
