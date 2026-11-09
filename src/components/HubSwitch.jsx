import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { NAV_HUBS } from '../constants/navHubs';

/**
 * The switcher at the top of a hub's pages (constants/navHubs.js): one menu
 * entry, then the choice here. Real links, so Cmd-click and Back work.
 */
export function HubSwitch({ hub, currentPage }) {
    const { t } = useTranslation();
    const pages = NAV_HUBS[hub];
    if (!pages) return null;
    return (
        <nav className="hub-switch" aria-label={t(`nav.hub.${hub}`)}>
            <div className="segmented segmented--block hub-switch__track">
                {pages.map((page) => {
                    const active = page.key === currentPage;
                    return (
                        <Link
                            key={page.key}
                            to={page.path}
                            className={`segmented__item touch-target--y touch-target ${active ? 'is-active' : ''}`}
                            aria-current={active ? 'page' : undefined}
                        >
                            {t(page.labelKey)}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
