import React, { useMemo, useState } from 'react';
import '../../styles/profile-view.css';
import { THEME_META } from '../../constants/theme';
import { getPokemonArtworkSpriteUrl } from '../../utils/pokemonSprites';
import { Sprite } from '../Sprite';
import { useTranslation } from '../../hooks/useTranslation';
import { auth } from '../../services/firebase';
import { sendEmailVerification } from 'firebase/auth';
import { useToastStore } from '../../store/useToastStore';
import {
    AccountIcon, EditIcon, StarsIcon, SavedTeamsIcon,
    SunIcon, MoonIcon, SaveIcon, RefreshIcon, GlobeIcon,
} from '../icons';

const EmailVerifyRow = () => {
    const showToast = useToastStore((state) => state.showToast);
    const user = auth?.currentUser;
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);

    // Anonymous / signed-out / already-verified users don't need this row.
    if (!user || user.isAnonymous || user.emailVerified) return null;

    const handleSend = async () => {
        if (sending) return;
        setSending(true);
        try {
            await sendEmailVerification(user);
            setSent(true);
            showToast?.('Verification email sent — check your inbox, then sign out and back in.', 'success');
        } catch (err) {
            showToast?.('Could not send verification email. Try again in a minute.', 'error');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="profile-account-row" style={{ gap: '0.75rem' }}>
            <div className="min-w-0">
                <p className="profile-account-row__label">Email verification</p>
                <p className="profile-account-row__value">
                    {sent ? 'Sent — open the link, then re-login' : 'Your email is not verified'}
                </p>
            </div>
            <button
                type="button"
                onClick={handleSend}
                disabled={sending || sent}
                className="profile-button"
            >
                {sending ? 'Sending…' : sent ? 'Sent ✓' : 'Verify email'}
            </button>
        </div>
    );
};

/**
 * ProfileView — single screen for the user's account, preferences and
 * "trainer profile". All values here are persisted to the Firestore
 * preferences doc (artifacts/{appId}/users/{uid}/profile/preferences),
 * so configuration follows the user across devices.
 *
 * Hooked / engagement element: the "Trainer Streak" — counts consecutive
 * days the user opened the app. The streak is displayed prominently with
 * the longest-ever streak as a personal best to chase. Updated on app
 * mount in App.jsx (see useTrainerStreak).
 */

const ThemeSwatchIcon = ({ id, color }) => {
    if (id === 'dark' || id === 'midnight' || id === 'eclipse') return <MoonIcon className="w-4 h-4" color={color} />;
    return <SunIcon className="w-4 h-4" color={color} />;
};

const SectionCard = ({ title, subtitle, icon, meta, className = '', children }) => (
    <section className={['profile-card', className].filter(Boolean).join(' ')}>
        <header className="profile-card__header">
            <div className="profile-card__header-main">
                {icon ? <div className="profile-card__icon">{icon}</div> : null}
                <div className="profile-card__heading">
                    <h3 className="profile-card__title">{title}</h3>
                    {subtitle ? <p className="profile-card__subtitle">{subtitle}</p> : null}
                </div>
            </div>
            {meta ? <div className="profile-card__meta">{meta}</div> : null}
        </header>
        {children}
    </section>
);

const OverviewStat = ({ icon, label, value, hint }) => (
    <div className="profile-overview-stat">
        <div className="profile-overview-stat__top">
            <span className="profile-overview-stat__icon">{icon}</span>
            <span className="profile-overview-stat__label">{label}</span>
        </div>
        <p className="profile-overview-stat__value">{value}</p>
        {hint ? <p className="profile-overview-stat__hint">{hint}</p> : null}
    </div>
);

export function ProfileView({
    // identity
    userEmail,
    userId,
    isAnonymous,
    // preferences (already-hydrated)
    theme,
    onChangeTheme,
    language,
    onChangeLanguage,
    displayName,
    onChangeDisplayName,
    greetingPokemonId,
    greetingPokemonIsShiny,
    onOpenPokemonSelector,
    // engagement
    streak,                // { count, longest, lastVisit }
    // stats
    savedTeamsCount,
    favoritePokemonsCount,
    // actions
    onOpenSignIn,
    onOpenSignUp,
    onSignOut,
    onResetSyncPrompt,
    onClearLocalGreeting,
    db,
}) {
    const { t } = useTranslation();
    const [nameDraft, setNameDraft] = useState(displayName || '');
    const [editingName, setEditingName] = useState(false);

    // Sync draft when external prop changes (e.g. firestore hydration).
    React.useEffect(() => {
        if (!editingName) setNameDraft(displayName || '');
    }, [displayName, editingName]);

    const handleSaveName = () => {
        const trimmed = nameDraft.trim().slice(0, 24);
        onChangeDisplayName(trimmed);
        setEditingName(false);
    };

    const trainerLabel = displayName?.trim() || (isAnonymous ? t('profile.guestPill') : (userEmail?.split('@')[0] || 'Trainer'));
    const initials = (trainerLabel.match(/\b\w/g) || ['T']).slice(0, 2).join('').toUpperCase();

    const streakCount = streak?.count || 0;
    const streakLongest = Math.max(streak?.longest || 0, streakCount);
    const activeTheme = THEME_META.find((entry) => entry.id === theme) || THEME_META[0];
    const syncLabel = isAnonymous ? t('profile.sectionAccountGuestDesc') : t('profile.syncedPill');

    const streakHint = useMemo(() => {
        if (streakCount === 0) return t('profile.streakHint0');
        if (streakCount === 1) return t('profile.streakHint1');
        if (streakCount < 7) return t('profile.streakHint2');
        if (streakCount < 30) return t('profile.streakHint3');
        return t('profile.streakHint4');
    }, [streakCount, t]);

    return (
        <div className="profile-view">
            <section className="profile-hero">
                <div className="profile-hero__main">
                    <button
                        type="button"
                        onClick={onOpenPokemonSelector}
                        className="profile-avatar-button"
                        aria-label={t('profile.sectionAvatarDesc')}
                        title={t('profile.sectionAvatarDesc')}
                    >
                        {greetingPokemonId ? (
                            <Sprite
                                src={getPokemonArtworkSpriteUrl(greetingPokemonId, { shiny: greetingPokemonIsShiny })}
                                alt="Trainer avatar"
                                className="profile-avatar-button__sprite"
                            />
                        ) : (
                            <span className="profile-avatar-button__initials">{initials}</span>
                        )}
                        <span className="profile-avatar-button__edit">
                            <EditIcon className="w-3.5 h-3.5" color="currentColor" />
                        </span>
                    </button>

                    <div className="profile-hero__identity">
                        <p className="profile-hero__eyebrow">{t('profile.trainerProfile')}</p>
                        {editingName ? (
                            <div className="profile-name-editor">
                                <input
                                    autoFocus
                                    value={nameDraft}
                                    onChange={(e) => setNameDraft(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveName();
                                        if (e.key === 'Escape') { setEditingName(false); setNameDraft(displayName || ''); }
                                    }}
                                    maxLength={24}
                                    placeholder={t('profile.nameDraftPlaceholder')}
                                    className="profile-name-input"
                                />
                                <button
                                    type="button"
                                    onClick={handleSaveName}
                                    className="profile-button profile-button--primary"
                                >
                                    {t('profile.saveNameBtn')}
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setEditingName(true)}
                                className="profile-hero__name-button"
                                title="Edit trainer name"
                            >
                                <h2 className="profile-hero__name">{trainerLabel}</h2>
                                <EditIcon className="w-4 h-4" color="currentColor" />
                            </button>
                        )}
                        <div className="profile-hero__meta">
                            <span className="profile-pill profile-pill--accent">{isAnonymous ? t('profile.guestPill') : t('profile.syncedPill')}</span>
                            {!isAnonymous && userEmail && (
                                <span className="profile-hero__email" title={userEmail}>{userEmail}</span>
                            )}
                            {userId && (
                                <span className="profile-hero__id" title={userId}>
                                    #{userId.slice(0, 8)}
                                </span>
                            )}
                        </div>
                        <p className="profile-hero__hint">{streakHint}</p>
                    </div>
                </div>

                <div className="profile-hero__side">
                    <div className="profile-streak-card" aria-label={`Current streak: ${streakCount} days`}>
                        <p className="profile-streak-card__label">{t('profile.currentStreak')}</p>
                        <div className="profile-streak-card__value-row">
                            <p className="profile-streak-card__value">
                                {streakCount}
                                <span>d</span>
                            </p>
                            <span className="profile-pill">{t('profile.bestStreak', { count: streakLongest })}</span>
                        </div>
                    </div>

                    <div className="profile-overview-grid">
                        <OverviewStat
                            icon={<SavedTeamsIcon className="w-4 h-4" />}
                            label={t('profile.statsTeams')}
                            value={savedTeamsCount}
                            hint={t('profile.statsTeamsSaved')}
                        />
                        <OverviewStat
                            icon={<StarsIcon className="w-4 h-4" />}
                            label={t('profile.statsFavorites')}
                            value={favoritePokemonsCount}
                            hint={t('profile.statsFavoritesPokemon')}
                        />
                    </div>
                </div>
            </section>

            <div className="profile-layout">
                <div className="profile-layout__column">
                    <SectionCard
                        className="profile-card--appearance"
                        meta={<span className="profile-pill profile-pill--accent">{activeTheme.label}</span>}
                        title={t('profile.sectionAppearance')}
                        subtitle={t('profile.sectionAppearanceDesc')}
                        icon={<SunIcon className="w-5 h-5" />}
                    >
                        <div className="profile-theme-grid">
                            {THEME_META.map((t) => {
                                const selected = theme === t.id;
                                return (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => onChangeTheme(t.id)}
                                        aria-pressed={selected}
                                        className={`profile-theme-card ${selected ? 'is-selected' : ''}`}
                                        style={{ '--profile-theme-swatch': t.swatch }}
                                    >
                                        <div className="profile-theme-card__header">
                                            <span className="profile-theme-card__swatch" aria-hidden="true"></span>
                                            <span className="profile-theme-card__label">{t.label}</span>
                                            <span className="profile-theme-card__icon">
                                                <ThemeSwatchIcon id={t.id} color="currentColor" />
                                            </span>
                                        </div>
                                        <p className="profile-theme-card__hint">{t.hint}</p>
                                    </button>
                                );
                            })}
                        </div>
                    </SectionCard>

                    <SectionCard
                        className="profile-card--language"
                        meta={<span className="profile-pill profile-pill--accent">{language === 'pt' ? 'Português' : 'English'}</span>}
                        title={t('profile.sectionLanguage')}
                        subtitle={t('profile.sectionLanguageDesc')}
                        icon={<GlobeIcon className="w-5 h-5" />}
                    >
                        <div className="profile-button-row">
                            <button
                                type="button"
                                onClick={() => onChangeLanguage('en')}
                                className={`profile-button ${language === 'en' ? 'profile-button--primary' : ''}`}
                            >
                                English
                            </button>
                            <button
                                type="button"
                                onClick={() => onChangeLanguage('pt')}
                                className={`profile-button ${language === 'pt' ? 'profile-button--primary' : ''}`}
                            >
                                Português (pt-BR)
                            </button>
                        </div>
                    </SectionCard>

                    <SectionCard
                        className="profile-card--sync"
                        meta={<span className="profile-pill">{db ? 'Cloud' : 'Offline'}</span>}
                        title={t('profile.sectionSync')}
                        subtitle={db ? t('profile.sectionSyncConnected') : t('profile.sectionSyncOffline')}
                        icon={<SaveIcon className="w-5 h-5" />}
                    >
                        <div className="profile-sync-list">
                            <div className="profile-sync-row">
                                <span className="profile-sync-row__label">{t('profile.syncItemTheme')}</span>
                                <span className="profile-sync-row__value">{isAnonymous ? t('profile.guestPill') : t('profile.syncedPill')}</span>
                            </div>
                            <div className="profile-sync-row">
                                <span className="profile-sync-row__label">{t('profile.syncItemWallpaper')}</span>
                                <span className="profile-sync-row__value">{isAnonymous ? t('profile.guestPill') : t('profile.syncedPill')}</span>
                            </div>
                            <div className="profile-sync-row">
                                <span className="profile-sync-row__label">{t('profile.syncItemTrainer')}</span>
                                <span className="profile-sync-row__value">{isAnonymous ? t('profile.guestPill') : t('profile.syncedPill')}</span>
                            </div>
                            <div className="profile-sync-row">
                                <span className="profile-sync-row__label">{t('profile.syncItemStreak')}</span>
                                <span className="profile-sync-row__value">{isAnonymous ? t('profile.guestPill') : t('profile.syncedPill')}</span>
                            </div>
                        </div>

                        <div className="profile-button-row profile-button-row--tight">
                            <button
                                type="button"
                                onClick={onResetSyncPrompt}
                                className="profile-button"
                                title="Allow the 'Save your progress' nudge to appear again"
                            >
                                <RefreshIcon className="w-3.5 h-3.5" />
                                {t('profile.resetRemindersBtn')}
                            </button>
                        </div>
                    </SectionCard>
                </div>

                <div className="profile-layout__column">
                    <SectionCard
                        className="profile-card--avatar"
                        title={t('profile.sectionAvatar')}
                        subtitle={t('profile.sectionAvatarDesc')}
                        icon={<StarsIcon className="w-5 h-5" />}
                    >
                        <div className="profile-avatar-card">
                            <div className="profile-avatar-preview">
                                {greetingPokemonId ? (
                                    <Sprite
                                        src={getPokemonArtworkSpriteUrl(greetingPokemonId, { shiny: greetingPokemonIsShiny })}
                                        alt="Greeting Pokémon"
                                        className="profile-avatar-preview__sprite"
                                    />
                                ) : (
                                    <span className="profile-avatar-preview__fallback">?</span>
                                )}
                            </div>
                            <div className="profile-avatar-actions">
                                <button
                                    type="button"
                                    onClick={onOpenPokemonSelector}
                                    className="profile-button profile-button--primary"
                                >
                                    {greetingPokemonId ? t('profile.changeAvatarBtn') : t('profile.pickAvatarBtn')}
                                </button>
                                {greetingPokemonId && (
                                    <button
                                        type="button"
                                        onClick={onClearLocalGreeting}
                                        className="profile-button"
                                    >
                                        {t('profile.removeAvatarBtn')}
                                    </button>
                                )}
                            </div>
                        </div>
                    </SectionCard>

                    <SectionCard
                        className="profile-card--account"
                        meta={<span className="profile-pill">{isAnonymous ? t('profile.guestPill') : t('profile.syncedPill')}</span>}
                        title={t('profile.sectionAccount')}
                        subtitle={isAnonymous ? t('profile.sectionAccountGuestDesc') : t('profile.sectionAccountSyncedDesc')}
                        icon={<AccountIcon className="w-5 h-5" />}
                    >
                        {isAnonymous ? (
                            <div className="profile-account-block">
                                <p className="profile-support-copy">
                                    {t('profile.accountSupportCopy')}
                                </p>
                                <div className="profile-button-row">
                                    <button
                                        type="button"
                                        onClick={onOpenSignUp}
                                        className="profile-button profile-button--primary"
                                    >
                                        {t('profile.createAccountBtn')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={onOpenSignIn}
                                        className="profile-button"
                                    >
                                        {t('profile.signInBtn')}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="profile-account-block">
                                <div className="profile-account-row">
                                    <div className="min-w-0">
                                        <p className="profile-account-row__label">Email</p>
                                        <p className="profile-account-row__value" title={userEmail || ''}>
                                            {userEmail || '—'}
                                        </p>
                                    </div>
                                    <span className="profile-pill profile-pill--accent">{t('profile.syncedPill')}</span>
                                </div>
                                <EmailVerifyRow />
                                <button
                                    type="button"
                                    onClick={onSignOut}
                                    className="profile-button profile-button--danger profile-button--block"
                                >
                                    {t('profile.signOutBtn')}
                                </button>
                            </div>
                        )}
                    </SectionCard>
                </div>
            </div>
        </div>
    );
}
