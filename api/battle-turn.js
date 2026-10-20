import { randomInt } from 'node:crypto';

import { setCorsHeaders, HttpError } from './_lib/httpBasics.js';
import { installRuntimeGuards, getLastRuntimeError, withTimeout } from './_lib/runtimeGuards.js';
import {
    PVP_FORMAT, asksTeamPreview, emptyPending, historyFromChoices, recordChoice, roundLines,
    sidesOf, sidesOwingChoice, simNames,
} from './_lib/pvpState.js';

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
                import('./_lib/serverAuth.js'),
                import('./_lib/battleResolver.js'),
                import('./_lib/battleNotify.js'),
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
 * Body: `{ battleId, choice?, action? }`.
 *
 *   - no action (or `'choose'`): submit a choice ("move 1", "switch 2"), or no
 *     choice for a safe refresh. The choice is recorded and, once everyone the
 *     sim asked has answered, the battle is replayed and the result written.
 *   - `'begin'`: the challenged trainer has written their team — accept and
 *     start in one request (the challenger's team went in with the challenge),
 *     then publish the opening position. Replaces accept → pick → lock → start.
 *   - `'forfeit'`: end a battle in progress; the other trainer wins.
 *
 * That is the whole reason this endpoint exists: `seed`, `turn`, the log and
 * `winner` have no client-writable path in firestore.rules, so nothing but
 * this function can decide an outcome — and each player only ever receives
 * their own filtered view of the protocol, so neither can read the other's sets.
 *
 * ## One private document per battle
 *
 * Seed, teams, the choice history and the round being answered live in
 * `secret/state` (`./_lib/pvpState.js` explains the read count and the leak
 * this replaced). A battle that predates it is migrated on first contact.
 *
 * ## Idempotency
 *
 * Both clients may call this after either one moves. A choice is recorded at
 * most once per round per side, inside a transaction that also decides whether
 * the round is complete — and only the request that completes it resolves it
 * (`claimedAt`). The write itself is a transaction guarded by `logSeq`, so a
 * stale claim taken over after a crash can never publish a round twice.
 *
 * ## "Your turn" notifications
 *
 * Whenever `publishLog` produces a fresh `awaitingUids`, `notifyAwaitingPlayer`
 * (`./_lib/battleNotify.js`) emails whichever of them is *not* the caller — the
 * caller is, by definition, in the app right now. No cron job, no queue: the
 * nudge rides the same request that changed the state.
 */

const ENGINE_VERSION = '@pkmn/sim@0.10.11';

// How long the response is willing to wait for the "it's your turn" nudge before
// answering anyway. It covers two sends now, not one — a Web Push (fast, and the
// only one that reaches a closed app) followed by the email — and anything still
// in flight when the function is frozen is simply lost, so the budget has to be
// the realistic cost of both rather than a round number.
const NOTIFY_BUDGET_MS = 2500;

const battleRef = (db, battleId) => db.doc(`artifacts/${deps.getAppId()}/battles/${battleId}`);
const stateRef = (db, battleId) => battleRef(db, battleId).collection('secret').doc('state');

const isSeed = (seed) => Array.isArray(seed) && seed.length === 4;
const nowIso = () => new Date().toISOString();

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
 * Create the battle's private state on first contact — from the team documents
 * and, for a battle that started before `secret/state` existed, the legacy
 * `choices` collection. Two requests racing here both build the same state;
 * `create` lets one win and the other reads what it wrote.
 */
const setUpState = async (db, battleId, battle, sides) => {
    const ref = stateRef(db, battleId);
    const existing = await ref.get();
    if (existing.exists) return existing.data();

    const seed = isSeed(battle.seed) ? battle.seed : deps.makeSeed(randomInt);
    const teams = await readTeams(db, battleId, sides);
    const round = Number.isInteger(battle.turn) ? battle.turn : 0;
    const choicesSnap = await battleRef(db, battleId).collection('choices').get();
    const byId = new Map(choicesSnap.docs.map((doc) => [doc.id, doc.data()]));
    const { history, pending } = historyFromChoices(byId, sides, round);
    const state = {
        seed,
        format: battle.format || 'gen9customgame',
        teams,
        history,
        pending,
        createdAt: nowIso(),
    };

    try {
        await ref.create(state);
    } catch (_) {
        const again = await ref.get();
        if (again.exists) return again.data();
        throw new HttpError(503, 'Could not set up the battle — try again.');
    }
    // The seed is the server's to choose, so neither player can grind the RNG.
    if (!isSeed(battle.seed)) await battleRef(db, battleId).update({ seed, engineVersion: ENGINE_VERSION });
    return state;
};

const bumpRecords = async (db, winnerUid, loserUid) => {
    // Best-effort and outside the battle's own write: a failed counter must not
    // roll back a resolved battle.
    if (!winnerUid || !loserUid) return;
    const profiles = db.collection(`artifacts/${deps.getAppId()}/publicProfiles`);
    await Promise.allSettled([
        profiles.doc(winnerUid).set({ battleRecord: { wins: deps.FieldValue.increment(1) } }, { merge: true }),
        profiles.doc(loserUid).set({ battleRecord: { losses: deps.FieldValue.increment(1) } }, { merge: true }),
    ]);
};

/**
 * Publish a replay result: the new protocol lines for each player, the battle's
 * new position, and the private state that produced it — one transaction,
 * written only if nobody published since `expectSeq` was read.
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
 * Returns the caller's own delta (`{seq, lines}`), so their screen can play the
 * turn from the response instead of waiting for the listener to bring it.
 *
 * @param {boolean} advanceTurn false for an opening publish that resolved nothing.
 */
const publishLog = async (db, battleId, {
    result, round, sides, names, advanceTurn, mySide, history, pending, expectSeq,
}) => {
    const ref = battleRef(db, battleId);
    const published = await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const battle = snap.data() || {};
        const seq = Number.isInteger(battle.logSeq) ? battle.logSeq : 0;
        if (seq !== expectSeq) return { stale: true };

        const offsets = {
            p1: Number.isInteger(battle.logLines?.p1) ? battle.logLines.p1 : 0,
            p2: Number.isInteger(battle.logLines?.p2) ? battle.logLines.p2 : 0,
        };
        const createdAt = nowIso();
        const nextLines = {};
        const deltas = {};

        // Append-only, and stored **per player** rather than as one doc holding
        // both sides. Firestore grants read access per document, never per
        // field, so a shared doc would hand each player the opponent's filtered
        // stream. The sequence is zero-padded so documents sort naturally.
        for (const side of ['p1', 'p2']) {
            const full = result.log[side] || [];
            const delta = full.slice(offsets[side]);
            nextLines[side] = full.length;
            deltas[side] = delta;
            if (delta.length === 0) continue;
            tx.set(
                ref.collection('playerLogs').doc(sides[side]).collection('rounds').doc(String(seq).padStart(4, '0')),
                { round, seq, lines: delta, createdAt },
            );
        }
        // The omniscient stream is deliberately NOT stored: nobody may read it
        // while the battle is live, and a replay can be regenerated any time.

        const winnerUid = result.winner
            ? (result.winner === names.p1 ? sides.p1 : result.winner === names.p2 ? sides.p2 : null)
            : null;

        const awaitingUids = [];
        if (!result.ended) {
            if (result.awaiting?.p1 && sides.p1) awaitingUids.push(sides.p1);
            if (result.awaiting?.p2 && sides.p2) awaitingUids.push(sides.p2);
        }

        tx.update(ref, {
            ...(advanceTurn ? { turn: round + 1 } : {}),
            logSeq: seq + 1,
            logLines: nextLines,
            awaitingChoiceFrom: awaitingUids,
            engineVersion: ENGINE_VERSION,
            lastActivityAt: createdAt,
            ...(result.ended ? { status: 'ended', winner: winnerUid, endedAt: createdAt } : {}),
        });
        tx.set(stateRef(db, battleId), { history, pending, updatedAt: createdAt }, { merge: true });

        return {
            stale: false,
            winnerUid,
            awaitingUids,
            ended: Boolean(result.ended),
            delta: mySide ? { seq, lines: deltas[mySide] } : null,
        };
    });

    if (!published.stale && published.ended && published.winnerUid) {
        await bumpRecords(db, published.winnerUid, published.winnerUid === sides.p1 ? sides.p2 : sides.p1);
    }
    return published;
};

const notifyOthers = (db, battleId, { awaitingUids, uid, callerName }) => withTimeout(
    deps.notifyAwaitingPlayer({ db, battleId, awaitingUids, callerUid: uid, callerName })
        .catch((err) => console.error('Failed to notify awaiting player:', err)),
    NOTIFY_BUDGET_MS,
);

/**
 * Publish the opening position. Nothing has been logged yet, so neither player
 * has been told what the sim wants — and without a prompt neither can choose,
 * which means the battle can never start.
 *
 * Team Preview, in a battle whose format still has it, is answered here with
 * "default" for both: the client always sent exactly that, so asking would be
 * a round trip that decides nothing.
 */
const bootstrap = async (db, battleId, { battle, state, sides, uid, mySide }) => {
    const names = simNames(battle, sides);
    const round = Number.isInteger(battle.turn) ? battle.turn : 0;
    const base = { format: state.format, seed: state.seed, teams: state.teams, names, choices: state.history };

    let result = await deps.replayBattle(base);
    let history = state.history;
    let advanceTurn = false;
    if (!result.ended && asksTeamPreview(result.log.p1) && asksTeamPreview(result.log.p2)) {
        result = await deps.resolveTurn({ ...base, nextChoices: { p1: 'default', p2: 'default' } });
        history = [...history, '>p1 default', '>p2 default'];
        advanceTurn = true;
    }

    const opened = await publishLog(db, battleId, {
        result,
        round,
        sides,
        names,
        advanceTurn,
        mySide,
        history,
        pending: emptyPending(advanceTurn ? round + 1 : round),
        expectSeq: Number.isInteger(battle.logSeq) ? battle.logSeq : 0,
    });
    // The battle just went live — nudge whichever of the two didn't trigger this.
    if (!opened.stale && !opened.ended) {
        await notifyOthers(db, battleId, { awaitingUids: opened.awaitingUids, uid, callerName: names[mySide] });
    }
    return opened;
};

/**
 * Record a choice (or none, for a refresh) and decide whether this request
 * resolves the round — one transaction over the battle and its private state.
 * `{setup: true}` when the state or the opening position doesn't exist yet.
 */
const claimRound = (db, battleId, uid, choice) => db.runTransaction(async (tx) => {
    const battleSnap = await tx.get(battleRef(db, battleId));
    if (!battleSnap.exists) throw new HttpError(404, 'Battle not found.');
    const battle = battleSnap.data();
    const players = Array.isArray(battle.players) ? battle.players : [];
    if (!players.includes(uid)) throw new HttpError(403, 'You are not in this battle.');
    if (battle.status !== 'active') {
        throw new HttpError(409, `This battle is not active (status: ${battle.status}).`);
    }
    const sides = sidesOf(battle);
    if (!sides.p1 || !sides.p2 || !players.includes(sides.p1)) {
        throw new HttpError(409, 'This battle has a broken player list.');
    }
    const mySide = sides.p1 === uid ? 'p1' : 'p2';

    const stateSnap = await tx.get(stateRef(db, battleId));
    if (!stateSnap.exists || !(Number.isInteger(battle.logSeq) && battle.logSeq > 0)) {
        return { setup: true, battle, sides, mySide };
    }
    const state = stateSnap.data();
    const round = Number.isInteger(battle.turn) ? battle.turn : 0;
    const owing = sidesOwingChoice(battle, sides);

    // A choice from someone the sim didn't ask is dropped rather than stored:
    // replayed in `p1, p2` order, a stray line would be read by the sim as an
    // answer to a different question on the next replay.
    if (choice && !owing[mySide]) return { ignored: true, battle, sides, mySide, round, owing };

    const recorded = recordChoice({ pending: state.pending, round, owing, side: mySide, choice, now: Date.now() });
    if (recorded.changed) tx.set(stateRef(db, battleId), { pending: recorded.pending }, { merge: true });
    return { battle, state, sides, mySide, round, owing, ...recorded };
});

const choose = async (db, battleId, uid, choice) => {
    const deltas = [];
    let outcome = await claimRound(db, battleId, uid, choice);

    if (outcome.setup) {
        const { battle, sides, mySide } = outcome;
        const state = await setUpState(db, battleId, battle, sides);
        if (!(Number.isInteger(battle.logSeq) && battle.logSeq > 0)) {
            const opened = await bootstrap(db, battleId, { battle, state, sides, uid, mySide });
            if (opened.delta?.lines.length) deltas.push(opened.delta);
        }
        outcome = await claimRound(db, battleId, uid, choice);
        if (outcome.setup) throw new HttpError(503, 'The battle could not be set up — try again.');
    }

    const { round, owing, mySide, sides, battle } = outcome;
    if (outcome.ignored) {
        return {
            battleId,
            round,
            resolved: false,
            waitingOnYou: false,
            waitingOnOpponent: true,
            ignored: 'The simulator is not waiting on you right now.',
            deltas,
        };
    }

    if (!outcome.claimed) {
        const iHaveChosen = Boolean(outcome.pending[mySide]);
        return {
            battleId,
            round,
            resolved: false,
            // Complete but claimed by another request: it is being resolved now.
            resolving: outcome.complete,
            waitingOnYou: owing[mySide] && !iHaveChosen,
            waitingOnOpponent: !owing[mySide] || iHaveChosen,
            deltas,
        };
    }

    const names = simNames(battle, sides);
    const { state, pending } = outcome;
    const result = await deps.resolveTurn({
        format: state.format || battle.format || 'gen9customgame',
        seed: state.seed,
        teams: state.teams,
        names,
        choices: state.history,
        // Only feed back what was actually asked for (wounds.md, 2026-07-27).
        nextChoices: { p1: owing.p1 ? pending.p1 : null, p2: owing.p2 ? pending.p2 : null },
    });

    const published = await publishLog(db, battleId, {
        result,
        round,
        sides,
        names,
        advanceTurn: true,
        mySide,
        history: [...state.history, ...roundLines(pending, owing)],
        pending: emptyPending(round + 1),
        expectSeq: battle.logSeq,
    });
    if (published.stale) return { battleId, round, resolved: true, alreadyResolved: true, deltas };
    if (published.delta?.lines.length) deltas.push(published.delta);

    // A round just became someone else's to answer — tell them. Skipped on a
    // finished battle: nobody is "awaiting" a win.
    if (!published.ended) {
        await notifyOthers(db, battleId, { awaitingUids: published.awaitingUids, uid, callerName: names[mySide] });
    }

    return {
        battleId,
        round,
        resolved: true,
        ended: published.ended,
        winner: published.winnerUid,
        turn: round + 1,
        waitingOnYou: published.awaitingUids.includes(uid),
        // The caller's own filtered lines — never the opponent's.
        deltas,
    };
};

/**
 * Accept and start in one request. The challenged trainer's client has just
 * written its team (`teams/{uid}`, which the rules allow on create); the
 * challenger's went in with the challenge. With both in, the battle goes live
 * under `PVP_FORMAT` and the opening is published in the same request — the
 * challenger's screen gets it through the listener.
 *
 * A challenge sent before teams travelled with it has no challenger team yet:
 * the battle then waits in `teamSelect` for it, and the challenger's own
 * `begin`, after they pick one, starts it.
 */
const begin = async (db, battleId, uid) => {
    const ref = battleRef(db, battleId);
    const outcome = await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) throw new HttpError(404, 'Battle not found.');
        const battle = snap.data();
        const players = Array.isArray(battle.players) ? battle.players : [];
        if (!players.includes(uid)) throw new HttpError(403, 'You are not in this battle.');
        if (battle.status === 'active') return { begun: true };
        if (battle.mode === 'random') throw new HttpError(409, 'A random battle is dealt by /api/battle-random.');
        if (!['pending', 'teamSelect'].includes(battle.status)) {
            throw new HttpError(409, `This battle cannot start (status: ${battle.status}).`);
        }
        if (battle.status === 'pending' && uid === battle.challenger) {
            throw new HttpError(409, 'Your opponent has not accepted yet.');
        }

        const sides = sidesOf(battle);
        if (!sides.p1 || !sides.p2) throw new HttpError(409, 'This battle has a broken player list.');
        const teams = ref.collection('teams');
        const has = {
            p1: (await tx.get(teams.doc(sides.p1))).exists,
            p2: (await tx.get(teams.doc(sides.p2))).exists,
        };
        const ready = {};
        if (has.p1) ready[sides.p1] = true;
        if (has.p2) ready[sides.p2] = true;
        const now = nowIso();

        if (!has.p1 || !has.p2) {
            tx.update(ref, { status: 'teamSelect', ready, lastActivityAt: now });
            return { begun: false, waitingOn: has.p1 ? sides.p2 : sides.p1 };
        }
        tx.update(ref, {
            status: 'active',
            ready,
            // Nothing has been replayed yet, so the format is still ours to set —
            // whatever an older client wrote at creation.
            format: PVP_FORMAT,
            seed: isSeed(battle.seed) ? battle.seed : deps.makeSeed(randomInt),
            startedAt: now,
            lastActivityAt: now,
        });
        return { begun: true };
    });

    if (!outcome.begun) {
        return { battleId, begun: false, waitingForTeam: outcome.waitingOn === uid ? 'you' : 'opponent' };
    }
    return { ...(await choose(db, battleId, uid, null)), begun: true };
};

/** End a battle in progress: the caller gives up, the other trainer wins. */
const forfeit = async (db, battleId, uid) => {
    const ref = battleRef(db, battleId);
    const outcome = await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) throw new HttpError(404, 'Battle not found.');
        const battle = snap.data();
        const players = Array.isArray(battle.players) ? battle.players : [];
        if (!players.includes(uid)) throw new HttpError(403, 'You are not in this battle.');
        if (battle.status === 'ended') return { already: true, winner: battle.winner || null };
        if (battle.status !== 'active') {
            throw new HttpError(409, 'Only a battle in progress can be forfeited.');
        }
        const winner = players.find((id) => id !== uid) || null;
        const now = nowIso();
        tx.update(ref, {
            status: 'ended',
            winner,
            forfeitedBy: uid,
            endedAt: now,
            awaitingChoiceFrom: [],
            lastActivityAt: now,
        });
        return { already: false, winner };
    });
    if (!outcome.already) await bumpRecords(db, outcome.winner, uid);
    return { battleId, ended: true, forfeited: true, winner: outcome.winner };
};

const handle = async (req, res) => {
    await loadDeps();

    const { uid, isAnonymous } = await deps.verifyCaller(req);
    if (isAnonymous) throw new HttpError(403, 'Battles require a full account.');

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const battleId = String(body.battleId || '').trim();
    const action = body.action == null ? 'choose' : String(body.action);
    const choice = body.choice == null ? null : String(body.choice).trim();

    if (!battleId) throw new HttpError(400, 'battleId is required.');
    if (choice && choice.length > 60) throw new HttpError(400, 'That choice is not valid.');

    const db = deps.getAdminFirestore();
    if (action === 'begin') return res.status(200).json(await begin(db, battleId, uid));
    if (action === 'forfeit') return res.status(200).json(await forfeit(db, battleId, uid));
    if (action !== 'choose') throw new HttpError(400, 'Unknown action.');
    return res.status(200).json(await choose(db, battleId, uid, choice || null));
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
