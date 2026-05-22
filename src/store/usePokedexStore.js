import { create } from 'zustand';
import { db } from '../services/firebase';
import { collection, query, where, orderBy, startAfter, limit, getDocs } from 'firebase/firestore';
import { useToastStore } from './useToastStore';

export const usePokedexStore = create((set, get) => ({
    pokemons: [],
    lastVisibleDoc: null,
    hasMore: true,
    isLoading: false,
    isFetchingMore: false,

    // Filters for Team Builder page
    selectedGeneration: 'all',
    selectedTypes: new Set(),
    searchInput: '',
    debouncedSearchTerm: '',
    showOnlyFavorites: false,

    // Filters for Pokedex page
    pokedexSelectedGeneration: 'all',
    pokedexSelectedTypes: new Set(),
    pokedexSearchInput: '',
    debouncedPokedexSearchTerm: '',
    pokedexShowOnlyFavorites: false,

    setFilter: (key, value) => {
        set({ [key]: value });
    },

    toggleTypeSelection: (type, isPokedex) => {
        const key = isPokedex ? 'pokedexSelectedTypes' : 'selectedTypes';
        set((state) => {
            const nextSet = new Set(state[key]);
            if (nextSet.has(type)) {
                nextSet.delete(type);
            } else {
                nextSet.add(type);
            }
            return { [key]: nextSet };
        });
    },

    buildQuery: (isPokedex, isLoadMore = false, cursor = null) => {
        const state = get();
        const genToUse = isPokedex ? state.pokedexSelectedGeneration : state.selectedGeneration;
        const searchToUse = (isPokedex ? state.debouncedPokedexSearchTerm : state.debouncedSearchTerm).toLowerCase();
        const typesToUse = Array.from(isPokedex ? state.pokedexSelectedTypes : state.selectedTypes);

        const q = collection(db, 'artifacts/pokemonTeamBuilder/pokemons');
        const constraints = [];

        if (genToUse !== 'all') {
            constraints.push(where('generation', '==', genToUse));
        }
        if (typesToUse.length > 0) {
            constraints.push(where('types', 'array-contains-any', typesToUse));
        }

        if (searchToUse) {
            constraints.push(orderBy('name'));
            constraints.push(where('name', '>=', searchToUse));
            constraints.push(where('name', '<=', searchToUse + '\uf8ff'));
        } else {
            constraints.push(orderBy('id'));
        }

        if (isLoadMore && cursor) {
            constraints.push(startAfter(cursor));
        }

        constraints.push(limit(50));

        return query(q, ...constraints);
    },

    fetchInitial: async (isPokedex) => {
        set({ isLoading: true, hasMore: true, lastVisibleDoc: null });
        const q = get().buildQuery(isPokedex, false, null);

        try {
            const documentSnapshots = await getDocs(q);
            const firstBatch = documentSnapshots.docs.map(doc => doc.data());
            const lastVisible = documentSnapshots.docs[documentSnapshots.docs.length - 1];

            set({
                pokemons: firstBatch,
                lastVisibleDoc: lastVisible,
                hasMore: documentSnapshots.docs.length >= 50
            });
        } catch (error) {
            console.error("Error fetching pokemons:", error);
            useToastStore.getState().showToast(
                "Error loading Pokémon list. You may need to create a composite index in Firestore.",
                "error"
            );
            set({ pokemons: [] });
        } finally {
            set({ isLoading: false });
        }
    },

    fetchMore: async (isPokedex) => {
        const { isFetchingMore, hasMore, lastVisibleDoc } = get();
        if (isFetchingMore || !hasMore || !lastVisibleDoc) return;

        set({ isFetchingMore: true });
        const q = get().buildQuery(isPokedex, true, lastVisibleDoc);

        try {
            const documentSnapshots = await getDocs(q);
            const newBatch = documentSnapshots.docs.map(doc => doc.data());
            const lastVisible = documentSnapshots.docs[documentSnapshots.docs.length - 1];

            set((state) => ({
                pokemons: [...state.pokemons, ...newBatch],
                lastVisibleDoc: lastVisible,
                hasMore: documentSnapshots.docs.length >= 50
            }));
        } catch (error) {
            console.error("Error fetching more pokemons:", error);
            useToastStore.getState().showToast("Failed to load more Pokémon.", "error");
        } finally {
            set({ isFetchingMore: false });
        }
    }
}));
