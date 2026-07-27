import { randomInt } from 'node:crypto';

import { setCorsHeaders, HttpError } from './lib/httpBasics.js';
import { installRuntimeGuards, getLastRuntimeError, withTimeout } from './lib/runtimeGuards.js';

// An unhandled rejection anywhere in this process returns FUNCTION_INVOCATION_FAILED
// with no stack and no log line pointing at the cause.
installRuntimeGuards();

/**
 * ## Why the heavy dependencies are loaded lazily
 *
 * Everything above is either a Node builtin or a module with no imports of its
 * own, so **evaluating this file cannot fail**. That is load-bearing, not
 * tidiness.
 *
 * A serverless function is imported once, during the platform's init phase,
 * before the handler exists. Anything that throws there — a dependency missing
 * from the bundle, an init phase that runs past its deadline while parsing
 * ~32 MB of `@pkmn/sim` and firebase-admin on a fraction of a vCPU — kills the
 * process before a single line of our error handling runs. The caller gets
 * `FUNCTION_INVOCATION_FAILED`: no body, no stack, and no way to tell which of
 * those it was. That failure is invisible from the outside and identical for
 * every request, `GET` and `POST` alike, which is exactly what we were seeing.
 *
 * Moving the imports here changes two things. They run during *invoke*, with
 * the full duration budget and the CPU burst, instead of against the init
 * deadline; and if one of them does fail it now throws inside the handler's
 * `try`, so the response says which module and why. `?ping` below deliberately
 * answers before any of this runs, to tell "the function can't start" apart
 * from "a dependency can't load".
 *
 * The promise is memoised, so a warm process pays the cost once — but it's
 * cleared on failure, so one bad load doesn't poison every later request.
 */
let depsPromise = null;

/**
 * The loaded modules, once `loadDeps()` has resolved. Every helper below reads
 * from here rather than from an import binding — which is safe because both
 * entry points (`handle` and `runDiagnostics`) await `loadDeps()` before
 * touching anything else.
 */
let deps = null;

const loadDeps = () => {
    if (!depsPromise) {
        depsPromise = (async () => {
            const [firestore, serverAuth, resolver, notify] = await Promise.all([
                import('firebase-admin/firestore'),
                import('./lib/serverAuth.js'),
                import('./lib/battleResolver.js'),
                import('./lib/battleNotify.js'),
            ]);
            deps = {
                FieldValue: firestore.FieldValue,
                verifyCaller: serverAuth.verifyCaller,
                getAdminFirestore: serverAuth.getAdminFirestore,
                getAppId: serverAuth.getAppId,
                describeCredentials: serverAuth.describeCredentials,
                getFirebaseProjectId: serverAuth.getFirebaseProjectId,
                replayBattle: resolver.replayBattle,
                resolveTurn: resolver.resolveTurn,
                makeSeed: resolver.makeSeed,
                BattleResolveError: resolver.BattleResolveError,
                notifyAwaitingPlayer: notify.notifyAwaitingPlayer,
            };
            return deps;
        })().catch((err) => {
            depsPromise = null;
            throw new HttpError(503, `Could not load the battle engine: ${err.message}`);
        });
    }
    return depsPromise;
};

/**
 * POST /api/battle-turn — the authoritative turn resolver.
 *
 * Body: `{ battleId, choice? }`.
 *
 * The client submits a choice ("move 1", "switch 2", "team 123456"); the server
 * records it and, once *both* players have chosen for the current round, replays
 * the battle and writes the result. That is the whole reason this endpoint
 * exists: `seed`, `turn`, the log and `winner` have no client-writable path in
 * firestore.rules, so nothing but this function can decide an outcome — and each
 * player only ever receives their own filtered view of the protocol, so neither
 * can read the other's sets.
 *
 * Calling it without a choice is a safe no-op refresh: it initialises the seed on
 * first contact and returns the caller's current view.
 *
 * ## Idempotency
 *
 * Both clients may call this after either one moves. A choice write is guarded by
 * `create` semantics (one choice per round per player, never overwritten), and
 * resolution is guarded by the round number: if the stored round has already
 * advanced past what we replayed, another invocation won this race and we simply
 * return the fresh state instead of writing a second time.
 *
 * ## "Your turn" notifications
 *
 * Whenever `publishLog` produces a fresh `awaitingUids`, `notifyAwaitingPlayer`
 * (`./lib/battleNotify.js`) emails whichever of them is *not* the caller — the
 * caller is, by definition, in the app right now. No cron job, no queue: the
 * nudge rides the same request that changed the state.
 */

const ENGINE_VERSION = '@pkmn/sim@0.10.11';

const battleRef = (db, battleId) => db.doc(`artifacts/${deps.getAppId()}/battles/${battleId}`);

/** Rebuild the flat choice history the resolver replays. */
const readChoiceHistory = async (db, battleId, sides, upToRound) => {
    const snap = await battleRef(db, battleId).collection('choices').get();
    const byId = new Map(snap.docs.map((doc) => [doc.id, doc.data()]));

    const history = [];
    for (let round = 0; round < upToRound; round += 1) {
        // Both sides in a fixed order — the sim resolves speed itself, so the
        // order these are written in must not vary or replays would diverge.
        for (const side of ['p1', 'p2']) {
            const entry = byId.get(`${round}_${sides[side]}`);
            if (entry?.choice) history.push(`>${side} ${entry.choice}`);
        }
    }
    return { history, byId };
};

const readTeams = async (db, battleId, sides) => {
    const teamsCol = battleRef(db, battleId).collection('teams');
    const [p1Snap, p2Snap] = await Promise.all([
        teamsCol.doc(sides.p1).get(),
        teamsCol.doc(sides.p2).get(),
    ]);
    if (!p1Snap.exists || !p2Snap.exists) {
        throw new HttpError(409, 'Both trainers must submit a team before the battle can run.');
    }
    return { p1: p1Snap.data().showdownText, p2: p2Snap.data().showdownText };
};

/**
 * Display names handed to the sim. They land in the protocol as `|player|p1|…`
 * and come back in `|win|…`, so they must be distinguishable — two trainers with
 * the same display name would otherwise make the winner ambiguous.
 */
const simNames = (battle, sides) => {
    const p1 = battle.playerNames?.[sides.p1] || 'Player 1';
    const p2Raw = battle.playerNames?.[sides.p2] || 'Player 2';
    return { p1, p2: p2Raw === p1 ? `${p2Raw} (2)` : p2Raw };
};

/**
 * Publish a replay result: the new protocol lines for each player, plus whatever
 * the battle's position now is.
 *
 * ## Only the delta is stored
 *
 * `replayBattle` always returns the log from turn zero, because that's how a
 * stateless replay works. Writing that whole thing every round would mean each
 * document repeats its predecessors — the client, which concatenates the rounds
 * in order, would show every earlier line again, and the read cost would grow
 * quadratically. So `logLines` on the battle doc tracks how many lines each side
 * has already received, and only what's past that offset gets written.
 *
 * @param {boolean} advanceTurn false for the opening publish, which reveals the
 *   first prompt without any round having been resolved yet.
 */
const publishLog = async (db, battleId, { result, battle, round, sides, names, advanceTurn }) => {
    const ref = battleRef(db, battleId);
    const batch = db.batch();

    const offsets = {
        p1: Number.isInteger(battle.logLines?.p1) ? battle.logLines.p1 : 0,
        p2: Number.isInteger(battle.logLines?.p2) ? battle.logLines.p2 : 0,
    };
    const seq = Number.isInteger(battle.logSeq) ? battle.logSeq : 0;
    const createdAt = new Date().toISOString();
    const nextLines = {};

    // Append-only, and stored **per player** rather than as one doc holding both
    // sides. Firestore grants read access per document, never per field, so a
    // shared doc would hand each player the opponent's filtered stream — undoing
    // the whole point of resolving turns server-side. The sequence is zero-padded
    // so documents sort naturally.
    for (const side of ['p1', 'p2']) {
        const full = result.log[side] || [];
        const delta = full.slice(offsets[side]);
        nextLines[side] = full.length;
        if (delta.length === 0) continue;
        batch.set(
            ref.collection('playerLogs').doc(sides[side]).collection('rounds').doc(String(seq).padStart(4, '0')),
            { round, seq, lines: delta, createdAt },
        );
    }
    // The omniscient stream is deliberately NOT stored: nobody may read it while
    // the battle is live, and a public replay (phase 5) can be regenerated from
    // the seed and choices at any time.

    const winnerUid = result.winner
        ? (result.winner === names.p1 ? sides.p1 : result.winner === names.p2 ? sides.p2 : null)
        : null;

    const awaitingUids = [];
    if (!result.ended) {
        if (result.awaiting?.p1 && sides.p1) awaitingUids.push(sides.p1);
        if (result.awaiting?.p2 && sides.p2) awaitingUids.push(sides.p2);
    }

    batch.update(ref, {
        ...(advanceTurn ? { turn: round + 1 } : {}),
        logSeq: seq + 1,
        logLines: nextLines,
        awaitingChoiceFrom: awaitingUids,
        engineVersion: ENGINE_VERSION,
        lastActivityAt: createdAt,
        ...(result.ended
            ? { status: 'ended', winner: winnerUid, endedAt: createdAt }
            : {}),
    });

    await batch.commit();

    // Win/loss on the public profiles. Best-effort and separate from the batch:
    // a failed counter must not roll back a resolved battle.
    if (result.ended && winnerUid) {
        const loserUid = winnerUid === sides.p1 ? sides.p2 : sides.p1;
        const profiles = db.collection(`artifacts/${deps.getAppId()}/publicProfiles`);
        await Promise.allSettled([
            profiles.doc(winnerUid).set({ battleRecord: { wins: deps.FieldValue.increment(1) } }, { merge: true }),
            profiles.doc(loserUid).set({ battleRecord: { losses: deps.FieldValue.increment(1) } }, { merge: true }),
        ]);
    }

    return { winnerUid, awaitingUids };
};

/**
 * Which sides the sim is actually waiting on right now.
 *
 * Usually both — but not always, and the exception is what matters. When a
 * Pokémon faints, only its trainer is asked to switch: the opponent's stream
 * receives `|request|{"wait":true}` and their client has nothing it *can*
 * submit. Gating resolution on "both players have chosen" therefore deadlocks
 * the battle the first time anything faints, because the side that owes nothing
 * can never produce the choice the other side is being held for.
 *
 * `awaitingChoiceFrom` is derived by `publishLog` from the sim's own per-side
 * requests, so it is the authority on who owes what. Missing or empty — a battle
 * that predates the field, or one that hasn't bootstrapped yet — falls back to
 * requiring both, which is the right reading of team preview and of every
 * ordinary turn.
 */
const sidesOwingChoice = (battle, sides) => {
    const awaiting = Array.isArray(battle.awaitingChoiceFrom) ? battle.awaitingChoiceFrom : null;
    if (!awaiting || awaiting.length === 0) return { p1: true, p2: true };
    return { p1: awaiting.includes(sides.p1), p2: awaiting.includes(sides.p2) };
};

const handle = async (req, res) => {
    await loadDeps();

    const { uid, isAnonymous } = await deps.verifyCaller(req);
    if (isAnonymous) throw new HttpError(403, 'Battles require a full account.');

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const battleId = String(body.battleId || '').trim();
    const choice = body.choice == null ? null : String(body.choice).trim();

    if (!battleId) throw new HttpError(400, 'battleId is required.');
    if (choice && choice.length > 60) throw new HttpError(400, 'That choice is not valid.');

    const db = deps.getAdminFirestore();
    const ref = battleRef(db, battleId);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpError(404, 'Battle not found.');

    const battle = snap.data();
    const players = Array.isArray(battle.players) ? battle.players : [];
    if (!players.includes(uid)) throw new HttpError(403, 'You are not in this battle.');
    if (battle.status !== 'active') {
        throw new HttpError(409, `This battle is not active (status: ${battle.status}).`);
    }

    // p1 is the challenger, always — a fixed mapping so replays never flip sides.
    // The rules guarantee the challenger is one of the two players.
    const p1 = battle.challenger;
    const sides = { p1, p2: players.find((id) => id !== p1) };
    if (!sides.p1 || !sides.p2) throw new HttpError(409, 'This battle has a broken player list.');
    const mySide = sides.p1 === uid ? 'p1' : 'p2';

    // First contact after the players started it: the seed is the server's to
    // choose, so neither player can grind the RNG.
    let seed = battle.seed;
    if (!Array.isArray(seed) || seed.length !== 4) {
        seed = deps.makeSeed(randomInt);
        await ref.update({ seed, engineVersion: ENGINE_VERSION });
    }

    const round = Number.isInteger(battle.turn) ? battle.turn : 0;
    const teams = await readTeams(db, battleId, sides);
    const names = simNames(battle, sides);
    const { history, byId } = await readChoiceHistory(db, battleId, sides, round);

    // Bootstrap. Nothing has been logged yet, so neither player has been told
    // what the sim wants — and without a prompt neither can choose, which means
    // the battle can never start. Publishing the opening position breaks that
    // deadlock: it hands both players their team-preview request without
    // resolving anything (hence `advanceTurn: false`).
    if (!Number.isInteger(battle.logSeq) || battle.logSeq === 0) {
        const opening = await deps.replayBattle({
            format: battle.format || 'gen9customgame',
            seed,
            teams,
            names,
            choices: history,
        });
        const opened = await publishLog(db, battleId, {
            result: opening, battle, round, sides, names, advanceTurn: false,
        });
        // Re-read so the offsets below reflect what we just wrote — including
        // who the sim is now waiting on, which `sidesOwingChoice` reads.
        battle.logSeq = 1;
        battle.logLines = { p1: opening.log.p1.length, p2: opening.log.p2.length };
        battle.awaitingChoiceFrom = opened.awaitingUids;

        // The battle just went live — nudge whichever of the two didn't just
        // trigger this bootstrap (i.e. hasn't opened the app yet).
        await withTimeout(
            deps.notifyAwaitingPlayer({
                db, battleId, awaitingUids: opened.awaitingUids, callerUid: uid, callerName: names[mySide],
            }).catch((err) => console.error('Failed to notify awaiting player:', err)),
            1500,
        );
    }

    const owing = sidesOwingChoice(battle, sides);

    // A choice from someone the sim didn't ask is dropped rather than stored.
    // Storing it would be actively harmful, not merely useless: the history is
    // replayed in `p1, p2` order every round, so a stray line sits there and
    // gets fed to the sim on the *next* replay — by which point the battle has
    // moved on and the sim reads it as an answer to a different question. That
    // is how a replay silently stops matching the battle the players saw.
    if (choice && !owing[mySide]) {
        return res.status(200).json({
            battleId,
            round,
            resolved: false,
            waitingOnYou: false,
            waitingOnOpponent: true,
            ignored: 'The simulator is not waiting on you right now.',
        });
    }

    // Record this player's choice for the round, if they sent one. `create` fails
    // if it already exists, which is exactly the write-once guarantee we want.
    if (choice) {
        const choiceId = `${round}_${uid}`;
        if (!byId.has(choiceId)) {
            try {
                await ref.collection('choices').doc(choiceId).create({
                    uid,
                    side: mySide,
                    round,
                    choice,
                    createdAt: new Date().toISOString(),
                });
                byId.set(choiceId, { choice, side: mySide });
            } catch (_) {
                // Lost a race with the player's other tab — their choice is
                // already in, which is fine.
            }
        }
    }

    const p1Choice = byId.get(`${round}_${sides.p1}`)?.choice || null;
    const p2Choice = byId.get(`${round}_${sides.p2}`)?.choice || null;

    // Everyone the sim asked has to have answered — but only them. A side the
    // sim isn't prompting is not something to wait for.
    const stillOwed = (owing.p1 && !p1Choice) || (owing.p2 && !p2Choice);
    if (stillOwed) {
        const iHaveChosen = byId.has(`${round}_${uid}`);
        return res.status(200).json({
            battleId,
            round,
            resolved: false,
            waitingOnYou: owing[mySide] && !iHaveChosen,
            waitingOnOpponent: !owing[mySide] || iHaveChosen,
        });
    }

    const result = await deps.resolveTurn({
        format: battle.format || 'gen9customgame',
        seed,
        teams,
        names,
        choices: history,
        // Only feed back what was actually asked for. Replaying a choice the sim
        // never prompted for makes it answer the *next* request with a stale
        // input, which is how a replay silently diverges from the live battle.
        nextChoices: {
            p1: owing.p1 ? p1Choice : null,
            p2: owing.p2 ? p2Choice : null,
        },
    });

    // Idempotency guard: if another invocation resolved this round while we were
    // replaying, don't write a second time.
    const fresh = await ref.get();
    if ((fresh.data()?.turn ?? 0) !== round) {
        return res.status(200).json({ battleId, round, resolved: true, alreadyResolved: true });
    }

    const { winnerUid, awaitingUids } = await publishLog(db, battleId, {
        result, battle, round, sides, names, advanceTurn: true,
    });

    // A round just became someone else's to answer — tell them. Skipped on a
    // finished battle: nobody is "awaiting" a win.
    if (!result.ended) {
        await withTimeout(
            deps.notifyAwaitingPlayer({ db, battleId, awaitingUids, callerUid: uid, callerName: names[mySide] })
                .catch((err) => console.error('Failed to notify awaiting player:', err)),
            1500,
        );
    }

    return res.status(200).json({
        battleId,
        round,
        resolved: true,
        ended: result.ended,
        winner: winnerUid,
        turn: round + 1,
        waitingOnYou: awaitingUids.includes(uid),
        // The caller's own filtered view — never the opponent's.
        log: result.log[mySide],
    });
};

/**
 * `GET /api/battle-turn` — a self-check, because the interesting failures here
 * are environmental and invisible from the outside.
 *
 * Exercises each of the three things that can be broken independently: the
 * service-account credentials, a real Firestore round-trip, and the simulator.
 * Reports the *shape* of the config, never its contents — see
 * `describeCredentials` — so this is safe to leave unauthenticated, which is the
 * point: it has to work when auth is exactly what's broken.
 */
const runDiagnostics = async () => {
    const checks = {
        ok: true,
        node: process.version,
        engine: ENGINE_VERSION,
        region: process.env.VERCEL_REGION || null,
    };

    // Reported as its own step, and first, because "the dependencies won't
    // load" is the failure that used to be indistinguishable from every other
    // failure. If this is what's broken, everything below is noise.
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
        const db = deps.getAdminFirestore();
        await db.doc(`artifacts/${deps.getAppId()}/__diagnostics/ping`).get();
        checks.firestore = 'ok';
    } catch (err) {
        checks.ok = false;
        checks.firestore = `${err.name}: ${err.message}`;
    }

    // A two-Pokémon battle through the real code path: if `@pkmn/sim` failed to
    // deploy, or the format id is wrong, this is where it shows.
    try {
        const team = 'Ditto\nAbility: Limber\nLevel: 50\n- Transform\n';
        const opening = await deps.replayBattle({
            format: 'gen9customgame',
            seed: [1, 2, 3, 4],
            teams: { p1: team, p2: team },
            names: { p1: 'A', p2: 'B' },
            choices: [],
        });
        checks.sim = opening.log.omniscient.length > 0 ? 'ok' : 'produced no output';
    } catch (err) {
        checks.ok = false;
        checks.sim = `${err.name}: ${err.message}`;
    }

    // A crash on an *earlier* request to this same warm process leaves no other
    // trace the caller can see.
    checks.lastRuntimeError = getLastRuntimeError();
    if (checks.lastRuntimeError) checks.ok = false;

    return checks;
};

export default async function handler(req, res) {
    try {
        const originAllowed = setCorsHeaders(req, res);

        if (req.method === 'OPTIONS') return res.status(204).end();
        if (!originAllowed) return res.status(403).json({ error: 'Origin not allowed.' });

        // `?ping` answers without loading anything, which makes it the one probe
        // that separates the two failures that look identical from outside: if
        // this returns JSON the function starts fine and the problem is a
        // dependency (ask the bare GET, which reports which one); if this *also*
        // returns FUNCTION_INVOCATION_FAILED, nothing in this file ever ran and
        // the fault is in the deployment or the platform config, not the code.
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
        console.error('battle-turn failed:', err);
        // `deps` is null when the failure *was* the dependency load, so the
        // class to compare against may not exist yet.
        if (deps?.BattleResolveError && err instanceof deps.BattleResolveError) {
            return res.status(422).json({ error: err.message, code: err.code });
        }
        if (err?.status) {
            return res.status(err.status).json({ error: err.message });
        }
        return res.status(500).json({
            error: err?.message || 'Could not resolve the turn.',
            details: String(err?.stack || err),
            // Named here as well as in the logs: an async crash that the guards
            // caught is usually the real cause of whatever surfaced above.
            lastRuntimeError: getLastRuntimeError(),
            projectId: deps?.getFirebaseProjectId?.() || null,
        });
    }
}
