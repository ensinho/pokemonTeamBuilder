import React, { useState } from 'react';
import { Type } from 'lucide-react';
import { ShellNavGroup } from './ShellNavGroup';
import { FooterFeedback } from './FooterFeedback';
import { TextSizeControl } from './TextSizeControl';
import { GithubIcon, LinkedinIcon, StarsIcon } from './icons';
import { PATCH_NOTES_VERSION } from '../constants/theme';
import { useTranslation } from '../hooks/useTranslation';

/**
 * The drawer's "About" section — phones only, where the site footer is hidden.
 *
 * It began as the footer's own markup dropped into the drawer: wrapping pills, a
 * bordered stepper and a loose credit line, which read as a web page footer
 * squeezed into a navigation column (Enzo, iPhone, 2026-09-10). Now it is one
 * more section of the rail, built from the rail's parts: a foldable
 * ShellNavGroup, rows with an icon column and a label, and trailing values —
 * like count, version, text size — on the right edge, the way a settings list
 * shows them. Folded by default, like the other sections, so the drawer opens
 * on navigation rather than on credits.
 *
 * Its open state is local on purpose. The rail's shared `openNavGroups` is
 * persisted per user, not per breakpoint, and capped at two: an About section
 * opened on a phone would silently hold one of the desktop rail's two slots
 * while not even rendering there.
 */
export function DrawerAboutSection({ onOpenPatchNotes, db, userId, userEmail, displayName, showToast }) {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);

    return (
        <ShellNavGroup
            title={t('nav.about')}
            railCollapsed={false}
            isOpen={isOpen}
            hasActiveItem={false}
            onToggle={() => setIsOpen((open) => !open)}
            panelId="app-shell-nav-about"
        >
            <FooterFeedback
                variant="drawer"
                db={db}
                userId={userId}
                userEmail={userEmail}
                displayName={displayName}
                showToast={showToast}
            />
            <li>
                <button type="button" onClick={onOpenPatchNotes} className="app-shell__nav-link">
                    <span className="app-shell__nav-icon" aria-hidden="true"><StarsIcon /></span>
                    <span className="app-shell__nav-text">{t('accountMenu.patchNotesLabel')}</span>
                    <span className="app-shell__nav-trailing app-shell__nav-trailing--mono">v{PATCH_NOTES_VERSION}</span>
                </button>
            </li>
            <li>
                {/* Not a button: the row only labels the stepper, which holds
                    the three real controls. The short label is deliberate —
                    "Tamanho do texto" wrapped to two lines beside the stepper in
                    a 248px row; the T glyph and "A 100% A" carry the rest. */}
                <div className="app-shell__nav-link app-shell__nav-link--static">
                    <span className="app-shell__nav-icon" aria-hidden="true"><Type /></span>
                    <span className="app-shell__nav-text">{t('nav.textSizeShort')}</span>
                    <span className="app-shell__nav-trailing"><TextSizeControl variant="inline" /></span>
                </div>
            </li>
            <li className="app-shell__nav-credit">
                <span>
                    {t('layout.developedBy')}{' '}
                    <a href="https://github.com/ensinho" target="_blank" rel="noopener noreferrer">Enzo Esmeraldo</a>
                </span>
                <span className="app-shell__nav-credit-links">
                    <a href="https://github.com/ensinho/pokemonTeamBuilder" target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="touch-target"><GithubIcon /></a>
                    <a href="https://www.linkedin.com/in/enzoesmeraldo/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="touch-target"><LinkedinIcon /></a>
                </span>
            </li>
        </ShellNavGroup>
    );
}

export default DrawerAboutSection;
