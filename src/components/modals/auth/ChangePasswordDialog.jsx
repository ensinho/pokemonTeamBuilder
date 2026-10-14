import React, { useState } from 'react';
import { Check, Circle, KeyRound, LockKeyhole, RefreshCw, ShieldCheck } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';
import { useAuthStore } from '../../../store/useAuthStore';
import { toast } from '../../../store/useToastStore';
import { prettifyAuthError } from '../../../utils/authErrors';
import { MIN_PASSWORD_LENGTH, passwordStrength } from '../../../utils/passwordStrength';
import { Loader } from '../../Loader';
import { AuthDialogShell, AuthHero, AuthSteps } from './AuthDialogShell';
import { PasswordField } from './PasswordField';

/**
 * Change password — the vault. Three steps the user can see: prove it's you
 * (a real reauthentication, so a wrong password fails here, not after typing
 * the new one twice), choose the new one with a live strength meter, done.
 */
export function ChangePasswordDialog({ onClose }) {
    const { t } = useTranslation();
    const userEmail = useAuthStore((s) => s.userEmail);
    const reauthenticate = useAuthStore((s) => s.reauthenticate);
    const setNewPassword = useAuthStore((s) => s.setNewPassword);
    const sendPasswordReset = useAuthStore((s) => s.sendPasswordReset);

    const [step, setStep] = useState('verify'); // 'verify' | 'choose' | 'done'
    const [working, setWorking] = useState(null); // null | 'verifying' | 'saving' | 'sending'
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPasswordValue] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const strength = passwordStrength(newPassword);
    // Anything typed lights at least one bar, so the meter visibly answers.
    const litBars = newPassword ? Math.max(1, strength.score) : 0;
    const rules = [
        { id: 'length', met: newPassword.length >= MIN_PASSWORD_LENGTH, label: t('modals.pwRuleLength', { count: MIN_PASSWORD_LENGTH }) },
        { id: 'match', met: !!newPassword && newPassword === confirmPassword, label: t('modals.pwRuleMatch') },
        { id: 'differs', met: !!newPassword && newPassword !== currentPassword, label: t('modals.pwRuleDiffers') },
    ];
    const canSave = rules.every((r) => r.met);

    const handleVerify = async (e) => {
        e.preventDefault();
        if (!currentPassword) { setError(t('modals.accountCurrentPasswordRequired')); return; }
        setError('');
        setNotice('');
        setWorking('verifying');
        try {
            await reauthenticate(currentPassword);
            setStep('choose');
        } catch (err) {
            setError(prettifyAuthError(err, t));
        } finally {
            setWorking(null);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!canSave) { setError(t('modals.pwFixRules')); return; }
        setError('');
        setWorking('saving');
        try {
            await setNewPassword(newPassword);
            setStep('done');
            toast.success(t('toast.passwordChanged'));
        } catch (err) {
            // Idle too long on step 2: Firebase wants a fresh sign-in again.
            if (err?.code === 'auth/requires-recent-login') {
                setStep('verify');
                setCurrentPassword('');
                setError(t('modals.pwVerifyAgain'));
            } else {
                setError(prettifyAuthError(err, t));
            }
        } finally {
            setWorking(null);
        }
    };

    const handleSendReset = async () => {
        if (!userEmail) return;
        setError('');
        setWorking('sending');
        try {
            await sendPasswordReset(userEmail);
            setNotice(t('modals.authResetSent', { email: userEmail }));
        } catch (err) {
            setError(prettifyAuthError(err, t));
        } finally {
            setWorking(null);
        }
    };

    const isDone = step === 'done';
    const hero = (
        <AuthHero
            titleId="change-password-title"
            eyebrow={t('modals.pwEyebrow')}
            title={t('modals.accountPasswordTitle')}
            lead={t('modals.pwLead')}
            art={(
                <span className={`auth-dialog__emblem ${isDone ? 'is-done' : ''}`} aria-hidden="true">
                    {isDone ? <ShieldCheck key="done" /> : <LockKeyhole key="lock" />}
                </span>
            )}
            points={[
                { Icon: KeyRound, text: t('modals.pwTipLength') },
                { Icon: RefreshCw, text: t('modals.pwTipReuse') },
                { Icon: ShieldCheck, text: t('modals.pwTipDevices') },
            ]}
        />
    );

    const steps = [
        { id: 'verify', label: t('modals.pwStepVerify') },
        { id: 'choose', label: t('modals.pwStepChoose') },
        { id: 'done', label: t('modals.pwStepDone') },
    ];
    const isBusy = working === 'verifying' || working === 'saving';

    return (
        <AuthDialogShell variant="password" labelledBy="change-password-title" hero={hero} onClose={onClose} locked={isBusy}>
            <AuthSteps steps={steps} current={step} />

            {isBusy ? (
                <div className="auth-dialog__status">
                    <Loader size="lg" label={working === 'verifying' ? t('modals.pwVerifying') : t('modals.pwSaving')} />
                </div>
            ) : isDone ? (
                <div className="auth-dialog__status">
                    <h3>{t('modals.pwDoneTitle')}</h3>
                    <p>{t('modals.pwDoneText', { email: userEmail || '' })}</p>
                    <button type="button" onClick={onClose} className="btn btn-primary btn-lg">
                        {t('modals.pwDoneBtn')}
                    </button>
                </div>
            ) : step === 'verify' ? (
                <form onSubmit={handleVerify} className="auth-dialog__form">
                    <div className="auth-dialog__heading">
                        <h3>{t('modals.pwVerifyHeading')}</h3>
                        <p>{t('modals.pwVerifyHint', { email: userEmail || '' })}</p>
                    </div>
                    {/* The account name for password managers. */}
                    <input type="email" autoComplete="username" value={userEmail || ''} readOnly hidden />
                    <PasswordField
                        label={t('modals.accountCurrentPassword')}
                        value={currentPassword}
                        onChange={setCurrentPassword}
                        autoComplete="current-password"
                        enterKeyHint="go"
                        autoFocus
                    />
                    {error && <p className="auth-dialog__message auth-dialog__message--error" role="alert">{error}</p>}
                    {notice && !error && <p className="auth-dialog__message auth-dialog__message--info" role="status">{notice}</p>}
                    <div className="auth-dialog__actions">
                        <button type="submit" className="btn btn-primary btn-lg btn-block">{t('modals.pwContinue')}</button>
                        <button type="button" onClick={handleSendReset} disabled={working === 'sending'} className="btn btn-ghost btn-block">
                            {working === 'sending' ? t('modals.authPleaseWait') : t('modals.accountForgotCurrent')}
                        </button>
                    </div>
                </form>
            ) : (
                <form onSubmit={handleSave} className="auth-dialog__form">
                    <div className="auth-dialog__heading">
                        <h3>{t('modals.pwChooseHeading')}</h3>
                        <p>{t('modals.pwChooseHint')}</p>
                    </div>
                    <input type="email" autoComplete="username" value={userEmail || ''} readOnly hidden />
                    <PasswordField
                        label={t('modals.accountNewPassword')}
                        value={newPassword}
                        onChange={setNewPasswordValue}
                        autoComplete="new-password"
                        enterKeyHint="next"
                        minLength={MIN_PASSWORD_LENGTH}
                        autoFocus
                        describedBy="pw-strength"
                    />
                    <div id="pw-strength" className="auth-strength" data-level={strength.level} aria-live="polite">
                        <div className="auth-strength__bars" aria-hidden="true">
                            {[1, 2, 3, 4].map((n) => (
                                <span key={n} className={`auth-strength__bar ${n <= litBars ? 'is-on' : ''}`} />
                            ))}
                        </div>
                        <span className="auth-strength__label">
                            {newPassword ? t(`modals.pwStrength_${strength.level}`) : t('modals.pwStrengthEmpty')}
                        </span>
                    </div>
                    <PasswordField
                        label={t('modals.accountConfirmPassword')}
                        value={confirmPassword}
                        onChange={setConfirmPassword}
                        autoComplete="new-password"
                        enterKeyHint="go"
                        minLength={MIN_PASSWORD_LENGTH}
                    />
                    <ul className="auth-checklist">
                        {rules.map((rule) => (
                            <li key={rule.id} className={rule.met ? 'is-met' : ''}>
                                {rule.met ? <Check aria-hidden="true" /> : <Circle aria-hidden="true" />}
                                <span>{rule.label}</span>
                            </li>
                        ))}
                    </ul>
                    {error && <p className="auth-dialog__message auth-dialog__message--error" role="alert">{error}</p>}
                    <div className="auth-dialog__actions">
                        <button type="submit" disabled={!canSave} className="btn btn-primary btn-lg btn-block">
                            {t('modals.accountPasswordBtn')}
                        </button>
                        <button type="button" onClick={() => { setError(''); setStep('verify'); }} className="btn btn-ghost btn-block">
                            {t('modals.pwBack')}
                        </button>
                    </div>
                </form>
            )}
        </AuthDialogShell>
    );
}
