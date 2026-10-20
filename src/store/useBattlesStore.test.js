import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The open battle's log: painted from this device's copy, the listener asked
 * only for the rounds after it, rounds merged by sequence from either source.
 * Firestore is a stand-in that records the query and hands back snapshots.
 */

const listeners = [];
vi.mock('firebase/firestore', () => ({
    collection: (_db, path) => ({ path }),
    doc: (_db, path, id) => ({ path: id ? `${path}/${id}` : path }),
    query: (ref, ...constraints) => ({ ...ref, constraints }),
    where: (field, op, value) => ({ where: [field, op, value] }),
    orderBy: (field, dir) => ({ orderBy: [field, dir] }),
    onSnapshot: (q, next) => {
        const entry = { q, next, active: true };
        listeners.push(entry);
        return () => { entry.active = false; };
    },
    getDoc: vi.fn(), setDoc: vi.fn(), updateDoc: vi.fn(), deleteDoc: vi.fn(), runTransaction: vi.fn(), writeBatch: vi.fn(),
}));
vi.mock('../services/firebase', () => ({ db: {}, auth: {} }));
vi.mock('../services/apiClient', () => ({ callAuthedApi: vi.fn(async () => ({ ok: true, payload: {}, error: null })) }));
vi.mock('./useAuthStore', () => ({
    useAuthStore: { getState: () => ({ userId: 'u1', isAnonymous: false, trainerDisplayName: () => 'Ash', publicAvatar: () => ({}) }) },
}));
vi.mock('../services/speciesIndex', () => ({ ensureSpeciesIndex: async () => ({ entryById: new Map() }) }));

const { useBattlesStore } = await import('./useBattlesStore');
const { writeCachedLog, readCachedLog } = await import('../utils/battleLogCache');

const store = new Map();
beforeEach(() => {
    listeners.length = 0;
    store.clear();
    vi.stubGlobal('localStorage', {
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: (k) => store.delete(k),
        key: (i) => [...store.keys()][i] ?? null,
        get length() { return store.size; },
    });
});
afterEach(() => {
    useBattlesStore.getState().clearOpenBattle();
    vi.unstubAllGlobals();
});

const snapshot = (rounds) => ({ docs: rounds.map(([seq, lines]) => ({ data: () => ({ seq, round: seq, lines }) })) });

describe('the open battle log', () => {
    it('asks for every round when this device has none', () => {
        useBattlesStore.getState().initLogListener('b1');
        expect(useBattlesStore.getState().hasLog).toBe(false);
        expect(listeners[0].q.constraints).toContainEqual({ where: ['seq', '>=', 0] });

        listeners[0].next(snapshot([[0, ['|start']], [1, ['|turn|1']]]));
        expect(useBattlesStore.getState().myLog).toEqual(['|start', '|turn|1']);
        expect(useBattlesStore.getState().hasLog).toBe(true);
        // …and keeps them for next time.
        expect(readCachedLog('u1', 'b1')).toEqual({ lines: ['|start', '|turn|1'], upTo: 2 });
    });

    it('paints from the cache at once and asks only for what it lacks', () => {
        writeCachedLog('u1', 'b1', { lines: ['|start', '|turn|1'], upTo: 2 });
        useBattlesStore.getState().initLogListener('b1');

        expect(useBattlesStore.getState().myLog).toEqual(['|start', '|turn|1']);
        expect(useBattlesStore.getState().hasLog).toBe(true);
        expect(listeners[0].q.constraints).toContainEqual({ where: ['seq', '>=', 2] });

        listeners[0].next(snapshot([[2, ['|turn|2']]]));
        expect(useBattlesStore.getState().myLog).toEqual(['|start', '|turn|1', '|turn|2']);
    });

    it('merges a turn\'s own lines with the listener\'s, by sequence, once each', () => {
        useBattlesStore.getState().initLogListener('b1');
        listeners[0].next(snapshot([[0, ['|start']]]));

        // The response brings round 2 before round 1 arrived: it waits for the gap.
        useBattlesStore.getState().mergeLogDeltas('b1', [{ seq: 2, lines: ['|turn|2'] }]);
        expect(useBattlesStore.getState().myLog).toEqual(['|start']);

        listeners[0].next(snapshot([[0, ['|start']], [1, ['|turn|1']], [2, ['|turn|2']]]));
        useBattlesStore.getState().mergeLogDeltas('b1', [{ seq: 1, lines: ['|turn|1'] }]);
        expect(useBattlesStore.getState().myLog).toEqual(['|start', '|turn|1', '|turn|2']);
    });

    it('ignores rounds for a battle that is no longer open', () => {
        useBattlesStore.getState().initLogListener('b1');
        useBattlesStore.getState().mergeLogDeltas('other', [{ seq: 0, lines: ['|x'] }]);
        expect(useBattlesStore.getState().myLog).toEqual([]);
    });
});
