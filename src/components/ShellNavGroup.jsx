import React from 'react';
import { ChevronDownIcon } from './icons';

/**
 * One labelled section of the sidebar navigation.
 *
 * Nineteen links across five sections overflow the rail on a short laptop
 * screen, so each section folds away. Two shapes:
 *
 * - Icon rail (`railCollapsed`): labels are hidden by the shell's own rules and
 *   there is nothing left to click, so the section renders as it always did —
 *   plain label, always-open list.
 * - Expanded sidebar: the label becomes the toggle. A folded section that holds
 *   the current page keeps a dot on its header, so "where am I" survives the fold.
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
                <p className="app-shell__nav-group-label is-hidden">{title}</p>
                <ul className="app-shell__nav-group-list">{children}</ul>
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
                <ul className="app-shell__nav-group-list">{children}</ul>
            </div>
        </li>
    );
}
