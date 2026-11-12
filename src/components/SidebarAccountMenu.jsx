import { useEffect, useRef, useState } from 'react';
import { ChevronRight, LogOut, Sparkles, UserRound } from 'lucide-react';
import { AnchoredPopover } from './AnchoredPopover';
import { MoonIcon, PokeballIcon, SunIcon, SettingsIcon } from './icons';
import { originFromEvent } from '../utils/themeTransition';
import { TrainerBadge } from './TrainerBadge';
import { useTranslation } from '../hooks/useTranslation';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';
import { TextSizeControl } from './TextSizeControl';
import { Switch } from './Switch';
import { TrainerTitle } from './rewards/TrainerTitle';
import { useShallow } from 'zustand/react/shallow';
import { useRewardsStore, isThemeUnlocked } from '../store/useRewardsStore';
import { frameProps } from '../utils/rewards';

/**
 * The unlocked themes as one row of swatches — the dark family, a hairline,
 * the light family — each family led by its moon/sun so no label is needed.
 * Wraps to a second line only when rewards unlock more than fit.
 */
function ThemeSwatches({ groups, currentTheme, onPick, label }) {
    return (
        <div className="theme-swatches" role="group" aria-label={label}>
            {groups.filter((group) => group.items.length).map((group) => (
                <span key={group.key} className="theme-swatches__family">
                    <span className="theme-swatches__icon" aria-hidden="true" title={group.label}>{group.icon}</span>
                    {group.items.map((theme) => (
                        <button
                            key={theme.id}
                            type="button"
                            onClick={(event) => onPick(theme.id, event)}
                            aria-pressed={currentTheme === theme.id}
                            aria-label={theme.label}
                            title={theme.label}
                            className="theme-swatches__swatch"
                            style={{ '--swatch': theme.swatch }}
                        />
                    ))}
                </span>
            ))}
        </div>
    );
}

export function SidebarAccountMenu({
    collapsed = false,
    variant = 'sidebar', // 'sidebar' | 'header'
    isMobile = false,
    avatar,
    displayName,
    email,
    currentTheme,
    themes,
    onOpenProfile,
    onOpenPatchNotes,
    onChangeTheme,
    onSignOut,
}) {
    const { t, language, setLanguage } = useTranslation();
    const selectedBadgeId = useAuthStore((s) => s.selectedBadgeId);
    // Rewards (2026-10-17): the frame around the avatar, the title under the
    // name, the level, and only the themes this trainer has unlocked.
    const { frameId, titleId, trainerLevel, unlockedRewards } = useRewardsStore(useShallow((s) => ({
        frameId: s.equipped.frame, titleId: s.equipped.title, trainerLevel: s.level, unlockedRewards: s.unlocked,
    })));
    const avatarFrame = frameProps(frameId);
    const showTeraType = useThemeStore((s) => s.showTeraType);
    const setShowTeraType = useThemeStore((s) => s.setShowTeraType);
    const [isOpen, setIsOpen] = useState(false);
    const anchorRef = useRef(null);
    const popoverRef = useRef(null);
    const accountName = displayName || email?.split('@')[0] || 'Trainer';

    const isHeader = variant === 'header';
    // On the mobile sidebar drawer the card is a direct shortcut to the profile
    // page — the full menu lives behind the header settings icon instead.
    const isProfileShortcut = variant === 'sidebar' && isMobile && !collapsed;

    useEffect(() => {
        if (!isOpen) return undefined;

        const handlePointerDown = (event) => {
            if (!anchorRef.current || !popoverRef.current) return;
            if (anchorRef.current.contains(event.target) || popoverRef.current.contains(event.target)) return;
            setIsOpen(false);
        };

        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen]);

    const handleToggle = () => {
        setIsOpen((open) => !open);
    };

    const handleOpenProfile = () => {
        onOpenProfile?.();
        setIsOpen(false);
    };

    const handleOpenPatchNotes = () => {
        onOpenPatchNotes?.();
        setIsOpen(false);
    };

    // onChangeTheme is store/themeChoice's chooseTheme: it applies the theme,
    // spreads it from the swatch that was pressed, and saves it to the account.
    const handleThemeChange = (themeId, event) => {
        onChangeTheme?.(themeId, originFromEvent(event));
        setIsOpen(false);
    };

    const handleTeraTypeChange = (show) => {
        if (show === showTeraType) return;
        setShowTeraType(show);
        // Follows the account across devices, like theme, scale and language.
        useAuthStore.getState().savePreferences({ showTeraType: show });
    };

    const handleLanguageChange = (lang) => {
        setLanguage(lang);
        useAuthStore.getState().savePreferences({ language: lang });
        setIsOpen(false);
    };

    const handleSignOut = () => {
        onSignOut?.();
        setIsOpen(false);
    };

    // Split themes so dark and light presets read as two distinct families.
    const themeGroups = [
        {
            key: 'dark',
            label: language === 'pt' ? 'Escuros' : 'Dark',
            icon: <MoonIcon />,
            items: themes.filter((theme) => theme.mode === 'dark' && isThemeUnlocked(theme.id, unlockedRewards)),
        },
        {
            key: 'light',
            label: language === 'pt' ? 'Claros' : 'Light',
            icon: <SunIcon />,
            items: themes.filter((theme) => theme.mode !== 'dark' && isThemeUnlocked(theme.id, unlockedRewards)),
        },
    ];

    const settingsLabel = language === 'pt' ? 'Conta e preferências' : 'Account & preferences';

    const renderTrigger = () => {
        if (isHeader) {
            return (
                <button
                    type="button"
                    onClick={handleToggle}
                    aria-label={settingsLabel}
                    aria-expanded={isOpen}
                    className={`app-shell__icon-button app-shell__account-header-trigger ${isOpen ? 'is-open' : ''}`}
                    title={settingsLabel}
                >
                    <SettingsIcon className="w-5 h-5" />
                </button>
            );
        }

        if (collapsed) {
            return (
                <button
                    type="button"
                    onClick={handleToggle}
                    aria-label={`Open account menu for ${accountName}`}
                    aria-expanded={isOpen}
                    className={`app-shell__icon-button app-shell__account-menu-trigger ${isOpen ? 'is-open' : ''}`}
                    title={accountName}
                >
                    {avatar}
                </button>
            );
        }

        // Mobile drawer: the whole card jumps straight to the profile page.
        if (isProfileShortcut) {
            return (
                <button
                    type="button"
                    onClick={handleOpenProfile}
                    aria-label={`${t('accountMenu.profileLabel')} — ${accountName}`}
                    className="app-shell__account-summary-block is-shortcut"
                    title={accountName}
                >
                    <span className="app-shell__account-avatar" {...avatarFrame}>{avatar}</span>
                    <div className="app-shell__account-copy">
                        <p className="app-shell__account-name flex items-center gap-1.5" title={accountName}>
                            <span className="truncate">{accountName}</span>
                            {selectedBadgeId && <TrainerBadge badgeId={selectedBadgeId} size="xs" />}
                        </p>
                        <p className="app-shell__account-subline">{t('accountMenu.profileLabel')}</p>
                    </div>
                    <span className="app-shell__account-summary-chevron" aria-hidden="true">
                        <PokeballIcon className="w-4 h-4" />
                    </span>
                </button>
            );
        }

        return (
            <>
                <button
                    type="button"
                    onClick={handleToggle}
                    aria-label={`Open account menu for ${accountName}`}
                    aria-expanded={isOpen}
                    className={`app-shell__account-summary-block ${isOpen ? 'is-open' : ''}`}
                    title={accountName}
                >
                    <span className="app-shell__account-avatar" {...avatarFrame}>{avatar}</span>
                    <div className="app-shell__account-copy">
                        <p className="app-shell__account-name flex items-center gap-1.5" title={accountName}>
                            <span className="truncate">{accountName}</span>
                            {selectedBadgeId && <TrainerBadge badgeId={selectedBadgeId} size="xs" />}
                        </p>
                        <TrainerTitle titleId={titleId} className="app-shell__account-subline" />
                    </div>
                </button>

                <button
                    type="button"
                    onClick={handleToggle}
                    aria-label={`Open account menu for ${accountName}`}
                    aria-expanded={isOpen}
                    className={`app-shell__account-menu-trigger ${isOpen ? 'is-open' : ''}`}
                    title="Account settings"
                >
                    <SettingsIcon className="w-4.5 h-4.5" />
                </button>
            </>
        );
    };

    return (
        <div className={`app-shell__account-menu ${collapsed ? 'is-collapsed' : ''}  ${isHeader ? 'is-header' : ''}`}>
            <div ref={anchorRef} className={`app-shell__account-card ${collapsed ? 'is-collapsed' : ''}  ${isHeader ? 'is-header' : ''}`}>
                {renderTrigger()}
            </div>

            <AnchoredPopover
                isOpen={isOpen}
                anchorRef={anchorRef}
                popoverRef={popoverRef}
                className={`app-shell__account-popover ${collapsed ? 'is-collapsed' : ''}  ${isHeader ? 'is-header' : ''}`}
                style={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    boxShadow: 'var(--elevation-3)',
                }}
                ariaLabel="Account menu"
                viewportPadding={12}
                offset={10}
                zIndex={isHeader ? 95 : 90}
                placement={isHeader ? 'bottom' : 'top'}
            >
                {isHeader ? (
                    /* The phone's gear menu: three things, not eight. It was
                       identity, profile, what's new, two rows of themes, text
                       size, language, a Tera switch with a paragraph under it
                       and sign-out, stacked edge to edge in a 390px popover
                       (Enzo, 2026-09-24: "muitas opções e fica colado"). The
                       settings a phone changes once a year live on the profile
                       — which this menu now opens from its first row — and
                       "What's new" lives in More → About. What stays is what a
                       thumb reaches for here: who am I, which theme, leave. */
                    <div className="account-quick">
                        <button type="button" onClick={handleOpenProfile} className="account-quick__identity">
                            <span className="account-quick__avatar" {...avatarFrame}>{avatar}</span>
                            <span className="account-quick__copy">
                                <span className="account-quick__name">
                                    <span className="truncate">{accountName}</span>
                                    {selectedBadgeId && <TrainerBadge badgeId={selectedBadgeId} size="xs" />}
                                </span>
                                <span className="account-quick__sub">{t('rewards.levelShort', { n: trainerLevel })} · {t('accountMenu.profileAndSettings')}</span>
                            </span>
                            <ChevronRight className="account-quick__chevron" aria-hidden="true" />
                        </button>

                        <div className="account-quick__theme">
                            <ThemeSwatches groups={themeGroups} currentTheme={currentTheme} onPick={handleThemeChange} label={t('accountMenu.themeShort')} />
                        </div>

                        <button type="button" onClick={handleSignOut} className="account-quick__signout">
                            <LogOut aria-hidden="true" />
                            <span>{t('accountMenu.signOutLabel')}</span>
                        </button>
                    </div>
                ) : (
                /* The account menu (2026-11-12, Enzo: "não parece muito menu de
                   usuário"): who you are, where to go, the few settings worth a
                   shortcut, then leave — the shape every account menu has. Rows
                   are one line each; a preference is its name on the left and
                   its control on the right; three hairlines group it, no caps
                   headings, no notes (the Tera switch's explanation lives on
                   Profile → Preferences, beside the same switch). */
                <div className="account-menu">
                    <div className="account-menu__identity">
                        <span className="account-menu__avatar" {...avatarFrame}>{avatar}</span>
                        <span className="account-menu__who">
                            <span className="account-menu__name">
                                <span className="truncate">{accountName}</span>
                                {selectedBadgeId && <TrainerBadge badgeId={selectedBadgeId} size="xs" />}
                            </span>
                            <span className="account-menu__sub" title={email || undefined}>
                                {t('rewards.levelShort', { n: trainerLevel })}
                                {email ? ` · ${email}` : ''}
                            </span>
                        </span>
                    </div>

                    <div className="account-menu__group">
                        <button type="button" onClick={handleOpenProfile} className="account-menu__item">
                            <UserRound aria-hidden="true" />
                            <span>{t('accountMenu.profileLabel')}</span>
                        </button>
                        {typeof onOpenPatchNotes === 'function' && (
                            <button type="button" onClick={handleOpenPatchNotes} className="account-menu__item">
                                <Sparkles aria-hidden="true" />
                                <span>{t('accountMenu.patchNotesLabel')}</span>
                            </button>
                        )}
                    </div>

                    <div className="account-menu__group">
                        <div className="account-menu__pref is-stacked">
                            <span className="account-menu__pref-label">{t('accountMenu.themeShort')}</span>
                            <ThemeSwatches groups={themeGroups} currentTheme={currentTheme} onPick={handleThemeChange} label={t('accountMenu.themeShort')} />
                        </div>
                        <div className="account-menu__pref">
                            <span className="account-menu__pref-label">{t('accountMenu.textSizeLabel')}</span>
                            <TextSizeControl variant="inline" />
                        </div>
                        <div className="account-menu__pref">
                            <span className="account-menu__pref-label">{t('accountMenu.languageLabel')}</span>
                            <div className="segmented segmented--sm" role="group" aria-label={t('accountMenu.languageLabel')}>
                                <button type="button" onClick={() => handleLanguageChange('en')} aria-pressed={language === 'en'} className="segmented__item" title="English">EN</button>
                                <button type="button" onClick={() => handleLanguageChange('pt')} aria-pressed={language === 'pt'} className="segmented__item" title="Português">PT</button>
                            </div>
                        </div>
                        <Switch
                            variant="row"
                            size="sm"
                            checked={showTeraType}
                            onChange={handleTeraTypeChange}
                            label={t('accountMenu.teraTypeSwitch')}
                            className="account-menu__pref account-menu__switch"
                        />
                    </div>

                    <div className="account-menu__group">
                        <button type="button" onClick={handleSignOut} className="account-menu__item is-danger">
                            <LogOut aria-hidden="true" />
                            <span>{t('accountMenu.signOutLabel')}</span>
                        </button>
                    </div>
                </div>
                )}
            </AnchoredPopover>
        </div>
    );
}
