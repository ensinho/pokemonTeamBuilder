import React, { useMemo, useState } from 'react';
import { Cloud, Medal, Swords, MailCheck } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { prettifyAuthError } from '../../utils/authErrors';
import { MIN_PASSWORD_LENGTH } from '../../utils/passwordStrength';
import { Loader } from '../Loader';
import { AuthDialogShell, AuthHero, AuthStage } from './auth/AuthDialogShell';
import { PasswordField } from './auth/PasswordField';
import { SHOWDOWN_SPRITES_BASE } from '../../utils/assetHost';

const LOGIN_POKEMON = ['pikachu', 'eevee', 'charmander', 'gengar', 'squirtle', 'togepi', 'piplup', 'snivy'];
const EMAIL_RE = /^\S+@\S+\.\S+$/;

/**
 * Sign in, create an account, or get back in — the trainer card. Three views
 * in one dialog ('signIn' | 'signUp' | 'reset'), switched in place so the
 * email typed in one carries into the next.
 */
export function AuthModal({ mode: initialMode = 'signIn', canLink = false, onSignIn, onSignUp, onResetPassword, onClose }) {
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
    const [busy, setBusy] = useState(false);
    const [resetSentTo, setResetSentTo] = useState('');

    const isSignUp = mode === 'signUp';
    const isReset = mode === 'reset';

    const switchMode = (next) => {
        setError('');
        setResetSentTo('');
        setMode(next);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!EMAIL_RE.test(email.trim())) { setError(t('modals.authValidationErrorEmail')); return; }
        if (!isReset && password.length < MIN_PASSWORD_LENGTH) { setError(t('modals.authValidationErrorPassword')); return; }
        setError('');
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
            setError(prettifyAuthError(err, t));
            setBusy(false);
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
                    {isReset ? (
                        <div className="auth-dialog__heading">
                            <h3>{t('modals.authResetHeading')}</h3>
                            <p>{t('modals.authResetHint')}</p>
                        </div>
                    ) : (
                        // Two places, one switch: the thumb travels between them.
                        <div className="segmented segmented--block segmented--lg" role="group" aria-label={t('modals.authEyebrow')}>
                            <button type="button" className="segmented__item" aria-pressed={!isSignUp} onClick={() => switchMode('signIn')}>
                                {t('modals.authTabSignIn')}
                            </button>
                            <button type="button" className="segmented__item" aria-pressed={isSignUp} onClick={() => switchMode('signUp')}>
                                {t('modals.authTabSignUp')}
                            </button>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="auth-dialog__form" noValidate>
                        <label className="field">
                            <span className="field-label">{t('modals.authEmailLabel')}</span>
                            <input
                                type="email"
                                autoComplete="email"
                                autoCapitalize="none"
                                autoCorrect="off"
                                inputMode="email"
                                enterKeyHint={isReset ? 'send' : 'next'}
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input-clean"
                                placeholder="trainer@pokemail.com"
                            />
                        </label>

                        {!isReset && (
                            <PasswordField
                                label={t('modals.authPasswordLabel')}
                                value={password}
                                onChange={setPassword}
                                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                                enterKeyHint="go"
                                minLength={MIN_PASSWORD_LENGTH}
                            />
                        )}
                        {isSignUp && <p className="auth-dialog__message auth-dialog__message--info">{t('modals.authPasswordHintNew')}</p>}

                        {error && <p className="auth-dialog__message auth-dialog__message--error" role="alert">{error}</p>}

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
                </>
            )}
        </AuthDialogShell>
    );
}
