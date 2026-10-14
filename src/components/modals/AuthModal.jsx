import React, { useState } from 'react';
import { CloseIcon } from '../icons';
import { useTranslation } from '../../hooks/useTranslation';
import { useModalA11y } from '../../hooks/useModalA11y';
import { prettifyAuthError } from '../../utils/authErrors';

export function AuthModal({ mode: initialMode = 'signIn', canLink = false, onSignIn, onSignUp, onResetPassword, onClose }) {
    const { t } = useTranslation();
    const randomLoginPokemons = ['pikachu', 'eevee', 'charmander', 'gengar', 'squirtle', 'togepi', 'piplup', 'snivy'];
    const randomSelected = randomLoginPokemons[Math.floor(Math.random() * randomLoginPokemons.length)];
    const AUTH_GIF_URL = `https://play.pokemonshowdown.com/sprites/ani/${randomSelected}.gif`;
    const [mode, setMode] = useState(initialMode);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState('');
    const dialogRef = useModalA11y(onClose);

    const isSignUp = mode === 'signUp';

    const validate = () => {
        if (!/^\S+@\S+\.\S+$/.test(email.trim())) return t('modals.authValidationErrorEmail');
        if (password.length < 6) return t('modals.authValidationErrorPassword');
        return '';
    };

    // Firebase answers the same whether or not the address has an account, so
    // the notice can't confirm one exists — it says where to look if it does.
    const handleForgotPassword = async () => {
        if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setNotice(''); setError(t('modals.authResetNeedsEmail')); return; }
        setError('');
        setBusy(true);
        try {
            await onResetPassword(email.trim());
            setNotice(t('modals.authResetSent', { email: email.trim() }));
        } catch (err) {
            setError(prettifyAuthError(err, t));
        } finally {
            setBusy(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const v = validate();
        if (v) { setError(v); return; }
        setError('');
        setBusy(true);
        try {
            if (isSignUp) {
                await onSignUp(email.trim(), password);
            } else {
                await onSignIn(email.trim(), password);
            }
            onClose?.();
        } catch (err) {
            setError(prettifyAuthError(err, t));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div
            className="modal-scrim"
            onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="auth-modal-title"
                tabIndex={-1}
                className="modal-panel modal-panel--sm"
            >
                <header className="modal-header">
                    <div className="min-w-0 flex-1">
                        <h2 id="auth-modal-title" className="modal-title">
                            {isSignUp ? t('modals.authCreateAccountTitle') : t('modals.authWelcomeBackTitle')}
                        </h2>
                        <p className="modal-subtitle">
                            {isSignUp
                                ? (canLink
                                    ? t('modals.authDescLinkGuest')
                                    : t('modals.authDescSyncAcross'))
                                : t('modals.authDescLoadExisting')}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label={t('common.close')}
                        className="modal-close"
                    >
                        <CloseIcon />
                    </button>
                </header>

                <form onSubmit={handleSubmit} className="modal-body flex flex-col gap-4">
                    {/* A fill, not a box: the panel already owns the one line. */}
                    <div className="flex flex-col items-center rounded-lg bg-surface-raised px-3 py-4">
                        <img
                            src={AUTH_GIF_URL}
                            alt=""
                            loading="lazy"
                            className="w-20 h-20 image-pixelated"
                        />
                        <p className="mt-2 text-center text-xs text-muted">
                            {isSignUp ? t('modals.authSubStartJourney') : t('modals.authSubTeamWaiting')}
                        </p>
                    </div>

                    <label className="field">
                        <span className="field-label">{t('modals.authEmailLabel')}</span>
                        <input
                            type="email"
                            autoComplete="email"
                            autoCapitalize="none"
                            autoCorrect="off"
                            inputMode="email"
                            enterKeyHint="next"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="input-clean"
                            placeholder="trainer@pokemail.com"
                        />
                    </label>

                    <label className="field">
                        <span className="field-label">{t('modals.authPasswordLabel')}</span>
                        <input
                            type="password"
                            autoComplete={isSignUp ? 'new-password' : 'current-password'}
                            enterKeyHint="go"
                            required
                            minLength={6}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="input-clean"
                            placeholder="••••••••"
                        />
                    </label>

                    {error && (
                        <p className="text-sm text-danger" role="alert">
                            {error}
                        </p>
                    )}
                    {notice && !error && (
                        <p className="text-sm text-muted" role="status">
                            {notice}
                        </p>
                    )}

                    <div className="flex flex-col gap-2">
                        <button
                            type="submit"
                            disabled={busy}
                            className="btn btn-primary btn-lg btn-block"
                        >
                            {busy ? t('modals.authPleaseWait') : isSignUp ? t('modals.authSignUpBtn') : t('modals.authSignInBtn')}
                        </button>

                        {!isSignUp && onResetPassword && (
                            <button
                                type="button"
                                onClick={handleForgotPassword}
                                disabled={busy}
                                className="btn btn-ghost btn-block"
                            >
                                {t('modals.authForgotPassword')}
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => { setError(''); setNotice(''); setMode(isSignUp ? 'signIn' : 'signUp'); }}
                            className="btn btn-ghost btn-block"
                        >
                            {isSignUp ? t('modals.authAlreadyHaveAccount') : t('modals.authDontHaveAccount')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

