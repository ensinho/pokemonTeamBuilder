import React, { useEffect, useRef, useState } from 'react';
import { CloseIcon } from '../icons';
import { useTranslation } from '../../hooks/useTranslation';

export function AuthModal({ mode: initialMode = 'signIn', canLink = false, onSignIn, onSignUp, onClose }) {
    const { t } = useTranslation();
    const randomLoginPokemons = ['pikachu', 'eevee', 'charmander', 'gengar', 'squirtle', 'togepi', 'piplup', 'snivy'];
    const randomSelected = randomLoginPokemons[Math.floor(Math.random() * randomLoginPokemons.length)];
    const AUTH_GIF_URL = `https://play.pokemonshowdown.com/sprites/ani/${randomSelected}.gif`;
    const [mode, setMode] = useState(initialMode);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const { dialogRef } = useModalA11yLocal(onClose);

    const isSignUp = mode === 'signUp';

    const validate = () => {
        if (!/^\S+@\S+\.\S+$/.test(email.trim())) return t('modals.authValidationErrorEmail');
        if (password.length < 6) return t('modals.authValidationErrorPassword');
        return '';
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in"
            onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="auth-modal-title"
                tabIndex={-1}
                className="w-full max-w-sm rounded-xl bg-surface text-fg shadow-2xl animate-scale-in"
            >
                <header className="flex items-center justify-between border-b border-surface-raised px-5 py-4">
                    <h2 id="auth-modal-title" className="text-lg font-bold text-primary">
                        {isSignUp ? t('modals.authCreateAccountTitle') : t('modals.authWelcomeBackTitle')}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label={t('common.close')}
                        className="rounded-md p-1 text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                        <CloseIcon />
                    </button>
                </header>

                <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
                    <p className="text-xs text-muted">
                        {isSignUp
                            ? (canLink
                                ? t('modals.authDescLinkGuest')
                                : t('modals.authDescSyncAcross'))
                            : t('modals.authDescLoadExisting')}
                    </p>

                    <div className="flex flex-col items-center rounded-lg border border-border bg-bg p-3">
                        <img
                            src={AUTH_GIF_URL}
                            alt="Animated Pokemon"
                            loading="lazy"
                            className="w-24 h-24 image-pixelated"
                        />
                        <p className="mt-2 text-center text-[11px] text-muted">
                            {isSignUp ? t('modals.authSubStartJourney') : t('modals.authSubTeamWaiting')}
                        </p>
                    </div>

                    <label className="block">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                            {t('modals.authEmailLabel')}
                        </span>
                        <input
                            type="email"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            placeholder="trainer@pokemail.com"
                        />
                    </label>

                    <label className="block">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                            {t('modals.authPasswordLabel')}
                        </span>
                        <input
                            type="password"
                            autoComplete={isSignUp ? 'new-password' : 'current-password'}
                            required
                            minLength={6}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            placeholder="••••••••"
                        />
                    </label>

                    {error && (
                        <p className="text-sm text-danger" role="alert">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={busy}
                        className="w-full rounded-md bg-primary py-2 font-bold text-white transition-opacity disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                        {busy ? t('modals.authPleaseWait') : isSignUp ? t('modals.authSignUpBtn') : t('modals.authSignInBtn')}
                    </button>

                    <div className="text-center pt-1">
                        <button
                            type="button"
                            onClick={() => { setError(''); setMode(isSignUp ? 'signIn' : 'signUp'); }}
                            className="text-xs text-muted underline hover:opacity-80"
                        >
                            {isSignUp ? t('modals.authAlreadyHaveAccount') : t('modals.authDontHaveAccount')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Local a11y helper that exposes the dialog ref.
function useModalA11yLocal(onClose) {
    const dialogRef = useRef(null);
    const previouslyFocusedRef = useRef(null);

    useEffect(() => {
        previouslyFocusedRef.current = document.activeElement;
        const node = dialogRef.current;
        if (node) {
            const focusable = node.querySelector(
                'input:not([disabled]), button:not([disabled]), [href], select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            );
            (focusable || node).focus?.();
        }
        const onKey = (e) => {
            if (e.key === 'Escape') { e.stopPropagation(); onClose?.(); }
        };
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('keydown', onKey);
            const prev = previouslyFocusedRef.current;
            if (prev && typeof prev.focus === 'function') prev.focus();
        };
    }, [onClose]);

    return { dialogRef };
}

function prettifyAuthError(err, t) {
    const code = err?.code || '';
    switch (code) {
        case 'auth/invalid-email': return t('modals.authErrorInvalidEmail');
        case 'auth/email-already-in-use': return t('modals.authErrorEmailInUse');
        case 'auth/weak-password': return t('modals.authValidationErrorPassword');
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
        case 'auth/invalid-login-credentials': return t('modals.authErrorWrongPassword');
        case 'auth/user-not-found': return t('modals.authErrorUserNotFound');
        case 'auth/network-request-failed': return t('modals.authErrorNetwork');
        case 'auth/too-many-requests': return t('modals.authErrorTooManyRequests');
        case 'auth/credential-already-in-use': return t('modals.authErrorCredentialInUse');
        default: return err?.message || t('modals.authErrorDefault');
    }
}
