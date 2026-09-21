import { doc, deleteDoc, setDoc } from 'firebase/firestore';

import { db } from './firebase';
import { appId, VAPID_PUBLIC_KEY } from '../constants/firebase';

/**
 * Web Push subscriptions — the half of notifications that survives the app
 * being closed.
 *
 * The in-app popups in `useBattleNotifications` only ever reach a tab that is
 * already open. Everything here is about the other case: the phone in a pocket,
 * the PWA not running at all. The browser holds the subscription; the server
 * (`api/lib/webPush.js`) sends to it; this module is only the bookkeeping
 * between them — subscribe on an explicit opt-in, mirror the subscription into
 * Firestore so the server can find it, and drop it again on opt-out.
 *
 * Platform notes that shaped this file:
 *  - **iOS only has push inside an installed PWA** (16.4+). Safari in a browser
 *    tab exposes neither `PushManager` nor `Notification`, so the UI has to ask
 *    for "Add to Home Screen" rather than for permission.
 *  - **The permission prompt must come from a user gesture.** The old code
 *    called `requestPermission()` on mount, which iOS rejects outright and
 *    which every other platform holds against the site.
 *  - **Endpoints rotate.** A subscription silently changes endpoint after a
 *    browser update or a push-service reset, which is why `syncSubscription`
 *    re-mirrors whatever the browser currently holds on every boot.
 */

const MASTER_KEY = 'ptb:browserNotifications';
const DAILY_KEY = 'ptb:notify:dailyPuzzle';
const LOCAL_ENDPOINT_KEY = 'ptb:push:endpoint';

const readFlag = (key, fallback) => {
    try {
        const value = localStorage.getItem(key);
        if (value === null) return fallback;
        return value === '1';
    } catch (_) {
        return fallback;
    }
};

const writeFlag = (key, value) => {
    try {
        localStorage.setItem(key, value ? '1' : '0');
    } catch (_) { /* a preference is never worth throwing over */ }
};

/** Master switch: does this trainer want to be told about anything at all? */
export const getNotificationsEnabled = () => readFlag(MASTER_KEY, true);
export const setNotificationsEnabled = (enabled) => writeFlag(MASTER_KEY, enabled);

/** Topic switch: the once-a-day "the new PokéPuzzle is up" nudge. */
export const getDailyPuzzleEnabled = () => readFlag(DAILY_KEY, true);

export const isPushSupported = () => (
    typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window
);

/** Installed-PWA detection — the gate iOS puts in front of the whole feature. */
export const isStandalonePwa = () => (
    typeof window !== 'undefined'
    && (window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator?.standalone === true)
);

export const isIos = () => (
    typeof navigator !== 'undefined'
    && (/iPad|iPhone|iPod/.test(navigator.userAgent)
        // iPadOS 13+ reports itself as a Mac; the touch points give it away.
        || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))
);

/**
 * "You can't have push here *yet*, but you could." — an iPhone in Safari, where
 * adding the app to the Home Screen is the missing step rather than a denied
 * permission.
 */
export const needsIosInstall = () => isIos() && !isStandalonePwa() && !isPushSupported();

export const getPermission = () => (
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
);

/** VAPID public keys travel as base64url; `subscribe` wants raw bytes. */
const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    const output = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
    return output;
};

/** Stable, path-safe document id for an endpoint (FNV-1a, hex). */
export const endpointDocId = (endpoint) => {
    let hash = 0x811c9dc5;
    for (let i = 0; i < endpoint.length; i += 1) {
        hash ^= endpoint.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return `sub_${hash.toString(16).padStart(8, '0')}_${endpoint.length}`;
};

const subscriptionDoc = (userId, endpoint) => doc(
    db,
    `artifacts/${appId}/users/${userId}/pushSubscriptions`,
    endpointDocId(endpoint),
);

/**
 * What the server needs to send to this device, and nothing else.
 *
 * `lang` and `topics` are denormalised onto the subscription on purpose: the
 * daily cron then needs a single collection-group query instead of a profile
 * read per trainer.
 */
export const describeSubscription = (subscription, { lang = 'en' } = {}) => {
    const json = subscription.toJSON();
    return {
        endpoint: json.endpoint,
        keys: { p256dh: json.keys?.p256dh || '', auth: json.keys?.auth || '' },
        lang: lang === 'pt' ? 'pt' : 'en',
        topics: { battles: true, dailyPuzzle: getDailyPuzzleEnabled() },
        userAgent: typeof navigator !== 'undefined' ? String(navigator.userAgent).slice(0, 180) : '',
        updatedAt: Date.now(),
    };
};

const saveSubscription = async (userId, subscription, lang) => {
    if (!db || !userId) return;
    const payload = describeSubscription(subscription, { lang });
    await setDoc(subscriptionDoc(userId, payload.endpoint), payload, { merge: true });
    try {
        localStorage.setItem(LOCAL_ENDPOINT_KEY, payload.endpoint);
    } catch (_) { /* only used to clean up on sign-out */ }
};

const getRegistration = async () => {
    if (!('serviceWorker' in navigator)) return null;
    // `ready` never settles when no worker is registered at all (dev server
    // without the PWA plugin), so it is raced against what is already there.
    const existing = await navigator.serviceWorker.getRegistration();
    if (!existing) return null;
    return navigator.serviceWorker.ready;
};

/**
 * Turn push on. **Must be called from a user gesture** — the permission prompt
 * depends on it, on iOS it is the only way at all.
 *
 * @returns {Promise<{ok: boolean, reason?: 'unsupported'|'ios-install'|'denied'|'no-key'|'error'}>}
 */
export const enablePush = async ({ userId, lang = 'en' } = {}) => {
    if (needsIosInstall()) return { ok: false, reason: 'ios-install' };
    if (!isPushSupported()) return { ok: false, reason: 'unsupported' };

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return { ok: false, reason: 'denied' };

    setNotificationsEnabled(true);

    // Permission alone already fixes the in-app popups; a missing VAPID key
    // only costs the "app closed" half, so it is reported, not thrown.
    if (!VAPID_PUBLIC_KEY) return { ok: true, reason: 'no-key' };

    try {
        const registration = await getRegistration();
        if (!registration) return { ok: true, reason: 'no-key' };

        const existing = await registration.pushManager.getSubscription();
        const subscription = existing || await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
        await saveSubscription(userId, subscription, lang);
        return { ok: true };
    } catch (err) {
        console.error('Could not subscribe to push notifications:', err);
        return { ok: false, reason: 'error' };
    }
};

/** Turn push off everywhere: the browser subscription and the server's copy. */
export const disablePush = async ({ userId } = {}) => {
    setNotificationsEnabled(false);
    try {
        const registration = await getRegistration();
        const subscription = await registration?.pushManager?.getSubscription();
        if (!subscription) return;
        const { endpoint } = subscription.toJSON();
        await subscription.unsubscribe().catch(() => {});
        if (db && userId && endpoint) await deleteDoc(subscriptionDoc(userId, endpoint)).catch(() => {});
    } catch (err) {
        console.error('Could not unsubscribe from push notifications:', err);
    }
};

/**
 * Boot-time reconciliation. Never prompts: it only re-mirrors a subscription
 * the browser already holds (endpoints rotate silently) and stops re-notifying
 * someone who turned notifications off on another device.
 */
export const syncSubscription = async ({ userId, lang = 'en' } = {}) => {
    if (!userId || !isPushSupported()) return;
    if (getPermission() !== 'granted' || !getNotificationsEnabled()) return;
    try {
        const registration = await getRegistration();
        const subscription = await registration?.pushManager?.getSubscription();
        if (!subscription) return;
        await saveSubscription(userId, subscription, lang);
    } catch (err) {
        console.error('Could not refresh the push subscription:', err);
    }
};

/**
 * Does this device already have a live push subscription?
 *
 * Used to decide who owns a *background* alert. Both channels watch the same
 * transitions, so a backgrounded tab that is also subscribed would show the
 * server's push and its own local copy — one tray entry thanks to the shared
 * tag, but two buzzes. When a subscription exists, push wins; every battle
 * transition that can need attention has a sender behind it
 * (see docs/modules/notifications.md).
 */
export const hasPushSubscription = async () => {
    try {
        if (!isPushSupported()) return false;
        const registration = await getRegistration();
        return Boolean(await registration?.pushManager?.getSubscription());
    } catch (_) {
        return false;
    }
};

/** Flip the daily-PokéPuzzle topic, on this device and on the server's copy. */
export const setDailyPuzzleEnabled = async (enabled, { userId } = {}) => {
    writeFlag(DAILY_KEY, enabled);
    if (!db || !userId) return;
    try {
        const registration = await getRegistration();
        const subscription = await registration?.pushManager?.getSubscription();
        const endpoint = subscription?.toJSON()?.endpoint;
        if (!endpoint) return;
        await setDoc(
            subscriptionDoc(userId, endpoint),
            { topics: { battles: true, dailyPuzzle: enabled }, updatedAt: Date.now() },
            { merge: true },
        );
    } catch (err) {
        console.error('Could not update the daily puzzle notification setting:', err);
    }
};
