import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { splitLocalePath } from '../utils/localePath';
import { deployBase } from '../services/localeHistory';

/**
 * Route a tap on a system notification.
 *
 * `public/push-sw.js` focuses an already-open tab and posts it the target
 * instead of navigating it, because a hard navigation would tear down every
 * live Firestore listener the session holds. This is the other end of that
 * message. It also replaces the old in-page handler, which set
 * `window.location.hash` — meaningless since the router moved to real paths
 * (CLAUDE.md, 2026-07-01), so tapping a battle notification did nothing at all.
 */
function useNotificationClickRouting() {
    const navigate = useNavigate();

    useEffect(() => {
        if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return undefined;

        const onMessage = (event) => {
            if (event.data?.type !== 'ptb:navigate' || !event.data.url) return;
            try {
                const target = new URL(event.data.url, window.location.origin);
                if (target.origin !== window.location.origin) return;
                // The router's basename (deploy base + language prefix) is
                // trimmed back off, leaving the app path `navigate` expects.
                const { appPath } = splitLocalePath(target.pathname, deployBase());
                navigate(`${appPath}${target.search}`);
            } catch (_) {
                // A malformed url is not worth a crash — the tap simply focuses.
            }
        };

        navigator.serviceWorker.addEventListener('message', onMessage);
        return () => navigator.serviceWorker.removeEventListener('message', onMessage);
    }, [navigate]);
}

/**
 * The shell's notification wiring. PokéRoom's room invites — the only thing
 * the `notifications` collection ever carried — left with PokéRoom on
 * 2026-10-17, so what remains is routing a tap on a system notification.
 */
export function useNotifications() {
    useNotificationClickRouting();
}
