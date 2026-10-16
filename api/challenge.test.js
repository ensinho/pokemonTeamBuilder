import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { createFakeFirestore } from './_lib/testing/fakeFirestore.js';

// Loading the sim, firebase-admin and the day's rotation can take seconds when
// the whole suite runs in parallel; the default 5 s is for unit tests.
vi.setConfig({ testTimeout: 60_000 });

/**
 * The challenge endpoint end to end, through the HTTP handler, against an
 * in-memory Firestore. Like `battle-turn.test.js`, this is where the bugs that
 * matter live: the handshake between the endpoint's bookkeeping and the sim's
 * requests (who owes a choice after a faint), and what a client can read.
 */

const fake = createFakeFirestore();

// A fixed seed, so two runs of the same day are the same battle (see the I1 test).
vi.mock('node:crypto', async () => {
    const actual = await vi.importActual('node:crypto');
    return { ...actual, randomInt: (max) => 4242 % max };
});

vi.mock('./_lib/serverAuth.js', async () => {
    const actual = await vi.importActual('./_lib/serverAuth.js');
    return {
        ...actual,
        verifyCaller: async (req) => {
            if (!req.headers['x-test-uid']) throw new actual.HttpError(401, 'Missing Firebase ID token.');
            return { uid: req.headers['x-test-uid'], email: null, isAnonymous: req.headers['x-test-anon'] === '1' };
        },
        getAdminFirestore: () => fake.db,
        getAppId: () => 'testApp',
    };
});

const { default: handler } = await import('./challenge.js');
const { replay, owes } = await import('./_lib/challenge/engine.js');

const UID = 'uid-enzo';
const BASE = 'artifacts/testApp';
// A Wednesday at noon in Brasília (difficulty: platinum).
const NOON = Date.parse('2026-10-14T12:00:00-03:00');

const call = async (body, { uid = UID, anonymous = false, method = 'POST', query } = {}) => {
    const res = {
        statusCode: 200,
        body: null,
        setHeader() {},
        status(code) { this.statusCode = code; return this; },
        json(payload) { this.body = payload; return this; },
        end() { return this; },
    };
    const headers = { origin: 'https://pokemonbuilder.app', ...(uid ? { 'x-test-uid': uid } : {}), ...(anonymous ? { 'x-test-anon': '1' } : {}) };
    await handler({ method, headers, body, query: query || {}, url: query?.ping ? '/api/challenge?ping=1' : '/api/challenge' }, res);
    return res;
};

const runDoc = (runId) => fake.store.get(`${BASE}/challengeRuns/${runId}`);
const secretDoc = (runId) => fake.store.get(`${BASE}/challengeRuns/${runId}/secret/state`);
const roundLines = (runId) => fake.childIds(`${BASE}/challengeRuns/${runId}/rounds`)
    .flatMap((id) => fake.store.get(`${BASE}/challengeRuns/${runId}/rounds/${id}`).lines);

/** A legal answer to the player's latest request, as the client would pick it. */
const nextChoice = (runId, salt = 0) => {
    const requests = roundLines(runId).filter((line) => line.startsWith('|request|'));
    const request = JSON.parse(requests[requests.length - 1].slice('|request|'.length));
    if (request.forceSwitch) {
        const index = request.side.pokemon.findIndex((mon) => !mon.active && !mon.condition.endsWith(' fnt'));
        return `switch ${index + 1}`;
    }
    const moves = request.active[0].moves;
    const usable = moves.map((m, i) => ({ m, i })).filter(({ m }) => !m.disabled && (m.pp === undefined || m.pp > 0));
    return `move ${usable[salt % usable.length].i + 1}`;
};

const playToEnd = async (runId) => {
    for (let step = 0; step < 400; step += 1) {
        const run = runDoc(runId);
        if (run.status !== 'active') return run;
        const res = await call({ action: 'choose', runId, turn: run.turn, choice: nextChoice(runId, step) });
        expect(res.statusCode, JSON.stringify(res.body)).toBe(200);
        // The player is never left facing a turn that only Cynthia owes.
        const secret = secretDoc(runId);
        const battle = replay({ format: secret.format, seed: secret.seed, teams: secret.teams, names: secret.names, choices: secret.choices }).battle;
        expect(battle.ended || owes(battle, 'p1')).toBe(true);
        if (res.body.status === 'active') expect(runDoc(runId).winChanceCurve).toBe(null);
    }
    throw new Error('battle did not end');
};

beforeEach(() => {
    fake.store.clear();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOON);
});
afterEach(() => vi.useRealTimers());

describe('POST /api/challenge', () => {
    it('creates the day once, for guests too, without exposing sets or the wildcard', async () => {
        const first = await call({ action: 'ensureDay' }, { anonymous: true });
        expect(first.statusCode).toBe(200);
        expect(first.body).toEqual({ dayKey: '2026-10-14', created: true });
        expect((await call({ action: 'ensureDay' })).body.created).toBe(false);

        const day = fake.store.get(`${BASE}/public/data/challengeDays/2026-10-14`);
        expect(day.difficulty).toBe('platinum');
        expect(day.lineup).toHaveLength(6);
        expect(day.lineup.filter((mon) => mon.wildcard)).toEqual([{ wildcard: true }]);
        expect(JSON.stringify(day.lineup)).not.toMatch(/moves|item|ability|showdownText/);
        expect(day.dailyTeam.members).toHaveLength(6);
    });

    it('forgets a deleted account on every day it ranked, and only that account', async () => {
        const entry = (uid, score) => ({ uid, name: uid, score, turns: 20, remaining: 2, at: '2026-10-13T12:00:00Z' });
        const day = (key, entries) => ({
            dayKey: key, boards: { daily: entries, free: [] }, players: entries.map((e) => e.uid),
            played: { daily: entries.length + 3, free: 0 }, wins: { daily: entries.length, free: 0 }, updatedAt: null,
        });
        fake.store.set(`${BASE}/public/data/challengeRanks/2026-10-12`, day('2026-10-12', [entry(UID, 1500), entry('other', 1200)]));
        fake.store.set(`${BASE}/public/data/challengeRanks/2026-10-13`, day('2026-10-13', [entry('other', 1300)]));

        const res = await call({ action: 'forget' });
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({ removed: 1 });
        const kept = fake.store.get(`${BASE}/public/data/challengeRanks/2026-10-12`);
        expect(kept.boards.daily.map((e) => e.uid)).toEqual(['other']);
        expect(kept.players).toEqual(['other']);
        expect(kept.played.daily).toBe(5); // totals stay
        expect(fake.store.get(`${BASE}/public/data/challengeRanks/2026-10-13`).boards.daily).toHaveLength(1);
    });

    it('hands the screen its state: the day for guests, the run and streak for players', async () => {
        const guest = await call({ action: 'state' }, { anonymous: true });
        expect(guest.statusCode).toBe(200);
        expect(guest.body).toMatchObject({ dayKey: '2026-10-14', run: null, official: null, stats: null });
        expect(guest.body.day.lineup).toHaveLength(6);
        expect(guest.body.day.dailyTeam.members).toHaveLength(6);
        expect(guest.body.nextResetAt).toBe(Date.parse('2026-10-15T00:00:00-03:00'));

        const empty = await call({ action: 'state' });
        expect(empty.body.run).toBe(null);
        expect(empty.body.stats).toEqual({ streak: 0, bestStreak: 0, wins: 0, played: 0 });

        const { body: started } = await call({ action: 'start', team: { source: 'daily' } });
        const live = await call({ action: 'state' });
        expect(live.body.run).toMatchObject({ runId: started.runId, status: 'active', turn: 0, practice: false });
        expect(live.body.run.lines).toEqual(started.lines);
        for (const key of ['seed', 'choices', 'teams', 'aiTrace', 'uid']) expect(live.body.run).not.toHaveProperty(key);

        await call({ action: 'forfeit', runId: started.runId });
        const { body: practice } = await call({ action: 'start', practice: true, team: { source: 'daily' } });
        const shown = await call({ action: 'state' });
        expect(shown.body.run.runId).toBe(practice.runId);
        expect(shown.body.official).toMatchObject({ runId: started.runId, status: 'lost' });
        expect(shown.body.stats.played).toBe(1);
    });

    it('refuses guests everything but ensureDay', async () => {
        for (const body of [
            { action: 'start', team: { source: 'daily' } },
            { action: 'choose', runId: 'x', turn: 0, choice: 'move 1' },
            { action: 'forfeit', runId: 'x' },
        ]) {
            const res = await call(body, { anonymous: true });
            expect(res.statusCode).toBe(403);
            expect(res.body.error).toBe('signInRequired');
        }
        expect((await call({ action: 'ensureDay' }, { uid: null })).statusCode).toBe(401);
    });

    it('plays a whole official battle, then records the result, the streak and an anonymous training row', async () => {
        const start = await call({ action: 'start', practice: false, team: { source: 'daily' }, trainerName: 'Enzo' });
        expect(start.statusCode).toBe(200);
        const { runId } = start.body;
        expect(runId).toBe(`${UID}_2026-10-14`);
        expect(start.body.events[0].key).toBe('challenge.cynthia.intro');

        // What the client can read holds no seed, no choices and none of her sets.
        const run = runDoc(runId);
        for (const key of ['seed', 'choices', 'teams', 'aiTrace']) expect(run).not.toHaveProperty(key);
        expect(roundLines(runId).filter((l) => l.startsWith('|request|')).every((l) => l.includes('"id":"p1"'))).toBe(true);

        const finished = await playToEnd(runId);
        expect(['won', 'lost']).toContain(finished.status);
        expect(finished.result.turns).toBeGreaterThan(0);
        expect(finished.endedAt).toBeTruthy();
        expect(roundLines(runId).join('\n')).toMatch(/\|win\|/);

        // The win-chance curve: one mark per point, in log order, inside the log.
        const { winChanceCurve: curve, winChanceMarks: marks } = finished;
        expect(curve.length).toBeGreaterThan(2);
        expect(marks).toHaveLength(curve.length);
        for (const p of curve) expect(p).toBeGreaterThanOrEqual(0);
        for (let i = 1; i < marks.length; i += 1) {
            expect(marks[i].line).toBeGreaterThan(marks[i - 1].line);
            expect(marks[i].turn).toBeGreaterThanOrEqual(marks[i - 1].turn);
        }
        expect(marks[marks.length - 1].line).toBe(roundLines(runId).length);
        const shown = await call({ action: 'state' });
        expect(shown.body.run.winChanceMarks).toEqual(marks);

        // The day's ranking: the finish counts; a win takes the first place, by name, without the uid.
        const ranks = fake.store.get(`${BASE}/public/data/challengeRanks/2026-10-14`);
        expect(ranks.played.daily).toBe(1);
        expect(ranks.wins.daily).toBe(finished.status === 'won' ? 1 : 0);
        expect(ranks.boards.daily.map((e) => e.uid)).toEqual(finished.status === 'won' ? [UID] : []);
        expect(shown.body.ranks.played.daily).toBe(1);
        expect(shown.body.ranks.mine.daily).toBe(finished.status === 'won' ? 1 : null);
        expect(JSON.stringify(shown.body.ranks)).not.toContain(UID);
        if (finished.status === 'won') expect(finished.result.place).toBe(1);

        const stats = fake.store.get(`${BASE}/challengeStats/${UID}`);
        expect(stats.played).toBe(1);
        expect(stats.history['2026-10-14']).toBe(finished.status);
        expect(stats.streak).toBe(finished.status === 'won' ? 1 : 0);

        const training = fake.childIds(`${BASE}/aiTraining`).map((id) => fake.store.get(`${BASE}/aiTraining/${id}`));
        expect(training).toHaveLength(1);
        const text = JSON.stringify(training[0]);
        expect(text).not.toContain(UID);
        expect(text).not.toContain(runId);
        expect(text).not.toContain('Enzo');
        expect(training[0].week).toBe('2026-W42');
        expect(training[0].turns.length).toBeGreaterThan(0);
        expect(training[0].turns[0].m1).toHaveLength(6);
    }, 120_000);

    it('allows one official run a day and practice only after it', async () => {
        const locked = await call({ action: 'start', practice: true, team: { source: 'daily' } });
        expect(locked.statusCode).toBe(403);
        expect(locked.body.error).toBe('practiceLocked');

        const { body } = await call({ action: 'start', team: { source: 'daily' } });
        const again = await call({ action: 'start', team: { source: 'daily' } });
        expect(again.statusCode).toBe(409);
        expect(again.body).toMatchObject({ error: 'officialAlreadyPlayed', runId: body.runId });

        expect((await call({ action: 'start', practice: true, team: { source: 'daily' } })).body.error).toBe('practiceLocked');
        const forfeit = await call({ action: 'forfeit', runId: body.runId });
        expect(forfeit.body.status).toBe('lost');
        // A forfeit keeps the curve so far (here, just the opening point).
        expect(forfeit.body.result.winChanceCurve).toHaveLength(1);
        expect(runDoc(body.runId).winChanceMarks).toHaveLength(1);
        // An official forfeit is a finish: it counts towards the day's played, never a place.
        const ranksAfterForfeit = fake.store.get(`${BASE}/public/data/challengeRanks/2026-10-14`);
        expect(ranksAfterForfeit.played.daily).toBe(1);
        expect(ranksAfterForfeit.boards.daily).toEqual([]);
        expect(forfeit.body.ranks.played.daily).toBe(1);

        const p1 = await call({ action: 'start', practice: true, team: { source: 'daily' } });
        expect(p1.body.runId).toBe(`${body.runId}_p1`);
        const p2 = await call({ action: 'start', practice: true, team: { source: 'daily' } });
        expect(p2.body.runId).toBe(`${body.runId}_p2`);
        expect(runDoc(p1.body.runId).status).toBe('lost'); // starting another closes the previous one
        // Practice never touches the stats, nor the ranking.
        expect(fake.store.get(`${BASE}/challengeStats/${UID}`).played).toBe(1);
        expect(fake.store.get(`${BASE}/public/data/challengeRanks/2026-10-14`).played.daily).toBe(1);
    });

    it('validates saved teams', async () => {
        const res = await call({ action: 'start', team: { source: 'saved', name: 'Bad', showdownText: 'Onix\n- Fissure\n\nOnix\n- Tackle' } });
        expect(res.statusCode).toBe(400);
        expect(res.body.error).toBe('invalidTeam');
        expect(res.body.errors.map((e) => e.code)).toEqual(expect.arrayContaining(['bannedMove', 'duplicateSpecies']));

        const ok = await call({ action: 'start', team: { source: 'saved', name: 'Rain', tier: 'OU', showdownText: 'Pelipper @ Damp Rock\nAbility: Drizzle\n- Hurricane\n- Scald\n- U-turn\n- Roost' } });
        expect(ok.statusCode).toBe(200);
        expect(runDoc(ok.body.runId)).toMatchObject({ teamSource: 'saved', teamName: 'Rain', teamTier: 'OU' });
    });

    it('refuses bad choices before and after the sim, and stale or foreign turns', async () => {
        const { body } = await call({ action: 'start', team: { source: 'daily' } });
        const { runId } = body;

        const format = await call({ action: 'choose', runId, turn: 0, choice: 'move 1 terastallize' });
        expect(format.statusCode).toBe(400);
        expect(format.body).toMatchObject({ error: 'invalidChoice', detail: 'format' });

        const sim = await call({ action: 'choose', runId, turn: 0, choice: 'switch 1' });
        expect(sim.statusCode).toBe(400);
        expect(sim.body.error).toBe('invalidChoice');
        expect(sim.body.simError).toMatch(/Invalid choice/);
        expect(secretDoc(runId).choices).toEqual([]); // nothing recorded

        expect((await call({ action: 'choose', runId, turn: 0, choice: nextChoice(runId) })).statusCode).toBe(200);
        const stale = await call({ action: 'choose', runId, turn: 0, choice: 'move 1' });
        expect(stale.statusCode).toBe(409);
        expect(stale.body).toEqual({ error: 'staleTurn', turn: 1 });

        expect((await call({ action: 'choose', runId, turn: 1, choice: 'move 1' }, { uid: 'someone-else' })).body.error).toBe('notOwner');
        expect((await call({ action: 'choose', runId: 'nope', turn: 0, choice: 'move 1' })).statusCode).toBe(404);
    });

    it("closes yesterday's run when the day turns", async () => {
        const { body } = await call({ action: 'start', team: { source: 'daily' } });
        vi.setSystemTime(Date.parse('2026-10-15T00:00:01-03:00'));
        const res = await call({ action: 'choose', runId: body.runId, turn: 0, choice: 'move 1' });
        expect(res.statusCode).toBe(410);
        expect(res.body).toMatchObject({ error: 'dayClosed', status: 'expired' });
        expect(runDoc(body.runId).status).toBe('expired');
        expect(fake.store.get(`${BASE}/challengeStats/${UID}`).history['2026-10-14']).toBe('expired');
    });

    it('decides for Cynthia from the position before the player moves (I1)', async () => {
        // Same day, same seed: two different first choices from the player must
        // meet the same first choice from Cynthia.
        const firstAiChoice = async (uid, salt) => {
            const { body } = await call({ action: 'start', team: { source: 'daily' } }, { uid });
            const secret = secretDoc(body.runId);
            await call({ action: 'choose', runId: body.runId, turn: 0, choice: nextChoice(body.runId, salt) }, { uid });
            return { seed: secret.seed, ai: secretDoc(body.runId).choices.find((c) => c.side === 'p2')?.choice };
        };
        const a = await firstAiChoice('uid-a', 0);
        const b = await firstAiChoice('uid-b', 1);
        expect(a.seed).toEqual(b.seed);
        expect(a.ai).toBeTruthy();
        expect(a.ai).toBe(b.ai);
    });
});

describe('GET /api/challenge', () => {
    it('answers ?ping without loading anything', async () => {
        const res = await call(undefined, { method: 'GET', query: { ping: '1' } });
        expect(res.body).toMatchObject({ ok: true, ping: true });
    });

    it('self-checks the sim and one real AI decision', async () => {
        const res = await call(undefined, { method: 'GET' });
        expect(res.body.sim).toBe('ok');
        expect(res.body.ai.choice).toMatch(/^(move|switch) \d$/);
        expect(JSON.stringify(res.body)).not.toContain('BEGIN PRIVATE KEY');
    });
});
