import { describe, it, expect, vi, beforeEach } from 'vitest';

// A store test for the same reason as useFirestoreTeamsStore.test.js: what this
// guards is ordering — a tap landing while an earlier add is still resolving,
// a removal racing a resolve — not any calculation.

const pendingDetails = new Map();
const deferDetail = (id) => new Promise((resolve) => { pendingDetails.set(id, resolve); });

vi.mock('../services/firebase', () => ({ db: null }));
vi.mock('firebase/firestore', () => ({ doc: () => ({}), collection: () => ({}), setDoc: vi.fn() }));
vi.mock('../services/pokemonDataCache', () => ({ resolvePokemonDetail: (id) => deferDetail(id) }));
vi.mock('../utils/loadCompetitivePreset', () => ({
    competitivePresetFor: () => Promise.resolve({ item: 'Leftovers', ability: 'pressure' }),
}));
vi.mock('./useToastStore', () => ({ toast: { error: vi.fn(), warning: vi.fn(), success: vi.fn(), info: vi.fn() } }));
vi.mock('./useAuthStore', () => ({ useAuthStore: { getState: () => ({}) } }));
vi.mock('./useFirestoreTeamsStore', () => ({ useFirestoreTeamsStore: { getState: () => ({}) } }));
vi.mock('./usePokedexStore', () => ({ usePokedexStore: { getState: () => ({ pokemons: [] }) } }));

let store;
let toast;

beforeEach(async () => {
    pendingDetails.clear();
    // Mock factories outlive vi.resetModules, so their call history would leak
    // from one test into the next.
    vi.clearAllMocks();
    vi.resetModules();
    ({ useActiveTeamStore: store } = await import('./useActiveTeamStore'));
    ({ toast } = await import('./useToastStore'));
});

const entry = (id, name) => ({ id, name, types: ['water'] });
const detail = (id) => ({ id, abilities: [{ name: 'torrent' }], moves: [{ name: 'surf' }] });
const settle = () => new Promise((r) => setTimeout(r, 0));

describe('handleAddPokemon', () => {
    it('fills the slot on the tap, before the full record resolves', async () => {
        const done = store.getState().handleAddPokemon(entry(7, 'squirtle'));
        const team = store.getState().currentTeam;
        expect(team.map((m) => m.id)).toEqual([7]);
        expect(team[0].abilities).toBeUndefined();

        pendingDetails.get(7)(detail(7));
        await done;
        const [member] = store.getState().currentTeam;
        expect(member.instanceId).toBe(team[0].instanceId);
        expect(member.abilities).toEqual([{ name: 'torrent' }]);
        expect(member.customization.item).toBe('Leftovers');
    });

    it('keeps both Pokémon when a second tap lands while the first resolves', async () => {
        const first = store.getState().handleAddPokemon(entry(7, 'squirtle'));
        const second = store.getState().handleAddPokemon(entry(8, 'wartortle'));
        pendingDetails.get(8)(detail(8));
        pendingDetails.get(7)(detail(7));
        await Promise.all([first, second]);
        expect(store.getState().currentTeam.map((m) => m.id)).toEqual([7, 8]);
    });

    it('does not bring back a member removed before its record arrived', async () => {
        const done = store.getState().handleAddPokemon(entry(7, 'squirtle'));
        const [{ instanceId }] = store.getState().currentTeam;
        store.getState().handleRemoveFromTeam(instanceId);
        pendingDetails.get(7)(detail(7));
        await done;
        expect(store.getState().currentTeam).toEqual([]);
    });

    it('keeps customisation made while the record was resolving', async () => {
        const done = store.getState().handleAddPokemon(entry(7, 'squirtle'));
        const [{ instanceId, customization }] = store.getState().currentTeam;
        store.getState().handleUpdateTeamMember(instanceId, { ...customization, item: 'Choice Scarf' });
        pendingDetails.get(7)(detail(7));
        await done;
        expect(store.getState().currentTeam[0].customization.item).toBe('Choice Scarf');
    });

    it('rolls the slot back and says so when the record cannot be loaded', async () => {
        const done = store.getState().handleAddPokemon(entry(7, 'squirtle'));
        pendingDetails.get(7)(null);
        await done;
        expect(store.getState().currentTeam).toEqual([]);
        expect(toast.error).toHaveBeenCalled();
    });

    it('counts a still-resolving member toward the six-slot limit', async () => {
        for (let id = 1; id <= 7; id += 1) store.getState().handleAddPokemon(entry(id, `mon${id}`));
        await settle();
        expect(store.getState().currentTeam).toHaveLength(6);
        expect(toast.warning).toHaveBeenCalled();
    });
});

describe('handleClearTeam', () => {
    it('clears at once and offers an undo that brings the whole team back', async () => {
        store.getState().handleAddPokemon(entry(7, 'squirtle'));
        store.getState().handleAddPokemon(entry(8, 'wartortle'));
        store.setState({ teamName: 'Rain', editingTeamId: 'team-1' });
        const before = store.getState().currentTeam;

        store.getState().handleClearTeam();
        expect(store.getState().currentTeam).toEqual([]);
        expect(store.getState().teamName).toBe('');

        const [, options] = toast.info.mock.calls.at(-1);
        options.actions[0].onClick();
        expect(store.getState().currentTeam).toEqual(before);
        expect(store.getState().teamName).toBe('Rain');
        expect(store.getState().editingTeamId).toBe('team-1');
    });

    it('says nothing when there was nothing to clear', () => {
        store.getState().handleClearTeam();
        expect(toast.info).not.toHaveBeenCalled();
    });
});

describe('handleRemoveFromTeam', () => {
    it('removes at once and the undo puts the member back in its slot', async () => {
        for (const id of [7, 8, 9]) store.getState().handleAddPokemon(entry(id, `mon${id}`));
        const before = store.getState().currentTeam;
        store.getState().handleRemoveFromTeam(before[1].instanceId);
        expect(store.getState().currentTeam.map((m) => m.id)).toEqual([7, 9]);

        const [, options] = toast.info.mock.calls.at(-1);
        options.actions[0].onClick();
        expect(store.getState().currentTeam.map((m) => m.id)).toEqual([7, 8, 9]);
        // A second undo (double tap) must not duplicate the member.
        options.actions[0].onClick();
        expect(store.getState().currentTeam).toHaveLength(3);
    });
});

describe('handleUpdateTeamMember', () => {
    it('keeps the edit and offers an undo that restores the previous build', () => {
        store.getState().handleAddPokemon(entry(7, 'squirtle'));
        const [{ instanceId, customization }] = store.getState().currentTeam;
        expect(store.getState().handleUpdateTeamMember(instanceId, { ...customization, item: 'leftovers' })).toBe(true);
        expect(store.getState().currentTeam[0].customization.item).toBe('leftovers');

        const [, options] = toast.info.mock.calls.at(-1);
        options.actions[0].onClick();
        expect(store.getState().currentTeam[0].customization).toEqual(customization);
    });

    it('does nothing (and says nothing) when the build did not change', () => {
        store.getState().handleAddPokemon(entry(7, 'squirtle'));
        const [{ instanceId, customization }] = store.getState().currentTeam;
        expect(store.getState().handleUpdateTeamMember(instanceId, { ...customization })).toBe(false);
        expect(toast.info).not.toHaveBeenCalled();
    });
});

describe('defaultTeamName and the unsaved-changes baseline', () => {
    it('names an unnamed team after its first member, numbered when taken', async () => {
        const { defaultTeamName } = await import('./useActiveTeamStore');
        const team = [entry(25, 'pikachu')];
        expect(defaultTeamName([], [])).toBe('');
        expect(defaultTeamName(team, [])).toMatch(/Pikachu/);
        const first = defaultTeamName(team, []);
        expect(defaultTeamName(team, [{ id: 'a', name: first }])).toBe(`${first} 2`);
        // The team being edited does not collide with its own saved name.
        expect(defaultTeamName(team, [{ id: 'a', name: first }], 'a')).toBe(first);
    });

    it('is dirty only after a loaded team changes', async () => {
        const { selectIsTeamDirty } = await import('./useActiveTeamStore');
        store.getState().handleAddPokemon(entry(7, 'squirtle'));
        store.setState({ teamName: 'Rain' });
        expect(selectIsTeamDirty(store.getState())).toBe(false);
        store.getState().setEditingTeamId('team-1');
        expect(selectIsTeamDirty(store.getState())).toBe(false);
        store.getState().setTeamName('Rain 2');
        expect(selectIsTeamDirty(store.getState())).toBe(true);
        store.getState().setTeamName('Rain');
        expect(selectIsTeamDirty(store.getState())).toBe(false);
    });
});

describe('exportTeamToShowdown', () => {
    it('waits for the clipboard and offers Showdown as the toast action', async () => {
        const writeText = vi.fn(() => Promise.resolve());
        vi.stubGlobal('navigator', { clipboard: { writeText } });
        const open = vi.fn();
        vi.stubGlobal('window', { open, location: { pathname: '/builder' } });
        store.setState({ buildShowdownExportText: () => 'Squirtle' });
        const ok = await store.getState().exportTeamToShowdown([entry(7, 'squirtle')], 'Rain');
        expect(ok).toBe(true);
        expect(writeText).toHaveBeenCalledWith('Squirtle');
        expect(open).not.toHaveBeenCalled();
        const [, options] = toast.success.mock.calls.at(-1);
        options.actions[0].onClick();
        expect(open).toHaveBeenCalledWith(expect.stringContaining('pokemonshowdown.com'), '_blank', 'noopener,noreferrer');
        vi.unstubAllGlobals();
    });

    it('warns instead of copying an empty team', async () => {
        expect(await store.getState().exportTeamToShowdown([], '')).toBe(false);
        expect(toast.warning).toHaveBeenCalled();
    });
});
