import React from 'react';
import { BottomSheet } from './BottomSheet';
import { useTranslation } from '../hooks/useTranslation';
import '../styles/more-sheet.css';

/**
 * MobileMoreSheet — what the phone's "Mais" tab opens.
 *
 * Below 1024px the tab bar is the navigation, and "Mais" used to slide the
 * desktop sidebar in from the *left* edge: a button in the bottom-right corner
 * opening a full-height column whose first rows repeated the tab bar itself
 * (Início, Construtor, Pokédex) and whose long tail sat at the top of the
 * screen, as far from the thumb that asked for it as the phone allows. A phone
 * layout is a different layout, not the same one at a smaller width — this is
 * the second surface over the same navigation data (AppLayout's
 * `navigationGroups`), not a second copy of it.
 *
 * - It rises from the bottom, where the tab that opened it is, on the shared
 *   BottomSheet — so it drags to dismiss, leaves on the exit animation and
 *   handles Escape and focus exactly like every other sheet in the app.
 * - Destinations are tiles in a grid, not rows: fifteen of them fit in about
 *   half the screen instead of running past the fold. The minimum tile width is
 *   in rem, so a larger interface scale drops to fewer columns instead of
 *   clipping labels.
 * - The caller leaves out what the tab bar already shows. The same destination
 *   twice on one screen reads as a bug.
 *
 * `children` carries the rows that are not destinations (account, install, the
 * About section); they keep the shell's own nav-row styling.
 */
export function MobileMoreSheet({ onClose, sections, currentPage, onNavigate, header = null, children = null }) {
    const { t } = useTranslation();

    return (
        <BottomSheet onClose={onClose} title={t('nav.more')}>
            <div className="more-sheet">
                {header}
                <nav className="more-sheet__nav" aria-label={t('nav.moreSheetLabel')}>
                    {sections.map((section) => (
                        <section key={section.key} className="more-sheet__section" aria-labelledby={`more-sheet-${section.key}`}>
                            <h3 id={`more-sheet-${section.key}`} className="more-sheet__section-title">{section.title}</h3>
                            <ul className="more-sheet__grid">
                                {section.items.map((item) => {
                                    const active = currentPage === item.key;
                                    return (
                                        <li key={item.key}>
                                            <button
                                                type="button"
                                                className={`more-tile ${active ? 'is-active' : ''}`}
                                                aria-current={active ? 'page' : undefined}
                                                onClick={() => onNavigate(item.path)}
                                            >
                                                <span className="more-tile__icon">
                                                    {item.icon}
                                                    {item.badge > 0 && (
                                                        <span className="more-tile__badge">{item.badge > 9 ? '9+' : item.badge}</span>
                                                    )}
                                                </span>
                                                <span className="more-tile__label">{item.label}</span>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </section>
                    ))}
                </nav>
                {children}
            </div>
        </BottomSheet>
    );
}

export default MobileMoreSheet;
