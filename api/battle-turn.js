import { FieldValue } from 'firebase-admin/firestore';
import { randomInt } from 'node:crypto';

import {
    verifyCaller, getAdminFirestore, getAppId, setCorsHeaders, HttpError,
} from './lib/serverAuth.js';
import {
    replayBattle, resolveTurn, makeSeed, BattleResolveError,
} from './lib/battleResolver.js';
import { notifyAwaitingPlayer } from './lib/battleNotify.js';

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

const battleRef = (db, battleId) => db.doc(`artifacts/${getAppId()}/battles/${battleId}`);

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
        if (result.awaiting.p1) awaitingUids.push(sides.p1);
        if (result.awaiting.p2) awaitingUids.push(sides.p2);
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
        const profiles = db.collection(`artifacts/${getAppId()}/publicProfiles`);
        await Promise.allSettled([
            profiles.doc(winnerUid).set({ battleRecord: { wins: FieldValue.increment(1) } }, { merge: true }),
            profiles.doc(loserUid).set({ battleRecord: { losses: FieldValue.increment(1) } }, { merge: true }),
        ]);
    }

    return { winnerUid, awaitingUids };
};

const handle = async (req, res) => {
    const { uid, isAnonymous } = await verifyCaller(req);
    if (isAnonymous) throw new HttpError(403, 'Battles require a full account.');

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const battleId = String(body.battleId || '').trim();
    const choice = body.choice == null ? null : String(body.choice).trim();

    if (!battleId) throw new HttpError(400, 'battleId is required.');
    if (choice && choice.length > 60) throw new HttpError(400, 'That choice is not valid.');

    const db = getAdminFirestore();
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
    if (!sides.p2) throw new HttpError(409, 'This battle has a broken player list.');
    const mySide = sides.p1 === uid ? 'p1' : 'p2';

    // First contact after the players started it: the seed is the server's to
    // choose, so neither player can grind the RNG.
    let seed = battle.seed;
    if (!Array.isArray(seed) || seed.length !== 4) {
        seed = makeSeed(randomInt);
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
        const opening = await replayBattle({
            format: battle.format || 'gen9customgame',
            seed,
            teams,
            names,
            choices: history,
        });
        const opened = await publishLog(db, battleId, {
            result: opening, battle, round, sides, names, advanceTurn: false,
        });
        // Re-read so the offsets below reflect what we just wrote.
        battle.logSeq = 1;
        battle.logLines = { p1: opening.log.p1.length, p2: opening.log.p2.length };

        // The battle just went live — nudge whichever of the two didn't just
        // trigger this bootstrap (i.e. hasn't opened the app yet).
        await notifyAwaitingPlayer({
            db, battleId, awaitingUids: opened.awaitingUids, callerUid: uid, callerName: names[mySide],
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

    // Not both in yet: nothing to resolve. Report the position and stop.
    if (!p1Choice || !p2Choice) {
        return res.status(200).json({
            battleId,
            round,
            resolved: false,
            waitingOnYou: !byId.has(`${round}_${uid}`),
            waitingOnOpponent: Boolean(byId.has(`${round}_${uid}`)),
        });
    }

    const result = await resolveTurn({
        format: battle.format || 'gen9customgame',
        seed,
        teams,
        names,
        choices: history,
        nextChoices: { p1: p1Choice, p2: p2Choice },
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
        await notifyAwaitingPlayer({ db, battleId, awaitingUids, callerUid: uid, callerName: names[mySide] });
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

export default async function handler(req, res) {
    const originAllowed = setCorsHeaders(req, res);

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (!originAllowed) return res.status(403).json({ error: 'Origin not allowed.' });
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

    try {
        return await handle(req, res);
    } catch (err) {
        if (err instanceof BattleResolveError) {
            return res.status(422).json({ error: err.message, code: err.code });
        }
        if (err?.status) {
            return res.status(err.status).json({ error: err.message });
        }
        console.error('battle-turn failed:', err);
        return res.status(500).json({ error: 'Could not resolve the turn.' });
    }
}
