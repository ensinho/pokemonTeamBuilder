import React, { useMemo, useState } from 'react';
import { THEME_META } from '../constants/theme';
import { Sprite } from './Sprite';
import {
    AccountIcon, EditIcon, SparklesIcon, StarsIcon, SavedTeamsIcon,
    SunIcon, MoonIcon, FlowerIcon, SaveIcon, RefreshIcon, TrashIcon,
} from './icons';

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
    if (id === 'dark' || id === 'midnight') return <MoonIcon className="w-4 h-4" color={color} />;
    if (id === 'sakura') return <FlowerIcon className="w-4 h-4" color={color} />;
    return <SunIcon className="w-4 h-4" color={color} />;
};

const SectionCard = ({ title, subtitle, icon, children }) => (
    <section
        className="rounded-xl p-5 md:p-6 border"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
        <header className="flex items-start gap-3 mb-4">
            {icon && (
                <div
                    className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}
                >
                    {icon}
                </div>
            )}
            <div className="min-w-0">
                <h3 className="text-base md:text-lg font-bold" style={{ color: 'var(--color-fg)' }}>
                    {title}
                </h3>
                {subtitle && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
                        {subtitle}
                    </p>
                )}
            </div>
        </header>
        {children}
    </section>
);

const Stat = ({ label, value, hint }) => (
    <div
        className="rounded-lg p-3 flex-1 min-w-[120px]"
        style={{ backgroundColor: 'var(--color-surface-raised)' }}
    >
        <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--color-muted)' }}>
            {label}
        </p>
        <p className="text-xl md:text-2xl font-bold mt-1 leading-none" style={{ color: 'var(--color-fg)' }}>
            {value}
        </p>
        {hint && (
            <p className="text-[10px] mt-1" style={{ color: 'var(--color-muted)' }}>
                {hint}
            </p>
        )}
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
    const streakHint = useMemo(() => {
        if (streakCount === 0) return 'Visit tomorrow to start a streak!';
        if (streakCount === 1) return 'Nice start — come back tomorrow!';
        if (streakCount < 7) return 'Keep it going!';
        if (streakCount < 30) return 'On fire!';
        return 'Legendary trainer.';
    }, [streakCount]);

    return (
        <div className="max-w-5xl mx-auto px-1 pb-10">
            {/* Trainer Card hero */}
            <div
                className="relative overflow-hidden rounded-2xl p-6 md:p-8 mb-6"
                style={{
                    backgroundImage: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 120%)',
                    color: '#fff',
                    boxShadow: 'var(--elevation-2)',
                }}
            >
                <div className="absolute inset-0 opacity-10 pointer-events-none"
                     style={{ backgroundImage: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.6), transparent 40%)' }} />
                <div className="relative flex flex-col md:flex-row md:items-center gap-5">
                    {/* Avatar slot — uses greeting Pokémon if set */}
                    <button
                        type="button"
                        onClick={onOpenPokemonSelector}
                        className="group relative shrink-0 w-24 h-24 md:w-28 md:h-28 rounded-2xl flex items-center justify-center"
                        style={{ backgroundColor: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(6px)' }}
                        aria-label="Change trainer avatar Pokémon"
                        title="Change avatar Pokémon"
                    >
                        {greetingPokemonId ? (
                            <Sprite
                                src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${greetingPokemonId}.png`}
                                alt="Trainer avatar"
                                className="w-20 h-20 md:w-24 md:h-24 object-contain"
                            />
                        ) : (
                            <span className="text-3xl font-extrabold tracking-wider">{initials}</span>
                        )}
                        <span
                            className="absolute -bottom-1 -right-1 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
                        >
                            <EditIcon className="w-3.5 h-3.5" color="#fff" />
                        </span>
                    </button>

                    {/* Identity */}
                    <div className="flex-1 min-w-0">
                        <p className="text-[11px] uppercase tracking-[0.18em] opacity-80 font-semibold">
                            Trainer Profile
                        </p>
                        {editingName ? (
                            <div className="flex items-center gap-2 mt-1">
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
                                    className="flex-1 min-w-0 rounded-md px-3 py-2 text-base md:text-lg font-bold focus:outline-none"
                                    style={{ backgroundColor: 'rgba(255,255,255,0.18)', color: '#fff' }}
                                />
                                <button
                                    type="button"
                                    onClick={handleSaveName}
                                    className="px-3 py-2 rounded-md text-xs font-bold uppercase tracking-wider"
                                    style={{ backgroundColor: '#fff', color: 'var(--color-primary)' }}
                                >
                                    Save
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setEditingName(true)}
                                className="mt-0.5 inline-flex items-center gap-2 group"
                                title="Edit trainer name"
                            >
                                <h2 className="text-2xl md:text-3xl font-extrabold leading-tight">
                                    {trainerLabel}
                                </h2>
                                <EditIcon className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity" color="#fff" />
                            </button>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                            <span
                                className="px-2 py-0.5 rounded-full font-semibold"
                                style={{ backgroundColor: 'rgba(255,255,255,0.22)' }}
                            >
                                {isAnonymous ? 'Guest' : 'Synced'}
                            </span>
                            {!isAnonymous && userEmail && (
                                <span className="opacity-90 truncate max-w-[260px]" title={userEmail}>{userEmail}</span>
                            )}
                            {userId && (
                                <span className="opacity-60 font-mono text-[10px]" title={userId}>
                                    #{userId.slice(0, 8)}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Streak badge — the engagement hook */}
                    <div
                        className="shrink-0 rounded-xl p-3 md:p-4 text-center min-w-[120px]"
                        style={{ backgroundColor: 'rgba(0,0,0,0.22)' }}
                        aria-label={`Current streak: ${streakCount} days`}
                    >
                        <p className="text-[10px] uppercase tracking-wider opacity-80 font-semibold">Streak</p>
                        <p className="text-3xl md:text-4xl font-extrabold leading-none mt-1">
                            {streakCount}
                            <span className="text-base font-bold ml-1 opacity-90">d</span>
                        </p>
                        <p className="text-[10px] mt-1 opacity-80">
                            best: {streakLongest}d
                        </p>
                    </div>
                </div>

                {/* Streak hint line */}
                <p className="relative mt-4 text-xs opacity-90">{streakHint}</p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
                {/* ----------- Account ----------- */}
                <SectionCard
                    title="Account"
                    subtitle={isAnonymous ? 'Save your progress to sync everywhere.' : 'Your data is synced across devices.'}
                    icon={<AccountIcon className="w-5 h-5" />}
                >
                    {isAnonymous ? (
                        <div className="space-y-3">
                            <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                                You're using the app as a guest. Create an account to keep your teams,
                                favorites and preferences across browsers and devices.
                            </p>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={onOpenSignUp}
                                    className="px-4 py-2 rounded-lg text-sm font-bold"
                                    style={{ backgroundColor: 'var(--color-primary)', color: '#fff' }}
                                >
                                    Create account
                                </button>
                                <button
                                    type="button"
                                    onClick={onOpenSignIn}
                                    className="px-4 py-2 rounded-lg text-sm font-semibold border"
                                    style={{ color: 'var(--color-fg)', borderColor: 'var(--color-border)' }}
                                >
                                    Sign in
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div
                                className="rounded-lg p-3 flex items-center justify-between gap-3"
                                style={{ backgroundColor: 'var(--color-surface-raised)' }}
                            >
                                <div className="min-w-0">
                                    <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--color-muted)' }}>
                                        Email
                                    </p>
                                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-fg)' }} title={userEmail || ''}>
                                        {userEmail || '—'}
                                    </p>
                                </div>
                                <span
                                    className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider"
                                    style={{ backgroundColor: 'var(--color-success)', color: '#fff' }}
                                >
                                    Synced
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={onSignOut}
                                className="w-full px-4 py-2 rounded-lg text-sm font-semibold border"
                                style={{ color: 'var(--color-danger)', borderColor: 'var(--color-border)' }}
                            >
                                Sign out
                            </button>
                        </div>
                    )}
                </SectionCard>

                {/* ----------- Stats ----------- */}
                <SectionCard
                    title="Trainer Stats"
                    subtitle="Your progress at a glance."
                    icon={<SparklesIcon className="w-5 h-5" />}
                >
                    <div className="flex flex-wrap gap-3">
                        <Stat label="Streak" value={`${streakCount}d`} hint={`best ${streakLongest}d`} />
                        <Stat label="Teams" value={savedTeamsCount} hint="saved" />
                        <Stat label="Favorites" value={favoritePokemonsCount} hint="Pokémon" />
                    </div>
                </SectionCard>

                {/* ----------- Appearance ----------- */}
                <SectionCard
                    title="Appearance"
                    subtitle="Pick the theme that follows you across devices."
                    icon={<SunIcon className="w-5 h-5" />}
                >
                    <div className="grid grid-cols-2 gap-2">
                        {THEME_META.map((t) => {
                            const selected = theme === t.id;
                            return (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => onChangeTheme(t.id)}
                                    aria-pressed={selected}
                                    className="text-left rounded-lg p-3 border transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2"
                                    style={{
                                        backgroundColor: selected ? 'var(--color-primary-soft)' : 'var(--color-surface-raised)',
                                        borderColor: selected ? 'var(--color-primary)' : 'var(--color-border)',
                                    }}
                                >
                                    <div className="flex items-center gap-2">
                                        <span
                                            className="inline-block w-5 h-5 rounded-full border"
                                            style={{ backgroundColor: t.swatch, borderColor: 'rgba(0,0,0,0.2)' }}
                                            aria-hidden="true"
                                        />
                                        <span className="text-sm font-bold" style={{ color: 'var(--color-fg)' }}>
                                            {t.label}
                                        </span>
                                        <span className="ml-auto" style={{ color: selected ? 'var(--color-primary)' : 'var(--color-muted)' }}>
                                            <ThemeSwatchIcon id={t.id} color={selected ? 'var(--color-primary)' : 'var(--color-muted)'} />
                                        </span>
                                    </div>
                                    <p className="text-[11px] mt-1" style={{ color: 'var(--color-muted)' }}>
                                        {t.hint}
                                    </p>
                                </button>
                            );
                        })}
                    </div>
                </SectionCard>

                {/* ----------- Avatar / Greeting Pokémon ----------- */}
                <SectionCard
                    title="Trainer Avatar"
                    subtitle="Your greeting Pokémon also appears on Home."
                    icon={<StarsIcon className="w-5 h-5" />}
                >
                    <div className="flex items-center gap-4">
                        <div
                            className="w-20 h-20 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: 'var(--color-surface-raised)' }}
                        >
                            {greetingPokemonId ? (
                                <Sprite
                                    src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${greetingPokemonId}.png`}
                                    alt="Greeting Pokémon"
                                    className="w-16 h-16 object-contain"
                                />
                            ) : (
                                <span className="text-2xl font-bold" style={{ color: 'var(--color-muted)' }}>?</span>
                            )}
                        </div>
                        <div className="flex-1 flex flex-col gap-2">
                            <button
                                type="button"
                                onClick={onOpenPokemonSelector}
                                className="px-3 py-2 rounded-lg text-sm font-semibold"
                                style={{ backgroundColor: 'var(--color-primary)', color: '#fff' }}
                            >
                                {greetingPokemonId ? 'Change Pokémon' : 'Pick a Pokémon'}
                            </button>
                            {greetingPokemonId && (
                                <button
                                    type="button"
                                    onClick={onClearLocalGreeting}
                                    className="px-3 py-2 rounded-lg text-xs font-semibold border"
                                    style={{ color: 'var(--color-muted)', borderColor: 'var(--color-border)' }}
                                >
                                    Remove
                                </button>
                            )}
                        </div>
                    </div>
                </SectionCard>

                {/* ----------- Sync / Data ----------- */}
                <SectionCard
                    title="Data & Sync"
                    subtitle={db ? 'Connected to cloud storage.' : 'Working offline.'}
                    icon={<SaveIcon className="w-5 h-5" />}
                >
                    <ul className="text-xs space-y-2" style={{ color: 'var(--color-muted)' }}>
                        <li className="flex items-center justify-between gap-3">
                            <span>Theme preference</span>
                            <span className="font-semibold" style={{ color: 'var(--color-fg)' }}>
                                {isAnonymous ? 'Local only' : 'Synced'}
                            </span>
                        </li>
                        <li className="flex items-center justify-between gap-3">
                            <span>Trainer name & avatar</span>
                            <span className="font-semibold" style={{ color: 'var(--color-fg)' }}>
                                {isAnonymous ? 'Local only' : 'Synced'}
                            </span>
                        </li>
                        <li className="flex items-center justify-between gap-3">
                            <span>Login streak</span>
                            <span className="font-semibold" style={{ color: 'var(--color-fg)' }}>
                                {isAnonymous ? 'Local only' : 'Synced'}
                            </span>
                        </li>
                    </ul>
                    <div className="mt-4 flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={onResetSyncPrompt}
                            className="px-3 py-2 rounded-lg text-xs font-semibold border inline-flex items-center gap-1.5"
                            style={{ color: 'var(--color-fg)', borderColor: 'var(--color-border)' }}
                            title="Allow the 'Save your progress' nudge to appear again"
                        >
                            <RefreshIcon className="w-3.5 h-3.5" /> Reset reminders
                        </button>
                    </div>
                </SectionCard>
            </div>
        </div>
    );
}
