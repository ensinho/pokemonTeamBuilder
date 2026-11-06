import { setCorsHeaders, HttpError } from './_lib/httpBasics.js';
import { installRuntimeGuards } from './_lib/runtimeGuards.js';

installRuntimeGuards();

/**
 * POST /api/battle-notify — push the *other* player about a battle change that
 * the browser wrote directly.
 *
 * A turn resolves through `api/battle-turn.js`, which can notify on the way
 * past. A challenge and a submitted team do not: `useBattlesStore` writes those
 * to Firestore itself, so without this endpoint the two moments most likely to
 * find the opponent with the app closed — being challenged, and being owed a
 * team — were the two that never notified.
 *
 * It takes a battle id and nothing else. Everything about who gets told what is
 * re-derived from the stored document (`pickBattlePushTarget`), so the worst a
 * caller can do is ask for a notification the battle's own state already
 * justifies — to the opponent, never to a third party.
 *
 * Same lazy-import discipline as the other functions here: nothing heavy is
 * touched at module scope, so a dependency failure returns JSON instead of
 * killing the process (docs/wounds.md, 2026-07-27).
 */

let depsPromise = null;

const loadDeps = () => {
    if (!depsPromise) {
        depsPromise = (async () => {
            const [serverAuth, notify, social] = await Promise.all([
                import('./_lib/serverAuth.js'),
                import('./_lib/battleNotify.js'),
                import('./_lib/socialNotify.js'),
            ]);
            return {
                verifyCaller: serverAuth.verifyCaller,
                getAdminFirestore: serverAuth.getAdminFirestore,
                getAppId: serverAuth.getAppId,
                notifyBattleEvent: notify.notifyBattleEvent,
                social,
            };
        })().catch((err) => {
            depsPromise = null;
            throw new HttpError(503, `Could not load the notifier: ${err.message}`);
        });
    }
    return depsPromise;
};

export default async function handler(req, res) {
    const originAllowed = setCorsHeaders(req, res);
    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
    }
    if (!originAllowed) {
        res.status(403).json({ error: 'Origin not allowed.' });
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Use POST.' });
        return;
    }

    try {
        const deps = await loadDeps();
        const { uid } = await deps.verifyCaller(req);

        const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

        // The Pokégear (2026-11-06, api/_lib/socialNotify.js): the same
        // endpoint carries the forum's notices, so no new function is spent
        // (12 per deployment). Ids only; recipients are re-derived.
        const kind = String(body.kind || 'battle');
        if (kind !== 'battle') {
            const db = deps.getAdminFirestore();
            const appId = deps.getAppId();
            const id = (value) => {
                const text = String(value || '').trim();
                if (text && !/^[A-Za-z0-9_-]{1,128}$/.test(text)) throw new HttpError(400, 'Bad id.');
                return text || null;
            };
            if (kind !== 'friendRequest' && !id(body.topicId)) throw new HttpError(400, 'topicId is required.');
            if (kind === 'friendRequest' && !id(body.to)) throw new HttpError(400, 'to is required.');
            let result;
            if (kind === 'forumMessage') {
                result = await deps.social.notifyForumMessage({ db, appId, callerUid: uid, topicId: id(body.topicId), messageId: id(body.messageId) });
            } else if (kind === 'reaction') {
                result = await deps.social.notifyReaction({ db, appId, callerUid: uid, topicId: id(body.topicId), messageId: id(body.messageId) });
            } else if (kind === 'friendRequest') {
                result = await deps.social.notifyFriendRequest({ db, appId, callerUid: uid, to: id(body.to) });
            } else {
                throw new HttpError(400, 'Unknown kind.');
            }
            res.status(200).json({ ok: true, ...result });
            return;
        }

        const battleId = String(body.battleId || '').trim();
        if (!battleId) throw new HttpError(400, 'battleId is required.');

        const db = deps.getAdminFirestore();
        const snap = await db.doc(`artifacts/${deps.getAppId()}/battles/${battleId}`).get();
        if (!snap.exists) throw new HttpError(404, 'Battle not found.');

        const result = await deps.notifyBattleEvent({
            db, battle: snap.data(), battleId, callerUid: uid,
        });
        res.status(200).json({ ok: true, ...result });
    } catch (err) {
        const status = err instanceof HttpError ? err.status : 500;
        if (status === 500) console.error('battle-notify failed:', err);
        res.status(status).json({ error: err.message || 'Unexpected error.' });
    }
}
