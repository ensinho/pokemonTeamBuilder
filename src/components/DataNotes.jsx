import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import '../styles/guide-view.css';
import { useTranslation } from '../hooks/useTranslation';

/**
 * "Where does this data come from?" under Best teams and Meta & usage
 * (2026-10-30). The paragraphs come from utils/dataNotes.js, which the
 * prerender reads too, so the page and its HTML state the same method and
 * numbers. Ends at the guide on reading tournament data.
 */
export function DataNotes({ paragraphs, className = '' }) {
    const { t } = useTranslation();
    if (!paragraphs?.length) return null;
    return (
        <section className={`data-notes ${className}`} aria-labelledby="data-notes-title">
            <h2 id="data-notes-title" className="data-notes__title">{t('dataNotes.heading')}</h2>
            {paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            <Link to="/guides/team-from-tournament-data" className="data-notes__link">
                {t('dataNotes.guideLink')}
                <ArrowRight aria-hidden="true" />
            </Link>
        </section>
    );
}
