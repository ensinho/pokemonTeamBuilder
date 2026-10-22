import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import '../../styles/profile-view.css';
import '../../styles/journeys.css';
import { THEME_META } from '../../constants/theme';
import { getPokemonArtworkSpriteUrl } from '../../utils/pokemonSprites';
import { trainerSpriteUrl } from '../../hooks/useTrainerSprites';
import { resolveAvatar } from '../../store/useAuthStore';
import { Sprite } from '../Sprite';
import { TrainerBadge } from '../TrainerBadge';
import { TrainerTitle } from '../rewards/TrainerTitle';
import { useTrainerBadges } from '../../hooks/useTrainerBadges';
import { useShallow } from 'zustand/react/shallow';
import { useRewardsStore, isThemeUnlocked } from '../../store/useRewardsStore';
import { themeReward } from '../../constants/cosmetics';
import { frameProps } from '../../utils/rewards';
import { liveStreak } from '../../utils/dailyCheckin';
import { useTranslation } from '../../hooks/useTranslation';
import { auth } from '../../services/firebase';
import { sendEmailVerification } from 'firebase/auth';
import { useToastStore } from '../../store/useToastStore';
import {
    EditIcon, StarsIcon, SavedTeamsIcon, SunIcon, MoonIcon, RefreshIcon,
} from '../icons';
import { Flame, Lock, Check, ChevronRight, Type } from 'lucide-react';
import { TextSizeControl } from '../TextSizeControl';
import { useNotificationSettings } from '../../hooks/useNotificationSettings';
import { originFromEvent } from '../../utils/themeTransition';
import { Switch } from '../Switch';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { AccountSecurityModal } from '../modals/AccountSecurityModal';
import {
    DEFAULT_SEARCH_SHORTCUT, formatShortcut, normalizeShortcut, shortcutFromEvent, validateShortcut,
} from '../../utils/searchShortcut';

const PROFILE_TABS = ['trainer', 'appearance', 'preferences', 'account'];

// Autofocus only where there is no software keyboard to throw up (ux skill, smell 16).
const IS_FINE_POINTER = typeof window !== 'undefined' && window.matchMedia?.('(pointer: fine)').matches;

const IS_APPLE = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent || '');

const EmailVerifyRow = () => {
    const { t } = useTranslation();
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
            showToast?.(t('profile.emailVerifyToast'), 'success');
        } catch {
            showToast?.(t('profile.emailVerifyError'), 'error');
        } finally {
            setSending(false);
        }
    };

    return (
        <SettingRow
            label={t('profile.emailVerifyLabel')}
            description={sent ? t('profile.emailVerifySentHint') : t('profile.emailVerifyPending')}
        >
            <button type="button" onClick={handleSend} disabled={sending || sent} className="btn btn-secondary btn-sm">
                {sending ? t('profile.emailVerifySending') : sent ? t('profile.emailVerifySentBtn') : t('profile.emailVerifyBtn')}
            </button>
        </SettingRow>
    );
};

/**
 * ProfileView — single screen for the user's account, preferences and
 * "trainer profile". All values here are persisted to the Firestore
 * preferences doc (artifacts/{appId}/users/{uid}/profile/preferences),
 * so configuration follows the user across devices.
 *
 * Layout (2026-10-22, "perfil mais fácil de mexer"): one centred column at
 * every width, like a native settings screen. Each tab is a stack of
 * sections; a section is a heading on the page and one card of rows, each
 * row the words on the left and its control on the right. The three uneven
 * columns of cards this replaced put the same kind of control in a different
 * place on every tab, and the hero boxed its figures inside its own box.
 */

/** A part of a tab: its heading on the page, then one card holding its rows. */
const Section = ({ title, description, meta, children, className = '' }) => (
    <section className={`section profile-section ${className}`.trim()}>
        <div className="profile-section__head">
            <div className="section-head">
                <h2 className="section-title">{title}</h2>
                {meta ? <span className="section-action">{meta}</span> : null}
            </div>
            {description ? <p className="profile-section__desc">{description}</p> : null}
        </div>
        <div className="card profile-section__body">{children}</div>
    </section>
);

/** One settings line: the words own the row, the control sits at its far edge (as `.switch--row`). */
const SettingRow = ({ label, description, children, tone, leading }) => (
    <div className={`profile-row ${tone ? `profile-row--${tone}` : ''}`}>
        {leading}
        <div className="profile-row__text">
            <span className="profile-row__label">{label}</span>
            {description ? <span className="profile-row__desc">{description}</span> : null}
        </div>
        {children ? <div className="profile-row__control">{children}</div> : null}
    </div>
);

/**
 * Notifications live on the profile, not only on the battle list, because two
 * of the three things they announce (the daily PokéPuzzle, and battles) are not
 * on the same screen — and because the browser only prompts for permission from
 * a real click, which needs a button somewhere the user goes deliberately.
 */
const NotificationsSection = () => {
    const { t } = useTranslation();
    const {
        enabled, busy, dailyEnabled, iosInstallNeeded, supported, toggle, toggleDailyPuzzle, challengeEnabled, toggleDailyChallenge,
    } = useNotificationSettings();

    // Switches, one per question the user is actually answering. This was a
    // status pill, an enable button, a list restating the pill, and a pair of
    // "remind me" / "don't remind me" buttons — four controls for two booleans.
    return (
        <Section title={t('profile.sectionNotifications')} description={t('profile.sectionNotificationsDesc')}>
            <Switch
                variant="row"
                checked={enabled}
                disabled={busy}
                onChange={toggle}
                label={t('profile.notifyDeviceLabel')}
                description={t('profile.notifyTopicBattles')}
            />
            <Switch
                variant="row"
                checked={enabled && dailyEnabled}
                disabled={!enabled}
                onChange={(next) => toggleDailyPuzzle(next)}
                label={t('profile.notifyTopicPuzzle')}
                description={t('profile.notifyPuzzleDesc')}
            />
            <Switch
                variant="row"
                checked={enabled && challengeEnabled}
                disabled={!enabled}
                onChange={(next) => toggleDailyChallenge(next)}
                label={t('profile.notifyTopicChallenge')}
                description={t('profile.notifyChallengeDesc')}
            />
            {iosInstallNeeded || !supported ? (
                <p className="profile-note">
                    {iosInstallNeeded ? t('battle.notifyIosInstall') : t('battle.notifyUnsupported')}
                </p>
            ) : null}
        </Section>
    );
};

/**
 * The global search's shortcut. Click the keys, press the new ones: the button
 * itself listens while recording, and stops each keystroke from reaching the
 * app-wide handler — otherwise pressing the current chord to "re-record" it
 * would open the palette over the profile.
 */
const SearchShortcutSection = ({ shortcut, onChange }) => {
    const { t } = useTranslation();
    const showToast = useToastStore((state) => state.showToast);
    const [recording, setRecording] = useState(false);
    const [error, setError] = useState(null);
    const keys = formatShortcut(shortcut, IS_APPLE);

    const stop = () => setRecording(false);

    const handleKeyDown = (event) => {
        if (!recording) return;
        event.preventDefault();
        event.stopPropagation();
        if (event.key === 'Escape') {
            stop();
            setError(null);
            return;
        }
        // Tab still moves focus; a recorder that traps it is a keyboard trap.
        if (event.key === 'Tab' && !event.ctrlKey && !event.metaKey && !event.altKey) {
            stop();
            return;
        }
        const next = shortcutFromEvent(event);
        if (!next) return; // a modifier on its own — keep listening
        const problem = validateShortcut(next);
        if (problem) {
            setError(problem === 'reserved'
                ? t('profile.shortcutErrReserved', { keys: formatShortcut(next, IS_APPLE) })
                : t('profile.shortcutErrModifier'));
            return;
        }
        setError(null);
        stop();
        if (normalizeShortcut(next) !== shortcut) {
            onChange(next);
            showToast?.(t('profile.shortcutSaved', { keys: formatShortcut(next, IS_APPLE) }), 'success');
        }
    };

    const isDefault = shortcut === DEFAULT_SEARCH_SHORTCUT;

    return (
        <Section className="profile-section--shortcut" title={t('profile.sectionShortcut')} description={t('profile.sectionShortcutDesc')}>
            <SettingRow
                label={t('profile.shortcutOpenSearch')}
                description={(
                    <span className="profile-shortcut__hint" role={error ? 'alert' : undefined}>
                        {error || (recording ? t('profile.shortcutRecordingHint') : t('profile.shortcutSlashHint'))}
                    </span>
                )}
            >
                {!isDefault && (
                    <button
                        type="button"
                        onClick={() => { setError(null); onChange(DEFAULT_SEARCH_SHORTCUT); }}
                        className="btn btn-ghost btn-sm btn-icon"
                        aria-label={t('profile.shortcutReset', { keys: formatShortcut(DEFAULT_SEARCH_SHORTCUT, IS_APPLE) })}
                        title={t('profile.shortcutReset', { keys: formatShortcut(DEFAULT_SEARCH_SHORTCUT, IS_APPLE) })}
                    >
                        <RefreshIcon className="w-3.5 h-3.5" />
                    </button>
                )}
                <button
                    type="button"
                    onClick={() => { setError(null); setRecording((on) => !on); }}
                    onKeyDown={handleKeyDown}
                    onBlur={stop}
                    aria-pressed={recording}
                    aria-label={recording ? t('profile.shortcutRecording') : t('profile.shortcutChangeLabel', { keys })}
                    className={`profile-shortcut__keys ${recording ? 'is-recording' : ''}`}
                >
                    {recording ? t('profile.shortcutRecording') : <kbd>{keys}</kbd>}
                </button>
            </SettingRow>
        </Section>
    );
};

/** A small round picture in a settings row: the partner or the trainer, or a "?" until there is one. */
const AvatarThumb = ({ src, pixel = false, onClick, label }) => (
    <button type="button" className="profile-thumb" onClick={onClick} aria-label={label}>
        {src
            ? <Sprite src={src} alt="" className={`profile-thumb__sprite ${pixel ? 'is-pixel' : ''}`} />
            : <span className="profile-thumb__empty" aria-hidden="true">?</span>}
    </button>
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
    showTeraType,
    onChangeShowTeraType,
    searchShortcut = DEFAULT_SEARCH_SHORTCUT,
    onChangeSearchShortcut,
    displayName,
    onChangeDisplayName,
    greetingPokemonId,
    greetingPokemonIsShiny,
    onOpenPokemonSelector,
    trainerSprite,
    onOpenTrainerSelector,
    avatarPreference,
    onChangeAvatarPreference,
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
    const navigate = useNavigate();
    useDocumentMeta({ title: t('nav.profile') });
    const { badges, unlockedCount, totalBadgesCount, selectedBadgeId, toggleEquip } = useTrainerBadges();
    // Rewards (2026-10-17): the equipped frame and title, the level, and which
    // reward themes are open — all recorded, so the hero paints at once.
    const { equipped, trainerLevel, unlocked } = useRewardsStore(useShallow((s) => ({
        equipped: s.equipped, trainerLevel: s.level, unlocked: s.unlocked,
    })));
    // Only what can be shown: the earned badges, the equipped one first. The
    // whole catalogue — locked ones, progress, how to earn them — lives in
    // Journeys → Badges, one tap away (it was here too, as a second wall of
    // 27 cards that equipped the same badge a different way).
    const earnedBadges = useMemo(() => badges
        .filter((badge) => badge.isUnlocked)
        .sort((a, b) => Number(b.isEquipped) - Number(a.isEquipped)), [badges]);
    const [nameDraft, setNameDraft] = useState(displayName || '');
    const [editingName, setEditingName] = useState(false);
    const [searchParams, setSearchParams] = useSearchParams();
    const requestedTab = searchParams.get('tab');
    const activeTab = PROFILE_TABS.includes(requestedTab) ? requestedTab : PROFILE_TABS[0];
    const setActiveTab = (tab) => {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            if (tab === PROFILE_TABS[0]) next.delete('tab'); else next.set('tab', tab);
            return next;
        }, { replace: true });
    };
    // 'password' | 'delete' | null — which AccountSecurityModal is open.
    const [securityModal, setSecurityModal] = useState(null);

    // Sync draft when external prop changes (e.g. firestore hydration).
    React.useEffect(() => {
        if (!editingName) setNameDraft(displayName || '');
    }, [displayName, editingName]);

    const handleSaveName = () => {
        const trimmed = nameDraft.trim().slice(0, 24);
        onChangeDisplayName(trimmed);
        setEditingName(false);
    };

    const mainAvatar = useMemo(
        () => resolveAvatar({ avatarPreference, trainerSprite, greetingPokemonId, greetingPokemonIsShiny }),
        [avatarPreference, trainerSprite, greetingPokemonId, greetingPokemonIsShiny],
    );

    const trainerLabel = displayName?.trim() || (isAnonymous ? t('profile.guestPill') : (userEmail?.split('@')[0] || 'Trainer'));
    const initials = (trainerLabel.match(/\b\w/g) || ['T']).slice(0, 2).join('').toUpperCase();

    // The streak as it stands today: a lapsed one reads 0 (utils/dailyCheckin.js).
    const streakCount = liveStreak(streak);
    const streakLongest = Math.max(streak?.longest || 0, streakCount);
    const partnerSrc = greetingPokemonId ? getPokemonArtworkSpriteUrl(greetingPokemonId, { shiny: greetingPokemonIsShiny }) : null;
    const trainerSrc = trainerSprite ? trainerSpriteUrl(trainerSprite) : null;
    const cosmeticName = (id) => (id ? t(`rewards.items.${id}.name`) : t('profile.noneEquipped'));

    return (
        <div className="profile-view">
            {/* The trainer card: who, what level, three figures. One box, and
                nothing inside it draws another. */}
            <header className="profile-hero">
                <button
                    type="button"
                    onClick={onOpenPokemonSelector}
                    className="profile-avatar-button"
                    aria-label={t('profile.sectionAvatarDesc')}
                    title={t('profile.sectionAvatarDesc')}
                    {...frameProps(equipped.frame)}
                >
                    {/* Whichever the trainer picked as their main avatar. */}
                    {mainAvatar.trainerSprite ? (
                        <Sprite
                            src={trainerSpriteUrl(mainAvatar.trainerSprite)}
                            alt={t('profile.avatarAlt')}
                            className="profile-avatar-button__sprite profile-avatar-button__sprite--pixel"
                        />
                    ) : mainAvatar.pokemonId ? (
                        <Sprite
                            src={getPokemonArtworkSpriteUrl(mainAvatar.pokemonId, { shiny: mainAvatar.isShiny })}
                            alt={t('profile.avatarAlt')}
                            className="profile-avatar-button__sprite"
                        />
                    ) : (
                        <span className="profile-avatar-button__initials">{initials}</span>
                    )}
                    {/* Always visible: a hover-only pencil never appears on a phone. */}
                    <span className="profile-avatar-button__edit" aria-hidden="true">
                        <EditIcon className="w-3 h-3" color="currentColor" />
                    </span>
                </button>

                <div className="profile-hero__identity">
                    {editingName ? (
                        <form
                            className="profile-name-editor"
                            onSubmit={(e) => { e.preventDefault(); handleSaveName(); }}
                        >
                            <input
                                autoFocus={IS_FINE_POINTER}
                                value={nameDraft}
                                onChange={(e) => setNameDraft(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Escape') { setEditingName(false); setNameDraft(displayName || ''); }
                                }}
                                maxLength={24}
                                placeholder={t('profile.nameDraftPlaceholder')}
                                aria-label={t('profile.editName')}
                                className="input-clean profile-name-input"
                            />
                            <button type="submit" className="btn btn-primary btn-sm">
                                {t('profile.saveNameBtn')}
                            </button>
                        </form>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setEditingName(true)}
                            className="profile-hero__name-button"
                            title={t('profile.editName')}
                            aria-label={`${t('profile.editName')}: ${trainerLabel}`}
                        >
                            <h1 className="profile-hero__name">
                                <span className="truncate">{trainerLabel}</span>
                                {selectedBadgeId && <TrainerBadge badgeId={selectedBadgeId} size="md" showTooltip />}
                            </h1>
                            <EditIcon className="profile-hero__name-icon" color="currentColor" />
                        </button>
                    )}
                    <p className="profile-hero__meta">
                        <Link to="/journeys?tab=rewards" className="badge badge--primary badge--figure" title={t('rewards.customize')}>
                            {t('rewards.levelShort', { n: trainerLevel })}
                        </Link>
                        <TrainerTitle titleId={equipped.title} />
                        {!equipped.title && (
                            <span className="profile-hero__status">{isAnonymous ? t('profile.guestPill') : t('profile.syncedPill')}</span>
                        )}
                    </p>
                </div>

                <dl className="profile-stats">
                    <div className="profile-stat">
                        <dt title={t('profile.currentStreak')}><Flame className="profile-stat__icon" aria-hidden="true" />{t('profile.streakShort')}</dt>
                        <dd>{streakCount}<span className="profile-stat__unit">d</span></dd>
                        <dd className="profile-stat__note">{t('profile.bestStreak', { count: streakLongest })}</dd>
                    </div>
                    <div className="profile-stat">
                        <dt><SavedTeamsIcon className="profile-stat__icon" aria-hidden="true" />{t('profile.statsTeams')}</dt>
                        <dd>{savedTeamsCount}</dd>
                        <dd className="profile-stat__note">{t('profile.statsTeamsSaved')}</dd>
                    </div>
                    <div className="profile-stat">
                        <dt><StarsIcon className="profile-stat__icon" aria-hidden="true" />{t('profile.statsFavorites')}</dt>
                        <dd>{favoritePokemonsCount}</dd>
                        <dd className="profile-stat__note">{t('profile.statsFavoritesPokemon')}</dd>
                    </div>
                </dl>

                {/* A guest's one real next step, where they land. */}
                {isAnonymous && (
                    <div className="profile-hero__actions">
                        <button type="button" onClick={onOpenSignUp} className="btn btn-primary btn-sm">
                            {t('profile.createAccountBtn')}
                        </button>
                        <button type="button" onClick={onOpenSignIn} className="btn btn-ghost btn-sm">
                            {t('profile.signInBtn')}
                        </button>
                    </div>
                )}
            </header>

            {/* Four tabs instead of one long scroll. The tab lives in the URL (?tab=). */}
            <div role="tablist" aria-label={t('profile.tabsAria')} className="tabs profile-tabs">
                {PROFILE_TABS.map((tab) => (
                    <button
                        key={tab}
                        type="button"
                        role="tab"
                        id={`profile-tab-${tab}`}
                        aria-selected={activeTab === tab}
                        aria-controls="profile-tab-panel"
                        onClick={() => setActiveTab(tab)}
                        className="tabs__item"
                    >
                        {t(`profile.tab_${tab}`)}
                    </button>
                ))}
            </div>

            <div
                role="tabpanel"
                id="profile-tab-panel"
                aria-labelledby={`profile-tab-${activeTab}`}
                className="profile-panel"
            >
                {activeTab === 'trainer' && (
                    <>
                        {/* Both faces, and — once both exist — which one is public. */}
                        <Section title={t('profile.sectionAvatar')} description={t('profile.sectionAvatarDesc')}>
                            <SettingRow
                                label={t('profile.avatarChoicePokemon')}
                                leading={(
                                    <AvatarThumb
                                        src={partnerSrc}
                                        onClick={onOpenPokemonSelector}
                                        label={greetingPokemonId ? t('profile.changeAvatarBtn') : t('profile.pickAvatarBtn')}
                                    />
                                )}
                            >
                                {greetingPokemonId && (
                                    <button type="button" onClick={onClearLocalGreeting} className="btn btn-ghost btn-sm">
                                        {t('profile.removeAvatarBtn')}
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={onOpenPokemonSelector}
                                    className="btn btn-secondary btn-sm"
                                    aria-label={greetingPokemonId ? t('profile.changeAvatarBtn') : t('profile.pickAvatarBtn')}
                                >
                                    {greetingPokemonId ? t('profile.changeShort') : t('profile.pickShort')}
                                </button>
                            </SettingRow>
                            <SettingRow
                                label={t('profile.avatarChoiceTrainer')}
                                description={t('profile.sectionTrainerDesc')}
                                leading={(
                                    <AvatarThumb
                                        src={trainerSrc}
                                        pixel
                                        onClick={onOpenTrainerSelector}
                                        label={trainerSprite ? t('profile.changeTrainerBtn') : t('profile.pickTrainerBtn')}
                                    />
                                )}
                            >
                                <button
                                    type="button"
                                    onClick={onOpenTrainerSelector}
                                    className="btn btn-secondary btn-sm"
                                    aria-label={trainerSprite ? t('profile.changeTrainerBtn') : t('profile.pickTrainerBtn')}
                                >
                                    {trainerSprite ? t('profile.changeShort') : t('profile.pickShort')}
                                </button>
                            </SettingRow>
                            {trainerSprite && greetingPokemonId && (
                                <div className="profile-row profile-row--stacked">
                                    <span className="profile-row__label">{t('profile.avatarChoiceLabel')}</span>
                                    <div className="segmented segmented--block profile-avatar-choice" role="group" aria-label={t('profile.avatarChoiceLabel')}>
                                        <button
                                            type="button"
                                            onClick={() => onChangeAvatarPreference('pokemon')}
                                            aria-pressed={avatarPreference !== 'trainer'}
                                            className="segmented__item"
                                        >
                                            <img src={partnerSrc} alt="" aria-hidden="true" />
                                            <span>{t('profile.avatarChoicePokemon')}</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onChangeAvatarPreference('trainer')}
                                            aria-pressed={avatarPreference === 'trainer'}
                                            className="segmented__item"
                                        >
                                            <img src={trainerSrc} alt="" aria-hidden="true" className="is-pixel" />
                                            <span>{t('profile.avatarChoiceTrainer')}</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </Section>

                        <Section
                            title={t('profile.sectionBadgeShowcase')}
                            description={t('profile.sectionBadgeShowcaseDesc')}
                            meta={(
                                <Link to="/journeys?tab=badges" className="profile-link">
                                    {t('profile.badgesSeeAll', { current: unlockedCount, total: totalBadgesCount })}
                                    <ChevronRight aria-hidden="true" />
                                </Link>
                            )}
                        >
                            {earnedBadges.length ? (
                                <ul className="badge-group__grid profile-badges">
                                    {earnedBadges.map((badge) => (
                                        <li key={badge.id}>
                                            <button
                                                type="button"
                                                className={`badge-tile is-unlocked ${badge.isEquipped ? 'is-equipped' : ''}`}
                                                onClick={() => toggleEquip(badge.id)}
                                                aria-pressed={badge.isEquipped}
                                            >
                                                <span className="badge-tile__emblem" aria-hidden="true"><badge.Icon /></span>
                                                <span className="badge-tile__name">{language === 'pt' ? badge.namePt : badge.nameEn}</span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <SettingRow label={t('profile.badgesEmpty')}>
                                    <Link to="/journeys" className="btn btn-secondary btn-sm">{t('journeys.tabs.journeys')}</Link>
                                </SettingRow>
                            )}
                        </Section>

                        <Section title={t('profile.sectionStyle')} description={t('profile.sectionStyleDesc')}>
                            <SettingRow label={t('profile.frameLabel')} description={cosmeticName(equipped.frame)}>
                                <Link to="/journeys?tab=rewards" className="btn btn-secondary btn-sm">{t('rewards.customize')}</Link>
                            </SettingRow>
                            <SettingRow label={t('profile.titleLabel')} description={cosmeticName(equipped.title)}>
                                <Link to="/journeys?tab=rewards" className="btn btn-secondary btn-sm">{t('rewards.customize')}</Link>
                            </SettingRow>
                        </Section>
                    </>
                )}

                {activeTab === 'appearance' && (
                    <>
                        <Section title={t('profile.sectionAppearance')} description={t('profile.sectionAppearanceDesc')}>
                            {[
                                { key: 'dark', label: t('profile.themesDark'), icon: <MoonIcon className="w-3.5 h-3.5" /> },
                                { key: 'light', label: t('profile.themesLight'), icon: <SunIcon className="w-3.5 h-3.5" /> },
                            ].map((group) => {
                                const groupThemes = THEME_META.filter((entry) =>
                                    group.key === 'dark' ? entry.mode === 'dark' : entry.mode !== 'dark'
                                );
                                return (
                                    <div key={group.key} className="profile-row profile-row--stacked">
                                        <span className="profile-row__label profile-row__label--icon">{group.icon}{group.label}</span>
                                        <div className="profile-theme-grid">
                                            {groupThemes.map((entry) => {
                                                const selected = theme === entry.id;
                                                // A reward theme still locked shows how to earn it,
                                                // and a tap opens the Rewards tab (the next step).
                                                const locked = !isThemeUnlocked(entry.id, unlocked);
                                                return (
                                                    <button
                                                        key={entry.id}
                                                        type="button"
                                                        onClick={(event) => (locked
                                                            ? navigate('/journeys?tab=rewards')
                                                            : onChangeTheme(entry.id, originFromEvent(event)))}
                                                        aria-pressed={locked ? undefined : selected}
                                                        className={`profile-theme-card ${selected ? 'is-selected' : ''} ${locked ? 'is-locked' : ''}`}
                                                        style={{ '--profile-theme-swatch': entry.swatch }}
                                                    >
                                                        <span className="profile-theme-card__swatch" aria-hidden="true" />
                                                        <span className="profile-theme-card__text">
                                                            <span className="profile-theme-card__label">{entry.label}</span>
                                                            <span className="profile-theme-card__hint">
                                                                {locked ? t('rewards.themeLocked', { n: themeReward(entry.id).unlock.level }) : entry.hint}
                                                            </span>
                                                        </span>
                                                        <span className="profile-theme-card__icon" aria-hidden="true">
                                                            {/* The group heading already says dark or light; a mark
                                                                here only for what differs — chosen, or still locked. */}
                                                            {locked ? <Lock className="w-3.5 h-3.5" /> : selected ? <Check className="w-3.5 h-3.5" /> : null}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                            {/* Text size moved here from the phone's gear menu
                                (2026-09-24): a setting chosen once belongs with
                                the other appearance choices, not in a popover. */}
                            <div className="profile-row profile-row--stacked profile-text-size">
                                <span className="profile-row__label profile-row__label--icon">
                                    <Type className="w-3.5 h-3.5" aria-hidden="true" />
                                    {t('accountMenu.textSizeLabel')}
                                </span>
                                <TextSizeControl variant="menu" />
                            </div>
                        </Section>

                        <Section title={t('profile.sectionLanguage')} description={t('profile.sectionLanguageDesc')}>
                            <div className="profile-row">
                                <div className="segmented segmented--block" role="group" aria-label={t('profile.sectionLanguage')}>
                                    <button
                                        type="button"
                                        onClick={() => onChangeLanguage('en')}
                                        aria-pressed={language === 'en'}
                                        className="segmented__item"
                                    >
                                        English
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onChangeLanguage('pt')}
                                        aria-pressed={language === 'pt'}
                                        className="segmented__item"
                                    >
                                        Português (pt-BR)
                                    </button>
                                </div>
                            </div>
                        </Section>
                    </>
                )}

                {activeTab === 'preferences' && (
                    <>
                        {/* The Tera switch is how the builder behaves, not how the
                            app looks — it sat under Appearance until 2026-10-22. */}
                        <Section title={t('profile.sectionGameplay')}>
                            <Switch
                                variant="row"
                                checked={showTeraType}
                                onChange={onChangeShowTeraType}
                                label={t('accountMenu.teraTypeSwitch')}
                                description={t('profile.sectionTeraDesc')}
                            />
                        </Section>
                        {onChangeSearchShortcut ? (
                            <SearchShortcutSection shortcut={searchShortcut} onChange={onChangeSearchShortcut} />
                        ) : null}
                        <NotificationsSection />
                    </>
                )}

                {activeTab === 'account' && (
                    <>
                        {isAnonymous ? (
                            // Guests: what is true about their data, and the way to keep it.
                            <Section title={t('profile.sectionAccount')} description={t('profile.guestLocalOnly')}>
                                <SettingRow label={t('profile.sectionAccountGuestDesc')}>
                                    <button type="button" onClick={onOpenSignIn} className="btn btn-ghost btn-sm">
                                        {t('profile.signInBtn')}
                                    </button>
                                    <button type="button" onClick={onOpenSignUp} className="btn btn-primary btn-sm">
                                        {t('profile.createAccountBtn')}
                                    </button>
                                </SettingRow>
                            </Section>
                        ) : (
                            <Section
                                title={t('profile.sectionAccount')}
                                description={db ? t('profile.syncAllDesc') : t('profile.sectionSyncOffline')}
                                meta={<span className="badge">{db ? t('profile.syncCloud') : t('profile.syncOffline')}</span>}
                            >
                                <SettingRow label={t('profile.emailLabel')} description={<span className="profile-row__value" title={userEmail || ''}>{userEmail || '—'}</span>} />
                                <EmailVerifyRow />
                                <SettingRow label={t('profile.passwordLabel')} description={t('profile.passwordDesc')}>
                                    <button type="button" onClick={() => setSecurityModal('password')} className="btn btn-secondary btn-sm">
                                        {t('profile.changePasswordBtn')}
                                    </button>
                                </SettingRow>
                                <SettingRow label={t('profile.sessionLabel')} description={t('profile.signOutDesc')}>
                                    <button type="button" onClick={onSignOut} className="btn btn-secondary btn-sm">
                                        {t('profile.signOutBtn')}
                                    </button>
                                </SettingRow>
                                {/* Last, and in the danger tone: the one thing here that cannot be undone. */}
                                <SettingRow label={t('profile.deleteAccountBtn')} description={t('profile.deleteDesc')} tone="danger">
                                    <button type="button" onClick={() => setSecurityModal('delete')} className="btn btn-danger btn-sm">
                                        {t('profile.deleteShort')}
                                    </button>
                                </SettingRow>
                            </Section>
                        )}

                        <Section title={t('profile.sectionSync')}>
                            {userId && (
                                <SettingRow label={t('profile.trainerIdLabel')} description={<span className="profile-row__value profile-row__value--mono" title={userId}>#{userId.slice(0, 8)}</span>} />
                            )}
                            <SettingRow label={t('profile.resetRemindersLabel')} description={t('profile.resetRemindersHint')}>
                                <button type="button" onClick={onResetSyncPrompt} className="btn btn-ghost btn-sm">
                                    <RefreshIcon className="w-3.5 h-3.5" />
                                    {t('profile.resetShort')}
                                </button>
                            </SettingRow>
                        </Section>

                        {securityModal && (
                            <AccountSecurityModal mode={securityModal} onClose={() => setSecurityModal(null)} />
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
