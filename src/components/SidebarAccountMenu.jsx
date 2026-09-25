import React, { useEffect, useRef, useState } from 'react';
import { ChevronRight, LogOut } from 'lucide-react';
import { AnchoredPopover } from './AnchoredPopover';
import { FlowerIcon, MoonIcon, PokeballIcon, SunIcon, SettingsIcon } from './icons';
import { originFromEvent } from '../utils/themeTransition';
import { TrainerBadge } from './TrainerBadge';
import { useTranslation } from '../hooks/useTranslation';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';
import { TextSizeControl } from './TextSizeControl';
import { Switch } from './Switch';

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
            items: themes.filter((theme) => theme.mode === 'dark'),
        },
        {
            key: 'light',
            label: language === 'pt' ? 'Claros' : 'Light',
            icon: <SunIcon />,
            items: themes.filter((theme) => theme.mode !== 'dark'),
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
                    <span className="app-shell__account-avatar">{avatar}</span>
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
                    <span className="app-shell__account-avatar">{avatar}</span>
                    <div className="app-shell__account-copy">
                        <p className="app-shell__account-name flex items-center gap-1.5" title={accountName}>
                            <span className="truncate">{accountName}</span>
                            {selectedBadgeId && <TrainerBadge badgeId={selectedBadgeId} size="xs" />}
                        </p>
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
        <div className={`app-shell__account-menu ${collapsed ? 'is-collapsed' : ''} ${isHeader ? 'is-header' : ''}`}>
            <div ref={anchorRef} className={`app-shell__account-card ${collapsed ? 'is-collapsed' : ''} ${isHeader ? 'is-header' : ''}`}>
                {renderTrigger()}
            </div>

            <AnchoredPopover
                isOpen={isOpen}
                anchorRef={anchorRef}
                popoverRef={popoverRef}
                className={`app-shell__account-popover ${collapsed ? 'is-collapsed' : ''} ${isHeader ? 'is-header' : ''}`}
                style={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    boxShadow: 'var(--elevation-3)',
                }}
                arrowTopStyle={{
                    backgroundColor: 'var(--color-surface)',
                    borderTop: '1px solid var(--color-border)',
                    borderLeft: '1px solid var(--color-border)',
                }}
                arrowBottomStyle={{
                    backgroundColor: 'var(--color-surface)',
                    borderRight: '1px solid var(--color-border)',
                    borderBottom: '1px solid var(--color-border)',
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
                            <span className="account-quick__avatar">{avatar}</span>
                            <span className="account-quick__copy">
                                <span className="account-quick__name">
                                    <span className="truncate">{accountName}</span>
                                    {selectedBadgeId && <TrainerBadge badgeId={selectedBadgeId} size="xs" />}
                                </span>
                                <span className="account-quick__sub">{t('accountMenu.profileAndSettings')}</span>
                            </span>
                            <ChevronRight className="account-quick__chevron" aria-hidden="true" />
                        </button>

                        <div className="account-quick__theme" role="group" aria-label={t('accountMenu.themeShort')}>
                            <span className="account-quick__label">{t('accountMenu.themeShort')}</span>
                            <div className="account-quick__swatches">
                                {themeGroups.map((group, groupIndex) => (
                                    <React.Fragment key={group.key}>
                                        {groupIndex > 0 && <span className="account-quick__divider" aria-hidden="true" />}
                                        {group.items.map((theme) => {
                                            const isActive = currentTheme === theme.id;
                                            return (
                                                <button
                                                    key={theme.id}
                                                    type="button"
                                                    onClick={(event) => handleThemeChange(theme.id, event)}
                                                    aria-pressed={isActive}
                                                    aria-label={theme.label}
                                                    title={theme.label}
                                                    className="account-quick__swatch"
                                                    style={{ '--swatch': theme.swatch }}
                                                />
                                            );
                                        })}
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>

                        <button type="button" onClick={handleSignOut} className="account-quick__signout">
                            <LogOut aria-hidden="true" />
                            <span>{t('accountMenu.signOutLabel')}</span>
                        </button>
                    </div>
                ) : (
                <div className="app-shell__account-popover-body">
                    <div className="app-shell__account-popover-head">
                        <span className="app-shell__account-popover-avatar">{avatar}</span>
                        <div className="app-shell__account-popover-copy">
                            <p className="app-shell__account-popover-name flex items-center gap-1.5">
                                <span className="truncate">{accountName}</span>
                                {selectedBadgeId && <TrainerBadge badgeId={selectedBadgeId} size="xs" />}
                            </p>
                            {email ? (
                                <p className="app-shell__account-popover-email" title={email}>
                                    {email}
                                </p>
                            ) : null}
                        </div>
                    </div>

                    <div className="app-shell__account-popover-section">
                        <button type="button" onClick={handleOpenProfile} className="app-shell__account-menu-item">
                            <span className="app-shell__account-menu-item-icon">
                                <PokeballIcon />
                            </span>
                            <span className="app-shell__account-menu-item-copy">
                                <span className="app-shell__account-menu-item-label">{t('accountMenu.profileLabel')}</span>
                                <span className="app-shell__account-menu-item-note">{t('accountMenu.profileNote')}</span>
                            </span>
                        </button>
                    </div>

                    {typeof onOpenPatchNotes === 'function' && (
                        <div className="app-shell__account-popover-section">
                            <button type="button" onClick={handleOpenPatchNotes} className="app-shell__account-menu-item">
                                <span className="app-shell__account-menu-item-icon">
                                    <FlowerIcon />
                                </span>
                                <span className="app-shell__account-menu-item-copy">
                                    <span className="app-shell__account-menu-item-label">{t('accountMenu.patchNotesLabel')}</span>
                                    <span className="app-shell__account-menu-item-note">{t('accountMenu.patchNotesNote')}</span>
                                </span>
                            </button>
                        </div>
                    )}

                    <div className="app-shell__account-popover-section">
                        <p className="app-shell__account-popover-label">{t('accountMenu.themeLabel')}</p>
                        <div className="app-shell__account-theme-groups">
                            {themeGroups.map((group) => (
                                <div key={group.key} className="app-shell__account-theme-group">
                                    <span className={`app-shell__account-theme-group-tag app-shell__account-theme-group-tag--${group.key}`}>
                                        <span className="app-shell__account-theme-group-icon" aria-hidden="true">{group.icon}</span>
                                        {group.label}
                                    </span>
                                    <div className="app-shell__account-theme-dots">
                                        {group.items.map((theme) => {
                                            const isActive = currentTheme === theme.id;
                                            return (
                                                <button
                                                    key={theme.id}
                                                    type="button"
                                                    onClick={(event) => handleThemeChange(theme.id, event)}
                                                    aria-pressed={isActive}
                                                    className={`app-shell__account-theme-dot ${isActive ? 'is-active' : ''}`}
                                                    style={{ backgroundColor: theme.swatch }}
                                                    title={theme.label}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="app-shell__account-popover-section">
                        <p className="app-shell__account-popover-label">{t('accountMenu.textSizeLabel')}</p>
                        <TextSizeControl variant="menu" />
                    </div>

                    <div className="app-shell__account-popover-section">
                        <p className="app-shell__account-popover-label">{t('accountMenu.languageLabel')}</p>
                        <div className="segmented segmented--sm segmented--block" role="group" aria-label={t('accountMenu.languageLabel')}>
                            <button
                                type="button"
                                onClick={() => handleLanguageChange('en')}
                                aria-pressed={language === 'en'}
                                className="segmented__item"
                            >
                                English
                            </button>
                            <button
                                type="button"
                                onClick={() => handleLanguageChange('pt')}
                                aria-pressed={language === 'pt'}
                                className="segmented__item"
                            >
                                Português
                            </button>
                        </div>
                    </div>

                    <div className="app-shell__account-popover-section">
                        <Switch
                            variant="row"
                            size="sm"
                            checked={showTeraType}
                            onChange={handleTeraTypeChange}
                            label={t('accountMenu.teraTypeSwitch')}
                            className="app-shell__account-switch"
                        />
                        <p className="app-shell__account-popover-note">{t('accountMenu.teraTypeNote')}</p>
                    </div>

                    <div className="app-shell__account-popover-section">
                        <button type="button" onClick={handleSignOut} className="app-shell__account-menu-item app-shell__account-menu-item--danger">
                            <span className="app-shell__account-menu-item-copy">
                                <span className="app-shell__account-menu-item-label">{t('accountMenu.signOutLabel')}</span>
                                <span className="app-shell__account-menu-item-note">{t('accountMenu.signOutNote')}</span>
                            </span>
                        </button>
                    </div>
                </div>
                )}
            </AnchoredPopover>
        </div>
    );
}
