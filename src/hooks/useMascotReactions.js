import { useEffect } from 'react';
import { toast, useToastStore } from '../store/useToastStore';
import { useMascotStore } from '../store/useMascotStore';
import { useTranslation } from './useTranslation';

/**
 * Mounted once by the shell (2026-11-06): what happens in the app becomes the
 * mascot's reaction — a success toast is a hop, an error an "oops" — played
 * by the one mascot holding the stage, if any, and only while the trainer
 * keeps reactions on (Profile → Appearance → Mascot).
 *
 * It also says when the connection drops and when it is back: an offline PWA
 * still opens every saved team, so the message is the fact, not an alarm.
 */
export function useMascotReactions() {
    const { t } = useTranslation();

    useEffect(() => {
        let seen = new Set(useToastStore.getState().toasts.map((item) => item.id));
        return useToastStore.subscribe((state) => {
            for (const item of state.toasts) {
                if (seen.has(item.id)) continue;
                seen.add(item.id);
                if (item.severity === 'success') useMascotStore.getState().react('hop');
                else if (item.severity === 'error') useMascotStore.getState().react('oops');
            }
            if (seen.size > 100) seen = new Set(state.toasts.map((item) => item.id));
        });
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;
        let wentOffline = false;
        const onOffline = () => {
            wentOffline = true;
            toast.warning(t('mascot.offline.title'), { description: t('mascot.offline.body'), key: 'connectivity', sticky: true });
            useMascotStore.getState().react('oops');
        };
        const onOnline = () => {
            if (!wentOffline) return;
            wentOffline = false;
            toast.success(t('mascot.online'), { key: 'connectivity' });
        };
        window.addEventListener('offline', onOffline);
        window.addEventListener('online', onOnline);
        return () => {
            window.removeEventListener('offline', onOffline);
            window.removeEventListener('online', onOnline);
        };
    }, [t]);
}
