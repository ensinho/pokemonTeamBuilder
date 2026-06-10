import React, { useEffect, useRef, useState } from 'react';
import { AnchoredPopover } from './AnchoredPopover';
import { MoonIcon, PokeballIcon, SunIcon, SettingsIcon } from './icons';
import { useTranslation } from '../hooks/useTranslation';
import { useAuthStore } from '../store/useAuthStore';

export function SidebarAccountMenu({
    collapsed = false,
    avatar,
    displayName,
    email,
    currentTheme,
    themes,
    onOpenProfile,
    onChangeTheme,
    onSignOut,
}) {
    const { t, language, setLanguage } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const anchorRef = useRef(null);
    const popoverRef = useRef(null);
    const accountName = displayName || email?.split('@')[0] || 'Trainer';

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

    const handleThemeChange = (themeId) => {
        onChangeTheme?.(themeId);
        // Also save preference to Firestore
        useAuthStore.getState().savePreferences({ theme: themeId });
        setIsOpen(false);
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

    return (
        <div className={`app-shell__account-menu ${collapsed ? 'is-collapsed' : ''}`}>
            <div ref={anchorRef} className={`app-shell__account-card ${collapsed ? 'is-collapsed' : ''}`}>
                {collapsed ? (
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
                ) : (
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
                                <p className="app-shell__account-name" title={accountName}>
                                    {accountName}
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
                )}
            </div>

            <AnchoredPopover
                isOpen={isOpen}
                anchorRef={anchorRef}
                popoverRef={popoverRef}
                className={`app-shell__account-popover ${collapsed ? 'is-collapsed' : ''}`}
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
                zIndex={90}
                placement="top"
            >
                <div className="app-shell__account-popover-body">
                    <div className="app-shell__account-popover-head">
                        <span className="app-shell__account-popover-avatar">{avatar}</span>
                        <div className="app-shell__account-popover-copy">
                            <p className="app-shell__account-popover-name">{accountName}</p>
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

                    <div className="app-shell__account-popover-section">
                        <p className="app-shell__account-popover-label">{t('accountMenu.themeLabel')}</p>
                        <div className="app-shell__account-theme-row">
                            {themes.map((theme) => {
                                const isActive = currentTheme === theme.id;

                                return (
                                    <button
                                        key={theme.id}
                                        type="button"
                                        onClick={() => handleThemeChange(theme.id)}
                                        aria-pressed={isActive}
                                        className={`app-shell__account-theme-dot ${isActive ? 'is-active' : ''}`}
                                        style={{ backgroundColor: theme.swatch }}
                                        title={theme.label}
                                    />
                                );
                            })}
                        </div>
                    </div>

                    <div className="app-shell__account-popover-section">
                        <p className="app-shell__account-popover-label">{t('accountMenu.languageLabel')}</p>
                        <div className="app-shell__account-language-row">
                            <button
                                type="button"
                                onClick={() => handleLanguageChange('en')}
                                className={`app-shell__account-lang-btn ${language === 'en' ? 'is-active' : ''}`}
                            >
                                English
                            </button>
                            <button
                                type="button"
                                onClick={() => handleLanguageChange('pt')}
                                className={`app-shell__account-lang-btn ${language === 'pt' ? 'is-active' : ''}`}
                            >
                                Português
                            </button>
                        </div>
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
            </AnchoredPopover>
        </div>
    );
}