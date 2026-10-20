import { describe, it, expect, beforeEach, vi } from 'vitest';

import { createFakeFirestore } from './_lib/testing/fakeFirestore.js';

/**
 * End-to-end cover for the turn endpoint, against an in-memory stand-in for
 * Firestore.
 *
 * The unit tests next door check the resolver in isolation, which is where the
 * battle *maths* lives. What they can't see is the part that actually broke in
 * production: the handshake between the endpoint's round bookkeeping and the
 * sim's per-side requests. A one-sided prompt — the forced switch every battle
 * hits the first time something faints — used to deadlock, because the endpoint
 * held the round open waiting for a choice from the player the sim had told to
 * sit still. No amount of resolver testing catches that; it only shows up when
 * you play a whole battle through the HTTP boundary, which is what this does.
 */

// A Firestore small enough to reason about — shared with the challenge
// endpoint's tests (`./_lib/testing/fakeFirestore.js`).
const fake = createFakeFirestore();
const state = { store: fake.store };
const { childIds } = fake;
const fakeDb = fake.db;

vi.mock('firebase-admin/firestore', () => ({
    FieldValue: { increment: (n) => ({ __increment: n }) },
}));

vi.mock('./_lib/serverAuth.js', async () => {
    const actual = await vi.importActual('./_lib/serverAuth.js');
    return {
        ...actual,
        verifyCaller: async (req) => ({ uid: req.headers['x-test-uid'], isAnonymous: false }),
        getAdminFirestore: () => fakeDb,
        getAppId: () => 'testApp',
        setCorsHeaders: () => true,
    };
});

// The nudge email is I/O with its own tests; here it would only add latency.
vi.mock('./_lib/battleNotify.js', () => ({ notifyAwaitingPlayer: async () => {} }));

const { default: handler } = await import('./battle-turn.js');

// ---------------------------------------------------------------------------

const P1 = 'uid-ash';
const P2 = 'uid-gary';
const BATTLE = 'artifacts/testApp/battles/b1';

const team = (mons) => mons.map(([species, item, ability, moves]) => (
    `${species} @ ${item}\nAbility: ${ability}\nLevel: 50\nEVs: 252 HP / 252 Atk / 252 Spe\nAdamant Nature\n${moves.map((m) => `- ${m}`).join('\n')}\n`
)).join('\n');

const post = async (uid, choice) => {
    const res = {
        statusCode: 200,
        body: null,
        setHeader() {},
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; },
        end() { return this; },
    };
    await handler(
        { method: 'POST', headers: { origin: 'https://pokemonbuilder.app', 'x-test-uid': uid }, body: { battleId: 'b1', choice } },
        res,
    );
    return res;
};

/** Every protocol line a player has been sent, in order. */
const logFor = (uid) => {
    const base = `${BATTLE}/playerLogs/${uid}/rounds`;
    return childIds(base).flatMap((id) => state.store.get(`${base}/${id}`).lines);
};

/** The sim's latest prompt for a player, parsed. */
const requestFor = (uid) => {
    const requests = logFor(uid).filter((line) => line.startsWith('|request|'));
    if (!requests.length) return null;
    const payload = requests[requests.length - 1].slice('|request|'.length);
    if (!payload.trim()) return null;
    return JSON.parse(payload);
};

/** A legal answer to whatever the sim is currently asking that player. */
const chooseFor = (uid) => {
    const request = requestFor(uid);
    if (!request || request.wait) return null;
    if (request.teamPreview) return 'default';
    if (request.forceSwitch) {
        const index = request.side.pokemon.findIndex((mon) => !mon.active && !mon.condition.endsWith(' fnt'));
        return index === -1 ? null : `switch ${index + 1}`;
    }
    if (request.active) return 'move 1';
    return null;
};

beforeEach(() => {
    state.store.clear();
    state.store.set(BATTLE, {
        status: 'active',
        players: [P1, P2],
        challenger: P1,
        playerNames: { [P1]: 'Ash', [P2]: 'Gary' },
        format: 'gen9customgame',
        turn: 0,
    });
    // Frail and hard-hitting on purpose: something faints within a couple of
    // turns, which is the case that used to wedge.
    state.store.set(`${BATTLE}/teams/${P1}`, {
        showdownText: team([
            ['Rattata', 'Life Orb', 'Guts', ['Quick Attack', 'Tackle']],
            ['Pidgey', 'Life Orb', 'Keen Eye', ['Quick Attack', 'Tackle']],
        ]),
    });
    state.store.set(`${BATTLE}/teams/${P2}`, {
        showdownText: team([
            ['Magikarp', 'Life Orb', 'Swift Swim', ['Tackle', 'Splash']],
            ['Caterpie', 'Life Orb', 'Shield Dust', ['Tackle', 'String Shot']],
        ]),
    });
});

const postAction = async (uid, action) => {
    const res = {
        statusCode: 200,
        body: null,
        setHeader() {},
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; },
        end() { return this; },
    };
    await handler(
        { method: 'POST', headers: { origin: 'https://pokemonbuilder.app', 'x-test-uid': uid }, body: { battleId: 'b1', action } },
        res,
    );
    return res;
};

/** Answer whatever the sim asks, round after round, until the battle ends. */
const playOut = async (rounds = 60) => {
    for (let round = 0; round < rounds; round += 1) {
        const battle = state.store.get(BATTLE);
        if (battle.status === 'ended') break;
        const awaiting = battle.awaitingChoiceFrom || [];
        if (!awaiting.length) break;
        for (const uid of awaiting) {
            const choice = chooseFor(uid);
            if (choice) await post(uid, choice);
        }
    }
};

describe('POST /api/battle-turn', () => {
    it('bootstraps the opening position and answers team preview itself', async () => {
        const res = await post(P1, null);

        expect(res.statusCode).toBe(200);
        expect(res.body.resolved).toBe(false);
        // Team preview decides nothing here (the client always sent "default"),
        // so the opening publish answers it: both players start on a move.
        expect(state.store.get(BATTLE).turn).toBe(1);
        expect(state.store.get(BATTLE).awaitingChoiceFrom).toEqual([P1, P2]);
        expect(requestFor(P1).active).toBeTruthy();
        expect(requestFor(P2).active).toBeTruthy();
        // The caller's own lines come back in the response.
        expect(res.body.deltas[0].seq).toBe(0);
        expect(res.body.deltas[0].lines).toEqual(logFor(P1));
    });

    it('holds the round open until everyone the sim asked has answered', async () => {
        await post(P1, null);

        const first = await post(P1, 'move 1');
        expect(first.body.resolved).toBe(false);
        expect(first.body.waitingOnOpponent).toBe(true);
        expect(state.store.get(BATTLE).turn).toBe(1);

        const second = await post(P2, 'move 1');
        expect(second.body.resolved).toBe(true);
        expect(state.store.get(BATTLE).turn).toBe(2);
        expect(second.body.deltas.at(-1).lines.length).toBeGreaterThan(0);
    });

    it('keeps a pending choice where the opponent cannot read it', async () => {
        await post(P1, null);
        await post(P1, 'move 2');

        // Nothing under choices/ (readable by both players) — the round waits
        // in secret/state, which no client rule reaches.
        expect(childIds(`${BATTLE}/choices`)).toEqual([]);
        expect(state.store.get(`${BATTLE}/secret/state`).pending).toMatchObject({ round: 1, p1: 'move 2', p2: null });
    });

    it('resolves a one-sided forced switch without waiting on the other player', async () => {
        await post(P1, null);

        // Play until someone faints and the sim prompts exactly one side.
        let sawOneSidedPrompt = false;
        for (let round = 0; round < 25 && !sawOneSidedPrompt; round += 1) {
            const battle = state.store.get(BATTLE);
            if (battle.status === 'ended') break;

            const awaiting = battle.awaitingChoiceFrom || [];
            if (awaiting.length === 1) {
                sawOneSidedPrompt = true;
                const uid = awaiting[0];
                const before = battle.turn;
                const res = await post(uid, chooseFor(uid));

                // The whole point: one player answering is enough, because the
                // other was never asked.
                expect(res.body.resolved).toBe(true);
                expect(state.store.get(BATTLE).turn).toBe(before + 1);
                break;
            }

            for (const uid of awaiting) {
                const choice = chooseFor(uid);
                if (choice) await post(uid, choice);
            }
        }

        expect(sawOneSidedPrompt).toBe(true);
    });

    it('plays a battle through to a winner', async () => {
        await post(P1, null);
        await playOut();

        const battle = state.store.get(BATTLE);
        expect(battle.status).toBe('ended');
        expect([P1, P2]).toContain(battle.winner);
        expect(battle.awaitingChoiceFrom).toEqual([]);
    });

    it('replays the same battle from the stored history', async () => {
        await post(P1, null);
        await playOut(4);

        // The history in secret/state is everything the replay needs: replaying
        // it reproduces the log the players were sent, line for line.
        const { replayBattle } = await import('./_lib/battleResolver.js');
        const secret = state.store.get(`${BATTLE}/secret/state`);
        const replay = await replayBattle({
            format: secret.format,
            seed: secret.seed,
            teams: secret.teams,
            names: { p1: 'Ash', p2: 'Gary' },
            choices: secret.history,
        });
        // `|t:|` lines carry the wall clock, the one thing a replay can't repeat.
        const timeless = (lines) => lines.filter((line) => !line.startsWith('|t:|'));
        expect(timeless(replay.log.p1)).toEqual(timeless(logFor(P1)));
    });

    it('drops a choice from the side the sim is not asking', async () => {
        await post(P1, null);

        // Play to a one-sided prompt, then have the *other* player submit.
        let idle = null;
        for (let round = 0; round < 25; round += 1) {
            const battle = state.store.get(BATTLE);
            if (battle.status === 'ended') break;
            const awaiting = battle.awaitingChoiceFrom || [];
            if (awaiting.length === 1) {
                idle = awaiting[0] === P1 ? P2 : P1;
                break;
            }
            for (const uid of awaiting) await post(uid, chooseFor(uid));
        }
        expect(idle).toBeTruthy();

        const before = state.store.get(BATTLE).turn;
        const res = await post(idle, 'move 1');

        expect(res.body.resolved).toBe(false);
        expect(res.body.ignored).toBeTruthy();
        expect(state.store.get(BATTLE).turn).toBe(before);
        // Nothing persisted, so it cannot leak into the next replay.
        const pending = state.store.get(`${BATTLE}/secret/state`).pending;
        expect(pending[idle === P1 ? 'p1' : 'p2']).toBeNull();
    });

    it('takes over a round whose resolver died after claiming it', async () => {
        await post(P1, null);
        await post(P1, 'move 1');
        // P2's request claimed the round and then never published.
        const secretPath = `${BATTLE}/secret/state`;
        const secret = state.store.get(secretPath);
        state.store.set(secretPath, {
            ...secret,
            pending: { ...secret.pending, p2: 'move 1', claimedAt: new Date(Date.now() - 60_000).toISOString() },
        });

        const res = await post(P1, null);
        expect(res.body.resolved).toBe(true);
        expect(state.store.get(BATTLE).turn).toBe(2);
    });

    it('leaves a fresh claim alone', async () => {
        await post(P1, null);
        await post(P1, 'move 1');
        const secretPath = `${BATTLE}/secret/state`;
        const secret = state.store.get(secretPath);
        state.store.set(secretPath, {
            ...secret,
            pending: { ...secret.pending, p2: 'move 1', claimedAt: new Date().toISOString() },
        });

        const res = await post(P1, null);
        expect(res.body.resolved).toBe(false);
        expect(res.body.resolving).toBe(true);
        expect(state.store.get(BATTLE).turn).toBe(1);
    });

    it('migrates a battle that started before secret/state', async () => {
        // A legacy battle: bootstrapped, team preview answered through choices/.
        const opening = await (await import('./_lib/battleResolver.js')).replayBattle({
            format: 'gen9customgame',
            seed: [5, 6, 7, 8],
            teams: {
                p1: state.store.get(`${BATTLE}/teams/${P1}`).showdownText,
                p2: state.store.get(`${BATTLE}/teams/${P2}`).showdownText,
            },
            names: { p1: 'Ash', p2: 'Gary' },
            choices: [],
        });
        state.store.set(BATTLE, {
            ...state.store.get(BATTLE),
            seed: [5, 6, 7, 8],
            logSeq: 1,
            logLines: { p1: opening.log.p1.length, p2: opening.log.p2.length },
            awaitingChoiceFrom: [P1, P2],
        });
        state.store.set(`${BATTLE}/playerLogs/${P1}/rounds/0000`, { round: 0, seq: 0, lines: opening.log.p1 });
        state.store.set(`${BATTLE}/playerLogs/${P2}/rounds/0000`, { round: 0, seq: 0, lines: opening.log.p2 });
        state.store.set(`${BATTLE}/choices/0_${P1}`, { uid: P1, side: 'p1', round: 0, choice: 'default' });

        const res = await post(P2, 'default');
        expect(res.body.resolved).toBe(true);
        expect(state.store.get(`${BATTLE}/secret/state`).history).toEqual(['>p1 default', '>p2 default']);
        expect(requestFor(P1).active).toBeTruthy();
    });

    it('rejects a caller who is not in the battle', async () => {
        const res = await post('uid-stranger', 'move 1');
        expect(res.statusCode).toBe(403);
    });
});

describe('POST /api/battle-turn — begin', () => {
    beforeEach(() => {
        state.store.set(BATTLE, {
            ...state.store.get(BATTLE),
            status: 'pending',
            format: 'gen9customgame',
            ready: {},
        });
    });

    it('accepts and starts in one request once both teams are in', async () => {
        const res = await postAction(P2, 'begin');

        expect(res.statusCode).toBe(200);
        expect(res.body.begun).toBe(true);
        const battle = state.store.get(BATTLE);
        expect(battle.status).toBe('active');
        expect(battle.format).toMatch(/^gen9anythinggoes@@@!Team Preview/);
        expect(battle.ready).toEqual({ [P1]: true, [P2]: true });
        // The opening is published and the caller's own lines come back.
        expect(battle.logSeq).toBe(1);
        expect(res.body.deltas[0].lines).toEqual(logFor(P2));
        // No team preview in the new format: straight to a move, and the
        // opponent's HP is a percentage, never exact.
        expect(requestFor(P2).active).toBeTruthy();
        expect(logFor(P2).filter((l) => l.startsWith('|switch|p1a')).every((l) => l.endsWith('/100'))).toBe(true);
    });

    it('is not the challenger\'s to accept', async () => {
        const res = await postAction(P1, 'begin');
        expect(res.statusCode).toBe(409);
        expect(state.store.get(BATTLE).status).toBe('pending');
    });

    it('waits in team select for a challenger who sent no team', async () => {
        state.store.delete(`${BATTLE}/teams/${P1}`);
        const res = await postAction(P2, 'begin');

        expect(res.body.begun).toBe(false);
        expect(res.body.waitingForTeam).toBe('opponent');
        expect(state.store.get(BATTLE)).toMatchObject({ status: 'teamSelect', ready: { [P2]: true } });
    });

    it('is idempotent once the battle is live', async () => {
        await postAction(P2, 'begin');
        const again = await postAction(P1, 'begin');
        expect(again.statusCode).toBe(200);
        expect(state.store.get(BATTLE).logSeq).toBe(1);
    });

    it('lets a Pokémon holding its Mega Stone Mega Evolve, in the battle format', async () => {
        state.store.set(`${BATTLE}/teams/${P1}`, {
            showdownText: team([['Charizard', 'Charizardite X', 'Blaze', ['Flare Blitz', 'Dragon Claw']]]),
        });
        await postAction(P2, 'begin');
        expect(requestFor(P1).active[0].canMegaEvo).toBe(true);

        await post(P1, 'move 1 mega');
        await post(P2, chooseFor(P2));

        const log = logFor(P1);
        expect(log.some((l) => l.startsWith('|detailschange|p1a: Charizard|Charizard-Mega-X'))).toBe(true);
        expect(log.some((l) => l.startsWith('|-mega|p1a: Charizard|Charizard|Charizardite X'))).toBe(true);
        // Once per battle: the next request no longer offers it.
        expect(requestFor(P1).active?.[0]?.canMegaEvo).toBeFalsy();
    });

    it('starts a Mega saved as its Mega forme as its base, so it still Mega Evolves', async () => {
        state.store.set(`${BATTLE}/teams/${P1}`, {
            showdownText: team([['Charizard-Mega-X', 'Charizardite X', 'Blaze', ['Flare Blitz', 'Dragon Claw']]]),
        });
        await postAction(P2, 'begin');
        expect(logFor(P1).find((l) => l.startsWith('|switch|p1a:'))).toMatch(/\|Charizard, L50/);
        expect(requestFor(P1).active[0].canMegaEvo).toBe(true);
    });
});

describe('POST /api/battle-turn — forfeit', () => {
    it('ends the battle and hands the other trainer the win', async () => {
        await post(P1, null);
        const res = await postAction(P1, 'forfeit');

        expect(res.statusCode).toBe(200);
        expect(state.store.get(BATTLE)).toMatchObject({ status: 'ended', winner: P2, forfeitedBy: P1 });
        expect(state.store.get(`artifacts/testApp/publicProfiles/${P2}`).battleRecord.wins).toEqual({ __increment: 1 });
    });

    it('only ends a battle in progress', async () => {
        state.store.set(BATTLE, { ...state.store.get(BATTLE), status: 'pending' });
        const res = await postAction(P1, 'forfeit');
        expect(res.statusCode).toBe(409);
    });
});

describe('GET /api/battle-turn', () => {
    it('reports engine and credential health without leaking secrets', async () => {
        const res = {
            statusCode: 200,
            body: null,
            setHeader() {},
            status(code) { this.statusCode = code; return this; },
            json(body) { this.body = body; return this; },
            end() { return this; },
        };
        await handler({ method: 'GET', headers: {} }, res);

        expect(res.body.sim).toBe('ok');
        expect(res.body.engine).toMatch(/@pkmn\/sim/);
        expect(JSON.stringify(res.body)).not.toContain('BEGIN PRIVATE KEY');
    });
});
