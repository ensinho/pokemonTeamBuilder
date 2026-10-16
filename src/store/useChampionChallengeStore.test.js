import { describe, it, expect, beforeEach, vi } from 'vitest';

const api = vi.hoisted(() => ({ state: vi.fn(), start: vi.fn(), choose: vi.fn(), forfeit: vi.fn() }));
const nav = vi.hoisted(() => ({ promptSignIn: vi.fn() }));

vi.mock('../services/challengeApi', () => ({ challengeApi: api }));
vi.mock('../utils/navigation', () => ({ promptSignIn: nav.promptSignIn }));

const { useChampionChallengeStore } = await import('./useChampionChallengeStore');

const ok = (payload) => ({ ok: true, status: 200, payload, error: null });
const fail = (error, status = 409, extra = {}) => ({ ok: false, status, payload: { error, ...extra }, error });

const STATE = {
    dayKey: '2026-10-14',
    nextResetAt: 1,
    day: { difficulty: 'platinum', lineup: [], dailyTeam: { members: [] } },
    official: null,
    run: null,
    stats: { streak: 0, bestStreak: 0, wins: 0, played: 0 },
};
const ACTIVE = { runId: 'u_2026-10-14', practice: false, status: 'active', turn: 3, lines: ['|turn|3'], result: null };

const store = () => useChampionChallengeStore.getState();

beforeEach(() => {
    store().reset();
    for (const fn of Object.values(api)) fn.mockReset();
    nav.promptSignIn.mockReset();
});

describe('useChampionChallengeStore', () => {
    it('loads once into "ready" and keeps data on screen when a later load fails', async () => {
        api.state.mockResolvedValueOnce(ok({ ...STATE, run: ACTIVE }));
        await store().load();
        expect(store()).toMatchObject({ status: 'ready', hasLoaded: true, run: ACTIVE });

        api.state.mockResolvedValueOnce(fail('internal', 500));
        await store().load();
        expect(store().status).toBe('ready');
        expect(store().run).toEqual(ACTIVE);
    });

    it('shows an error screen only when nothing ever loaded, offline included', async () => {
        api.state.mockRejectedValueOnce(new TypeError('Failed to fetch'));
        await store().load();
        expect(store()).toMatchObject({ status: 'error', hasLoaded: false, loadError: 'offline' });
    });

    it('marks the choice pending on the tap and clears it when the turn comes back', async () => {
        useChampionChallengeStore.setState({ ...STATE, hasLoaded: true, status: 'ready', run: ACTIVE });
        let resolve;
        api.choose.mockReturnValueOnce(new Promise((r) => { resolve = r; }));

        const done = store().choose('move 2', 'Hurricane');
        expect(store().pending).toEqual({ choice: 'move 2', label: 'Hurricane', turn: 3 });
        expect(api.choose).toHaveBeenCalledWith({ runId: ACTIVE.runId, turn: 3, choice: 'move 2' });
        // A second tap while one is in flight is ignored.
        expect(await store().choose('move 1', 'Scald')).toBe(false);

        resolve(ok({ turn: 4, status: 'active', lines: ['|move|p1a: Pelipper|Hurricane|p2a: Spiritomb', '|turn|4'], events: [{ key: 'challenge.cynthia.ace', at: 0 }], result: null }));
        await done;
        expect(store().pending).toBe(null);
        expect(store().run.turn).toBe(4);
        expect(store().run.lines).toHaveLength(3);
        expect(store().events[0].key).toBe('challenge.cynthia.ace');
    });

    it('reloads instead of erroring on a stale turn (another tab moved first)', async () => {
        useChampionChallengeStore.setState({ ...STATE, hasLoaded: true, status: 'ready', run: ACTIVE });
        api.choose.mockResolvedValueOnce(fail('staleTurn', 409, { turn: 5 }));
        api.state.mockResolvedValueOnce(ok({ ...STATE, run: { ...ACTIVE, turn: 5 } }));
        await store().choose('move 1', 'Scald');
        expect(api.state).toHaveBeenCalledTimes(1);
        expect(store().run.turn).toBe(5);
        expect(store().pending).toBe(null);
    });

    it('records the official result and streak when the battle ends', async () => {
        useChampionChallengeStore.setState({ ...STATE, hasLoaded: true, status: 'ready', run: ACTIVE });
        api.choose.mockResolvedValueOnce(ok({
            turn: 4, status: 'won', lines: ['|win|Enzo'], events: [],
            result: { turns: 4, remaining: 3, hpPct: 60, score: 1490, streak: 2, bestStreak: 5, winChanceCurve: [0.5, 0.9] },
        }));
        await store().choose('move 1', 'Scald');
        expect(store().run).toMatchObject({ status: 'won', winChanceCurve: [0.5, 0.9] });
        expect(store().official).toMatchObject({ status: 'won' });
        expect(store().stats).toMatchObject({ streak: 2, bestStreak: 5, wins: 1, played: 1 });
    });

    it('sends a guest to sign in instead of starting, and lists a bad team', async () => {
        api.start.mockResolvedValueOnce(fail('signInRequired', 403));
        expect(await store().start({ team: { source: 'daily' } })).toBe(false);
        expect(nav.promptSignIn).toHaveBeenCalledWith('signIn');

        api.start.mockResolvedValueOnce(fail('invalidTeam', 400, { errors: [{ slot: 0, code: 'noMoves' }] }));
        await store().start({ team: { source: 'saved', showdownText: 'Pikachu' } });
        expect(store().teamErrors).toEqual([{ slot: 0, code: 'noMoves' }]);
        expect(store().isStarting).toBe(false);
    });
});
