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
vi.mock('./useToastStore', () => ({ toast: { error: vi.fn(), warning: vi.fn(), success: vi.fn() } }));
vi.mock('./useAuthStore', () => ({ useAuthStore: { getState: () => ({}) } }));
vi.mock('./useFirestoreTeamsStore', () => ({ useFirestoreTeamsStore: { getState: () => ({}) } }));
vi.mock('./usePokedexStore', () => ({ usePokedexStore: { getState: () => ({ pokemons: [] }) } }));

let store;
let toast;

beforeEach(async () => {
    pendingDetails.clear();
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
