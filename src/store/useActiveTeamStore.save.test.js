import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Saving, loading a saved team over a draft, and the share link: the ordering
// bugs of the 2026-11 UX audit (a double tap writing two documents, a link
// published anew on every tap, a draft replaced with no way back).

let pendingWrites = [];
const setDoc = vi.fn(() => new Promise((resolve, reject) => { pendingWrites.push({ resolve, reject }); }));
let docSeq = 0;

vi.mock('../services/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
    doc: (_db, _path, id) => ({ id: id || `doc-${(docSeq += 1)}` }),
    collection: () => ({}),
    setDoc: (...args) => setDoc(...args),
}));
vi.mock('../services/pokemonDataCache', () => ({ resolvePokemonDetail: () => Promise.resolve(null) }));
vi.mock('../services/speciesIndex', () => ({
    ensureSpeciesIndex: () => Promise.resolve({ baseIdOf: null, list: [] }),
    getSpeciesIndex: () => ({ baseIdOf: null }),
}));
vi.mock('../services/staticData', () => ({ loadStaticData: () => Promise.resolve({ byStone: {} }) }));
vi.mock('../services/analytics', () => ({ track: () => {} }));
vi.mock('../services/localeHistory', () => ({ deployBase: () => '/' }));
vi.mock('./useToastStore', () => ({ toast: { error: vi.fn(), warning: vi.fn(), success: vi.fn(), info: vi.fn() } }));
vi.mock('./useAuthStore', () => ({ useAuthStore: { getState: () => ({ userId: 'u1', isAuthReady: true }) }, markJourney: () => {} }));
vi.mock('./useFirestoreTeamsStore', () => ({ useFirestoreTeamsStore: { getState: () => ({ setActiveTeamId: () => {} }) } }));
vi.mock('./usePokedexStore', () => ({ usePokedexStore: { getState: () => ({ pokemons: [] }) } }));

let store;
let toast;

const member = (id) => ({
    id, name: `mon${id}`, types: ['water'], instanceId: `${id}-i`,
    abilities: [{ name: 'torrent' }], moves: [{ name: 'surf' }],
    customization: { item: '', moves: [] },
});
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(async () => {
    pendingWrites = [];
    docSeq = 0;
    vi.clearAllMocks();
    vi.resetModules();
    ({ useActiveTeamStore: store } = await import('./useActiveTeamStore'));
    ({ toast } = await import('./useToastStore'));
});

afterEach(() => vi.unstubAllGlobals());

describe('handleSaveTeam', () => {
    it('ignores a second tap while the first save is in flight', async () => {
        store.setState({ currentTeam: [member(7)], teamName: 'Rain' });
        const first = store.getState().handleSaveTeam([]);
        const second = store.getState().handleSaveTeam([]);
        expect(await second).toBe(false);
        await flush();
        expect(setDoc).toHaveBeenCalledTimes(1);
        // The baseline moved on the tap: the button already reads "saved".
        expect(store.getState().editingTeamId).toBeTruthy();
        expect(store.getState().isSaving).toBe(true);
        pendingWrites[0].resolve();
        expect(await first).toBe(true);
        expect(store.getState().isSaving).toBe(false);
    });

    it('rolls the baseline back and offers a retry when the write fails', async () => {
        store.setState({ currentTeam: [member(7)], teamName: 'Rain' });
        const saving = store.getState().handleSaveTeam([]);
        await flush();
        pendingWrites[0].reject(new Error('offline'));
        expect(await saving).toBe(false);
        expect(store.getState().editingTeamId).toBeNull();
        expect(store.getState().savedSignature).toBeNull();
        const [, options] = toast.error.mock.calls.at(-1);
        expect(options.actions[0].label).toBeTruthy();
    });

    it('reports a taken name on the field instead of writing', async () => {
        store.setState({ currentTeam: [member(7)], teamName: 'Rain' });
        await store.getState().handleSaveTeam([{ id: 'other', name: 'Rain' }]);
        expect(setDoc).not.toHaveBeenCalled();
        expect(store.getState().nameError?.reason).toBe('taken');
        store.getState().setTeamName('Rain 2');
        expect(store.getState().nameError).toBeNull();
    });
});

describe('loadTeamForEditing', () => {
    it('offers an undo when it replaces an unsaved draft', () => {
        const draft = [member(1)];
        store.setState({ currentTeam: draft, teamName: 'Draft' });
        store.getState().loadTeamForEditing({ members: [member(2)], name: 'Saved', id: 't1' });
        expect(store.getState().editingTeamId).toBe('t1');

        const [, options] = toast.success.mock.calls.at(-1);
        options.actions[0].onClick();
        expect(store.getState().currentTeam).toBe(draft);
        expect(store.getState().teamName).toBe('Draft');
        expect(store.getState().editingTeamId).toBeNull();
    });

    it('offers nothing to undo over an empty builder', () => {
        store.getState().loadTeamForEditing({ members: [member(2)], name: 'Saved', id: 't1' });
        const [, options] = toast.success.mock.calls.at(-1);
        expect(options.actions).toEqual([]);
    });
});

describe('copyTeamLink', () => {
    it('publishes once and hands out the same page while the team is unchanged', async () => {
        const writeText = vi.fn(() => Promise.resolve());
        vi.stubGlobal('navigator', { clipboard: { writeText } });
        vi.stubGlobal('window', { location: { origin: 'https://example.test', pathname: '/builder' }, matchMedia: () => ({ matches: false }) });
        store.setState({ currentTeam: [member(7)], teamName: 'Rain' });

        const first = store.getState().copyTeamLink();
        await flush();
        pendingWrites[0].resolve();
        await first;
        await store.getState().copyTeamLink();

        expect(setDoc).toHaveBeenCalledTimes(1);
        expect(writeText).toHaveBeenCalledTimes(2);
        expect(writeText.mock.calls[0][0]).toBe(writeText.mock.calls[1][0]);
    });
});
