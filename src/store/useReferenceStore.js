import { create } from 'zustand';
import { loadPokemonReferenceData } from '../services/pokemonDataCache';
import { useToastStore } from './useToastStore';

export const useReferenceStore = create((set) => ({
    generations: [],
    items: [],
    natures: [],
    isLoading: false,

    fetchReferenceData: async () => {
        set({ isLoading: true });
        try {
            const data = await loadPokemonReferenceData();
            set({
                generations: data.generations || [],
                items: data.items || [],
                natures: data.natures || [],
                isLoading: false
            });
        } catch (error) {
            useToastStore.getState().showToast("Failed to load filter data.", "error");
            set({ isLoading: false });
        }
    }
}));
