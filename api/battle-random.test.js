import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * End-to-end cover for the random-battle roll, against the same in-memory
 * stand-in for Firestore that `battle-turn.test.js` uses.
 *
 * The interesting part is not that a team comes out — `lib/randomTeams.test.js`
 * covers the generator — but the handover: a rolled battle has to be
 * indistinguishable from a hand-built one by the time the resolver sees it. So
 * this rolls a battle and then plays a turn of it through the *other* endpoint,
 * which is the only way to catch the two things that would break it silently:
 * teams written in a shape `Teams.import()` rejects, and a format that leaves
 * the two endpoints disagreeing about what the sim was asked.
 */

const state = vi.hoisted(() => ({ store: new Map() }));

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
    // Reads run immediately, writes are buffered until the body returns — the
    // part of a real transaction this code depends on. It does *not* model
    // contention; the claim it protects is tested by calling the endpoint twice.
    runTransaction: async (body) => {
        const ops = [];
        const result = await body({
            get: (ref) => ref.get(),
            set: (ref, data, options) => ops.push(() => ref.set(data, options)),
            update: (ref, data) => ops.push(() => ref.update(data)),
        });
        for (const op of ops) await op();
        return result;
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

vi.mock('./lib/battleNotify.js', () => ({ notifyAwaitingPlayer: async () => {} }));

const { default: rollHandler } = await import('./battle-random.js');
const { default: turnHandler } = await import('./battle-turn.js');

// ---------------------------------------------------------------------------

const P1 = 'uid-ash';
const P2 = 'uid-gary';
const BATTLE = 'artifacts/testApp/battles/b1';

const post = async (handler, uid, body = {}) => {
    const res = {
        statusCode: 200,
        body: null,
        setHeader() {},
        status(code) { this.statusCode = code; return this; },
        json(payload) { this.body = payload; return this; },
        end() { return this; },
    };
    await handler(
        {
            method: 'POST',
            headers: { origin: 'https://pokemonbuilder.app', 'x-test-uid': uid },
            body: { battleId: 'b1', ...body },
        },
        res,
    );
    return res;
};

const roll = (uid) => post(rollHandler, uid);
const turn = (uid, choice = null) => post(turnHandler, uid, { choice });

const battleDoc = () => state.store.get(BATTLE);
const teamDoc = (uid) => state.store.get(`${BATTLE}/teams/${uid}`);

const requestFor = (uid) => {
    const base = `${BATTLE}/playerLogs/${uid}/rounds`;
    const lines = childIds(base).flatMap((id) => state.store.get(`${base}/${id}`).lines);
    const requests = lines.filter((line) => line.startsWith('|request|'));
    if (!requests.length) return null;
    const payload = requests[requests.length - 1].slice('|request|'.length);
    return payload.trim() ? JSON.parse(payload) : null;
};

beforeEach(() => {
    state.store.clear();
    state.store.set(BATTLE, {
        status: 'teamSelect',
        mode: 'random',
        players: [P1, P2],
        challenger: P1,
        playerNames: { [P1]: 'Ash', [P2]: 'Gary' },
        format: 'gen9randombattle',
        seed: null,
        ready: {},
        turn: 0,
    });
});

describe('POST /api/battle-random', () => {
    it('deals both trainers a team and starts the battle', async () => {
        const res = await roll(P2);

        expect(res.statusCode).toBe(200);
        expect(res.body.rolled).toBe(true);

        const battle = battleDoc();
        expect(battle.status).toBe('active');
        expect(battle.ready).toEqual({ [P1]: true, [P2]: true });
        expect(battle.format).toBe('gen9randombattle');
        expect(battle.seed).toHaveLength(4);
        expect(battle.randomTeamsRolledAt).toBeTruthy();

        for (const uid of [P1, P2]) {
            expect(teamDoc(uid).showdownText).toContain('Ability:');
            expect(teamDoc(uid).sprites).toHaveLength(6);
            expect(teamDoc(uid).random).toBe(true);
        }
        expect(teamDoc(P1).showdownText).not.toBe(teamDoc(P2).showdownText);
    });

    // The whole point of storing teams per-document: a player must not learn the
    // other side's sets from the roll they triggered themselves.
    it('returns the caller their own six and nothing about the opponent', async () => {
        const res = await roll(P2);

        expect(res.body.roster).toHaveLength(6);
        const mine = teamDoc(P2).sprites.map((mon) => mon.name);
        expect(res.body.roster.map((mon) => mon.name)).toEqual(mine);
        expect(JSON.stringify(res.body)).not.toContain('showdownText');
    });

    it('rolls once, however many times it is called', async () => {
        await roll(P2);
        const dealt = teamDoc(P1).showdownText;
        const rolledAt = battleDoc().randomTeamsRolledAt;

        const second = await roll(P1);
        expect(second.statusCode).toBe(200);
        expect(second.body.alreadyRolled).toBe(true);
        expect(teamDoc(P1).showdownText).toBe(dealt);
        expect(battleDoc().randomTeamsRolledAt).toBe(rolledAt);
    });

    // firestore.rules refuses a client team write in a random battle, but a
    // document created before the mode could be read must not survive either.
    it('overwrites a team a player wrote for themselves before the roll', async () => {
        state.store.set(`${BATTLE}/teams/${P1}`, {
            showdownText: 'Arceus @ Leftovers\nAbility: Multitype\nLevel: 100\n- Judgment\n',
        });

        await roll(P1);
        expect(teamDoc(P1).showdownText).not.toContain('Judgment');
        expect(teamDoc(P1).random).toBe(true);
    });

    it('refuses anyone who is not in the battle', async () => {
        const res = await roll('uid-stranger');
        expect(res.statusCode).toBe(403);
        expect(teamDoc(P1)).toBeUndefined();
    });

    it('refuses a battle that is not in random mode', async () => {
        state.store.set(BATTLE, { ...battleDoc(), mode: 'standard' });
        const res = await roll(P1);
        expect(res.statusCode).toBe(409);
        expect(teamDoc(P1)).toBeUndefined();
    });

    it('refuses to deal before the challenge has been accepted', async () => {
        state.store.set(BATTLE, { ...battleDoc(), status: 'pending' });
        const res = await roll(P1);
        expect(res.statusCode).toBe(409);
        expect(battleDoc().status).toBe('pending');
    });

    it('reports a missing battle rather than creating one', async () => {
        state.store.delete(BATTLE);
        const res = await roll(P1);
        expect(res.statusCode).toBe(404);
    });
});

describe('a rolled battle, played through the turn resolver', () => {
    it('opens straight into a move prompt — gen9randombattle has no team preview', async () => {
        await roll(P2);
        await turn(P1, null);

        expect(battleDoc().awaitingChoiceFrom).toEqual([P1, P2]);
        for (const uid of [P1, P2]) {
            expect(requestFor(uid).active).toBeTruthy();
            expect(requestFor(uid).teamPreview).toBeUndefined();
            expect(requestFor(uid).side.pokemon).toHaveLength(6);
        }
    });

    it('resolves a turn once both players have moved', async () => {
        await roll(P2);
        await turn(P1, null);

        await turn(P1, 'move 1');
        const res = await turn(P2, 'move 1');

        expect(res.body.resolved).toBe(true);
        expect(battleDoc().turn).toBe(1);
    });

    // Each player's own stream is the only thing they are ever sent, and a
    // random battle is where that would be easiest to get wrong: both teams are
    // written by one request, moments apart, from the same generated pair.
    it('never shows a player the other side\'s bench', async () => {
        await roll(P2);
        await turn(P1, null);

        const mine = requestFor(P1).side.pokemon.map((mon) => mon.details.split(',')[0]);
        expect(mine).toEqual(teamDoc(P1).sprites.map((mon) => mon.name));

        // Everything of theirs except the lead, which walks onto the field in
        // full view. Species the viewer happens to own too prove nothing.
        const myLog = childIds(`${BATTLE}/playerLogs/${P1}/rounds`)
            .flatMap((id) => state.store.get(`${BATTLE}/playerLogs/${P1}/rounds/${id}`).lines)
            .join('\n');
        const theirBench = teamDoc(P2).sprites
            .map((mon) => mon.name)
            .slice(1)
            .filter((name) => !mine.includes(name));

        expect(theirBench.length).toBeGreaterThan(0);
        for (const species of theirBench) {
            expect(myLog).not.toContain(species);
        }
    });
});
