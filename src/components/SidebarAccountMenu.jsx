import React, { useEffect, useRef, useState } from 'react';
import { AnchoredPopover } from './AnchoredPopover';
import { MoonIcon, PokeballIcon, SunIcon } from './icons';

const ThemeMenuIcon = ({ themeId }) => {
    if (themeId === 'dark' || themeId === 'midnight' || themeId === 'eclipse') {
        return <MoonIcon />;
    }

    return <SunIcon />;
};

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
    const [isOpen, setIsOpen] = useState(false);
    const anchorRef = useRef(null);
    const popoverRef = useRef(null);
    const accountName = displayName || email || 'Trainer';

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
                            title="Open account menu"
                        >
                            <span className="app-shell__account-avatar">{avatar}</span>
                            <div className="app-shell__account-copy">
                                <p className="app-shell__account-label">Signed in</p>
                                <p className="app-shell__account-email" title={email || accountName}>
                                    {email || accountName}
                                </p>
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={handleToggle}
                            aria-label={`Open account menu for ${accountName}`}
                            aria-expanded={isOpen}
                            className={`app-shell__account-menu-trigger ${isOpen ? 'is-open' : ''}`}
                            title="Open account menu"
                        >
                            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="m5 8 5 5 5-5" />
                            </svg>
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
                                <span className="app-shell__account-menu-item-label">Profile</span>
                                <span className="app-shell__account-menu-item-note">Open trainer settings and preferences</span>
                            </span>
                        </button>
                    </div>

                    <div className="app-shell__account-popover-section">
                        <p className="app-shell__account-popover-label">Theme preferences</p>
                        <div className="app-shell__account-theme-grid">
                            {themes.map((theme) => {
                                const isActive = currentTheme === theme.id;

                                return (
                                    <button
                                        key={theme.id}
                                        type="button"
                                        onClick={() => handleThemeChange(theme.id)}
                                        aria-pressed={isActive}
                                        className={`app-shell__account-theme-option ${isActive ? 'is-active' : ''}`}
                                        style={{ '--app-shell-theme-swatch': theme.swatch }}
                                        title={theme.label}
                                    >
                                        <span className="app-shell__account-theme-swatch" aria-hidden="true"></span>
                                        <span className="app-shell__account-theme-copy">
                                            <span className="app-shell__account-theme-name">{theme.label}</span>
                                            <span className="app-shell__account-theme-hint">{theme.hint}</span>
                                        </span>
                                        <span className="app-shell__account-theme-icon">
                                            <ThemeMenuIcon themeId={theme.id} />
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="app-shell__account-popover-section">
                        <button type="button" onClick={handleSignOut} className="app-shell__account-menu-item app-shell__account-menu-item--danger">
                            <span className="app-shell__account-menu-item-copy">
                                <span className="app-shell__account-menu-item-label">Sign out</span>
                                <span className="app-shell__account-menu-item-note">Keep using the app with a fresh guest session</span>
                            </span>
                        </button>
                    </div>
                </div>
            </AnchoredPopover>
        </div>
    );
}