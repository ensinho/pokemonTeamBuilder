import { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { useBattles } from './useBattles';
import { useTranslation } from './useTranslation';
import { useAuthStore } from '../store/useAuthStore';
import { useLanguageStore } from '../store/useLanguageStore';
import { useToastStore } from '../store/useToastStore';
import { battleAttentionNotice } from '../utils/battle';
import { digestAttention, digestUrl } from '../utils/notificationDigest';
import {
    getNotificationsEnabled, getPermission, hasPushSubscription, isPushSupported, syncSubscription,
} from '../services/pushNotifications';

/**
 * Battle alerts for a tab that is *open* — the live half of the notification
 * story. The other half, the one that reaches a closed app, is Web Push
 * (`src/services/pushNotifications.js` + `api/lib/webPush.js`); this hook and
 * that pipeline deliberately share the `ptb-battles` tag so a push that lands
 * while the app is in the background replaces this one instead of stacking.
 *
 * Three rules, each of them a bug that happened:
 *
 *  - **Nothing fires until the listener has actually answered.** The effect ran
 *    once with the store's initial `battles: []`, marked itself seeded, and
 *    then treated the first real snapshot as "all of these just arrived" — one
 *    banner per pending battle, every single app open. The baseline is now
 *    seeded from the first *loaded* snapshot (`hasLoadedBattles`).
 *  - **A visible tab gets a toast, not an OS banner.** An OS notification for
 *    something the user is looking at is pure interruption.
 *  - **Several at once become one.** See `digestAttention`.
 *
 * Permission is never requested from here: it belongs to a user gesture
 * (`NotificationToggle`), which is also the only thing iOS accepts.
 */

const NOTIFICATION_TAG = 'ptb-battles';
const ICON = `${import.meta.env.BASE_URL}apple-touch-icon.png`;

/** Show an OS-level notification, preferring the worker so clicks survive. */
const showSystemNotification = async ({ title, body, url }) => {
    const options = {
        body,
        icon: ICON,
        badge: ICON,
        tag: NOTIFICATION_TAG,
        renotify: true,
        data: { url, count: 1 },
    };
    try {
        // Subscribed devices get this from the server instead — showing both
        // means two buzzes for one event.
        if (await hasPushSubscription()) return;

        const registration = await navigator.serviceWorker?.getRegistration?.();
        if (registration?.showNotification) {
            // iOS only supports this path (the `Notification` constructor
            // throws there), and it is also the only one whose click is handled
            // by `public/push-sw.js` — so a tap still routes after the tab that
            // created it is gone.
            await registration.showNotification(title, options);
            return;
        }
        // eslint-disable-next-line no-new
        new Notification(title, options);
    } catch (_) {
        // Never let a notification take the app down with it.
    }
};

export function useBattleNotifications() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { battles, hasLoadedBattles } = useBattles();
    const userId = useAuthStore((state) => state.userId);
    const language = useLanguageStore((state) => state.language);
    const showToast = useToastStore((state) => state.showToast);

    // Endpoints rotate silently; re-mirroring what the browser already holds
    // keeps the server able to reach this device. Never prompts.
    useEffect(() => {
        if (!userId) return;
        syncSubscription({ userId, lang: language }).catch(() => {});
    }, [userId, language]);

    // Which battles already needed attention as of the last snapshot. Only a
    // battleId moving from absent to present here is worth announcing.
    const previouslyWaiting = useRef(new Set());
    const seeded = useRef(false);

    useEffect(() => {
        // A different trainer is a different baseline — never inherit one.
        seeded.current = false;
        previouslyWaiting.current = new Set();
    }, [userId]);

    const announce = useCallback((digest) => {
        const url = digestUrl(digest);
        const title = digest.kind === 'group'
            ? t('battle.notifyGroupTitle', { count: digest.count })
            : t(digest.notice.titleKey, {
                ...digest.notice.params,
                name: digest.notice.params.name || t('friends.unknownTrainer'),
            });
        const body = digest.kind === 'group'
            ? t('battle.notifyGroupBody')
            : t(digest.notice.bodyKey, {
                ...digest.notice.params,
                name: digest.notice.params.name || t('friends.unknownTrainer'),
            });

        // Looking at the app already? Then this is a toast, not an interruption.
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
            showToast(title, 'info', {
                description: body,
                duration: 10000,
                actions: [{ label: t('battle.notifyOpen'), onClick: () => navigate(url) }],
            });
            return;
        }

        if (!isPushSupported() || !getNotificationsEnabled()) return;
        if (getPermission() !== 'granted') return;
        showSystemNotification({ title, body, url });
    }, [navigate, showToast, t]);

    useEffect(() => {
        if (!hasLoadedBattles) return;

        const nextWaiting = new Set();
        const fresh = [];

        for (const { battle, view } of battles) {
            const notice = battleAttentionNotice(view);
            if (!notice) continue;
            nextWaiting.add(battle.id);
            if (seeded.current && !previouslyWaiting.current.has(battle.id)) {
                fresh.push({ battleId: battle.id, notice });
            }
        }

        previouslyWaiting.current = nextWaiting;
        if (!seeded.current) {
            // First answered snapshot: everything in it is history, not news.
            seeded.current = true;
            return;
        }

        const digest = digestAttention(fresh);
        if (digest) announce(digest);
    }, [battles, hasLoadedBattles, announce]);
}
