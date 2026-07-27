import { describe, it, expect, beforeEach, vi } from 'vitest';

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

const state = vi.hoisted(() => ({ store: new Map() }));

// ---------------------------------------------------------------------------
// A Firestore small enough to reason about: a flat path -> data map, with just
// the surface `battle-turn.js` actually touches.
// ---------------------------------------------------------------------------

const childIds = (prefix) => {
    const ids = new Set();
    for (const key of state.store.keys()) {
        if (!key.startsWith(`${prefix}/`)) continue;
        const rest = key.slice(prefix.length + 1);
        if (!rest.includes('/')) ids.add(rest);
    }
    return [...ids].sort();
};

class FakeDoc {
    constructor(path) { this.path = path; this.id = path.split('/').pop(); }

    async get() {
        const data = state.store.get(this.path);
        return { exists: data !== undefined, id: this.id, data: () => data };
    }

    async set(data, options) {
        const prev = options?.merge ? (state.store.get(this.path) || {}) : {};
        state.store.set(this.path, { ...prev, ...data });
    }

    async create(data) {
        if (state.store.has(this.path)) throw new Error('Document already exists');
        state.store.set(this.path, data);
    }

    async update(data) {
        if (!state.store.has(this.path)) throw new Error('No document to update');
        state.store.set(this.path, { ...state.store.get(this.path), ...data });
    }

    collection(name) { return new FakeCollection(`${this.path}/${name}`); }
}

class FakeCollection {
    constructor(path) { this.path = path; }

    doc(id) { return new FakeDoc(`${this.path}/${id}`); }

    async get() {
        return {
            docs: childIds(this.path).map((id) => ({
                id,
                data: () => state.store.get(`${this.path}/${id}`),
            })),
        };
    }
}

const fakeDb = {
    doc: (path) => new FakeDoc(path),
    collection: (path) => new FakeCollection(path),
    batch: () => {
        const ops = [];
        return {
            set: (ref, data, options) => ops.push(() => ref.set(data, options)),
            update: (ref, data) => ops.push(() => ref.update(data)),
            commit: async () => { for (const op of ops) await op(); },
        };
    },
};

vi.mock('firebase-admin/firestore', () => ({
    FieldValue: { increment: (n) => ({ __increment: n }) },
}));

vi.mock('./lib/serverAuth.js', async () => {
    const actual = await vi.importActual('./lib/serverAuth.js');
    return {
        ...actual,
        verifyCaller: async (req) => ({ uid: req.headers['x-test-uid'], isAnonymous: false }),
        getAdminFirestore: () => fakeDb,
        getAppId: () => 'testApp',
        setCorsHeaders: () => true,
    };
});

// The nudge email is I/O with its own tests; here it would only add latency.
vi.mock('./lib/battleNotify.js', () => ({ notifyAwaitingPlayer: async () => {} }));

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

describe('POST /api/battle-turn', () => {
    it('bootstraps the opening position and asks both players for a team order', async () => {
        const res = await post(P1, null);

        expect(res.statusCode).toBe(200);
        expect(res.body.resolved).toBe(false);
        expect(state.store.get(BATTLE).awaitingChoiceFrom).toEqual([P1, P2]);
        expect(requestFor(P1).teamPreview).toBe(true);
        expect(requestFor(P2).teamPreview).toBe(true);
    });

    it('holds the round open until everyone the sim asked has answered', async () => {
        await post(P1, null);

        const first = await post(P1, 'default');
        expect(first.body.resolved).toBe(false);
        expect(first.body.waitingOnOpponent).toBe(true);
        expect(state.store.get(BATTLE).turn).toBe(0);

        const second = await post(P2, 'default');
        expect(second.body.resolved).toBe(true);
        expect(state.store.get(BATTLE).turn).toBe(1);
    });

    it('resolves a one-sided forced switch without waiting on the other player', async () => {
        await post(P1, null);
        await post(P1, 'default');
        await post(P2, 'default');

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
        await post(P1, 'default');
        await post(P2, 'default');

        for (let round = 0; round < 60; round += 1) {
            const battle = state.store.get(BATTLE);
            if (battle.status === 'ended') break;
            const awaiting = battle.awaitingChoiceFrom || [];
            if (!awaiting.length) break;
            for (const uid of awaiting) {
                const choice = chooseFor(uid);
                if (choice) await post(uid, choice);
            }
        }

        const battle = state.store.get(BATTLE);
        expect(battle.status).toBe('ended');
        expect([P1, P2]).toContain(battle.winner);
        expect(battle.awaitingChoiceFrom).toEqual([]);
    });

    it('drops a choice from the side the sim is not asking', async () => {
        await post(P1, null);
        await post(P1, 'default');
        await post(P2, 'default');

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
        expect(childIds(`${BATTLE}/choices`)).not.toContain(`${before}_${idle}`);
    });

    it('rejects a caller who is not in the battle', async () => {
        const res = await post('uid-stranger', 'move 1');
        expect(res.statusCode).toBe(403);
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
