import { describe, it, expect, vi, beforeEach } from 'vitest';

// Guards the loading edge: `isLoading` is what the Pokédex and both builders
// render as `isInitialLoading`, which swaps the whole grid for the loader. It
// may rise for the first list only — a refilter re-running it remounted every
// card on every debounced keystroke (docs/wounds.md 2026-09-24, backlog 13).

const INDEX = [
    { id: 1, name: 'bulbasaur', types: ['grass', 'poison'], generation: 'generation-i' },
    { id: 4, name: 'charmander', types: ['fire'], generation: 'generation-i' },
    { id: 7, name: 'squirtle', types: ['water'], generation: 'generation-i' },
];

vi.mock('../services/pokemonDataCache', () => ({
    loadPokemonIndex: () => Promise.resolve(INDEX),
    loadGames: () => Promise.resolve([]),
}));
vi.mock('./useToastStore', () => ({ toast: { error: vi.fn() } }));
vi.mock('./useFirestoreTeamsStore', () => ({
    useFirestoreTeamsStore: { getState: () => ({ favoritePokemons: new Set() }) },
}));

let store;

beforeEach(async () => {
    vi.resetModules();
    ({ usePokedexStore: store } = await import('./usePokedexStore'));
});

describe('fetchInitial', () => {
    it('shows the loader for the first list', async () => {
        const seen = [];
        const unsubscribe = store.subscribe((state) => seen.push(state.isLoading));
        await store.getState().fetchInitial(true);
        unsubscribe();
        expect(seen).toContain(true);
        expect(store.getState().isLoading).toBe(false);
        expect(store.getState().pokemons.map((p) => p.id)).toEqual([1, 4, 7]);
    });

    it('refilters without raising isLoading once a list exists', async () => {
        await store.getState().fetchInitial(true);
        const seen = [];
        const unsubscribe = store.subscribe((state) => seen.push(state.isLoading));
        store.setState({ debouncedPokedexSearchTerm: 'char' });
        await store.getState().fetchInitial(true);
        unsubscribe();
        expect(seen).not.toContain(true);
        expect(store.getState().pokemons.map((p) => p.id)).toEqual([4]);
    });
});
