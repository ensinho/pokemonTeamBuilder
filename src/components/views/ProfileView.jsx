import React, { useMemo, useState } from 'react';
import '../../styles/profile-view.css';
import { THEME_META } from '../../constants/theme';
import { getPokemonArtworkSpriteUrl } from '../../utils/pokemonSprites';
import { Sprite } from '../Sprite';
import {
    AccountIcon, EditIcon, StarsIcon, SavedTeamsIcon,
    SunIcon, MoonIcon, SaveIcon, RefreshIcon,
} from '../icons';

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

    const trainerLabel = displayName?.trim() || (isAnonymous ? 'Anonymous Trainer' : (userEmail?.split('@')[0] || 'Trainer'));
    const initials = (trainerLabel.match(/\b\w/g) || ['T']).slice(0, 2).join('').toUpperCase();

    const streakCount = streak?.count || 0;
    const streakLongest = Math.max(streak?.longest || 0, streakCount);
    const activeTheme = THEME_META.find((entry) => entry.id === theme) || THEME_META[0];
    const syncLabel = isAnonymous ? 'Local only' : 'Synced';
    const streakHint = useMemo(() => {
        if (streakCount === 0) return 'Visit tomorrow to start a streak!';
        if (streakCount === 1) return 'Nice start — come back tomorrow!';
        if (streakCount < 7) return 'Keep it going!';
        if (streakCount < 30) return 'On fire!';
        return 'Legendary trainer.';
    }, [streakCount]);

    return (
        <div className="profile-view">
            <section className="profile-hero">
                <div className="profile-hero__main">
                    <button
                        type="button"
                        onClick={onOpenPokemonSelector}
                        className="profile-avatar-button"
                        aria-label="Change trainer avatar Pokémon"
                        title="Change avatar Pokémon"
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
                        <p className="profile-hero__eyebrow">Trainer profile</p>
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
                                    placeholder="Your trainer name"
                                    className="profile-name-input"
                                />
                                <button
                                    type="button"
                                    onClick={handleSaveName}
                                    className="profile-button profile-button--primary"
                                >
                                    Save
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
                            <span className="profile-pill profile-pill--accent">{isAnonymous ? 'Guest' : 'Synced'}</span>
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
                        <p className="profile-streak-card__label">Current streak</p>
                        <div className="profile-streak-card__value-row">
                            <p className="profile-streak-card__value">
                                {streakCount}
                                <span>d</span>
                            </p>
                            <span className="profile-pill">best {streakLongest}d</span>
                        </div>
                    </div>

                    <div className="profile-overview-grid">
                        <OverviewStat
                            icon={<SavedTeamsIcon className="w-4 h-4" />}
                            label="Teams"
                            value={savedTeamsCount}
                            hint="saved"
                        />
                        <OverviewStat
                            icon={<StarsIcon className="w-4 h-4" />}
                            label="Favorites"
                            value={favoritePokemonsCount}
                            hint="Pokemon"
                        />
                    </div>
                </div>
            </section>

            <div className="profile-layout">
                <SectionCard
                    className="profile-card--appearance"
                    meta={<span className="profile-pill profile-pill--accent">{activeTheme.label}</span>}
                    title="Appearance"
                    subtitle="Pick the theme that follows you across devices."
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
                    className="profile-card--account"
                    meta={<span className="profile-pill">{syncLabel}</span>}
                    title="Account"
                    subtitle={isAnonymous ? 'Save your progress to sync everywhere.' : 'Your data is synced across devices.'}
                    icon={<AccountIcon className="w-5 h-5" />}
                >
                    {isAnonymous ? (
                        <div className="profile-account-block">
                            <p className="profile-support-copy">
                                You are using the app as a guest. Create an account to keep your teams,
                                favorites, and preferences across browsers and devices.
                            </p>
                            <div className="profile-button-row">
                                <button
                                    type="button"
                                    onClick={onOpenSignUp}
                                    className="profile-button profile-button--primary"
                                >
                                    Create account
                                </button>
                                <button
                                    type="button"
                                    onClick={onOpenSignIn}
                                    className="profile-button"
                                >
                                    Sign in
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
                                <span className="profile-pill profile-pill--accent">Synced</span>
                            </div>
                            <button
                                type="button"
                                onClick={onSignOut}
                                className="profile-button profile-button--danger profile-button--block"
                            >
                                Sign out
                            </button>
                        </div>
                    )}
                </SectionCard>

                <SectionCard
                    className="profile-card--sync"
                    meta={<span className="profile-pill">{db ? 'Cloud' : 'Offline'}</span>}
                    title="Data & Sync"
                    subtitle={db ? 'Connected to cloud storage.' : 'Working offline.'}
                    icon={<SaveIcon className="w-5 h-5" />}
                >
                    <div className="profile-sync-list">
                        <div className="profile-sync-row">
                            <span className="profile-sync-row__label">Theme preference</span>
                            <span className="profile-sync-row__value">{syncLabel}</span>
                        </div>
                        <div className="profile-sync-row">
                            <span className="profile-sync-row__label">Home wallpaper</span>
                            <span className="profile-sync-row__value">{syncLabel}</span>
                        </div>
                        <div className="profile-sync-row">
                            <span className="profile-sync-row__label">Trainer name & avatar</span>
                            <span className="profile-sync-row__value">{syncLabel}</span>
                        </div>
                        <div className="profile-sync-row">
                            <span className="profile-sync-row__label">Login streak</span>
                            <span className="profile-sync-row__value">{syncLabel}</span>
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
                            Reset reminders
                        </button>
                    </div>
                </SectionCard>

                <SectionCard
                    className="profile-card--avatar"
                    title="Trainer Avatar"
                    subtitle="Your greeting Pokemon also appears on Home."
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
                                {greetingPokemonId ? 'Change Pokemon' : 'Pick a Pokemon'}
                            </button>
                            {greetingPokemonId && (
                                <button
                                    type="button"
                                    onClick={onClearLocalGreeting}
                                    className="profile-button"
                                >
                                    Remove
                                </button>
                            )}
                        </div>
                    </div>
                </SectionCard>
            </div>
        </div>
    );
}
