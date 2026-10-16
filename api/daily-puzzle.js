import { HttpError } from './_lib/httpBasics.js';
import { installRuntimeGuards } from './_lib/runtimeGuards.js';

installRuntimeGuards();

/**
 * GET /api/daily-puzzle — the once-a-day "a new PokéPuzzle is up" push.
 *
 * Driven by a Vercel cron (see `vercel.json`), because this is the one
 * notification in the app that no user action produces: the puzzle changes
 * because the date did. Everything else pushes from the request that caused it.
 *
 * One collection-group read for the whole send, and no profile lookups: the
 * client denormalises `lang` and `topics` onto each subscription document
 * precisely so this stays a single query no matter how many trainers there are.
 *
 * It is idempotent in the way that matters — the payload carries the `ptb-daily`
 * tag, so a double firing replaces the tray entry instead of stacking a second
 * one. That matters more than it sounds: on Vercel's Hobby plan a cron is
 * *daily at most* and fires somewhere inside the scheduled hour rather than on
 * the minute, so this must tolerate a fuzzy, occasionally repeated trigger —
 * and must never depend on having run at a precise time.
 */

const MAX_SUBSCRIPTIONS = 2000;

let depsPromise = null;

const loadDeps = () => {
    if (!depsPromise) {
        depsPromise = (async () => {
            const [serverAuth, webPush] = await Promise.all([
                import('./_lib/serverAuth.js'),
                import('./_lib/webPush.js'),
            ]);
            return {
                getAdminFirestore: serverAuth.getAdminFirestore,
                getAppId: serverAuth.getAppId,
                isPushConfigured: webPush.isPushConfigured,
                buildPushPayload: webPush.buildPushPayload,
                sendToSubscriptionDocs: webPush.sendToSubscriptionDocs,
            };
        })().catch((err) => {
            depsPromise = null;
            throw new HttpError(503, `Could not load the notifier: ${err.message}`);
        });
    }
    return depsPromise;
};

/**
 * The daily pushes this one cron sends (the Hobby plan allows two crons, so a
 * new daily topic rides here — docs/modules/notifications.md). Each has its own
 * opt-out and its own tray entry.
 */
export const DAILY_TOPICS = [
    { topic: 'dailyPuzzle', kind: 'dailyPuzzle', url: '/pokepuzzle' },
    { topic: 'dailyChallenge', kind: 'dailyChallenge', url: '/challenge' },
];

/** Only this app's own subscriptions, and only those still opted in to `topic`. */
export const selectDailyTargets = (docs, { appId, topic = 'dailyPuzzle', limit = MAX_SUBSCRIPTIONS }) => docs
    .filter((docSnap) => docSnap.ref.path.startsWith(`artifacts/${appId}/users/`))
    .filter((docSnap) => docSnap.data()?.topics?.[topic] !== false)
    .slice(0, limit);

export default async function handler(req, res) {
    const secret = process.env.CRON_SECRET;
    if (secret) {
        const auth = req.headers.authorization || '';
        if (auth !== `Bearer ${secret}`) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
    }

    try {
        const deps = await loadDeps();
        if (!deps.isPushConfigured()) {
            res.status(200).json({ ok: true, skipped: 'VAPID keys are not configured.' });
            return;
        }

        const appId = deps.getAppId();
        const db = deps.getAdminFirestore();
        const snap = await db.collectionGroup('pushSubscriptions').get();

        // Per topic, one send per language, so nobody gets the English copy on
        // a phone they set to Portuguese. Topics go one after the other: a
        // subscription removed as gone (404/410) by the first is not retried.
        const byTopic = {};
        let candidates = 0;
        for (const { topic, kind, url } of DAILY_TOPICS) {
            const targets = selectDailyTargets(snap.docs, { appId, topic });
            candidates += targets.length;
            const byLang = new Map();
            for (const docSnap of targets) {
                const lang = docSnap.data()?.lang === 'pt' ? 'pt' : 'en';
                if (!byLang.has(lang)) byLang.set(lang, []);
                byLang.get(lang).push(docSnap);
            }
            const results = await Promise.all([...byLang.entries()].map(([lang, docs]) => (
                deps.sendToSubscriptionDocs({ docs, payload: deps.buildPushPayload({ kind, lang, url }), topic })
            )));
            byTopic[topic] = results.reduce((acc, result) => ({
                sent: acc.sent + result.sent,
                removed: acc.removed + result.removed,
                failed: acc.failed + result.failed,
            }), { sent: 0, removed: 0, failed: 0 });
        }

        const total = Object.values(byTopic).reduce((acc, t) => ({
            sent: acc.sent + t.sent,
            removed: acc.removed + t.removed,
            failed: acc.failed + t.failed,
        }), { sent: 0, removed: 0, failed: 0 });

        res.status(200).json({ ok: true, candidates, ...total, byTopic });
    } catch (err) {
        console.error('daily-puzzle push failed:', err);
        res.status(err instanceof HttpError ? err.status : 500).json({ error: err.message || 'Unexpected error.' });
    }
}
