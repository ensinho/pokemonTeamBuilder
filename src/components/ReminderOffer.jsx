import React from 'react';
import { Bell } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { useReminderOffer } from '../hooks/useReminderOffer';
import '../styles/reminder-offer.css';

/**
 * Asked once, after a win: "want a nudge tomorrow?" (hooks/useReminderOffer).
 * `variant="chip"` is the Champion Challenge's console-bar form; the default
 * is a quiet row inside a result card.
 */
export function ReminderOffer({ topic, active, variant = 'card' }) {
    const { t } = useTranslation();
    const { visible, accept, dismiss } = useReminderOffer(topic, active);
    if (!visible) return null;

    if (variant === 'chip') {
        return (
            <button type="button" className="ds-chip is-button" onClick={accept}>
                <Bell className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                {t('reminderOffer.chip')}
            </button>
        );
    }

    return (
        <div className="reminder-offer" role="group" aria-label={t('reminderOffer.chip')}>
            <span className="reminder-offer__icon" aria-hidden="true"><Bell /></span>
            <p className="reminder-offer__text">{t(`reminderOffer.${topic}`)}</p>
            <div className="reminder-offer__actions">
                <button type="button" className="btn btn-primary btn-sm" onClick={accept}>{t('reminderOffer.accept')}</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={dismiss}>{t('reminderOffer.dismiss')}</button>
            </div>
        </div>
    );
}
