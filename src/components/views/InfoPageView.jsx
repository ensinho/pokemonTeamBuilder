import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import '../../styles/entity-detail-view.css';
import '../../styles/guide-view.css';

import { useTranslation } from '../../hooks/useTranslation';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { sitePageContent } from '../../content/sitePages';
import { SITE_PAGE_PATHS } from '../../utils/seoPages';
import { dayLabel } from '../../utils/dataNotes';
import { Switch } from '../Switch';
import { useAnalyticsConsent } from '../../hooks/useAnalyticsConsent';

const PATH_OF = Object.fromEntries(Object.entries(SITE_PAGE_PATHS).map(([path, key]) => [key, path]));

/**
 * About, How it works, Privacy and Terms (2026-10-30) — one view, the text in
 * content/sitePages.js, drawn like a guide (the guide's reading column and
 * CSS). api/_lib/seoSnapshot.js writes the same text into the page's HTML.
 */
export function InfoPageView({ pageKey }) {
    const { t, language } = useTranslation();
    const path = PATH_OF[pageKey];
    const page = sitePageContent(pageKey, language);
    useDocumentMeta({ path });

    const others = Object.entries(SITE_PAGE_PATHS).filter(([, key]) => key !== pageKey);

    return (
        <div className="edv guide-view guide-view--article">
            <header className="edv-header">
                <span className="edv-kicker">
                    <span>{t('sitePages.kicker')}</span>
                    <span aria-hidden="true">·</span>
                    <span>{t('sitePages.updated', { date: dayLabel(page.updated, language) })}</span>
                </span>
                <h1 className="edv-title">{t(`seo.${pageKey}.title`)}</h1>
                <p className="edv-lead">{page.lede}</p>
            </header>

            <article className="edv-section guide-article">
                {page.sections.map((section) => (
                    <section key={section.heading} className="guide-section">
                        <h2 className="guide-section__title">{section.heading}</h2>
                        {(section.paragraphs || []).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                        {section.steps?.length > 0 && (
                            <ol className="guide-steps">
                                {section.steps.map((step) => <li key={step}>{step}</li>)}
                            </ol>
                        )}
                        {section.consent && <ConsentSwitch />}
                        {section.links?.length > 0 && (
                            <div className="guide-links">
                                {section.links.map((l) => (l.href ? (
                                    <a
                                        key={l.href}
                                        href={l.href}
                                        className="btn btn-outline btn-sm"
                                        {...(l.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                                    >
                                        {l.label}
                                        <ArrowUpRight aria-hidden="true" />
                                    </a>
                                ) : (
                                    <Link key={l.to} to={l.to} className="btn btn-outline btn-sm">
                                        {l.label}
                                        <ArrowRight aria-hidden="true" />
                                    </Link>
                                )))}
                            </div>
                        )}
                    </section>
                ))}
            </article>

            <nav className="edv-section" aria-labelledby="site-pages-more">
                <h2 id="site-pages-more" className="edv-section__title">{t('sitePages.footerLabel')}</h2>
                <ul className="guide-more">
                    {others.map(([to, key]) => (
                        <li key={key}>
                            <Link to={to} className="guide-more__link">
                                {t(`seo.${key}.title`)}
                                <ArrowRight aria-hidden="true" />
                            </Link>
                        </li>
                    ))}
                </ul>
            </nav>
        </div>
    );
}

/** The Privacy page's way to change the cookie answer (ConsentBanner asks first). */
function ConsentSwitch() {
    const { t } = useTranslation();
    const [consent, setConsent] = useAnalyticsConsent();
    return (
        <Switch
            variant="row"
            checked={consent === 'granted'}
            onChange={(on) => setConsent(on ? 'granted' : 'denied')}
            label={t('consent.switchLabel')}
            description={consent === null ? t('consent.switchUnanswered') : t('consent.switchDescription')}
            className="guide-consent"
        />
    );
}

export default InfoPageView;
