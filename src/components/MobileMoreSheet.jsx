import React from 'react';
import { BottomSheet } from './BottomSheet';
import { useTranslation } from '../hooks/useTranslation';
import '../styles/more-sheet.css';
import { navHue } from '../utils/navHue';

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
 * - Destinations are cards in a grid, not rows. Since 2026-11-15 every card is
 *   the same object (Enzo: "simétrico… cards padronizados"): a toned icon tile
 *   over its name, three to a row, so each section is one even row of three.
 *   A section of two (a persona's dock took one) is two columns, never a gap.
 * - A `hero` section is the day's games: two equal wide cards, the icon beside
 *   the name and a `hint` line saying what it is.
 * - `accountAfter` names the section the `header` (the account) follows: the
 *   games first — what people open the sheet for — then who you are.
 * - A card shows `shortLabel` when the item has one. The full name stays its
 *   accessible name.
 * - The caller leaves out what the tab bar already shows. The same destination
 *   twice on one screen reads as a bug (the Champion is Enzo's one exception).
 *
 * `children` carries the rows that are not destinations (support, install,
 * the About section); they keep the shell's own nav-row styling.
 */
export function MobileMoreSheet({ onClose, sections, currentPage, onNavigate, onIntent, header = null, accountAfter = null, children = null }) {
    const { t } = useTranslation();
    const headerIndex = accountAfter ? sections.findIndex((section) => section.key === accountAfter) : -1;

    const renderSection = (section) => {
        const columns = section.hero ? 2 : Math.min(3, section.items.length);
        return (
            <section
                key={section.key}
                className="more-sheet__section"
                aria-labelledby={section.title ? `more-sheet-${section.key}` : undefined}
            >
                {section.title && (
                    <h3 id={`more-sheet-${section.key}`} className="more-sheet__section-title">{section.title}</h3>
                )}
                <ul
                    className={`more-sheet__grid ${section.hero ? 'more-sheet__grid--hero' : ''}`}
                    style={{ '--more-cols': columns }}
                >
                    {section.items.map((item) => {
                        const active = currentPage === item.key || Boolean(item.members?.includes(currentPage));
                        const shortened = item.shortLabel && item.shortLabel !== item.label;
                        return (
                            <li key={item.key}>
                                <button
                                    type="button"
                                    className={`more-tile ${section.hero ? 'more-tile--hero' : ''} ${active ? 'is-active' : ''}`}
                                    aria-current={active ? 'page' : undefined}
                                    aria-label={shortened ? item.label : undefined}
                                    onPointerDown={() => onIntent?.(item.prefetchKey || item.key)}
                                    onClick={() => onNavigate(item.path)}
                                    // --nav-hue: the destination's type tone, as in the
                                    // rail and the dock (utils/navHue.js).
                                    style={{ '--nav-hue': navHue(item.key) }}
                                >
                                    <span className="more-tile__icon">
                                        {item.icon}
                                        {item.badge > 0 && (
                                            <span className="more-tile__badge">{item.badge > 9 ? '9+' : item.badge}</span>
                                        )}
                                    </span>
                                    {section.hero ? (
                                        <span className="more-tile__text">
                                            <span className="more-tile__label">{item.label}</span>
                                            {item.hint && <span className="more-tile__hint">{item.hint}</span>}
                                        </span>
                                    ) : (
                                        <span className="more-tile__label">{shortened ? item.shortLabel : item.label}</span>
                                    )}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </section>
        );
    };

    return (
        <BottomSheet onClose={onClose} title={t('nav.more')}>
            <div className="more-sheet">
                {headerIndex === -1 && header}
                <nav className="more-sheet__nav" aria-label={t('nav.moreSheetLabel')}>
                    {sections.map((section, index) => (
                        <React.Fragment key={section.key}>
                            {renderSection(section)}
                            {index === headerIndex && header}
                        </React.Fragment>
                    ))}
                </nav>
                {children}
            </div>
        </BottomSheet>
    );
}

export default MobileMoreSheet;
