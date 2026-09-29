import { useEffect } from 'react';
import { useOfflinePokedexStore } from '../store/useOfflinePokedexStore';

// Boot has priority: the download waits until the app has settled, then runs in
// idle time. It pauses when the connection drops and resumes when it returns.
const START_DELAY_MS = 8000;

export function useOfflinePokedexSync() {
    useEffect(() => {
        if (typeof window === 'undefined') return undefined;
        const { sync, pause } = useOfflinePokedexStore.getState();

        let idleHandle = null;
        const startTimer = window.setTimeout(() => {
            if ('requestIdleCallback' in window) idleHandle = window.requestIdleCallback(() => sync(), { timeout: 10000 });
            else sync();
        }, START_DELAY_MS);

        const onOnline = () => sync();
        const onOffline = () => pause();
        window.addEventListener('online', onOnline);
        window.addEventListener('offline', onOffline);

        return () => {
            window.clearTimeout(startTimer);
            if (idleHandle !== null) window.cancelIdleCallback?.(idleHandle);
            window.removeEventListener('online', onOnline);
            window.removeEventListener('offline', onOffline);
            pause();
        };
    }, []);
}
