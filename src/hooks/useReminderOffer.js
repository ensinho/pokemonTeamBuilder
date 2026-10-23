import { useCallback, useEffect, useState } from 'react';
import { useNotificationSettings } from './useNotificationSettings';
import { markReminderSeen, readReminderSeen, shouldOfferReminder } from '../utils/reminderOffer';
import { track } from '../services/analytics';

const storage = () => {
    try {
        return window.localStorage;
    } catch {
        return null;
    }
};

/**
 * The "remind me tomorrow" offer after a win (utils/reminderOffer.js).
 * `active` is the caller's "a win just happened here"; the hook adds whether
 * asking can still change anything. Accepting goes through the same toggle as
 * Profile → Notifications, from the click itself: iOS refuses a permission
 * prompt that no tap started.
 */
export function useReminderOffer(topic, active) {
    const settings = useNotificationSettings();
    const [seen, setSeen] = useState(() => readReminderSeen(storage()));
    const visible = Boolean(active) && shouldOfferReminder({ ...settings, seen });

    useEffect(() => {
        if (visible) track('reminder_offer_view', { topic });
    }, [visible, topic]);

    const answer = useCallback((accepted) => {
        markReminderSeen(storage());
        setSeen(true);
        track(accepted ? 'reminder_offer_accept' : 'reminder_offer_dismiss', { topic });
    }, [topic]);

    const accept = useCallback(() => {
        // Started first and synchronously: the permission prompt inside it
        // must belong to this tap.
        const pending = settings.toggle();
        answer(true);
        return pending;
    }, [settings, answer]);

    const dismiss = useCallback(() => answer(false), [answer]);

    return { visible, accept, dismiss };
}
