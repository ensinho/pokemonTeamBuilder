import React from 'react';
import { ChevronDownIcon } from './icons';

/**
 * One labelled section of the sidebar navigation.
 *
 * The four destinations that carry the app are pinned above these, unlabelled
 * and unfoldable. What is left is the long tail, and it is an accordion: at most
 * one section is open at a time (see `toggleNavGroup` in AppLayout), which is
 * what keeps the rail a fixed short shape instead of growing to whatever the
 * user last left open.
 *
 * Two shapes:
 *
 * - Icon rail (`railCollapsed`): labels are hidden by the shell's own rules and
 *   there is nothing left to click, so the section renders as a plain always-open
 *   list of icons.
 * - Expanded sidebar: the header is a *quiet label* first and a control second —
 *   smaller and shorter than a nav row, muted, with the chevron on the trailing
 *   edge. It deliberately does not mimic a nav item: a header shaped like a
 *   destination competes with the destinations under it, and with five of them
 *   the rail read as ten things to click rather than four plus some organisation.
 *   A folded section holding the current page keeps a dot, so "where am I"
 *   survives the fold.
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
