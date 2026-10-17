import { randomInt } from 'node:crypto';

import { setCorsHeaders, HttpError } from './_lib/httpBasics.js';
import { installRuntimeGuards, getLastRuntimeError } from './_lib/runtimeGuards.js';

// An unhandled rejection anywhere in this process returns FUNCTION_INVOCATION_FAILED
// with no stack and no log line pointing at the cause.
installRuntimeGuards();

/**
 * POST /api/challenge — the Champion Challenge: a daily battle against
 * Cynthia, decided by an AI that runs here and nowhere else.
 *
 * Body: `{action, ...}` with `action` one of
 *   - `ensureDay`  create today's public document if missing (any signed-in caller)
 *   - `state`      the challenge screen's data: the day, the run to show, the streak
 *                  (guests get the day only)
 *   - `start`      open the official run or a practice rematch (registered accounts)
 *   - `choose`     one player choice; the AI answers in the same request
 *   - `forfeit`    give up the current run
 * Contract and error codes: docs/plans/daily-champion-challenge-tech.md §2.4.
 *
 * Reads never come here: the client reads the day, its run and its rounds
 * straight from Firestore, so opening the Home or resuming a battle never
 * wakes this function. `GET ?ping=1` warms it while the player walks to
 * Cynthia; the walk hides the cold start.
 *
 * ## Why only builtins and dependency-free modules are imported at the top
 *
 * Same reason as `battle-turn.js`: a top-level import runs in the platform's
 * init phase, where nothing can catch it, and a failure there is an opaque
 * FUNCTION_INVOCATION_FAILED. `@pkmn/sim`, firebase-admin and everything under
 * `_lib/challenge/` and `_lib/ai/` load in `loadDeps()`, inside the handler,
 * where a failure becomes JSON naming the module. `challenge.deps.test.js`
 * fails if that is undone.
 */

let depsPromise = null;
let deps = null;

/** Each step named, so a failure says which module would not load. */
const STEPS = [
    ['serverAuth', () => import('./_lib/serverAuth.js')],
    ['actions', () => import('./_lib/challenge/actions.js')],
    ['engine', () => import('./_lib/challenge/engine.js')],
    ['ai', () => import('./_lib/ai/index.js')],
];

const loadDeps = () => {
    if (!depsPromise) {
        depsPromise = (async () => {
            const loaded = {};
            for (const [name, load] of STEPS) {
                try {
                    loaded[name] = await load();
                } catch (err) {
                    throw new HttpError(503, `Failed to load ${name}: ${err.message}`);
                }
            }
            deps = loaded;
            return deps;
        })().catch((err) => {
            // Cleared so one bad load doesn't poison every later request.
            depsPromise = null;
            throw err;
        });
    }
    return depsPromise;
};

const serviceFor = () => deps.actions.createChallengeService({
    db: deps.serverAuth.getAdminFirestore(),
    appId: deps.serverAuth.getAppId(),
    randomInt,
});

const handle = async (req, res) => {
    await loadDeps();
    const caller = await deps.serverAuth.verifyCaller(req);

    let body;
    try {
        body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    } catch {
        return res.status(400).json({ error: 'badRequest', detail: 'body is not JSON' });
    }

    const service = serviceFor();
    switch (body.action) {
        case 'ensureDay': return res.status(200).json(await service.ensureDay(caller, body));
        case 'state': return res.status(200).json(await service.state(caller, body));
        case 'start': return res.status(200).json(await service.start(caller, body));
        case 'choose': return res.status(200).json(await service.choose(caller, body));
        case 'forfeit': return res.status(200).json(await service.forfeit(caller, body));
        case 'forget': return res.status(200).json(await service.forget(caller, body));
        default: return res.status(400).json({ error: 'badRequest', detail: 'unknown action' });
    }
};

/**
 * `GET /api/challenge` — self-check: the dependencies, the credentials' shape
 * (never their contents), a Firestore round trip, and a two-Pokémon battle with
 * one real AI decision, timed.
 */
const runDiagnostics = async () => {
    const checks = { ok: true, node: process.version, region: process.env.VERCEL_REGION || null };
    const startedAt = Date.now();
    try {
        await loadDeps();
        checks.dependencies = `ok (${Date.now() - startedAt}ms)`;
    } catch (err) {
        return { ...checks, ok: false, dependencies: err.message, lastRuntimeError: getLastRuntimeError() };
    }

    checks.credentials = deps.serverAuth.describeCredentials();
    if (checks.credentials.privateKeyProblem) checks.ok = false;

    try {
        const db = deps.serverAuth.getAdminFirestore();
        await db.doc(`artifacts/${deps.serverAuth.getAppId()}/__diagnostics/ping`).get();
        checks.firestore = 'ok';
    } catch (err) {
        checks.ok = false;
        checks.firestore = `${err.name}: ${err.message}`;
    }

    try {
        const { createMatch, snapshot, requestOf } = deps.engine;
        const match = createMatch({
            seed: [1, 2, 3, 4],
            teams: {
                p1: 'Togekiss\nAbility: Serene Grace\n- Air Slash\n- Aura Sphere',
                p2: 'Garchomp\nAbility: Rough Skin\n- Dragon Claw\n- Stone Edge',
            },
            names: { p1: 'Check', p2: 'Cynthia' },
        });
        const decidedAt = Date.now();
        const { choice } = deps.ai.decide({
            snapshot: snapshot(match.battle),
            request: requestOf(match.battle, 'p2'),
            p2Lines: match.lines.p2,
            seed: [1, 2, 3, 4],
            turn: 0,
            profileKey: 'world',
        });
        checks.sim = 'ok';
        checks.ai = { version: deps.ai.AI_VERSION, choice, ms: Date.now() - decidedAt };
    } catch (err) {
        checks.ok = false;
        checks.sim = `${err.name}: ${err.message}`;
    }

    checks.lastRuntimeError = getLastRuntimeError();
    if (checks.lastRuntimeError) checks.ok = false;
    return checks;
};

export default async function handler(req, res) {
    try {
        const originAllowed = setCorsHeaders(req, res);
        if (req.method === 'OPTIONS') return res.status(204).end();
        if (!originAllowed) return res.status(403).json({ error: 'originNotAllowed' });

        // Answers before loading anything: JSON here means the function starts.
        if (req.query?.ping !== undefined || req.url?.includes('ping=')) {
            return res.status(200).json({ ok: true, ping: true, node: process.version, lastRuntimeError: getLastRuntimeError() });
        }

        if (req.method === 'GET') {
            const checks = await runDiagnostics();
            return res.status(checks.ok ? 200 : 503).json(checks);
        }
        if (req.method !== 'POST') return res.status(405).json({ error: 'methodNotAllowed' });

        return await handle(req, res);
    } catch (err) {
        // Only our own errors pick the status. A Google API error carries one
        // too (Firestore over REST: `code` and `status` both 400), and relaying
        // it sent the bare `{"error":400}` that hid a refused write (wound 2026-10-16).
        if (err instanceof HttpError) {
            // ChallengeError carries a stable code; HttpError (auth, loading) a message.
            const code = err.code || (err.status === 401 ? 'unauthenticated' : err.message);
            return res.status(err.status).json({ error: code, ...(err.extra || {}) });
        }
        console.error('challenge failed:', err);
        return res.status(500).json({
            error: 'internal',
            detail: err?.message || String(err),
            lastRuntimeError: getLastRuntimeError(),
        });
    }
}
