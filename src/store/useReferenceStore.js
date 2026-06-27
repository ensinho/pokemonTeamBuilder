import { create } from 'zustand';
import { loadPokemonReferenceData, loadPokemonIndex, loadGames } from '../services/pokemonDataCache';
import { useToastStore } from './useToastStore';

export const useReferenceStore = create((set, get) => ({
    generations: [],
    items: [],
    natures: [],
    // Selectable games for the "by game" filter (lightweight: key/label/generation).
    games: [],
    isLoading: false,

    // Full, unfiltered Pokémon index (all generations + battle forms, with base
    // stats). Distinct from usePokedexStore.pokemons, which is filtered/paginated.
    // Powers Speed Tiers, the damage calculator and detail name→id resolution.
    pokemonIndex: [],
    isIndexLoading: false,

    fetchReferenceData: async () => {
        set({ isLoading: true });
        try {
            const [data, games] = await Promise.all([
                loadPokemonReferenceData(),
                loadGames().catch(() => []),
            ]);
            set({
                generations: data.generations || [],
                items: data.items || [],
                natures: data.natures || [],
                games: (games || []).map((g) => ({ key: g.key, label: g.label, generation: g.generation, count: g.count, formSuffixes: g.formSuffixes || [] })),
                isLoading: false
            });
        } catch (error) {
            useToastStore.getState().showToast("Failed to load filter data.", "error");
            set({ isLoading: false });
        }
    },

    fetchPokemonIndex: async () => {
        const state = get();
        if (state.pokemonIndex.length || state.isIndexLoading) return;
        set({ isIndexLoading: true });
        try {
            const list = await loadPokemonIndex();
            set({ pokemonIndex: list, isIndexLoading: false });
        } catch (error) {
            set({ isIndexLoading: false });
        }
    },
}));
