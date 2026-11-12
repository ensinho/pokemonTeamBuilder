import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import '../../styles/profile-view.css';
import '../../styles/journeys.css';
import { THEME_META } from '../../constants/theme';
import { getPokemonArtworkSpriteUrl } from '../../utils/pokemonSprites';
import { trainerSpriteUrl } from '../../hooks/useTrainerSprites';
import { resolveAvatar, useAuthStore } from '../../store/useAuthStore';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import { PERSONAS, derivePersona, hasAnsweredProfile } from '../../utils/trainerProfile';
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
import { Flame, Languages, Lock, Check, ChevronRight, Type } from 'lucide-react';
import { TextSizeControl } from '../TextSizeControl';
import { useThemeStore } from '../../store/useThemeStore';
import { useNotificationSettings } from '../../hooks/useNotificationSettings';
import { originFromEvent } from '../../utils/themeTransition';
import { Switch } from '../Switch';
import { Mascot } from '../Mascot';
import { useMascotStore, MASCOT_COSTUME_CHOICES, MASCOT_FORM_CHOICES } from '../../store/useMascotStore';
import { costumeHat } from '../../utils/mascot/assistant';
import { TONES as MASCOT_TONES } from '../../utils/mascot/constants';
import { typeColors } from '../../constants/typeChart';
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

/**
 * A setting chosen once (2026-11-05, the grouped-settings reference): the row
 * says the current value at its end ("Tema · Escuro ›") and opens its control
 * under it on a tap, so the page reads as a list of answers, not a wall of
 * controls. One open at a time is the caller's choice (`open` / `onToggle`).
 */
const DisclosureRow = ({ id, icon, label, value, open, onToggle, children }) => (
    <div className={`profile-row profile-row--disclosure ${open ? 'is-open' : ''}`}>
        <button
            type="button"
            className="profile-row__summary"
            aria-expanded={open}
            aria-controls={`${id}-panel`}
            onClick={onToggle}
        >
            <span className="profile-row__label profile-row__label--icon">{icon}{label}</span>
            <span className="profile-row__value">{value}</span>
            <ChevronRight className="profile-row__chevron" aria-hidden="true" />
        </button>
        {open && <div id={`${id}-panel`} className="profile-row__panel">{children}</div>}
    </div>
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
 * What the onboarding learned (utils/trainerProfile.js), and the way back
 * into it. First in Preferences: it decides the order of everything else.
 */
const TrainerProfileSection = () => {
    const { t } = useTranslation();
    const profile = useAuthStore((s) => s.trainerProfile);
    const open = useOnboardingStore((s) => s.open);
    const persona = hasAnsweredProfile(profile) ? derivePersona(profile) : null;
    const tags = persona
        ? [
            ...persona.interests.map((interest) => t(`onboarding.interestShort.${interest}`)),
            ...(profile.competitiveLevel ? [t(`onboarding.levelShort.${profile.competitiveLevel}`)] : []),
            ...(profile.battleFormat ? [t(`onboarding.format.${profile.battleFormat}`)] : []),
        ].join(' · ')
        : null;
    return (
        <Section title={t('onboarding.profile.label')}>
            <SettingRow
                label={persona ? t(`onboarding.personas.${persona.id}.name`) : t('onboarding.profile.label')}
                description={persona ? tags : t('onboarding.profile.none')}
                leading={(
                    <span className="profile-thumb profile-thumb--static" aria-hidden="true">
                        <img src={getPokemonArtworkSpriteUrl((persona || PERSONAS.master).art)} alt="" width={40} height={40} decoding="async" />
                    </span>
                )}
            >
                <button type="button" className={`btn btn-sm ${persona ? 'btn-secondary' : 'btn-primary'}`} onClick={() => open('profile')}>
                    {persona ? t('onboarding.profile.redo') : t('onboarding.profile.setup')}
                </button>
            </SettingRow>
        </Section>
    );
};

// The faces offered beside the playground: one tap shows each mood on the big one.
const MASCOT_MOODS = ['feliz', 'animado', 'travesso', 'apaixonado', 'pensando', 'surpreso', 'determinado', 'sonolento'];

/**
 * The mascot's room (2026-11-06): the full playground — pet it, hold it for a
 * Shadow Ball, drag it, tap the sparks three times — plus what this device
 * keeps: his form (the 3D bot or the icon's line, 2026-11-11), his colour (the icon's violet, the persona's type, any of the 18
 * types, or shiny once found) and whether he reacts and celebrates on his own.
 */
const MascotSection = () => {
    const { t } = useTranslation();
    const prefs = useMascotStore((s) => s.prefs);
    const setPrefs = useMascotStore((s) => s.setPrefs);
    const trainerProfile = useAuthStore((s) => s.trainerProfile);
    const personaTone = derivePersona(trainerProfile)?.tone || null;
    const personaId = derivePersona(trainerProfile)?.id || null;
    // "The profile's" is offered once there is a profile to follow.
    const costumes = MASCOT_COSTUME_CHOICES.filter((k) => k !== 'persona' || (personaId && hasAnsweredProfile(trainerProfile)));
    const [mood, setMood] = useState('feliz');
    const tones = ['brand', ...(personaTone ? ['persona'] : []), ...MASCOT_TONES, ...(prefs.shinyFound ? ['shiny'] : [])];
    const toneLabel = (k) => (k === 'brand' ? t('profile.mascotToneBrand')
        : k === 'persona' ? t('profile.mascotTonePersona', { type: t(`types.${personaTone}`, { defaultValue: personaTone }) })
            : k === 'shiny' ? t('profile.mascotToneShiny') : t(`types.${k}`, { defaultValue: k }));
    const toneSwatch = (k) => (k === 'brand' ? 'var(--mascot-brand)' : k === 'persona' ? typeColors[personaTone] : k === 'shiny' ? 'var(--mascot-shiny)' : typeColors[k]);

    return (
        <Section title={t('profile.sectionMascot')} description={t('profile.sectionMascotDesc')}>
            <div className="profile-mascot">
                <div className="mascot-stage profile-mascot__stage">
                    <Mascot size="fill" mood={mood} playground stage loop="breathe" label={t('mascot.label')} />
                </div>
                <div className="profile-mascot__side">
                    <div className="segmented segmented--block" role="group" aria-label={t('profile.mascotForm')}>
                        {MASCOT_FORM_CHOICES.map((k) => (
                            <button key={k} type="button" className="segmented__item" aria-pressed={prefs.form === k} onClick={() => setPrefs({ form: k })}>
                                {t(`profile.mascotForm_${k}`)}
                            </button>
                        ))}
                    </div>
                    <p className="profile-mascot__try">{t(prefs.form === 'bot' ? 'profile.mascotTryBot' : 'profile.mascotTry')}</p>
                    <div className="profile-mascot__moods" role="group" aria-label={t('profile.mascotMoods')}>
                        {MASCOT_MOODS.map((m) => (
                            <button key={m} type="button" className="profile-mascot__mood" aria-pressed={mood === m} onClick={() => setMood(m)} title={t(`mascot.moods.${m}`)}>
                                <Mascot size="sm" mood={m} seasonal={false} />
                                <span className="sr-only">{t(`mascot.moods.${m}`)}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            <div className="profile-row profile-row--stacked">
                <span className="profile-row__label">{t('profile.mascotTone')}</span>
                <div className="profile-mascot__tones" role="group" aria-label={t('profile.mascotTone')}>
                    {tones.map((k) => (
                        <button key={k} type="button" className="mascot-tone" style={{ '--tone': toneSwatch(k) }} aria-pressed={prefs.tone === k} onClick={() => setPrefs({ tone: k })}>
                            {toneLabel(k)}
                        </button>
                    ))}
                </div>
            </div>
            <div className="profile-row profile-row--stacked">
                <span className="profile-row__label">{t('profile.mascotCostume')}</span>
                <span className="profile-row__desc">{t('profile.mascotCostumeDesc')}</span>
                <div className="profile-mascot__costumes" role="group" aria-label={t('profile.mascotCostume')}>
                    {costumes.map((k) => (
                        <button key={k} type="button" className="mascot-costume" aria-pressed={prefs.costume === k} onClick={() => setPrefs({ costume: k })}>
                            <Mascot size="md" hat={costumeHat(k, personaId) || undefined} seasonal={false} />
                            <span className="mascot-costume__name">{t(`mascot.costumes.${k}`)}</span>
                        </button>
                    ))}
                </div>
            </div>
            <Switch
                variant="row"
                checked={prefs.reactions}
                onChange={(next) => setPrefs({ reactions: next })}
                label={t('profile.mascotReactions')}
                description={t('profile.mascotReactionsDesc')}
            />
        </Section>
    );
};

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

/**
 * One of the trainer's two faces (2026-11-12): the picture, its name, and its
 * picker. Once both faces exist the tile is also the choice of which one other
 * trainers see — a radio, ringed when chosen — so no separate switch is needed.
 */
const FaceTile = ({ label, src, pixel = false, isMain, mainLabel, canChoose, onChoose, onPick, pickLabel, pickText, onRemove = null, removeText }) => (
    <div className={`profile-face ${isMain ? 'is-main' : ''}`}>
        {canChoose ? (
            <button type="button" role="radio" aria-checked={isMain} className="profile-face__choose" onClick={onChoose}>
                <span className="profile-thumb profile-thumb--static" aria-hidden="true">
                    {src ? <Sprite src={src} alt="" className={`profile-thumb__sprite ${pixel ? 'is-pixel' : ''}`} /> : null}
                </span>
                <span className="profile-face__text">
                    <span className="profile-row__label">{label}</span>
                    <span className={`profile-face__state ${isMain ? 'is-main' : ''}`}>{isMain ? mainLabel : '\u00a0'}</span>
                </span>
            </button>
        ) : (
            <div className="profile-face__choose">
                <AvatarThumb src={src} pixel={pixel} onClick={onPick} label={pickLabel} />
                <span className="profile-face__text">
                    <span className="profile-row__label">{label}</span>
                </span>
            </div>
        )}
        <div className="profile-face__actions">
            {onRemove && <button type="button" onClick={onRemove} className="btn btn-ghost btn-sm">{removeText}</button>}
            <button type="button" onClick={onPick} className="btn btn-secondary btn-sm" aria-label={pickLabel}>{pickText}</button>
        </div>
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
    // Appearance: one setting open at a time (DisclosureRow).
    const [openSetting, setOpenSetting] = useState(null);
    const toggleSetting = (key) => setOpenSetting((current) => (current === key ? null : key));
    const uiScale = useThemeStore((s) => s.uiScale);
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
    const equippedBadge = earnedBadges.find((badge) => badge.isEquipped) || null;
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

    // Closes at once (the store shows the new name optimistically); a failed
    // save reopens the field with what was typed — the store toasts Retry.
    const handleSaveName = async () => {
        const trimmed = nameDraft.trim().slice(0, 24);
        setEditingName(false);
        const saved = await onChangeDisplayName(trimmed);
        if (saved === false) {
            setNameDraft(trimmed);
            setEditingName(true);
        }
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
    const bothFaces = Boolean(trainerSprite && greetingPokemonId);
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
                        {/* A guest's name already reads "Convidado": the pill
                            would say it twice (audit 2026-11-09). */}
                        {!equipped.title && !(isAnonymous && trainerLabel === t('profile.guestPill')) && (
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
                        {/* Both faces side by side (2026-11-12, "menos rolagem"): each
                            tile is the face, its picker, and — once both exist — the
                            choice of which one is public (the ring). It replaced two
                            rows plus a third "main avatar" switch; frame and title,
                            which dress the same face, joined as one row. */}
                        <Section title={t('profile.sectionAvatar')} description={t('profile.sectionAvatarDesc')}>
                            <div className="profile-faces" role={bothFaces ? 'radiogroup' : undefined} aria-label={bothFaces ? t('profile.avatarChoiceLabel') : undefined}>
                                <FaceTile
                                    label={t('profile.avatarChoicePokemon')}
                                    src={partnerSrc}
                                    isMain={bothFaces && avatarPreference !== 'trainer'}
                                    mainLabel={t('profile.avatarMain')}
                                    canChoose={bothFaces}
                                    onChoose={() => onChangeAvatarPreference('pokemon')}
                                    onPick={onOpenPokemonSelector}
                                    pickLabel={greetingPokemonId ? t('profile.changeAvatarBtn') : t('profile.pickAvatarBtn')}
                                    pickText={greetingPokemonId ? t('profile.changeShort') : t('profile.pickShort')}
                                    onRemove={greetingPokemonId ? onClearLocalGreeting : null}
                                    removeText={t('profile.removeAvatarBtn')}
                                />
                                <FaceTile
                                    label={t('profile.avatarChoiceTrainer')}
                                    src={trainerSrc}
                                    pixel
                                    isMain={bothFaces && avatarPreference === 'trainer'}
                                    mainLabel={t('profile.avatarMain')}
                                    canChoose={bothFaces}
                                    onChoose={() => onChangeAvatarPreference('trainer')}
                                    onPick={onOpenTrainerSelector}
                                    pickLabel={trainerSprite ? t('profile.changeTrainerBtn') : t('profile.pickTrainerBtn')}
                                    pickText={trainerSprite ? t('profile.changeShort') : t('profile.pickShort')}
                                />
                            </div>
                            <SettingRow
                                label={t('profile.styleLabel')}
                                description={`${cosmeticName(equipped.frame)} · ${cosmeticName(equipped.title)}`}
                            >
                                <Link to="/journeys?tab=rewards" className="btn btn-secondary btn-sm">{t('rewards.customize')}</Link>
                            </SettingRow>
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
                                /* Emblems only: the name is the tile's label and tooltip,
                                   and the one being shown is named under the grid. */
                                <div className="profile-badges">
                                    <ul className="profile-badges__grid">
                                        {earnedBadges.map((badge) => {
                                            const name = language === 'pt' ? badge.namePt : badge.nameEn;
                                            return (
                                                <li key={badge.id}>
                                                    <button
                                                        type="button"
                                                        className={`badge-tile profile-badges__tile is-unlocked ${badge.isEquipped ? 'is-equipped' : ''}`}
                                                        onClick={() => toggleEquip(badge.id)}
                                                        aria-pressed={badge.isEquipped}
                                                        aria-label={name}
                                                        title={name}
                                                    >
                                                        <span className="badge-tile__emblem" aria-hidden="true"><badge.Icon /></span>
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                    <p className="profile-badges__shown">
                                        {equippedBadge
                                            ? t('profile.badgeShown', { name: language === 'pt' ? equippedBadge.namePt : equippedBadge.nameEn })
                                            : t('profile.badgeNoneShown')}
                                    </p>
                                </div>
                            ) : (
                                <SettingRow label={t('profile.badgesEmpty')}>
                                    <Link to="/journeys" className="btn btn-secondary btn-sm">{t('journeys.tabs.journeys')}</Link>
                                </SettingRow>
                            )}
                        </Section>
                    </>
                )}

                {activeTab === 'appearance' && (
                    <>
                        <Section title={t('profile.sectionAppearance')} description={t('profile.sectionAppearanceDesc')}>
                            <DisclosureRow
                                id="profile-theme"
                                icon={theme && THEME_META.find((entry) => entry.id === theme)?.mode === 'dark' ? <MoonIcon className="w-3.5 h-3.5" /> : <SunIcon className="w-3.5 h-3.5" />}
                                label={t('profile.settingTheme')}
                                value={THEME_META.find((entry) => entry.id === theme)?.label || '—'}
                                open={openSetting === 'theme'}
                                onToggle={() => toggleSetting('theme')}
                            >
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
                            </DisclosureRow>
                            {/* Text size moved here from the phone's gear menu
                                (2026-09-24): a setting chosen once belongs with
                                the other appearance choices, not in a popover. */}
                            <DisclosureRow
                                id="profile-text-size"
                                icon={<Type className="w-3.5 h-3.5" aria-hidden="true" />}
                                label={t('accountMenu.textSizeLabel')}
                                value={`${Math.round((uiScale || 1) * 100)}%`}
                                open={openSetting === 'textSize'}
                                onToggle={() => toggleSetting('textSize')}
                            >
                                <TextSizeControl variant="menu" />
                            </DisclosureRow>
                            <DisclosureRow
                                id="profile-language"
                                icon={<Languages className="w-3.5 h-3.5" aria-hidden="true" />}
                                label={t('profile.sectionLanguage')}
                                value={language === 'pt' ? 'Português (pt-BR)' : 'English'}
                                open={openSetting === 'language'}
                                onToggle={() => toggleSetting('language')}
                            >
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
                            </DisclosureRow>
                        </Section>
                        <MascotSection />
                    </>
                )}

                {activeTab === 'preferences' && (
                    <>
                        <TrainerProfileSection />
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
