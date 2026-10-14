import React, { useState } from 'react';
import { CloseIcon } from '../icons';
import { useTranslation } from '../../hooks/useTranslation';
import { useModalA11y } from '../../hooks/useModalA11y';
import { useAuthStore } from '../../store/useAuthStore';
import { prettifyAuthError } from '../../utils/authErrors';

const MIN_PASSWORD = 6;

/**
 * Change the password, or delete the account — the two things an account
 * holder could not do anywhere in the app. Both start by asking for the
 * current password: Firebase requires a fresh sign-in for either, and it is
 * the confirmation a deletion deserves.
 */
export function AccountSecurityModal({ mode, onClose }) {
    const { t } = useTranslation();
    const dialogRef = useModalA11y(onClose);
    const userEmail = useAuthStore((s) => s.userEmail);
    const changePassword = useAuthStore((s) => s.changePassword);
    const deleteAccount = useAuthStore((s) => s.deleteAccount);
    const sendPasswordReset = useAuthStore((s) => s.sendPasswordReset);

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [busy, setBusy] = useState(false);

    const isDelete = mode === 'delete';

    const validate = () => {
        if (!currentPassword) return t('modals.accountCurrentPasswordRequired');
        if (isDelete) return '';
        if (newPassword.length < MIN_PASSWORD) return t('modals.authValidationErrorPassword');
        if (newPassword !== confirmPassword) return t('modals.accountPasswordMismatch');
        if (newPassword === currentPassword) return t('modals.accountPasswordUnchanged');
        return '';
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const problem = validate();
        if (problem) { setError(problem); return; }
        setError('');
        setBusy(true);
        try {
            if (isDelete) await deleteAccount(currentPassword);
            else await changePassword(currentPassword, newPassword);
            onClose();
        } catch (err) {
            setError(prettifyAuthError(err, t));
            setBusy(false);
        }
    };

    const handleSendReset = async () => {
        if (!userEmail || busy) return;
        setError('');
        setBusy(true);
        try {
            await sendPasswordReset(userEmail);
            setNotice(t('modals.authResetSent', { email: userEmail }));
        } catch (err) {
            setError(prettifyAuthError(err, t));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div
            className="modal-scrim"
            onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="account-security-title"
                tabIndex={-1}
                className="modal-panel modal-panel--sm"
            >
                <header className="modal-header">
                    <div className="min-w-0 flex-1">
                        <h2 id="account-security-title" className="modal-title">
                            {isDelete ? t('modals.accountDeleteTitle') : t('modals.accountPasswordTitle')}
                        </h2>
                        <p className="modal-subtitle">
                            {isDelete ? t('modals.accountDeleteDesc') : t('modals.accountPasswordDesc')}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={busy}
                        aria-label={t('common.close')}
                        className="modal-close"
                    >
                        <CloseIcon />
                    </button>
                </header>

                <form onSubmit={handleSubmit} className="modal-body flex flex-col gap-4">
                    {/* The account name for password managers, which file the
                        new password under it. */}
                    <input type="email" autoComplete="username" value={userEmail || ''} readOnly hidden />

                    <label className="field">
                        <span className="field-label">{t('modals.accountCurrentPassword')}</span>
                        <input
                            type="password"
                            autoComplete="current-password"
                            enterKeyHint={isDelete ? 'go' : 'next'}
                            required
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="input-clean"
                            placeholder="••••••••"
                        />
                    </label>

                    {!isDelete && (
                        <>
                            <label className="field">
                                <span className="field-label">{t('modals.accountNewPassword')}</span>
                                <input
                                    type="password"
                                    autoComplete="new-password"
                                    enterKeyHint="next"
                                    required
                                    minLength={MIN_PASSWORD}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="input-clean"
                                    placeholder="••••••••"
                                />
                            </label>
                            <label className="field">
                                <span className="field-label">{t('modals.accountConfirmPassword')}</span>
                                <input
                                    type="password"
                                    autoComplete="new-password"
                                    enterKeyHint="go"
                                    required
                                    minLength={MIN_PASSWORD}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="input-clean"
                                    placeholder="••••••••"
                                />
                            </label>
                        </>
                    )}

                    {error && <p className="text-sm text-danger" role="alert">{error}</p>}
                    {notice && !error && <p className="text-sm text-muted" role="status">{notice}</p>}

                    <div className="flex flex-col gap-2">
                        <button
                            type="submit"
                            disabled={busy}
                            className={`btn btn-lg btn-block ${isDelete ? 'btn-danger' : 'btn-primary'}`}
                        >
                            {busy
                                ? t('modals.authPleaseWait')
                                : isDelete ? t('modals.accountDeleteBtn') : t('modals.accountPasswordBtn')}
                        </button>
                        {!isDelete && (
                            <button
                                type="button"
                                onClick={handleSendReset}
                                disabled={busy}
                                className="btn btn-ghost btn-block"
                            >
                                {t('modals.accountForgotCurrent')}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
