import { useEffect, useRef } from 'react';
import { useBattles } from './useBattles';
import { useTranslation } from './useTranslation';
import { battleAttentionNotice } from '../utils/battle';

/**
 * Native browser Notification popups for battles — deliberately scoped to
 * "while this tab is open": no service worker, no push subscription, no
 * server round-trip. `useBattles()` already holds a live Firestore listener
 * bound app-wide from `AppLayout`, so this just watches its output and fires
 * a popup the moment a battle *transitions* into needing the viewer's
 * attention (a fresh challenge, an unsubmitted team, or a move now owed).
 *
 * This is a separate channel from the "your turn" email in
 * `api/lib/battleNotify.js` — that one reaches an opponent who isn't in the
 * app at all; this one is for whoever has it open right now but is looking at
 * something else.
 */

const PREFERENCE_KEY = 'ptb:browserNotifications';
const NOTIFICATION_ICON = `${import.meta.env.BASE_URL}apple-touch-icon.png`;

export const isBrowserNotificationSupported = () => typeof window !== 'undefined' && 'Notification' in window;

export const getBrowserNotificationPreference = () => {
    try {
        return localStorage.getItem(PREFERENCE_KEY) === '1';
    } catch (_) {
        return false;
    }
};

export const setBrowserNotificationPreference = (enabled) => {
    try {
        localStorage.setItem(PREFERENCE_KEY, enabled ? '1' : '0');
    } catch (_) { /* a preference is not worth throwing over, as everywhere else here */ }
};

export function useBattleNotifications() {
    const { t } = useTranslation();
    const { battles } = useBattles();

    // Which battles already needed attention as of the last snapshot. Only a
    // battleId moving from absent to present here fires a popup — otherwise a
    // battle that's been sitting unanswered would re-notify on every unrelated
    // re-render, and the very first snapshot after login would burst-fire one
    // per already-pending battle instead of only new ones.
    const previouslyWaiting = useRef(new Set());
    const isFirstRun = useRef(true);

    useEffect(() => {
        const nextWaiting = new Set();
        const fresh = [];

        for (const { battle, view } of battles) {
            const notice = battleAttentionNotice(view);
            if (!notice) continue;
            nextWaiting.add(battle.id);
            if (!isFirstRun.current && !previouslyWaiting.current.has(battle.id)) {
                fresh.push({ battleId: battle.id, notice });
            }
        }

        previouslyWaiting.current = nextWaiting;
        isFirstRun.current = false;

        if (fresh.length === 0) return;
        if (!isBrowserNotificationSupported() || !getBrowserNotificationPreference()) return;
        if (Notification.permission !== 'granted') return;

        for (const { battleId, notice } of fresh) {
            try {
                // `notice.params.name` is null for an opponent with no display
                // name — never let that interpolate the literal word "null".
                const params = { ...notice.params, name: notice.params.name || t('friends.unknownTrainer') };
                const popup = new Notification(t(notice.titleKey, params), {
                    body: t(notice.bodyKey, params),
                    icon: NOTIFICATION_ICON,
                    badge: NOTIFICATION_ICON,
                    tag: `battle-${battleId}`,
                });
                popup.onclick = () => {
                    window.focus();
                    window.location.hash = `#/battles/${battleId}`;
                    popup.close();
                };
            } catch (_) {
                // A handful of browsers (notably iOS Safari outside a PWA) expose
                // `Notification` but throw on construction — never let that take
                // the app down with it.
            }
        }
    }, [battles, t]);
}
