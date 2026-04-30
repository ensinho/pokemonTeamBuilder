import React, { useEffect, useRef, useState } from 'react';
import { CloseIcon } from './icons';

/**
 * AuthModal — minimal email + password sign in / sign up modal.
 *
 * Props:
 *  - mode: 'signIn' | 'signUp' (initial mode; user can toggle)
 *  - canLink: when true, sign-up will LINK the current anonymous account
 *             so existing teams/favorites are preserved.
 *  - onSignIn(email, password): Promise<void>
 *  - onSignUp(email, password): Promise<void>
 *  - onClose(): void
 *  - colors: theme colors object
 */
export function AuthModal({ mode: initialMode = 'signIn', canLink = false, onSignIn, onSignUp, onClose, colors }) {
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
        if (!/^\S+@\S+\.\S+$/.test(email.trim())) return 'Please enter a valid email.';
        if (password.length < 6) return 'Password must be at least 6 characters.';
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
            setError(prettifyAuthError(err));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
            onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="auth-modal-title"
                tabIndex={-1}
                className="w-full max-w-sm rounded-xl shadow-2xl animate-scale-in"
                style={{ backgroundColor: colors.card, color: colors.text }}
            >
                <header
                    className="flex items-center justify-between px-5 py-4 border-b"
                    style={{ borderColor: colors.cardLight }}
                >
                    <h2 id="auth-modal-title" className="text-lg font-bold" style={{ color: colors.primary }}>
                        {isSignUp ? 'Create your account' : 'Welcome back'}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="p-1 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        style={{ color: colors.textMuted }}
                    >
                        <CloseIcon />
                    </button>
                </header>

                <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
                    <p className="text-xs" style={{ color: colors.textMuted }}>
                        {isSignUp
                            ? (canLink
                                ? 'We will keep your current teams and favorites linked to this email so you can sign in from any device.'
                                : 'Your account lets you sync teams, favorites and preferences across devices.')
                            : 'Sign in to load your teams, favorites and preferences on this device.'}
                    </p>

                    <div
                        className="rounded-lg border p-3 flex flex-col items-center"
                        style={{ backgroundColor: colors.background, borderColor: colors.border }}
                    >
                        <img
                            src={AUTH_GIF_URL}
                            alt="Animated Pokemon"
                            loading="lazy"
                            className="w-24 h-24 image-pixelated"
                        />
                        <p className="text-[11px] mt-2 text-center" style={{ color: colors.textMuted }}>
                            {isSignUp ? 'Start your journey!' : 'Your team is waiting for you!'}
                        </p>
                    </div>

                    <label className="block">
                        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textMuted }}>
                            Email
                        </span>
                        <input
                            type="email"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="mt-1 w-full px-3 py-2 rounded-md border focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            style={{
                                backgroundColor: colors.background,
                                borderColor: colors.border,
                                color: colors.text,
                            }}
                            placeholder="trainer@pokemail.com"
                        />
                    </label>

                    <label className="block">
                        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textMuted }}>
                            Password
                        </span>
                        <input
                            type="password"
                            autoComplete={isSignUp ? 'new-password' : 'current-password'}
                            required
                            minLength={6}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-1 w-full px-3 py-2 rounded-md border focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            style={{
                                backgroundColor: colors.background,
                                borderColor: colors.border,
                                color: colors.text,
                            }}
                            placeholder="••••••••"
                        />
                    </label>

                    {error && (
                        <p className="text-sm" style={{ color: colors.danger }} role="alert">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={busy}
                        className="w-full py-2 rounded-md font-bold text-white transition-opacity disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        style={{ backgroundColor: colors.primary }}
                    >
                        {busy ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in'}
                    </button>

                    <div className="text-center pt-1">
                        <button
                            type="button"
                            onClick={() => { setError(''); setMode(isSignUp ? 'signIn' : 'signUp'); }}
                            className="text-xs underline hover:opacity-80"
                            style={{ color: colors.textMuted }}
                        >
                            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
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

function prettifyAuthError(err) {
    const code = err?.code || '';
    switch (code) {
        case 'auth/invalid-email': return 'That email looks invalid.';
        case 'auth/email-already-in-use': return 'That email is already registered. Try signing in instead.';
        case 'auth/weak-password': return 'Password must be at least 6 characters.';
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
        case 'auth/invalid-login-credentials': return 'Email or password is incorrect.';
        case 'auth/user-not-found': return 'No account found for that email.';
        case 'auth/network-request-failed': return 'Network error. Check your connection and try again.';
        case 'auth/too-many-requests': return 'Too many attempts. Try again in a moment.';
        case 'auth/credential-already-in-use': return 'That email is linked to another account. Sign in instead.';
        default: return err?.message || 'Something went wrong. Please try again.';
    }
}
