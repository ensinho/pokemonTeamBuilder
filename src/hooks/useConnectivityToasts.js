import { useEffect } from 'react';
import { toast } from '../store/useToastStore';
import { t } from '../utils/translate';

// The Team Builder works offline — the shell and its data are precached and
// Firestore queues writes — but a user who can't tell they are offline can't
// tell that "saved" means "saved on this device" either. One toast when the
// connection drops (or the app opens without one), one when it returns.
export function useConnectivityToasts() {
    useEffect(() => {
        if (typeof window === 'undefined') return undefined;

        const announceOffline = () => toast.info(t('toast.offline'), {
            description: t('toast.offlineDesc'),
            duration: 6000,
        });
        const announceOnline = () => toast.success(t('toast.online'));

        if (navigator.onLine === false) announceOffline();

        window.addEventListener('offline', announceOffline);
        window.addEventListener('online', announceOnline);
        return () => {
            window.removeEventListener('offline', announceOffline);
            window.removeEventListener('online', announceOnline);
        };
    }, []);
}
