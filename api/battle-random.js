import { randomInt } from 'node:crypto';

import { setCorsHeaders, HttpError } from './lib/httpBasics.js';
import { installRuntimeGuards, getLastRuntimeError } from './lib/runtimeGuards.js';

// Same reasoning as api/battle-turn.js: an unhandled rejection anywhere in this
// process returns FUNCTION_INVOCATION_FAILED with no stack and no log line.
installRuntimeGuards();

/**
 * POST /api/battle-random — deal both trainers a random team.
 *
 * Body: `{ battleId }`.
 *
 * A random battle skips team building entirely: instead of each player locking in
 * something they made, the server rolls six Pokémon per side out of Showdown's
 * own random-battle generator (see ./lib/randomTeams.js, which explains where the
 * level balance comes from) and starts the battle immediately.
 *
 * ## Why this is a server endpoint and not a client roll
 *
 * The obvious cheat is re-rolling until you like your team, and the subtler one
 * is rolling your opponent's. Neither is possible here: the teams are a pure
 * function of the battle's seed, the seed is chosen by this function, and the
 * whole roll is claimed inside a transaction that refuses to run twice
 * (`randomTeamsRolledAt`). A client that pre-creates its own `teams/{uid}`
 * document — which firestore.rules cannot fully prevent on a *create* — has that
 * document overwritten here, and the rules refuse the write outright for a
 * battle in random mode.
 *
 * The response tells the caller their own roster and nothing about the other
 * side's: the opponent's sets stay unreadable until the battle reveals them, the
 * same guarantee that makes turn resolution server-side in the first place.
 *
 * ## Everything after this is the ordinary battle
 *
 * The roll flips the battle to `active` with both `ready` flags set, so the very
 * next `POST /api/battle-turn` bootstraps it like any other battle. `gen9randombattle`
 * has no team preview, so the first thing each player is asked for is a move.
 */

let depsPromise = null;
let deps = null;

const loadDeps = () => {
    if (!depsPromise) {
        depsPromise = (async () => {
            const [serverAuth, resolver, randomTeams] = await Promise.all([
                import('./lib/serverAuth.js'),
                import('./lib/battleResolver.js'),
                import('./lib/randomTeams.js'),
            ]);
            deps = {
                verifyCaller: serverAuth.verifyCaller,
                getAdminFirestore: serverAuth.getAdminFirestore,
                getAppId: serverAuth.getAppId,
                describeCredentials: serverAuth.describeCredentials,
                makeSeed: resolver.makeSeed,
                generateRandomTeams: randomTeams.generateRandomTeams,
                RandomTeamError: randomTeams.RandomTeamError,
                RANDOM_BATTLE_FORMAT: randomTeams.RANDOM_BATTLE_FORMAT,
            };
            return deps;
        })().catch((err) => {
            depsPromise = null;
            throw new HttpError(503, `Could not load the random battle generator: ${err.message}`);
        });
    }
    return depsPromise;
};

/** Pinned so a battle records which generator dealt it. */
const GENERATOR_VERSION = '@pkmn/randoms@0.10.11';

const battleRef = (db, battleId) => db.doc(`artifacts/${deps.getAppId()}/battles/${battleId}`);

const handle = async (req, res) => {
    await loadDeps();

    const { uid, isAnonymous } = await deps.verifyCaller(req);
    if (isAnonymous) throw new HttpError(403, 'Battles require a full account.');

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const battleId = String(body.battleId || '').trim();
    if (!battleId) throw new HttpError(400, 'battleId is required.');

    const db = deps.getAdminFirestore();
    const ref = battleRef(db, battleId);

    // The whole roll is one transaction. Both clients may reach this at the same
    // moment — the challenged player's accept triggers it, and the challenger's
    // open tab notices the battle is unrolled and triggers it too. Without the
    // claim, both would generate (from different seeds, since the seed is created
    // here) and the second write would deal a team over the top of one a player
    // may already have been shown.
    const outcome = await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) throw new HttpError(404, 'Battle not found.');

        const battle = snap.data();
        const players = Array.isArray(battle.players) ? battle.players : [];
        if (!players.includes(uid)) throw new HttpError(403, 'You are not in this battle.');
        if (battle.mode !== 'random') {
            throw new HttpError(409, 'This battle is not a random battle.');
        }

        // p1 is the challenger, matching api/battle-turn.js — the mapping has to
        // agree with the resolver's or each side would be dealt the other's team.
        const p1 = battle.challenger;
        const p2 = players.find((id) => id !== p1);
        if (!p1 || !p2) throw new HttpError(409, 'This battle has a broken player list.');

        if (battle.randomTeamsRolledAt) {
            return { rolled: false, alreadyRolled: true, status: battle.status };
        }
        if (battle.status !== 'teamSelect') {
            throw new HttpError(
                409,
                `Random teams are dealt once the challenge is accepted (status: ${battle.status}).`,
            );
        }

        // The seed is the server's to choose — it decides both teams *and* every
        // roll of the dice in the battle itself, so a player who could influence
        // it could pick their own team.
        const seed = Array.isArray(battle.seed) && battle.seed.length === 4
            ? battle.seed
            : deps.makeSeed(randomInt);

        const teams = deps.generateRandomTeams({ format: deps.RANDOM_BATTLE_FORMAT, seed });
        const now = new Date().toISOString();

        // Stored exactly like a hand-built team, in the same owner-read-only
        // document, so nothing downstream needs to know it was rolled.
        for (const [side, ownerUid] of [['p1', p1], ['p2', p2]]) {
            tx.set(ref.collection('teams').doc(ownerUid), {
                showdownText: teams[side].showdownText,
                teamName: 'Random Battle',
                sprites: teams[side].roster,
                random: true,
                submittedAt: now,
            });
        }

        tx.update(ref, {
            seed,
            format: deps.RANDOM_BATTLE_FORMAT,
            // Nobody has a team to submit, so both sides are ready by definition
            // and the battle goes straight to active. That also closes the window
            // in which firestore.rules would let a player rewrite their own team
            // document (allowed only while a battle is in `teamSelect`).
            ready: { [p1]: true, [p2]: true },
            status: 'active',
            randomTeamsRolledAt: now,
            randomGeneratorVersion: GENERATOR_VERSION,
            lastActivityAt: now,
        });

        return {
            rolled: true,
            status: 'active',
            // The caller's own six, for an immediate reveal. Never the other side's.
            roster: uid === p1 ? teams.p1.roster : teams.p2.roster,
        };
    });

    return res.status(200).json({ battleId, ...outcome });
};

/**
 * `GET /api/battle-random` — a self-check in the same spirit as the resolver's.
 *
 * The failure this catches is the one that is invisible otherwise: `@pkmn/randoms`
 * missing from the deployed bundle, or a generator that loads but produces
 * nothing for the current format.
 */
const runDiagnostics = async () => {
    const checks = {
        ok: true,
        node: process.version,
        generator: GENERATOR_VERSION,
        region: process.env.VERCEL_REGION || null,
    };

    const startedAt = Date.now();
    try {
        await loadDeps();
        checks.dependencies = `ok (${Date.now() - startedAt}ms)`;
    } catch (err) {
        return {
            ...checks,
            ok: false,
            dependencies: `${err.name}: ${err.message}`,
            lastRuntimeError: getLastRuntimeError(),
        };
    }

    checks.credentials = deps.describeCredentials();
    if (checks.credentials.privateKeyProblem) checks.ok = false;

    try {
        const teams = deps.generateRandomTeams({ format: deps.RANDOM_BATTLE_FORMAT, seed: [1, 2, 3, 4] });
        const levels = teams.p1.roster.map((mon) => mon.level);
        checks.format = deps.RANDOM_BATTLE_FORMAT;
        checks.sample = {
            size: teams.p1.roster.length,
            levels: `${Math.min(...levels)}-${Math.max(...levels)}`,
            distinctSides: teams.p1.showdownText !== teams.p2.showdownText,
        };
        if (teams.p1.roster.length !== 6) checks.ok = false;
    } catch (err) {
        checks.ok = false;
        checks.generatorError = `${err.name}: ${err.message}`;
    }

    checks.lastRuntimeError = getLastRuntimeError();
    if (checks.lastRuntimeError) checks.ok = false;

    return checks;
};

export default async function handler(req, res) {
    try {
        const originAllowed = setCorsHeaders(req, res);

        if (req.method === 'OPTIONS') return res.status(204).end();
        if (!originAllowed) return res.status(403).json({ error: 'Origin not allowed.' });

        if (req.query?.ping !== undefined || req.url?.includes('ping=')) {
            return res.status(200).json({
                pong: true,
                node: process.version,
                region: process.env.VERCEL_REGION || null,
                lastRuntimeError: getLastRuntimeError(),
            });
        }

        if (req.method === 'GET') {
            const checks = await runDiagnostics();
            return res.status(checks.ok ? 200 : 503).json(checks);
        }

        if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

        return await handle(req, res);
    } catch (err) {
        console.error('battle-random failed:', err);
        if (deps?.RandomTeamError && err instanceof deps.RandomTeamError) {
            return res.status(422).json({ error: err.message, code: err.code });
        }
        if (err?.status) {
            return res.status(err.status).json({ error: err.message });
        }
        return res.status(500).json({
            error: err?.message || 'Could not deal the random teams.',
            details: String(err?.stack || err),
            lastRuntimeError: getLastRuntimeError(),
        });
    }
}
