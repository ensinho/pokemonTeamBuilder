import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import '../../styles/entity-detail-view.css';
import '../../styles/guide-view.css';

import { useTranslation } from '../../hooks/useTranslation';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { GUIDE_INDEX, guideMeta } from '../../content/guideIndex';
import { guideContent } from '../../content/guides';
import { dayLabel } from '../../utils/dataNotes';
import { EmptyState } from '../EmptyState';

/**
 * The guides (2026-10-30): `/guides` lists them, `/guides/:slug` is one. The
 * text is content/guides.js — written for the questions players ask search
 * engines and AI assistants, every answer ending at the tool that does it —
 * and api/_lib/seoSnapshot.js writes the same text (and the FAQ as FAQPage
 * JSON-LD) into the page's HTML.
 */

export function GuidesView() {
    const { t, language } = useTranslation();
    useDocumentMeta({ path: '/guides' });

    return (
        <div className="edv guide-view">
            <header className="edv-header">
                <span className="edv-kicker">{t('guidesPage.kicker')}</span>
                <h1 className="edv-title">{t('guidesPage.title')}</h1>
                <p className="edv-lead">{t('guidesPage.lede')}</p>
            </header>
            <ul className="guide-list">
                {GUIDE_INDEX.map((g) => {
                    const meta = guideMeta(g.slug, language);
                    return (
                        <li key={g.slug}>
                            <Link to={`/guides/${g.slug}`} className="guide-card">
                                <h2 className="guide-card__title">{meta.title}</h2>
                                <p className="guide-card__text">{meta.description}</p>
                                <span className="guide-card__cta">
                                    {t('guidesPage.read')}
                                    <ArrowRight aria-hidden="true" />
                                </span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

export function GuideView() {
    const { slug } = useParams();
    const { t, language } = useTranslation();
    const meta = guideMeta(slug, language);
    const guide = guideContent(slug, language);
    useDocumentMeta({ path: `/guides/${slug}` });

    if (!meta || !guide) {
        return (
            <div className="edv guide-view">
                <EmptyState title={t('guidesPage.notFound')} />
                <Link to="/guides" className="btn btn-outline self-center">{t('guidesPage.more')}</Link>
            </div>
        );
    }

    const others = GUIDE_INDEX.filter((g) => g.slug !== slug);

    return (
        <div className="edv guide-view guide-view--article">
            <header className="edv-header">
                <span className="edv-kicker">
                    <Link to="/guides" className="guide-kicker-link">{t('guidesPage.kicker')}</Link>
                    <span aria-hidden="true">·</span>
                    <span>{t('guidesPage.updated', { date: dayLabel(meta.updated, language) })}</span>
                </span>
                <h1 className="edv-title">{meta.title}</h1>
                <p className="edv-lead">{guide.lede}</p>
            </header>

            <article className="edv-section guide-article">
                {guide.sections.map((section) => (
                    <section key={section.heading} className="guide-section">
                        <h2 className="guide-section__title">{section.heading}</h2>
                        {(section.paragraphs || []).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                        {section.steps?.length > 0 && (
                            <ol className="guide-steps">
                                {section.steps.map((step) => <li key={step}>{step}</li>)}
                            </ol>
                        )}
                        {section.links?.length > 0 && (
                            <div className="guide-links">
                                {section.links.map((l) => (
                                    <Link key={l.to + l.label} to={l.to} className="btn btn-outline btn-sm">
                                        {l.label}
                                        <ArrowRight aria-hidden="true" />
                                    </Link>
                                ))}
                            </div>
                        )}
                    </section>
                ))}
            </article>

            {guide.faq?.length > 0 && (
                <section className="edv-section guide-faq" aria-labelledby="guide-faq">
                    <h2 id="guide-faq" className="guide-section__title">{t('guidesPage.faq')}</h2>
                    {guide.faq.map((item) => (
                        <div key={item.q} className="guide-faq__item">
                            <h3 className="guide-faq__q">{item.q}</h3>
                            <p className="guide-faq__a">{item.a}</p>
                        </div>
                    ))}
                </section>
            )}

            {others.length > 0 && (
                <nav className="edv-section" aria-labelledby="guide-more">
                    <h2 id="guide-more" className="edv-section__title">{t('guidesPage.more')}</h2>
                    <ul className="guide-more">
                        {others.map((g) => (
                            <li key={g.slug}>
                                <Link to={`/guides/${g.slug}`} className="guide-more__link">
                                    {guideMeta(g.slug, language).title}
                                    <ArrowRight aria-hidden="true" />
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>
            )}
        </div>
    );
}
