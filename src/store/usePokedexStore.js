import { create } from 'zustand';
import { loadPokemonIndex, loadGames } from '../services/pokemonDataCache';
import { useToastStore } from './useToastStore';

const PAGE_SIZE = 50;

// The full static index is loaded once and cached here for the session.
let fullIndexPromise = null;
const getFullIndex = () => {
    if (!fullIndexPromise) {
        fullIndexPromise = loadPokemonIndex().catch((error) => {
            fullIndexPromise = null; // allow retry on next attempt
            throw error;
        });
    }
    return fullIndexPromise;
};

// Game key -> Set of national-dex ids (species + native forms), loaded once.
let gameSetsPromise = null;
const getGameSets = () => {
    if (!gameSetsPromise) {
        gameSetsPromise = loadGames().then((games) => {
            const map = new Map();
            for (const g of games) {
                map.set(g.key, {
                    ids: new Set(g.pokemonIds),
                    generation: g.generation,
                    dexes: g.dexes || null,
                });
            }
            return map;
        }).catch((error) => {
            gameSetsPromise = null;
            throw error;
        });
    }
    return gameSetsPromise;
};

// Pure client-side filtering — mirrors what the old Firestore `where` clauses did.
const filterPokemons = (all, { generation, types, search, gameIds, gameGen }) => {
    const searchTerm = (search || '').toLowerCase().trim();
    const typeList = Array.from(types || []);

    const filtered = all.filter((p) => {
        if (generation && generation !== 'all' && p.generation !== generation) return false;
        if (typeList.length > 0 && !typeList.some((t) => (p.types || []).includes(t))) return false;
        if (searchTerm && !p.name.toLowerCase().includes(searchTerm)) return false;
        return true;
    });

    if (gameIds) {
        return [...filtered].sort((a, b) => {
            const aIn = gameIds.has(a.id);
            const bIn = gameIds.has(b.id);
            if (aIn && !bIn) return -1;
            if (!aIn && bIn) return 1;

            if (aIn && bIn && gameGen) {
                const aNative = a.generation === gameGen;
                const bNative = b.generation === gameGen;
                if (aNative && !bNative) return -1;
                if (!aNative && bNative) return 1;
            }

            return a.id - b.id;
        });
    }

    return filtered;
};

export const usePokedexStore = create((set, get) => ({
    pokemons: [],          // currently visible (paged) slice
    filteredPokemons: [],  // full filtered result set (client-side)
    visibleCount: PAGE_SIZE,
    hasMore: true,
    isLoading: false,
    isFetchingMore: false,
    gameSets: null,        // Game key -> Set of national-dex ids (loaded once)

    // Filters for Team Builder page
    selectedGeneration: 'all',
    selectedGame: 'all',
    selectedTypes: new Set(),
    searchInput: '',
    debouncedSearchTerm: '',
    showOnlyFavorites: false,

    // Filters for Pokedex page
    pokedexSelectedGeneration: 'all',
    pokedexSelectedGame: 'all',
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

    // Load the full index once, apply the active filters, and reveal the first page.
    fetchInitial: async (isPokedex) => {
        set({ isLoading: true, visibleCount: PAGE_SIZE });

        try {
            const all = await getFullIndex();
            const state = get();
            const gameKey = isPokedex ? state.pokedexSelectedGame : state.selectedGame;
            let gameIds = null;
            let gameGen = null;
            let gameSets = state.gameSets;
            if (!gameSets) {
                try {
                    gameSets = await getGameSets();
                    set({ gameSets });
                } catch (_) {
                    gameSets = null;
                }
            }
            if (gameKey && gameKey !== 'all' && gameSets) {
                const gameData = gameSets.get(gameKey);
                if (gameData) {
                    gameIds = gameData.ids || null;
                    gameGen = gameData.generation || null;
                }
            }
            const filtered = filterPokemons(all, {
                generation: isPokedex ? state.pokedexSelectedGeneration : state.selectedGeneration,
                types: isPokedex ? state.pokedexSelectedTypes : state.selectedTypes,
                search: isPokedex ? state.debouncedPokedexSearchTerm : state.debouncedSearchTerm,
                gameIds,
                gameGen,
            });

            set({
                filteredPokemons: filtered,
                pokemons: filtered.slice(0, PAGE_SIZE),
                hasMore: filtered.length > PAGE_SIZE,
            });
        } catch (error) {
            console.error("Error loading Pokémon index:", error);
            useToastStore.getState().showToast("Error loading Pokémon list.", "error");
            set({ pokemons: [], filteredPokemons: [], hasMore: false });
        } finally {
            set({ isLoading: false });
        }
    },

    // Reveal the next page — pure client-side slice, no network.
    fetchMore: () => {
        const { isFetchingMore, hasMore, visibleCount, filteredPokemons } = get();
        if (isFetchingMore || !hasMore) return;

        set({ isFetchingMore: true });
        try {
            const nextCount = visibleCount + PAGE_SIZE;
            set({
                pokemons: filteredPokemons.slice(0, nextCount),
                visibleCount: nextCount,
                hasMore: filteredPokemons.length > nextCount,
            });
        } finally {
            set({ isFetchingMore: false });
        }
    },
}));
