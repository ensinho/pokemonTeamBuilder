import React from 'react';
import { Coffee } from 'lucide-react';
import { SUPPORT_URL } from '../../constants/support';
import { Mascot } from '../Mascot';

/**
 * The one ask in the forum (2026-11-10, Enzo): inside the Feedback room, where
 * trainers already come to say what the app should be — and nowhere else in
 * the feed. A fill, not a box; one action, secondary, because "Criar post" is
 * the view's primary.
 */
export function ForumSupportCard({ t }) {
    return (
        <aside className="forum-support" aria-labelledby="forum-support-title">
            <Mascot size="sm" mood="animado" />
            <div className="forum-support__body">
                <h2 id="forum-support-title" className="forum-support__title">{t('forum.support.title')}</h2>
                <p className="forum-support__text">{t('forum.support.text')}</p>
            </div>
            <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm forum-support__cta">
                <Coffee aria-hidden="true" />
                {t('forum.support.cta')}
            </a>
        </aside>
    );
}
