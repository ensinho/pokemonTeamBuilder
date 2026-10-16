import { randomInt } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * `/api/challenge` for `npm run dev` — the Champion Challenge's real service
 * (engine + Cynthia's AI, `api/_lib/challenge/actions.js`) over an in-memory
 * Firestore (`api/_lib/testing/fakeFirestore.js`).
 *
 * Why it exists: `/api/*` only runs on Vercel, so on the Vite dev server the
 * challenge screen had nothing to talk to (404). This makes the whole flow
 * playable locally without deploying a function, publishing rules or writing a
 * single document to the real database.
 *
 * Dev only, and deliberately simple:
 *  - `apply: 'serve'` — never part of a build.
 *  - The Firebase ID token is **decoded, not verified** (uid and whether the
 *    account is anonymous). Fine for a dev server on localhost; the real
 *    endpoint verifies it against Google's keys (`api/_lib/serverAuth.js`).
 *  - Runs live in memory and reset when the dev server restarts.
 *  - The engine loads on the first request, so starting the dev server stays fast.
 *
 * Point `VITE_CHALLENGE_ENDPOINT` at a deployed preview to test against the
 * real function and Firestore instead.
 */
export function challengeDevApi() {
    let servicePromise = null;

    const loadService = (root, logger) => {
        if (!servicePromise) {
            // Runtime-built paths: the config bundler must not inline the engine.
            const from = (file) => import(pathToFileURL(resolve(root, file)).href);
            servicePromise = Promise.all([
                from('api/_lib/challenge/actions.js'),
                from('api/_lib/testing/fakeFirestore.js'),
            ]).then(([{ createChallengeService }, { createFakeFirestore }]) => {
                logger.info('[challenge] in-memory dev backend ready — runs reset when the dev server restarts');
                return createChallengeService({ db: createFakeFirestore().db, appId: 'dev', randomInt });
            }).catch((err) => {
                servicePromise = null;
                throw err;
            });
        }
        return servicePromise;
    };

    const callerFrom = (header) => {
        const token = String(header || '').replace(/^Bearer\s+/i, '');
        try {
            const payload = JSON.parse(Buffer.from(token.split('.')[1] || '', 'base64url').toString('utf8'));
            const uid = payload.user_id || payload.sub;
            return uid ? { uid, isAnonymous: payload.firebase?.sign_in_provider === 'anonymous' } : null;
        } catch {
            return null;
        }
    };

    return {
        name: 'challenge-dev-api',
        apply: 'serve',
        configureServer(server) {
            server.middlewares.use(async (req, res, next) => {
                const url = new URL(req.url || '/', 'http://localhost');
                if (!url.pathname.endsWith('/api/challenge')) return next();

                const send = (status, body) => {
                    res.statusCode = status;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(body));
                };

                if (req.method === 'GET' && url.searchParams.has('ping')) return send(200, { ok: true, ping: true, dev: true });
                if (req.method !== 'POST') return send(405, { error: 'methodNotAllowed' });

                let raw = '';
                for await (const chunk of req) raw += chunk;
                const caller = callerFrom(req.headers.authorization);
                if (!caller) return send(401, { error: 'unauthenticated' });

                try {
                    const body = JSON.parse(raw || '{}');
                    const service = await loadService(server.config.root, server.config.logger);
                    if (!['ensureDay', 'state', 'start', 'choose', 'forfeit'].includes(body.action)) {
                        return send(400, { error: 'badRequest', detail: 'unknown action' });
                    }
                    return send(200, await service[body.action](caller, body));
                } catch (err) {
                    if (err?.status) return send(err.status, { error: err.code || err.message, ...(err.extra || {}) });
                    server.config.logger.error(`[challenge] ${err?.stack || err}`);
                    return send(500, { error: 'internal', detail: err?.message || String(err) });
                }
            });
        },
    };
}
