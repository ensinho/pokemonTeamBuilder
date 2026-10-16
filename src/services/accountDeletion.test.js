import { beforeEach, describe, expect, it, vi } from 'vitest';

// A tiny in-memory stand-in for the Firestore calls deleteUserData makes.
const store = new Map(); // path → data
const batches = [];

vi.mock('./firebase', () => ({ db: {} }));
vi.mock('../constants/firebase', () => ({ appId: 'app' }));
const forget = vi.fn(async () => ({ ok: true, payload: { removed: 1 } }));
vi.mock('./challengeApi', () => ({ challengeApi: { forget: (...args) => forget(...args) } }));
vi.mock('firebase/firestore', () => {
    const ref = (path) => ({ path });
    const childrenOf = (path) => [...store.keys()].filter((key) => key.startsWith(`${path}/`) && !key.slice(path.length + 1).includes('/'));
    return {
        collection: (_db, path) => ({ path, kind: 'collection' }),
        doc: (_db, path, id) => ref(id ? `${path}/${id}` : path),
        where: (field, op, value) => ({ field, op, value }),
        query: (col, filter) => ({ ...col, filter }),
        getDocs: async (q) => {
            const docs = childrenOf(q.path)
                .filter((path) => {
                    if (!q.filter) return true;
                    const value = store.get(path)?.[q.filter.field];
                    return q.filter.op === 'array-contains' ? value?.includes(q.filter.value) : value === q.filter.value;
                })
                .map((path) => ({ ref: ref(path) }));
            return { docs };
        },
        writeBatch: () => {
            const paths = [];
            return {
                delete: (r) => paths.push(r.path),
                commit: async () => { batches.push(paths); paths.forEach((p) => store.delete(p)); },
            };
        },
    };
});

const { deleteUserData } = await import('./accountDeletion');

describe('deleteUserData', () => {
    beforeEach(() => {
        store.clear();
        batches.length = 0;
        forget.mockClear();
        const base = 'artifacts/app';
        store.set(`${base}/users/me/teams/t1`, {});
        store.set(`${base}/challengeRuns/me_2026-10-15`, { uid: 'me' });
        store.set(`${base}/challengeRuns/me_2026-10-15/rounds/0001`, {});
        store.set(`${base}/challengeRuns/me_2026-10-15/rounds/0002`, {});
        store.set(`${base}/challengeRuns/me_2026-10-15/secret/state`, {});
        store.set(`${base}/challengeRuns/me_2026-10-15_p1`, { uid: 'me' });
        store.set(`${base}/challengeStats/me`, { streak: 3 });
        store.set(`${base}/challengeRuns/you_2026-10-15`, { uid: 'you' });
        store.set(`${base}/challengeStats/you`, { streak: 1 });
        store.set(`${base}/aiTraining/row1`, { result: 'won' });
    });

    it("erases the player's challenge runs, their rounds and secret state, and their stats", async () => {
        await deleteUserData('me');
        const left = [...store.keys()];
        expect(left.filter((path) => path.includes('/me'))).toEqual([]);
        // Someone else's challenge and the anonymous training rows stay.
        expect(left).toContain('artifacts/app/challengeRuns/you_2026-10-15');
        expect(left).toContain('artifacts/app/challengeStats/you');
        expect(left).toContain('artifacts/app/aiTraining/row1');
    });

    it('deletes a run only after its rounds and secret state (their rule reads the run)', async () => {
        await deleteUserData('me');
        const order = batches.flat();
        const run = order.indexOf('artifacts/app/challengeRuns/me_2026-10-15');
        expect(run).toBeGreaterThan(order.indexOf('artifacts/app/challengeRuns/me_2026-10-15/rounds/0002'));
        expect(run).toBeGreaterThan(order.indexOf('artifacts/app/challengeRuns/me_2026-10-15/secret/state'));
        expect(batches.length).toBeGreaterThanOrEqual(2);
    });

    it('asks the endpoint to take the player off the ranking, and carries on if it is down', async () => {
        await deleteUserData('me');
        expect(forget).toHaveBeenCalledOnce();
        forget.mockRejectedValueOnce(new Error('offline'));
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        store.set('artifacts/app/challengeStats/me', { streak: 1 });
        await expect(deleteUserData('me')).resolves.toBeUndefined();
        expect(store.has('artifacts/app/challengeStats/me')).toBe(false);
        spy.mockRestore();
    });
});
