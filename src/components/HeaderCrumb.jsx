import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { navHue } from '../utils/navHue';

/**
 * The header's breadcrumb (2026-11-11), made useful (2026-11-12): the section
 * the page lives in is a button, and what it opens is that section's other
 * pages — the rail's own group, one step from the title. "Where before what"
 * was a label nobody could act on; a crumb that is a way to the siblings is
 * the pattern people already know from every product header.
 *
 * `section` is a rail group ({ key, title, items }) — the same objects the rail
 * and the Mais sheet draw, so a destination's label, icon and tone are never
 * restated here. Desktop only (the caller decides): a phone has the dock.
 */
export function HeaderCrumb({ section, currentPage, onIntent }) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const wrapRef = useRef(null);
    const buttonRef = useRef(null);
    const menuRef = useRef(null);

    const close = useCallback((refocus = false) => {
        setOpen(false);
        if (refocus) buttonRef.current?.focus();
    }, []);

    // A page change closes it — the click on a sibling, or anything else that
    // navigated while it was open.
    useEffect(() => { setOpen(false); }, [currentPage]);

    useEffect(() => {
        if (!open) return undefined;
        const onPointerDown = (event) => {
            if (!wrapRef.current?.contains(event.target)) close();
        };
        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.stopPropagation();
                close(true);
            }
        };
        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open, close]);

    // Opened from the keyboard, the first row takes the focus; a pointer keeps
    // it on the button, where the hand already is.
    const openedByKeyRef = useRef(false);
    useEffect(() => {
        if (open && openedByKeyRef.current) {
            menuRef.current?.querySelector('[role="menuitem"]')?.focus();
        }
        openedByKeyRef.current = false;
    }, [open]);

    const onMenuKeyDown = (event) => {
        const rows = [...(menuRef.current?.querySelectorAll('[role="menuitem"]') || [])];
        const index = rows.indexOf(document.activeElement);
        const step = { ArrowDown: 1, ArrowUp: -1 }[event.key];
        if (step) {
            event.preventDefault();
            rows[(index + step + rows.length) % rows.length]?.focus();
        } else if (event.key === 'Home' || event.key === 'End') {
            event.preventDefault();
            rows[event.key === 'Home' ? 0 : rows.length - 1]?.focus();
        } else if (event.key === 'Tab') {
            close();
        }
    };

    return (
        <span ref={wrapRef} className="app-shell__crumb-wrap">
            <button
                ref={buttonRef}
                type="button"
                className="app-shell__crumb"
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={t('nav.sectionMenu', { section: section.title })}
                onClick={() => setOpen((value) => !value)}
                onKeyDown={(event) => {
                    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
                        openedByKeyRef.current = true;
                    }
                    if (event.key === 'ArrowDown') {
                        event.preventDefault();
                        setOpen(true);
                    }
                }}
            >
                <span className="app-shell__crumb-label">{section.title}</span>
                <ChevronDown className="app-shell__crumb-chevron" aria-hidden="true" />
            </button>
            <span className="app-shell__crumb-sep" aria-hidden="true">/</span>
            {open && (
                <div
                    ref={menuRef}
                    role="menu"
                    aria-label={section.title}
                    className="menu-surface app-shell__crumb-menu"
                    onKeyDown={onMenuKeyDown}
                >
                    {section.items.map((item) => {
                        const active = item.key === currentPage || Boolean(item.members?.includes(currentPage));
                        return (
                            <Link
                                key={item.key}
                                to={item.path}
                                role="menuitem"
                                className={`menu-item ${active ? 'is-active' : ''}`}
                                aria-current={active ? 'page' : undefined}
                                onPointerEnter={() => onIntent?.(item.prefetchKey || item.key)}
                                onClick={() => close()}
                            >
                                <span className="app-shell__nav-icon" aria-hidden="true" style={{ '--nav-hue': navHue(item.key) }}>
                                    {item.icon}
                                </span>
                                <span className="min-w-0 truncate">{item.label}</span>
                                {item.badge > 0 && <span className="app-shell__nav-badge">{item.badge}</span>}
                            </Link>
                        );
                    })}
                </div>
            )}
        </span>
    );
}

export default HeaderCrumb;
