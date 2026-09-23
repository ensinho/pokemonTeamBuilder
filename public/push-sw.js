/* eslint-env serviceworker */
/*
 * Web Push handler, imported into the Workbox-generated `sw.js`
 * (`workbox.importScripts` in vite.config.js).
 *
 * It lives in `public/` as a plain classic-worker script, not in `src/`, for
 * two reasons: the generated service worker is the only one this app may ever
 * register (a second worker re-opens the double-update-prompt wound in
 * docs/wounds.md, 2026-09-14), and `importScripts` needs a file that is served
 * as-is rather than bundled.
 *
 * Everything here is deliberately dependency-free and synchronous to parse: a
 * worker that throws while evaluating never receives a push at all.
 */

/** Same shape the server sends (see api/lib/webPush.js `buildPushPayload`). */
const parsePushPayload = (raw) => {
    let data = {};
    try {
        data = raw ? JSON.parse(raw) : {};
    } catch (_) {
        // A push with a non-JSON body still has to show *something*: the
        // subscription was created with `userVisibleOnly`, so a silent push
        // costs the site its permission.
        data = {};
    }
    return {
        title: data.title || 'Pokémon Team Builder',
        body: data.body || '',
        url: typeof data.url === 'string' ? data.url : '/',
        group: data.group || 'general',
        groupTitle: data.groupTitle || '',
        groupBody: data.groupBody || '',
        groupUrl: typeof data.groupUrl === 'string' ? data.groupUrl : '/',
        count: 1,
    };
};

/**
 * One notification per *group*, not per event.
 *
 * The OS tray is not a feed. Three battles waiting is one line — "3 batalhas
 * esperando por você" — and tapping it opens the list; a single battle keeps
 * its own copy, with the opponent's name and a link straight to that battle.
 * Sharing a `tag` is what makes the second push replace the first instead of
 * stacking, on Android and in an installed iOS PWA alike.
 *
 * `existing` is whatever `registration.getNotifications({ tag })` returned, so
 * the running count survives in `data.count` even though the worker itself is
 * torn down between pushes.
 */
const buildNotification = (payload, existing) => {
    const previous = (existing || []).reduce(
        (total, notification) => total + (Number(notification?.data?.count) || 1),
        0,
    );
    const count = previous + 1;
    const grouped = previous > 0 && Boolean(payload.groupTitle);

    const title = grouped
        ? String(payload.groupTitle).replace('{{count}}', String(count))
        : payload.title;
    const body = grouped
        ? String(payload.groupBody).replace('{{count}}', String(count))
        : payload.body;
    const url = grouped ? payload.groupUrl : payload.url;

    return {
        title,
        options: {
            body,
            tag: payload.group,
            // Without this the replacement is silent on Android — the tray
            // updates but nothing tells the user a *new* battle came in.
            renotify: true,
            icon: 'apple-touch-icon.png',
            badge: 'favicon-32x32.png',
            data: { url, count },
        },
    };
};

self.__ptbPushInternals = { parsePushPayload, buildNotification };

self.addEventListener('push', (event) => {
    const payload = parsePushPayload(event.data ? event.data.text() : '');

    event.waitUntil((async () => {
        let existing = [];
        try {
            existing = await self.registration.getNotifications({ tag: payload.group });
        } catch (_) {
            // Safari has been known to reject this; a missing count only costs
            // us the grouping, never the notification.
        }
        const { title, options } = buildNotification(payload, existing);
        await self.registration.showNotification(title, options);
    })());
});

/**
 * Tapping a notification lands on the thing it is about.
 *
 * The old in-page handler set `window.location.hash`, which stopped meaning
 * anything when the router moved to real paths (CLAUDE.md, 2026-07-01) — a tap
 * silently did nothing. An already-open tab is focused and told where to go
 * (AppLayout listens for this message and calls `navigate`), because a hard
 * navigation there would throw away the live Firestore listeners; only a cold
 * start opens a window.
 */
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const target = new URL(event.notification.data?.url || '/', self.registration.scope).href;

    event.waitUntil((async () => {
        const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        const open = clientList.find((client) => client.url.startsWith(self.registration.scope));
        if (open) {
            await open.focus();
            open.postMessage({ type: 'ptb:navigate', url: target });
            return;
        }
        await self.clients.openWindow(target);
    })());
});
