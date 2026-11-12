import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Cloud, LockKeyhole, Mail, Medal, Swords, MailCheck } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { authErrorField, isAuthCancel, prettifyAuthError } from '../../utils/authErrors';
import { MIN_PASSWORD_LENGTH } from '../../utils/passwordStrength';
import { Loader } from '../Loader';
import { AuthDialogShell, AuthHero, AuthStage } from './auth/AuthDialogShell';
import { PasswordField } from './auth/PasswordField';
import { GoogleButton } from '../GoogleButton';
import { useGoogleSignInAvailable } from '../../services/googleAvailability';
import { SHOWDOWN_SPRITES_BASE } from '../../utils/assetHost';

const LOGIN_POKEMON = ['pikachu', 'eevee', 'charmander', 'gengar', 'squirtle', 'togepi', 'piplup', 'snivy'];
const EMAIL_RE = /^\S+@\S+\.\S+$/;

/**
 * Sign in, create an account, or get back in — the trainer card. Three views
 * in one dialog ('signIn' | 'signUp' | 'reset'), switched in place so the
 * email typed in one carries into the next.
 *
 * 2026-11-09 (the journal reference's sign-up — .claude/skills/app-screens):
 * filled fields with a leading icon, the form first, and the other mode as a
 * footer sentence ("Novo por aqui? Criar conta") instead of a switch above
 * the fields. On a phone the form's surface rises over the scene
 * (auth-dialog.css).
 */
export function AuthModal({ mode: initialMode = 'signIn', canLink = false, onSignIn, onSignUp, onGoogle, onResetPassword, onClose }) {
    const { t } = useTranslation();
    // Picked once per opening, not per render — it used to change on every keystroke.
    const sprite = useMemo(
        () => `${SHOWDOWN_SPRITES_BASE}/ani/${LOGIN_POKEMON[Math.floor(Math.random() * LOGIN_POKEMON.length)]}.gif`,
        [],
    );
    const [mode, setMode] = useState(initialMode);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    // Which field the error is about ('email' | 'password' | null): marked
    // aria-invalid, pointed at the message, and focused.
    const [errorField, setErrorField] = useState(null);
    const emailRef = useRef(null);
    const passwordRef = useRef(null);
    const [busy, setBusy] = useState(false);
    const [googleBusy, setGoogleBusy] = useState(false);
    const googleOn = useGoogleSignInAvailable();
    const [resetSentTo, setResetSentTo] = useState('');

    const isSignUp = mode === 'signUp';
    const isReset = mode === 'reset';

    const showError = (message, field = null) => {
        setError(message);
        setErrorField(field);
    };
    // Focus once the form is back (it unmounts while a request is in flight).
    useEffect(() => {
        if (busy || !error) return;
        if (errorField === 'email') emailRef.current?.focus();
        else if (errorField === 'password') passwordRef.current?.focus();
    }, [busy, error, errorField]);

    const switchMode = (next) => {
        setError('');
        setErrorField(null);
        setResetSentTo('');
        setMode(next);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!EMAIL_RE.test(email.trim())) { showError(t('modals.authValidationErrorEmail'), 'email'); return; }
        if (!isReset && password.length < MIN_PASSWORD_LENGTH) { showError(t('modals.authValidationErrorPassword'), 'password'); return; }
        setError('');
        setErrorField(null);
        setBusy(true);
        try {
            if (isReset) {
                await onResetPassword(email.trim());
                setResetSentTo(email.trim());
                setBusy(false);
                return;
            }
            if (isSignUp) await onSignUp(email.trim(), password);
            else await onSignIn(email.trim(), password);
            onClose?.();
        } catch (err) {
            showError(prettifyAuthError(err, t), authErrorField(err));
            setBusy(false);
        }
    };

    // Google (2026-11-12): the popup does the rest; closing it is not an error.
    const handleGoogle = async () => {
        setError('');
        setErrorField(null);
        setGoogleBusy(true);
        try {
            await onGoogle();
            onClose?.();
        } catch (err) {
            setGoogleBusy(false);
            if (!isAuthCancel(err)) showError(prettifyAuthError(err, t));
        }
    };

    const hero = (
        <AuthHero
            titleId="auth-modal-title"
            eyebrow={t('modals.authEyebrow')}
            title={isReset ? t('modals.authResetTitle') : isSignUp ? t('modals.authCreateAccountTitle') : t('modals.authWelcomeBackTitle')}
            lead={isReset
                ? t('modals.authResetLead')
                : isSignUp
                    ? (canLink ? t('modals.authDescLinkGuest') : t('modals.authDescSyncAcross'))
                    : t('modals.authDescLoadExisting')}
            art={<AuthStage src={sprite} />}
            points={isReset ? [] : [
                { Icon: Cloud, text: t('modals.authBenefitSync') },
                { Icon: Swords, text: t('modals.authBenefitSocial') },
                { Icon: Medal, text: t('modals.authBenefitProgress') },
            ]}
        />
    );

    return (
        <AuthDialogShell variant="account" labelledBy="auth-modal-title" hero={hero} onClose={onClose} locked={busy}>
            {busy && !isReset ? (
                <div className="auth-dialog__status">
                    <Loader size="lg" label={isSignUp ? t('modals.authCreating') : t('modals.authSigningIn')} />
                    <p>{isSignUp ? t('modals.authSubStartJourney') : t('modals.authSubTeamWaiting')}</p>
                </div>
            ) : resetSentTo ? (
                <div className="auth-dialog__status">
                    <span className="auth-dialog__emblem is-done" aria-hidden="true"><MailCheck /></span>
                    <h3>{t('modals.authResetSentTitle')}</h3>
                    <p>{t('modals.authResetSent', { email: resetSentTo })}</p>
                    <button type="button" onClick={() => switchMode('signIn')} className="btn btn-primary btn-lg">
                        {t('modals.authResetBack')}
                    </button>
                </div>
            ) : (
                <>
                    {isReset && (
                        <div className="auth-dialog__heading">
                            <h3>{t('modals.authResetHeading')}</h3>
                            <p>{t('modals.authResetHint')}</p>
                        </div>
                    )}

                    {!isReset && onGoogle && googleOn && (
                        <>
                            <GoogleButton onClick={handleGoogle} busy={googleBusy} label={t('modals.authGoogle')} busyLabel={t('modals.authGoogleWorking')} />
                            <p className="auth-or" aria-hidden="true">{t('modals.authOr')}</p>
                        </>
                    )}

                    <form onSubmit={handleSubmit} className="auth-dialog__form" noValidate>
                        <label className="field field--filled">
                            <span className="field-label">{t('modals.authEmailLabel')}</span>
                            <span className="field__control">
                                <Mail className="field__icon" aria-hidden="true" />
                                <input
                                    ref={emailRef}
                                    type="email"
                                    autoComplete="email"
                                    autoCapitalize="none"
                                    autoCorrect="off"
                                    inputMode="email"
                                    enterKeyHint={isReset ? 'send' : 'next'}
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    aria-invalid={errorField === 'email' || undefined}
                                    aria-describedby={error && errorField === 'email' ? 'auth-modal-error' : undefined}
                                    className="input-clean"
                                    placeholder="trainer@pokemail.com"
                                />
                            </span>
                        </label>

                        {!isReset && (
                            <PasswordField
                                mascot
                                filled
                                icon={LockKeyhole}
                                label={t('modals.authPasswordLabel')}
                                value={password}
                                onChange={setPassword}
                                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                                enterKeyHint="go"
                                minLength={MIN_PASSWORD_LENGTH}
                                inputRef={passwordRef}
                                invalid={errorField === 'password'}
                                describedBy={error && errorField === 'password' ? 'auth-modal-error' : undefined}
                            />
                        )}
                        {isSignUp && <p className="auth-dialog__message auth-dialog__message--info">{t('modals.authPasswordHintNew')}</p>}

                        {error && <p id="auth-modal-error" className="auth-dialog__message auth-dialog__message--error" role="alert">{error}</p>}

                        <div className="auth-dialog__actions">
                            <button type="submit" disabled={busy} className="btn btn-primary btn-lg btn-block">
                                {isReset
                                    ? (busy ? t('modals.authPleaseWait') : t('modals.authResetBtn'))
                                    : isSignUp ? t('modals.authSignUpBtn') : t('modals.authSignInBtn')}
                            </button>
                            {isReset ? (
                                <button type="button" onClick={() => switchMode('signIn')} className="btn btn-ghost btn-block">
                                    {t('modals.authResetBack')}
                                </button>
                            ) : !isSignUp && onResetPassword && (
                                <button type="button" onClick={() => switchMode('reset')} className="btn btn-ghost btn-block">
                                    {t('modals.authForgotPassword')}
                                </button>
                            )}
                        </div>
                    </form>

                    {!isReset && (
                        // The other mode, as every app says it: a sentence and a link.
                        <p className="auth-dialog__switch">
                            {isSignUp ? t('modals.authHaveAccount') : t('modals.authNoAccount')}
                            {' '}
                            <button type="button" className="auth-dialog__switch-link" onClick={() => switchMode(isSignUp ? 'signIn' : 'signUp')}>
                                {isSignUp ? t('modals.authTabSignIn') : t('modals.authTabSignUp')}
                            </button>
                        </p>
                    )}
                </>
            )}
        </AuthDialogShell>
    );
}
