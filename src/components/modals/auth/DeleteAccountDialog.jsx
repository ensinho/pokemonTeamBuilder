import React, { useState } from 'react';
import { Check, Circle, UserRound, UserPlus } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';
import { useAuthStore } from '../../../store/useAuthStore';
import { useFirestoreTeamsStore } from '../../../store/useFirestoreTeamsStore';
import { useQuizRunsStore } from '../../../store/useQuizRunsStore';
import { useFriendsStore } from '../../../store/useFriendsStore';
import { getPokemonFrontSpriteUrl } from '../../../utils/pokemonSprites';
import { prettifyAuthError } from '../../../utils/authErrors';
import { Loader } from '../../Loader';
import { AuthDialogShell, AuthHero, AuthStage, AuthSteps } from './AuthDialogShell';
import { PasswordField } from './PasswordField';

const STAGES = ['verify', 'data', 'account'];

/**
 * Delete account — releasing a Pokémon. Review what goes, with the user's own
 * numbers; confirm with the password and the typed word; then watch each stage
 * happen. When it is done the store hands over to the session transition and
 * Home, so this dialog never shows a "deleted" screen of its own.
 */
export function DeleteAccountDialog({ onClose }) {
    const { t } = useTranslation();
    const deleteAccount = useAuthStore((s) => s.deleteAccount);
    const greetingPokemonId = useAuthStore((s) => s.greetingPokemonId);
    const streak = useAuthStore((s) => s.streak);
    const teamsCount = useFirestoreTeamsStore((s) => s.savedTeams.length);
    const favoritesCount = useFirestoreTeamsStore((s) => s.favoritePokemons.size);
    const quizCount = useQuizRunsStore((s) => s.quizRuns?.length || 0);
    const friendsCount = useFriendsStore((s) => s.friends.length);

    const [step, setStep] = useState('review'); // 'review' | 'confirm' | 'working'
    const [stage, setStage] = useState(null);
    const [password, setPassword] = useState('');
    const [typed, setTyped] = useState('');
    const [error, setError] = useState('');

    const confirmWord = t('modals.delConfirmWord');
    const wordMatches = typed.trim().toUpperCase() === confirmWord.toUpperCase();

    const handleDelete = async (e) => {
        e.preventDefault();
        if (!password) { setError(t('modals.accountCurrentPasswordRequired')); return; }
        if (!wordMatches) { setError(t('modals.delTypeWordError', { word: confirmWord })); return; }
        setError('');
        setStep('working');
        try {
            await deleteAccount(password, setStage);
        } catch (err) {
            setStage(null);
            setStep('confirm');
            setError(prettifyAuthError(err, t));
        }
    };

    const hero = (
        <AuthHero
            titleId="delete-account-title"
            eyebrow={t('modals.accountDeleteTitle')}
            title={t('modals.delHeroTitle')}
            lead={t('modals.delHeroLead')}
            art={<AuthStage src={getPokemonFrontSpriteUrl(greetingPokemonId || 25)} />}
            points={[
                { Icon: UserRound, text: t('modals.delPointGuest') },
                { Icon: UserPlus, text: t('modals.delPointAgain') },
            ]}
        />
    );

    const steps = [
        { id: 'review', label: t('modals.delStepReview') },
        { id: 'confirm', label: t('modals.delStepConfirm') },
        { id: 'working', label: t('modals.delStepRelease') },
    ];
    const ledger = [
        { id: 'teams', value: teamsCount, label: t('modals.delLedgerTeams') },
        { id: 'favorites', value: favoritesCount, label: t('modals.delLedgerFavorites') },
        { id: 'quiz', value: quizCount, label: t('modals.delLedgerQuiz') },
        { id: 'friends', value: friendsCount, label: t('modals.delLedgerFriends') },
    ];
    const stageIndex = STAGES.indexOf(stage);

    return (
        <AuthDialogShell variant="delete" labelledBy="delete-account-title" hero={hero} onClose={onClose} locked={step === 'working'}>
            <AuthSteps steps={steps} current={step} />

            {step === 'working' ? (
                <div className="auth-dialog__status">
                    <Loader size="lg" label={t('modals.delWorking')} />
                    <ul className="auth-progress">
                        {STAGES.map((id, i) => {
                            const done = stage === 'done' || i < stageIndex;
                            const active = i === stageIndex;
                            return (
                                <li key={id} className={done ? 'is-done' : active ? 'is-active' : ''}>
                                    {done ? <Check aria-hidden="true" /> : <Circle aria-hidden="true" />}
                                    <span>{t(`modals.delStage_${id}`)}</span>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            ) : step === 'review' ? (
                <>
                    <div className="auth-dialog__heading">
                        <h3>{t('modals.delReviewHeading')}</h3>
                        <p>{t('modals.delReviewHint')}</p>
                    </div>
                    <ul className="auth-ledger">
                        {ledger.map((item) => (
                            <li key={item.id} className="auth-ledger__item">
                                <span className="auth-ledger__value">{item.value}</span>
                                <span className="auth-ledger__label">{item.label}</span>
                            </li>
                        ))}
                    </ul>
                    <p className="auth-ledger__note">
                        {t('modals.delReviewAlso', { days: streak?.longest || streak?.count || 0 })}
                    </p>
                    <div className="auth-dialog__actions">
                        <button type="button" onClick={() => setStep('confirm')} className="btn btn-danger btn-lg btn-block">
                            {t('modals.delContinue')}
                        </button>
                        <button type="button" onClick={onClose} className="btn btn-ghost btn-block">
                            {t('modals.delKeep')}
                        </button>
                    </div>
                </>
            ) : (
                <form onSubmit={handleDelete} className="auth-dialog__form">
                    <div className="auth-dialog__heading">
                        <h3>{t('modals.delConfirmHeading')}</h3>
                        <p>{t('modals.delConfirmHint')}</p>
                    </div>
                    <PasswordField
                        label={t('modals.accountCurrentPassword')}
                        value={password}
                        onChange={setPassword}
                        autoComplete="current-password"
                        enterKeyHint="next"
                        autoFocus
                    />
                    <label className="field">
                        <span className="field-label">
                            {t('modals.delTypeWordLabel')} <span className="auth-confirm-word">{confirmWord}</span>
                        </span>
                        <input
                            type="text"
                            autoComplete="off"
                            autoCapitalize="characters"
                            autoCorrect="off"
                            spellCheck={false}
                            enterKeyHint="go"
                            value={typed}
                            onChange={(e) => setTyped(e.target.value)}
                            className="input-clean"
                            placeholder={confirmWord}
                        />
                    </label>
                    {error && <p className="auth-dialog__message auth-dialog__message--error" role="alert">{error}</p>}
                    <div className="auth-dialog__actions">
                        <button type="submit" disabled={!password || !wordMatches} className="btn btn-danger btn-lg btn-block">
                            {t('modals.accountDeleteBtn')}
                        </button>
                        <button type="button" onClick={() => { setError(''); setStep('review'); }} className="btn btn-ghost btn-block">
                            {t('modals.pwBack')}
                        </button>
                    </div>
                </form>
            )}
        </AuthDialogShell>
    );
}
