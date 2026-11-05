import { AI_VERSION, decide } from '../ai/index.js';
import { FEATURE_VERSION } from '../ai/features.js';
import { trainingRow, winProbFull } from '../ai/observe.js';
import WIN_MODEL from '../ai/models/winprob-v1.js';
import {
    CHAMPION_IDS, CHAMPIONS, CHOICE_PATTERN, DEFAULT_CHAMPION, ENGINE_VERSION, FORMAT, MAX_NAME_LENGTH,
} from './constants.js';
import { dailyTeamFor } from './dailyTeam.js';
import { dayKeyAt, isoWeekOf, nextResetAt } from './day.js';
import { dialogueEvents } from './dialogue.js';
import { apply, battleNames, createMatch, outcome, owes, replay, requestOf, snapshot } from './engine.js';
import { fail } from './errors.js';
import {
    effectiveStreak, nextStats, resultOf, statsOf, withStats,
} from './outcome.js';
import { boardOf, forgetPlayer, nextRanks, placeOf, publicRanks } from './ranking.js';
import { aceFor, championTeamTextFor, difficultyFor } from './rotation.js';
import {
    buildDayDoc, officialRunId, paths, practiceRunId,
} from './runs.js';
import { validateTeam } from './validateTeam.js';

/**
 * The challenge's actions, independent of HTTP so they can be tested
 * against an in-memory Firestore. `api/challenge.js` is only the door.
 *
 * ## A turn (`choose`)
 *
 *   read run + secret → check owner, status, day, turn
 *   replay(seed, teams, choices)                       ~5–70 ms
 *   snapshot ← BEFORE the player's choice              (AI invariant I1)
 *   AI decides on the snapshot; player's choice applied (the sim validates it)
 *   while only Cynthia owes a choice (a faint): AI decides again
 *   transaction: re-read the turn, write round + choices + run (+ stats)
 *
 * The replay and the AI run **outside** the transaction: inside it there is
 * only a re-read of `turn` and the writes, so the document is locked for a
 * couple of round trips rather than for the whole computation. Two tabs racing
 * the same turn both compute; the second finds the turn moved and gets
 * `staleTurn`, and nothing it computed is written.
 */

const TRAINING_RETENTION_DAYS = 365;
const MAX_AI_TRACE = 10;
const MAX_FORCED_STEPS = 6;

const requireRegistered = (caller) => {
    if (caller.isAnonymous) throw fail(403, 'signInRequired');
};

const cleanName = (value) => String(value || '').replace(/[|\n\r]/g, '').trim().slice(0, MAX_NAME_LENGTH);

const makeSeed = (randomInt) => [0, 1, 2, 3].map(() => randomInt(0x10000));

/** The champion a request names; none means Cynthia, as before there were two. */
const championFrom = (value) => {
    if (value === undefined || value === null || value === '') return DEFAULT_CHAMPION;
    if (!CHAMPION_IDS.includes(value)) throw fail(400, 'badRequest', { detail: 'championId' });
    return value;
};

/** A run's champion: runs from before there were two carry none. */
const championOfRun = (run) => (CHAMPIONS[run?.championId] ? run.championId : DEFAULT_CHAMPION);

/** The record the screen shows for one champion. */
const statsView = (stats, dayKey) => ({
    streak: effectiveStreak(stats, dayKey),
    bestStreak: stats.bestStreak || 0,
    wins: stats.wins || 0,
    played: stats.played || 0,
});

const otherBoard = (board) => (board === 'daily' ? 'free' : 'daily');

/** The player's team for `start`: the champion's Time do dia, or a validated saved team. */
const resolveTeam = (team, dayKey, championId) => {
    if (team?.source === 'daily') {
        return { text: dailyTeamFor(dayKey, championId).showdownText, source: 'daily', name: 'daily', tier: 'daily' };
    }
    if (team?.source !== 'saved') throw fail(400, 'badRequest', { detail: 'team.source must be "saved" or "daily"' });
    const checked = validateTeam(team.showdownText);
    if (!checked.ok) throw fail(400, 'invalidTeam', { errors: checked.errors });
    return {
        text: checked.text,
        source: 'saved',
        name: cleanName(team.name) || 'team',
        // A label only — computed by the client, recorded, never trusted.
        tier: String(team.tier || '').slice(0, 12),
    };
};

/**
 * The win-chance curve's first point (the player's chance, full information)
 * and its mark — the battle turn and the player's log length at that moment.
 */
const firstCurvePoint = (battle, lineCount, model) => {
    const p = winProbFull(snapshot(battle), model);
    return p === null
        ? { winCurve: [], winMarks: [] }
        : { winCurve: [p], winMarks: [{ turn: battle.turn, line: lineCount }] };
};

/** The curve as a run and a result carry it: both arrays, or neither. */
const curveFields = (curve = [], marks = []) => (curve?.length
    ? { winChanceCurve: curve, winChanceMarks: marks?.length === curve.length ? marks : null }
    : { winChanceCurve: null, winChanceMarks: null });

/**
 * @param {{db: object, appId: string, now?: () => number, randomInt: (n: number) => number,
 *          model?: object|null}} deps
 */
export const createChallengeService = ({ db, appId, now = () => Date.now(), randomInt, model = WIN_MODEL }) => {
    const p = paths(appId);
    const ref = (path) => db.doc(path);

    const expire = async (run, runId, dayKey) => {
        await db.runTransaction(async (tx) => {
            const fresh = await tx.get(ref(p.run(runId)));
            const statsSnap = run.practice ? null : await tx.get(ref(p.stats(run.uid)));
            if (fresh.data()?.status !== 'active') return;
            const stamp = new Date(now()).toISOString();
            tx.update(ref(p.run(runId)), { status: 'expired', updatedAt: stamp, endedAt: stamp });
            if (!run.practice) {
                const championId = championOfRun(run);
                const next = nextStats(statsOf(statsSnap.data(), championId, run.uid), { dayKey: run.dayKey, status: 'expired' });
                tx.set(ref(p.stats(run.uid)), withStats(statsSnap.data(), championId, next, run.uid));
            }
        });
        throw fail(410, 'dayClosed', { status: 'expired', dayKey });
    };

    /** A run the caller owns, still playable today. */
    const loadOwnRun = async (uid, runId) => {
        if (typeof runId !== 'string' || !runId || runId.length > 160 || runId.includes('/')) throw fail(400, 'badRequest', { detail: 'runId' });
        const [runSnap, secretSnap] = await Promise.all([ref(p.run(runId)).get(), ref(p.secret(runId)).get()]);
        if (!runSnap.exists) throw fail(404, 'runNotFound');
        const run = runSnap.data();
        if (run.uid !== uid) throw fail(403, 'notOwner');
        if (run.status !== 'active') throw fail(409, 'runEnded', { status: run.status });
        const today = dayKeyAt(now());
        if (run.dayKey !== today) await expire(run, runId, today);
        return { run, secret: secretSnap.data() };
    };

    const ensureDay = async (caller, body = {}) => {
        const championId = championFrom(body?.championId);
        const dayKey = dayKeyAt(now());
        const created = await db.runTransaction(async (tx) => {
            const snap = await tx.get(ref(p.day(dayKey, championId)));
            if (snap.exists) return false;
            tx.set(ref(p.day(dayKey, championId)), buildDayDoc({ dayKey, championId, aiVersion: AI_VERSION, nowMs: now() }));
            return true;
        });
        return { dayKey, created };
    };

    /**
     * Whether the caller finished and beat each champion today — the selector
     * and the "another champion is waiting" card. `known` spares the reads of
     * the champion already loaded.
     */
    const championsToday = async (uid, dayKey, known) => Promise.all(CHAMPION_IDS.map(async (id) => {
        const officials = known[id] || (uid
            ? await Promise.all(['daily', 'free'].map(async (board) => {
                const snap = await ref(p.run(officialRunId(uid, dayKey, id, board))).get();
                return snap.exists ? snap.data() : null;
            }))
            : []);
        return {
            id,
            name: CHAMPIONS[id].name,
            played: officials.some((run) => run && run.status !== 'active'),
            won: officials.some((run) => run?.status === 'won'),
        };
    }));

    /** A run as the player may see it: no seed, no choices, no AI trace. */
    const publicRun = (runId, run, lines) => ({
        runId,
        practice: Boolean(run.practice),
        status: run.status,
        turn: run.turn,
        teamSource: run.teamSource,
        teamName: run.teamName,
        result: run.result || null,
        winChanceCurve: run.status === 'active' ? null : (run.winChanceCurve || null),
        winChanceMarks: run.status === 'active' ? null : (run.winChanceMarks || null),
        lines,
    });

    /**
     * Everything the challenge screen needs, in one call: today's public day,
     * the run to show (an active practice, else the official one) with all of
     * the player's log lines, and their streak.
     *
     * The screen reads through here rather than straight from Firestore: it
     * needs the function warm anyway (its first `choose` would pay the cold
     * start), so this call is the warm-up, and it spares one read per round.
     * The Home card, which must never wake the function, reads Firestore.
     */
    const state = async (caller, body = {}) => {
        const championId = championFrom(body?.championId);
        const nowMs = now();
        const dayKey = dayKeyAt(nowMs);
        let daySnap = await ref(p.day(dayKey, championId)).get();
        if (!daySnap.exists) {
            await ensureDay(caller, { championId });
            daySnap = await ref(p.day(dayKey, championId)).get();
        }
        const day = daySnap.data();
        const base = {
            dayKey,
            championId,
            nextResetAt: nextResetAt(nowMs),
            day: {
                difficulty: day.difficulty,
                challengeKey: day.challengeKey,
                championName: day.championName,
                lineup: day.lineup,
                dailyTeam: { members: day.dailyTeam?.members || [] },
            },
        };
        // Every champion's ranking, so the screen can show either board without
        // leaving the room (and fall back to one that has players). `ranks`
        // stays the champion on screen's, for clients from before.
        const viewer = caller.isAnonymous ? null : caller.uid;
        const allRanks = await Promise.all(CHAMPION_IDS.map(async (id) => {
            const snap = await ref(p.ranks(dayKey, id)).get();
            return [id, publicRanks(snap.exists ? snap.data() : null, viewer)];
        }));
        base.ranksByChampion = Object.fromEntries(allRanks);
        base.ranks = base.ranksByChampion[championId];
        if (caller.isAnonymous) {
            return { ...base, official: null, officials: null, run: null, stats: null, champions: await championsToday(null, dayKey, {}) };
        }

        // One official per board: the first battle with the Time do dia, and the first with your own team.
        const ids = { daily: officialRunId(caller.uid, dayKey, championId, 'daily'), free: officialRunId(caller.uid, dayKey, championId, 'free') };
        const [dailySnap, freeSnap, statsSnap] = await Promise.all([ref(p.run(ids.daily)).get(), ref(p.run(ids.free)).get(), ref(p.stats(caller.uid)).get()]);
        const docs = { daily: dailySnap.exists ? dailySnap.data() : null, free: freeSnap.exists ? freeSnap.data() : null };
        const stats = statsOf(statsSnap.exists ? statsSnap.data() : null, championId, caller.uid);

        // Each board shows its latest practice once its official is over; the
        // screen gets a battle in progress first, else whichever moved last.
        const candidates = await Promise.all(['daily', 'free'].map(async (board) => {
            const official = docs[board];
            if (!official) return null;
            if (official.status !== 'active' && official.activePracticeId) {
                const practiceSnap = await ref(p.run(official.activePracticeId)).get();
                if (practiceSnap.exists) return { board, runId: official.activePracticeId, run: practiceSnap.data() };
            }
            return { board, runId: ids[board], run: official };
        }));
        const shown = candidates.filter(Boolean).sort((a, b) => Number(b.run.status === 'active') - Number(a.run.status === 'active')
            || String(b.run.updatedAt || '').localeCompare(String(a.run.updatedAt || '')))[0] || null;

        let run = null;
        if (shown) {
            const secret = (await ref(p.secret(shown.runId)).get()).data();
            const match = replay({ format: secret.format, seed: secret.seed, teams: secret.teams, names: secret.names, choices: secret.choices });
            run = publicRun(shown.runId, shown.run, match.lines.p1);
        }

        const summaryOf = (board) => (docs[board] ? { runId: ids[board], status: docs[board].status, result: docs[board].result || null } : null);
        const officials = { daily: summaryOf('daily'), free: summaryOf('free') };
        return {
            ...base,
            // The official of the board on screen — what the screen read before there were two.
            official: shown ? officials[shown.board] : null,
            officials,
            run,
            stats: statsView(stats, dayKey),
            champions: await championsToday(caller.uid, dayKey, { [championId]: [docs.daily, docs.free] }),
        };
    };

    const start = async (caller, body) => {
        requireRegistered(caller);
        const championId = championFrom(body.championId);
        const champion = CHAMPIONS[championId];
        const practice = Boolean(body.practice);
        const dayKey = dayKeyAt(now());
        const team = resolveTeam(body.team, dayKey, championId);
        // The team decides the board, and each board has its own official run.
        const board = boardOf(team.source);
        const officialId = officialRunId(caller.uid, dayKey, championId, board);
        const otherId = officialRunId(caller.uid, dayKey, championId, otherBoard(board));

        return db.runTransaction(async (tx) => {
            const [daySnap, officialSnap, otherSnap] = await Promise.all([
                tx.get(ref(p.day(dayKey, championId))), tx.get(ref(p.run(officialId))), tx.get(ref(p.run(otherId))),
            ]);
            const official = officialSnap.exists ? officialSnap.data() : null;
            const other = otherSnap.exists ? otherSnap.data() : null;
            // One battle at a time against a champion: one in progress is resumed, not doubled.
            if (other?.status === 'active') throw fail(409, 'officialAlreadyPlayed', { runId: otherId, status: other.status });
            let runId = officialId;
            let practiceN = null;
            if (!practice) {
                if (official) throw fail(409, 'officialAlreadyPlayed', { runId: officialId, status: official.status });
            } else {
                if (!official || official.status === 'active') throw fail(403, 'practiceLocked');
                practiceN = (official.practiceCount || 0) + 1;
                runId = practiceRunId(officialId, practiceN);
            }
            // A new battle closes a practice still open on either board.
            const openPractices = [];
            for (const parent of [official, other]) {
                if (!parent?.activePracticeId) continue;
                const prev = await tx.get(ref(p.run(parent.activePracticeId)));
                if (prev.exists && prev.data().status === 'active') openPractices.push(parent.activePracticeId);
            }

            const seed = makeSeed(randomInt);
            const names = battleNames(body.trainerName, champion.name);
            const teams = { p1: team.text, p2: championTeamTextFor(dayKey, championId) };
            const match = createMatch({ seed, teams, names });
            const lines = match.lines.p1;
            const spoken = dialogueEvents([], lines, {
                said: [], aceSpecies: aceFor(dayKey, championId), championName: champion.name, championId,
            });
            const stamp = new Date(now()).toISOString();
            const difficulty = difficultyFor(dayKey);

            if (!daySnap.exists) tx.set(ref(p.day(dayKey, championId)), buildDayDoc({ dayKey, championId, aiVersion: AI_VERSION, nowMs: now() }));
            tx.set(ref(p.run(runId)), {
                uid: caller.uid,
                dayKey,
                practice,
                practiceN,
                championId,
                challengeKey: difficulty,
                board,
                teamSource: team.source,
                teamName: team.name,
                teamTier: team.tier,
                status: 'active',
                turn: 0,
                roundCount: 1,
                lineCount: lines.length,
                result: null,
                winChanceCurve: null,
                winChanceMarks: null,
                engineVersion: ENGINE_VERSION,
                aiVersion: AI_VERSION,
                createdAt: stamp,
                updatedAt: stamp,
                endedAt: null,
                ...(practice ? {} : { practiceCount: 0, activePracticeId: null }),
            });
            tx.set(ref(p.round(runId, 0)), { seq: 0, turn: 0, lines, events: spoken.events, createdAt: stamp });
            tx.set(ref(p.secret(runId)), {
                format: FORMAT,
                seed,
                teams,
                names,
                profileKey: difficulty,
                choices: [],
                aiTrace: [],
                said: spoken.said,
                ...firstCurvePoint(match.battle, lines.length, model),
                training: [],
            });
            if (practice) tx.update(ref(p.run(officialId)), { practiceCount: practiceN, activePracticeId: runId, updatedAt: stamp });
            for (const id of openPractices) tx.update(ref(p.run(id)), { status: 'lost', updatedAt: stamp, endedAt: stamp });
            return { runId, turn: 0, status: 'active', practice, lines, events: spoken.events };
        });
    };

    const choose = async (caller, body) => {
        requireRegistered(caller);
        const choice = String(body.choice || '').trim();
        if (!CHOICE_PATTERN.test(choice)) throw fail(400, 'invalidChoice', { detail: 'format' });
        if (!Number.isInteger(body.turn)) throw fail(400, 'badRequest', { detail: 'turn' });

        const { run, secret } = await loadOwnRun(caller.uid, body.runId);
        if (body.turn !== run.turn) throw fail(409, 'staleTurn', { turn: run.turn });
        const championId = championOfRun(run);
        const champion = CHAMPIONS[championId];
        // The day's ace: who the AI keeps for last, and who her "ace" line is about.
        const aceSpecies = aceFor(run.dayKey, championId);

        const match = replay({ format: secret.format, seed: secret.seed, teams: secret.teams, names: secret.names, choices: secret.choices });
        const { battle } = match;
        if (!owes(battle, 'p1')) throw fail(409, 'notYourTurn', { turn: run.turn });

        const decisions = [];
        const newChoices = [];
        let training = null;
        const decideNow = () => decide({
            snapshot: snapshot(battle),
            request: requestOf(battle, 'p2'),
            p2Lines: match.lines.p2,
            seed: secret.seed,
            turn: `${run.turn}.${decisions.length}`,
            profileKey: secret.profileKey,
            championId,
            aceSpecies,
            model,
        });

        // I1: Cynthia's choice for this turn comes from the battle *before* the player's.
        const aiFirst = owes(battle, 'p2') ? decideNow() : null;
        if (aiFirst) decisions.push(aiFirst);
        if (aiFirst && !requestOf(battle, 'p1')?.forceSwitch) {
            training = trainingRow({ snapshot: snapshot(battle), p2Lines: match.lines.p2, p1Request: requestOf(battle, 'p1'), p1Choice: choice });
        }

        const mine = apply(match, 'p1', choice);
        if (!mine.ok) throw fail(400, 'invalidChoice', { simError: mine.error });
        newChoices.push({ side: 'p1', choice, turn: run.turn });

        const applyAi = (decision) => {
            let result = apply(match, 'p2', decision.choice);
            let used = decision.choice;
            if (!result.ok) {
                // Never expected (I6), never fatal: the sim's default is legal.
                used = 'default';
                result = apply(match, 'p2', used);
                decision.trace = { ...decision.trace, refused: decision.choice };
            }
            newChoices.push({ side: 'p2', choice: used, turn: run.turn });
        };
        if (aiFirst) applyAi(aiFirst);

        // After a faint the sim may ask only her; answer within the same request
        // so the player never waits on a turn that is the CPU's.
        for (let step = 0; step < MAX_FORCED_STEPS && owes(battle, 'p2') && !owes(battle, 'p1'); step += 1) {
            const next = decideNow();
            decisions.push(next);
            applyAi(next);
        }

        const out = outcome(battle);
        const status = out.ended ? (out.winner === 'p1' ? 'won' : 'lost') : 'active';
        const newLines = match.lines.p1.slice(run.lineCount);
        const winNow = winProbFull(snapshot(battle), model);
        const winCurve = winNow === null ? (secret.winCurve || []) : [...(secret.winCurve || []), winNow];
        // Where each point was taken: the battle turn and the player's log length,
        // so the result can name what caused the biggest swing.
        const winMarks = winNow === null ? (secret.winMarks || []) : [...(secret.winMarks || []), { turn: battle.turn, line: match.lines.p1.length }];
        const lastWin = secret.winCurve?.length ? secret.winCurve[secret.winCurve.length - 1] : null;
        const spoken = dialogueEvents(match.lines.p1.slice(0, run.lineCount), newLines, {
            said: secret.said || [],
            aceSpecies,
            championName: champion.name,
            championId,
            // Her view of the swing: 1 − the player's chance.
            winProb: { before: lastWin === null ? null : 1 - lastWin, after: winNow === null ? null : 1 - winNow },
        });
        const result = out.ended ? resultOf(out, status) : null;
        const stamp = new Date(now()).toISOString();
        const trainingRows = training ? [...(secret.training || []), training] : (secret.training || []);

        const { stats, ranks } = await db.runTransaction(async (tx) => {
            const fresh = await tx.get(ref(p.run(body.runId)));
            const statsSnap = out.ended && !run.practice ? await tx.get(ref(p.stats(caller.uid))) : null;
            const ranksSnap = statsSnap ? await tx.get(ref(p.ranks(run.dayKey, championId))) : null;
            // A win takes a place, and the row shows the trainer's public profile.
            const profileSnap = ranksSnap && status === 'won' ? await tx.get(ref(p.profile(caller.uid))) : null;
            if (fresh.data()?.turn !== run.turn || fresh.data()?.status !== 'active') {
                throw fail(409, 'staleTurn', { turn: fresh.data()?.turn ?? run.turn });
            }

            tx.set(ref(p.round(body.runId, run.roundCount)), { seq: run.roundCount, turn: run.turn + 1, lines: newLines, events: spoken.events, createdAt: stamp });
            tx.set(ref(p.secret(body.runId)), {
                ...secret,
                choices: [...secret.choices, ...newChoices],
                aiTrace: [...(secret.aiTrace || []), ...decisions.map((d) => d.trace).filter(Boolean)].slice(-MAX_AI_TRACE),
                said: spoken.said,
                winCurve,
                winMarks,
                training: trainingRows,
            });
            tx.update(ref(p.run(body.runId)), {
                turn: run.turn + 1,
                roundCount: run.roundCount + 1,
                lineCount: match.lines.p1.length,
                status,
                result,
                updatedAt: stamp,
                ...(out.ended ? { endedAt: stamp, ...curveFields(winCurve, winMarks) } : {}),
            });

            let nextStatsDoc = null;
            if (statsSnap) {
                nextStatsDoc = nextStats(statsOf(statsSnap.data(), championId, caller.uid), { dayKey: run.dayKey, status });
                tx.set(ref(p.stats(caller.uid)), withStats(statsSnap.data(), championId, nextStatsDoc, caller.uid));
            }
            // The day's ranking: every official finish counts, a win takes a place.
            let nextRanksDoc = null;
            if (ranksSnap) {
                nextRanksDoc = nextRanks(ranksSnap.exists ? ranksSnap.data() : null, {
                    dayKey: run.dayKey, teamSource: run.teamSource, uid: caller.uid, name: secret.names?.p1 || 'Trainer', status, result, at: stamp,
                    profile: profileSnap?.exists ? profileSnap.data() : null,
                });
                tx.set(ref(p.ranks(run.dayKey, championId)), nextRanksDoc);
            }
            if (out.ended && trainingRows.length) {
                // Anonymous by construction: no uid, run id, names, team text or time of day.
                tx.set(db.collection(`artifacts/${appId}/aiTraining`).doc(), {
                    schema: 1,
                    aiVersion: AI_VERSION,
                    engineVersion: ENGINE_VERSION,
                    featureVersion: FEATURE_VERSION,
                    week: isoWeekOf(run.dayKey),
                    difficulty: secret.profileKey,
                    championId,
                    teamSource: run.teamSource,
                    outcome: status === 'won' ? 0 : 1,
                    turns: trainingRows,
                    expiresAt: new Date(now() + TRAINING_RETENTION_DAYS * 86_400_000).toISOString(),
                });
            }
            return { stats: nextStatsDoc, ranks: nextRanksDoc };
        });

        return {
            turn: run.turn + 1,
            status,
            lines: newLines,
            events: spoken.events,
            result: result ? {
                ...result,
                streak: stats ? effectiveStreak(stats, run.dayKey) : null,
                bestStreak: stats?.bestStreak ?? null,
                ...curveFields(winCurve, winMarks),
                ...(ranks ? { board: boardOf(run.teamSource), place: placeOf(ranks, boardOf(run.teamSource), caller.uid) } : {}),
            } : null,
            ...(ranks ? { ranks: publicRanks(ranks, caller.uid) } : {}),
            ...(stats ? { stats: statsView(stats, run.dayKey) } : {}),
        };
    };

    const forfeit = async (caller, body) => {
        requireRegistered(caller);
        const { run, secret } = await loadOwnRun(caller.uid, body.runId);
        const championId = championOfRun(run);
        const match = replay({ format: secret.format, seed: secret.seed, teams: secret.teams, names: secret.names, choices: secret.choices });
        const result = resultOf(outcome(match.battle), 'lost');
        const stamp = new Date(now()).toISOString();
        const { stats, ranks } = await db.runTransaction(async (tx) => {
            const fresh = await tx.get(ref(p.run(body.runId)));
            const statsSnap = run.practice ? null : await tx.get(ref(p.stats(caller.uid)));
            const ranksSnap = run.practice ? null : await tx.get(ref(p.ranks(run.dayKey, championId)));
            if (fresh.data()?.status !== 'active') throw fail(409, 'runEnded', { status: fresh.data()?.status });
            tx.update(ref(p.run(body.runId)), {
                status: 'lost', result, updatedAt: stamp, endedAt: stamp, forfeited: true, ...curveFields(secret.winCurve, secret.winMarks),
            });
            if (!statsSnap) return { stats: null, ranks: null };
            const next = nextStats(statsOf(statsSnap.data(), championId, caller.uid), { dayKey: run.dayKey, status: 'lost' });
            tx.set(ref(p.stats(caller.uid)), withStats(statsSnap.data(), championId, next, caller.uid));
            const nextRanksDoc = nextRanks(ranksSnap.exists ? ranksSnap.data() : null, {
                dayKey: run.dayKey, teamSource: run.teamSource, uid: caller.uid, name: secret.names?.p1 || 'Trainer', status: 'lost', result, at: stamp,
            });
            tx.set(ref(p.ranks(run.dayKey, championId)), nextRanksDoc);
            return { stats: next, ranks: nextRanksDoc };
        });
        return {
            status: 'lost',
            // A forfeit on the day's second board keeps a streak the first one won.
            result: {
                ...result,
                streak: stats ? effectiveStreak(stats, run.dayKey) : null,
                bestStreak: stats?.bestStreak ?? null,
                ...curveFields(secret.winCurve, secret.winMarks),
            },
            ...(ranks ? { ranks: publicRanks(ranks, caller.uid) } : {}),
            ...(stats ? { stats: statsView(stats, run.dayKey) } : {}),
        };
    };

    /**
     * Account deletion: take the caller off every day's ranking. The client
     * may not write the ranking (firestore.rules), so this is the one way out
     * of it. Runs and stats the client deletes itself (accountDeletion.js).
     */
    const forget = async (caller) => {
        if (!caller?.uid) throw fail(401, 'unauthenticated');
        const days = await db.collection(`artifacts/${appId}/public/data/challengeRanks`).where('players', 'array-contains', caller.uid).get();
        let removed = 0;
        for (const day of days.docs) {
            await db.runTransaction(async (tx) => {
                const fresh = await tx.get(day.ref);
                if (!fresh.exists) return;
                tx.set(day.ref, forgetPlayer(fresh.data(), caller.uid));
            });
            removed += 1;
        }
        return { removed };
    };

    return { ensureDay, state, start, choose, forfeit, forget };
};
