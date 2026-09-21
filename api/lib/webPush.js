/**
 * Web Push — the notification channel that works with the app closed.
 *
 * The in-app popups (`src/hooks/useBattleNotifications.js`) need an open tab;
 * the "your turn" email needs the trainer to check their inbox. This is the
 * one that reaches a phone in a pocket, including an installed iOS PWA
 * (16.4+), and it rides the same requests the other two already do — no queue,
 * no cron except the once-a-day puzzle nudge.
 *
 * Two deliberate shapes:
 *
 *  - **`web-push` is loaded lazily.** Same rule as everything else under
 *    `api/`: a static import runs during the platform's init phase where a
 *    failure is an opaque FUNCTION_INVOCATION_FAILED. It is also CJS all the
 *    way down, which `api/lib/dependencies.test.js` pins.
 *  - **Subscriptions carry their own `lang` and `topics`.** Denormalised by the
 *    client on purpose, so sending never costs a profile read per trainer.
 */

let webPushPromise = null;

const loadWebPush = () => {
    if (!webPushPromise) {
        webPushPromise = import('web-push').then((module) => module.default || module);
    }
    return webPushPromise;
};

export const isPushConfigured = () => Boolean(
    process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY,
);

const APP_URL = process.env.PUBLIC_APP_URL || 'https://pokemonbuilder.app';

/**
 * Copy for every push this app sends, in both languages.
 *
 * `group` is the notification tag: everything battle-shaped collapses into one
 * tray entry, so five battles are "5 batalhas esperando por você" rather than
 * five banners. `{{count}}` is filled in by the service worker, which is the
 * only place that knows how many are already on screen.
 */
const TEMPLATES = {
    battleTurn: {
        en: { title: 'Your turn!', body: ({ name }) => `${name} is waiting for your move.` },
        pt: { title: 'Sua vez!', body: ({ name }) => `${name} está esperando sua jogada.` },
    },
    battleChallenge: {
        en: { title: 'New challenge!', body: ({ name }) => `${name} challenged you to a battle.` },
        pt: { title: 'Novo desafio!', body: ({ name }) => `${name} te desafiou para uma batalha.` },
    },
    battleTeam: {
        en: { title: 'Pick your team', body: ({ name }) => `Your battle against ${name} is waiting for your six.` },
        pt: { title: 'Escolha seu time', body: ({ name }) => `Sua batalha contra ${name} está esperando seus seis.` },
    },
    dailyPuzzle: {
        en: { title: 'A new PokéPuzzle is up!', body: () => "Today's Pokémon is waiting — keep your streak alive." },
        pt: { title: 'Novo PokéPuzzle no ar!', body: () => 'O Pokémon de hoje já está esperando — mantenha sua ofensiva.' },
    },
};

const GROUPS = {
    battle: {
        group: 'ptb-battles',
        groupUrl: '/battles',
        en: { title: '{{count}} battles need you', body: 'Tap to see what is waiting.' },
        pt: { title: '{{count}} batalhas esperando por você', body: 'Toque para ver o que está pendente.' },
    },
    puzzle: {
        group: 'ptb-daily',
        groupUrl: '/pokepuzzle',
        en: { title: '{{count}} reminders', body: 'Tap to open the app.' },
        pt: { title: '{{count}} lembretes', body: 'Toque para abrir o app.' },
    },
};

const FALLBACK_NAME = { en: 'your opponent', pt: 'seu oponente' };

/**
 * The JSON body `public/push-sw.js` parses. Pure — this is the part worth
 * testing, and the part that must stay in step with the worker.
 */
export const buildPushPayload = ({ kind, lang = 'en', params = {}, url = '/' }) => {
    const language = lang === 'pt' ? 'pt' : 'en';
    const template = TEMPLATES[kind]?.[language] || TEMPLATES[kind]?.en;
    if (!template) return null;

    const groupKey = kind === 'dailyPuzzle' ? 'puzzle' : 'battle';
    const group = GROUPS[groupKey];
    const name = params.name || FALLBACK_NAME[language];

    return {
        title: template.title,
        body: template.body({ ...params, name }),
        url,
        group: group.group,
        groupTitle: group[language].title,
        groupBody: group[language].body,
        groupUrl: group.groupUrl,
    };
};

export const battleUrl = (battleId) => `/battles/${battleId}`;
export const absoluteUrl = (path) => `${APP_URL}${path}`;

/** Every push subscription this trainer has registered, newest first. */
export const listSubscriptions = async ({ db, appId, uid }) => {
    const snap = await db.collection(`artifacts/${appId}/users/${uid}/pushSubscriptions`).get();
    return snap.docs;
};

/**
 * Is this stored subscription still worth sending to, for this topic?
 *
 * A topic the trainer turned off is the only *opt-out* here: an older
 * subscription document has no `topics` map at all, and must keep receiving
 * battle alerts rather than go silent until it happens to be rewritten.
 */
export const shouldSendTo = (data, topic = null) => {
    if (!data?.endpoint || !data?.keys?.p256dh || !data?.keys?.auth) return false;
    if (topic && data.topics && data.topics[topic] === false) return false;
    return true;
};

/**
 * A push service answering 404 or 410 means the subscription is gone for good
 * (app uninstalled, permission revoked, endpoint rotated). Keeping it would
 * mean retrying it forever, so the row is dropped on the spot.
 */
const isGone = (status) => status === 404 || status === 410;

/**
 * Send one payload to a set of subscription documents.
 *
 * Best-effort by design — it rides requests that have already committed their
 * real work, so a push that fails must never surface as a failed battle turn.
 *
 * @returns {Promise<{sent: number, removed: number, failed: number}>}
 */
export const sendToSubscriptionDocs = async ({ docs, payload, topic = null }) => {
    if (!isPushConfigured() || !payload || !docs?.length) return { sent: 0, removed: 0, failed: 0 };

    const webPush = await loadWebPush();
    webPush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:enzopo625@gmail.com',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY,
    );

    const body = JSON.stringify(payload);
    let sent = 0;
    let removed = 0;
    let failed = 0;

    await Promise.all(docs.map(async (docSnap) => {
        const data = docSnap.data() || {};
        if (!shouldSendTo(data, topic)) return;

        try {
            await webPush.sendNotification(
                { endpoint: data.endpoint, keys: { p256dh: data.keys.p256dh, auth: data.keys.auth } },
                body,
                { TTL: 60 * 60 * 12 },
            );
            sent += 1;
        } catch (err) {
            if (isGone(err?.statusCode)) {
                removed += 1;
                await docSnap.ref.delete().catch(() => {});
                return;
            }
            failed += 1;
            console.error('Push delivery failed:', err?.statusCode || '', err?.message || err);
        }
    }));

    return { sent, removed, failed };
};

/**
 * Send to every device one trainer has, each in the language that device asked
 * for. Never throws.
 */
export const sendPushToUser = async ({ db, appId, uid, kind, params = {}, url = '/', topic = null }) => {
    try {
        if (!isPushConfigured() || !uid) return { sent: 0, removed: 0, failed: 0 };
        const docs = await listSubscriptions({ db, appId, uid });
        if (!docs.length) return { sent: 0, removed: 0, failed: 0 };

        // One send per language present, so a trainer with a phone in Portuguese
        // and a laptop in English gets each in its own.
        const byLang = new Map();
        for (const docSnap of docs) {
            const lang = docSnap.data()?.lang === 'pt' ? 'pt' : 'en';
            if (!byLang.has(lang)) byLang.set(lang, []);
            byLang.get(lang).push(docSnap);
        }

        const results = await Promise.all([...byLang.entries()].map(([lang, langDocs]) => (
            sendToSubscriptionDocs({
                docs: langDocs,
                payload: buildPushPayload({ kind, lang, params, url }),
                topic,
            })
        )));

        return results.reduce((total, result) => ({
            sent: total.sent + result.sent,
            removed: total.removed + result.removed,
            failed: total.failed + result.failed,
        }), { sent: 0, removed: 0, failed: 0 });
    } catch (err) {
        console.error('Could not send push notification:', err);
        return { sent: 0, removed: 0, failed: 0 };
    }
};
