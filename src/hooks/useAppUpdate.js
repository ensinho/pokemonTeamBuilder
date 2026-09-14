import { useCallback, useEffect, useRef, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { buildSignature, documentAssetUrls, findNewAssetUrls } from '../utils/appUpdate';

// One deploy, one prompt, one reload.
//
// Why this hook exists (docs/wounds.md, 2026-09-14): the update prompt used to
// appear *twice* on every release, and the first "Recarregar agora" did nothing.
// The page is controlled by a service worker whose NavigationRoute answers every
// navigation from the precached `index.html`, so `window.location.reload()` does
// not fetch a new deploy — it re-serves the exact build the user is trying to
// leave. The only reload that lands on the new build is the one that happens
// *after* the waiting worker takes over (skipWaiting → controllerchange).
//
// So detection and application are deliberately separated:
//   - Detection has two sources (the service worker, and an HTML poll for pages
//     that have no service worker), but they share one prompt.
//   - Application has exactly one rule: never navigate while the old worker is
//     still in charge.

// Polling only runs while the tab is visible, and a visible tab also checks the
// moment it regains focus — so a minute is cheap (sw.js is a few KB) and means a
// release reaches an open tab promptly instead of whenever the browser feels like
// re-checking the worker.
const SW_UPDATE_INTERVAL_MS = 60 * 1000;
const SW_FIRST_CHECK_DELAY_MS = 8 * 1000;
// The no-service-worker fallback refetches a whole HTML document, and it is the
// rare path, so it goes easy.
const HTML_POLL_INTERVAL_MS = 5 * 60 * 1000;
const HTML_FIRST_CHECK_DELAY_MS = 30 * 1000;
// If skipWaiting never produces a controllerchange, the user is left looking at
// the old build with the prompt already dismissed. Escape hatch, not happy path.
const RELOAD_WATCHDOG_MS = 6 * 1000;
const CONTROLLER_CHANGE_TIMEOUT_MS = 3 * 1000;

const supportsServiceWorker = () => typeof navigator !== 'undefined' && 'serviceWorker' in navigator;

async function getRegistration(registrationRef) {
    if (registrationRef.current) return registrationRef.current;
    if (!supportsServiceWorker()) return null;
    try {
        return (await navigator.serviceWorker.getRegistration()) ?? null;
    } catch {
        return null;
    }
}

/**
 * Leave the current build behind when there is no waiting worker to hand over to.
 *
 * A controlling worker serves navigations from its own precache, so unregistering
 * it is what makes the next navigation reach the network. The new build registers
 * its own worker on boot, so the PWA is only briefly without one.
 */
async function hardReload(registrationRef) {
    try {
        const registration = await getRegistration(registrationRef);
        if (registration?.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            await new Promise((resolve) => {
                navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true });
                setTimeout(resolve, CONTROLLER_CHANGE_TIMEOUT_MS);
            });
        } else if (registration && navigator.serviceWorker.controller) {
            await registration.unregister();
        }
    } catch {
        // Whatever went wrong, a reload is still better than staying put.
    }
    window.location.reload();
}

export function useAppUpdate() {
    const registrationRef = useRef(null);
    const [promptOpen, setPromptOpen] = useState(false);
    // Build signatures the user declined, so "Depois" survives the next poll.
    const dismissedBuildsRef = useRef(new Set());
    const pendingBuildRef = useRef(null);

    // `useRegisterSW` captures these callbacks on the first render only (it holds
    // the registration in a `useState` initializer), which is why they touch refs
    // and nothing else.
    const {
        needRefresh: [needRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegisteredSW(_swUrl, registration) {
            registrationRef.current = registration ?? null;
        },
        onRegisterError() {
            registrationRef.current = null;
        },
    });

    // A worker is waiting: this is the good case, and the only one where the
    // prompt's button can hand over cleanly.
    useEffect(() => {
        if (needRefresh) setPromptOpen(true);
    }, [needRefresh]);

    // Ask the browser to re-fetch sw.js. A new deploy changes its bytes (the
    // precache manifest lists the hashed assets), so this installs the new worker
    // and parks it in `waiting`, which is what flips `needRefresh` above.
    useEffect(() => {
        if (!supportsServiceWorker()) return undefined;
        let cancelled = false;

        const pullServiceWorker = async () => {
            if (cancelled || document.visibilityState !== 'visible') return;
            const registration = registrationRef.current;
            if (!registration) return;
            try {
                await registration.update();
            } catch {
                // Offline, or sw.js momentarily unreachable. The next tick retries.
            }
        };

        const handleVisibility = () => {
            if (document.visibilityState === 'visible') pullServiceWorker();
        };

        const firstCheck = setTimeout(pullServiceWorker, SW_FIRST_CHECK_DELAY_MS);
        const interval = setInterval(pullServiceWorker, SW_UPDATE_INTERVAL_MS);
        document.addEventListener('visibilitychange', handleVisibility);
        window.addEventListener('online', pullServiceWorker);

        return () => {
            cancelled = true;
            clearTimeout(firstCheck);
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibility);
            window.removeEventListener('online', pullServiceWorker);
        };
    }, []);

    // Fallback for pages with no service worker at all. It stays quiet whenever
    // one exists: two detectors racing for the same prompt is what produced the
    // broken first click in the first place.
    useEffect(() => {
        let cancelled = false;

        const pollHtml = async () => {
            if (cancelled || document.visibilityState !== 'visible') return;
            if (await getRegistration(registrationRef)) return;
            if (cancelled) return;
            try {
                const base = import.meta.env.BASE_URL || '/';
                const response = await fetch(
                    `${window.location.origin}${base}index.html?t=${Date.now()}`,
                    { cache: 'no-store' },
                );
                if (!response.ok || cancelled) return;
                const newAssets = findNewAssetUrls(await response.text(), documentAssetUrls());
                if (!newAssets.length || cancelled) return;

                const signature = buildSignature(newAssets);
                if (dismissedBuildsRef.current.has(signature)) return;
                pendingBuildRef.current = signature;
                setPromptOpen(true);
            } catch {
                // Offline or a blocked fetch. Not worth telling the user about.
            }
        };

        const handleVisibility = () => {
            if (document.visibilityState === 'visible') pollHtml();
        };

        const firstCheck = setTimeout(pollHtml, HTML_FIRST_CHECK_DELAY_MS);
        const interval = setInterval(pollHtml, HTML_POLL_INTERVAL_MS);
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            cancelled = true;
            clearTimeout(firstCheck);
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, []);

    const applyUpdate = useCallback(() => {
        setPromptOpen(false);
        if (needRefresh) {
            // workbox-window posts SKIP_WAITING and reloads on `controlling`.
            updateServiceWorker(true);
            setTimeout(() => { hardReload(registrationRef); }, RELOAD_WATCHDOG_MS);
            return;
        }
        hardReload(registrationRef);
    }, [needRefresh, updateServiceWorker]);

    const dismissUpdate = useCallback(() => {
        setPromptOpen(false);
        if (pendingBuildRef.current) {
            dismissedBuildsRef.current.add(pendingBuildRef.current);
            pendingBuildRef.current = null;
        }
    }, []);

    return { updateAvailable: promptOpen, applyUpdate, dismissUpdate };
}
