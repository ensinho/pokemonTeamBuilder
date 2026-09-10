import React from 'react';
import { ChevronDownIcon } from './icons';

/**
 * One labelled section of the sidebar navigation, foldable.
 *
 * The four destinations that carry the app are pinned above these, unlabelled
 * and unfoldable. What is left is the long tail, and it folds — but **at most
 * two sections are open at a time** (`MAX_OPEN_NAV_GROUPS` in AppLayout).
 *
 * That cap is the whole design. Independent folds let the rail grow to whatever
 * the user last left open, which in practice was everything plus a scrollbar. A
 * strict accordion — one section, the previous shape — went the other way: with
 * every section shut the rail was four chevron rows over 400px of nothing, so
 * the tail was invisible *and* two clicks away. Two open is the state that keeps
 * both failures out of reach, and it matches how the rail actually gets used: a
 * section you live in, plus one you are browsing.
 *
 * Two shapes:
 *
 * - Icon rail (`railCollapsed`): labels are hidden by the shell's own rules, so
 *   a header here would be a control with nothing in it. The list renders bare
 *   and always open, carrying its name on `aria-label` for screen readers;
 *   whitespace separates the sections.
 * - Expanded sidebar: the header is a *quiet label* first and a control second.
 *   It keeps the type of the plain label — 12px, muted, 500 — and is shorter
 *   than a nav row, so it reads as organisation rather than as a fifth
 *   destination; only the chevron says it folds, and only at half strength
 *   until hover. A folded section holding the current page keeps a dot, so
 *   "where am I" survives the fold.
 */
export function ShellNavGroup({
    title,
    railCollapsed = false,
    isOpen = true,
    hasActiveItem = false,
    onToggle,
    panelId,
    children,
}) {
    if (railCollapsed) {
        return (
            <li className="app-shell__nav-group">
                <ul className="app-shell__nav-group-list" aria-label={title}>{children}</ul>
            </li>
        );
    }

    return (
        <li className="app-shell__nav-group">
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={isOpen}
                aria-controls={panelId}
                className={`app-shell__nav-group-toggle ${isOpen ? 'is-open' : ''}`}
            >
                <span className="app-shell__nav-group-label">{title}</span>
                {!isOpen && hasActiveItem && <span className="app-shell__nav-group-dot" aria-hidden="true" />}
                <ChevronDownIcon className="app-shell__nav-group-chevron" />
            </button>

            <div id={panelId} className={`app-shell__nav-group-panel ${isOpen ? 'is-open' : ''}`}>
                <ul className="app-shell__nav-group-list" aria-label={title}>{children}</ul>
            </div>
        </li>
    );
}
