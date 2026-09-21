import { useCallback, useEffect, useState } from 'react';

import { useAuthStore } from '../store/useAuthStore';
import { useLanguageStore } from '../store/useLanguageStore';
import { useToastStore } from '../store/useToastStore';
import { useTranslation } from './useTranslation';
import {
    disablePush,
    enablePush,
    getDailyPuzzleEnabled,
    getNotificationsEnabled,
    getPermission,
    isPushSupported,
    needsIosInstall,
    setDailyPuzzleEnabled,
} from '../services/pushNotifications';

/**
 * The one place that turns notifications on and off, for every surface that
 * offers it (the battle list's pill, the profile card).
 *
 * The permission prompt only ever happens inside `toggle`, which is only ever
 * called from a click. That is not a style choice: iOS refuses a request that
 * doesn't come from a user gesture, and the previous code asked on mount — so
 * on the platform the bug report came from, it could never have worked.
 */
export function useNotificationSettings() {
    const { t } = useTranslation();
    const showToast = useToastStore((state) => state.showToast);
    const userId = useAuthStore((state) => state.userId);
    const language = useLanguageStore((state) => state.language);

    const [permission, setPermission] = useState(() => getPermission());
    const [enabled, setEnabled] = useState(() => getNotificationsEnabled() && getPermission() === 'granted');
    const [dailyEnabled, setDaily] = useState(() => getDailyPuzzleEnabled());
    const [busy, setBusy] = useState(false);

    // Permission can be revoked from the browser's own UI while the app is
    // open; the pill would otherwise keep claiming notifications are on.
    useEffect(() => {
        const refresh = () => {
            const current = getPermission();
            setPermission(current);
            setEnabled(getNotificationsEnabled() && current === 'granted');
        };
        document.addEventListener('visibilitychange', refresh);
        return () => document.removeEventListener('visibilitychange', refresh);
    }, []);

    const toggle = useCallback(async () => {
        if (busy) return;

        if (needsIosInstall()) {
            showToast(t('battle.notifyIosInstall'), 'info', { duration: 9000 });
            return;
        }
        if (!isPushSupported()) {
            showToast(t('battle.notifyUnsupported'), 'warning');
            return;
        }

        setBusy(true);
        try {
            if (enabled) {
                await disablePush({ userId });
                setEnabled(false);
                showToast(t('battle.notifyStatusDisabled'), 'info');
                return;
            }

            const result = await enablePush({ userId, lang: language });
            setPermission(getPermission());

            if (!result.ok) {
                if (result.reason === 'ios-install') showToast(t('battle.notifyIosInstall'), 'info', { duration: 9000 });
                else if (result.reason === 'unsupported') showToast(t('battle.notifyUnsupported'), 'warning');
                else showToast(t('battle.notifyBlocked'), 'warning');
                setEnabled(false);
                return;
            }

            setEnabled(true);
            showToast(
                t('battle.notifyStatusEnabled'),
                'success',
                // `no-key` means permission was granted but this deployment has
                // no VAPID key, so only the "app is open" half works. Worth
                // saying out loud rather than quietly half-working.
                result.reason === 'no-key' ? { description: t('battle.notifyForegroundOnly') } : undefined,
            );
        } finally {
            setBusy(false);
        }
    }, [busy, enabled, language, showToast, t, userId]);

    const toggleDailyPuzzle = useCallback(async (next) => {
        setDaily(next);
        await setDailyPuzzleEnabled(next, { userId });
    }, [userId]);

    return {
        supported: isPushSupported(),
        iosInstallNeeded: needsIosInstall(),
        permission,
        enabled,
        busy,
        dailyEnabled,
        toggle,
        toggleDailyPuzzle,
    };
}
