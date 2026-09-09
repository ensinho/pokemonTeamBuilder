import React from 'react';

import { useModalA11y } from '../../hooks/useModalA11y';
import { useTranslation } from '../../hooks/useTranslation';

export function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmText }) {
    const { t } = useTranslation();
    const dialogRef = useModalA11y(isOpen ? onClose : undefined);

    if (!isOpen) return null;

    return (
        <div className="modal-scrim" onClick={onClose} role="presentation">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-dialog-title"
                tabIndex={-1}
                className="modal-panel modal-panel--sm"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="modal-header">
                    <div>
                        <h2 id="confirm-dialog-title" className="modal-title">{title}</h2>
                        <p className="modal-subtitle">{message}</p>
                    </div>
                </div>

                <div className="modal-footer">
                    <button type="button" onClick={onClose} className="btn btn-ghost">
                        {t('common.cancel')}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            onConfirm?.();
                            onClose?.();
                        }}
                        className="btn btn-danger"
                    >
                        {confirmText || t('common.confirm')}
                    </button>
                </div>
            </div>
        </div>
    );
}