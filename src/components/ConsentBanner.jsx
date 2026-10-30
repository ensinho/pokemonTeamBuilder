import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/consent-banner.css';

import { useTranslation } from '../hooks/useTranslation';
import { useAnalyticsConsent } from '../hooks/useAnalyticsConsent';
import { analyticsAvailable } from '../services/analytics';

/**
 * The analytics cookie question (2026-10-30, LGPD). Asked once per device,
 * before Google Analytics loads (services/analytics.js waits for 'granted').
 * Refuse and Accept are equal buttons side by side — a refusal must be as
 * easy as an acceptance — and the page stays usable while it is up: it is a
 * card at the bottom, not a wall. Never shown where analytics cannot run
 * (no measurement id, a crawler). The Privacy page's switch changes the
 * answer later.
 */
export function ConsentBanner() {
    const { t } = useTranslation();
    const [consent, setConsent] = useAnalyticsConsent();

    if (consent !== null || !analyticsAvailable()) return null;

    return (
        <section className="consent-banner" role="region" aria-labelledby="consent-banner-title">
            <div className="consent-banner__copy">
                <h2 id="consent-banner-title" className="consent-banner__title">{t('consent.title')}</h2>
                <p className="consent-banner__text">
                    {t('consent.text')}{' '}
                    <Link to="/privacy" className="consent-banner__link">{t('consent.privacy')}</Link>
                </p>
            </div>
            <div className="consent-banner__actions">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setConsent('denied')}>
                    {t('consent.decline')}
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setConsent('granted')}>
                    {t('consent.accept')}
                </button>
            </div>
        </section>
    );
}

export default ConsentBanner;
