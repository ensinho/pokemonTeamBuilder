import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { usePokedexStore } from '../store/usePokedexStore';
import { useDebounce } from './useDebounce';
import { useAuthStore } from '../store/useAuthStore';

export function usePokedex() {
    const location = useLocation();
    const isPokedex = location.pathname.includes('/pokedex') || location.pathname.includes('/locations');
    const isAuthReady = useAuthStore(state => state.isAuthReady);

    // Retrieve state slices granularly to avoid subscribing to the entire store
    const searchInput = usePokedexStore(state => state.searchInput);
    const pokedexSearchInput = usePokedexStore(state => state.pokedexSearchInput);
    const debouncedSearchTermInStore = usePokedexStore(state => state.debouncedSearchTerm);
    const debouncedPokedexSearchTermInStore = usePokedexStore(state => state.debouncedPokedexSearchTerm);
    
    const pokemons = usePokedexStore(state => state.pokemons);
    const isLoading = usePokedexStore(state => state.isLoading);
    const isFetchingMore = usePokedexStore(state => state.isFetchingMore);
    const hasMore = usePokedexStore(state => state.hasMore);
    const gameSets = usePokedexStore(state => state.gameSets);

    const selectedGeneration = usePokedexStore(state => state.selectedGeneration);
    const selectedGame = usePokedexStore(state => state.selectedGame);
    const selectedTypes = usePokedexStore(state => state.selectedTypes);
    const showOnlyFavorites = usePokedexStore(state => state.showOnlyFavorites);

    const pokedexSelectedGeneration = usePokedexStore(state => state.pokedexSelectedGeneration);
    const pokedexSelectedGame = usePokedexStore(state => state.pokedexSelectedGame);
    const pokedexSelectedTypes = usePokedexStore(state => state.pokedexSelectedTypes);
    const pokedexShowOnlyFavorites = usePokedexStore(state => state.pokedexShowOnlyFavorites);

    // Retrieve actions
    const setFilter = usePokedexStore(state => state.setFilter);
    const toggleTypeSelection = usePokedexStore(state => state.toggleTypeSelection);
    const fetchInitial = usePokedexStore(state => state.fetchInitial);
    const fetchMore = usePokedexStore(state => state.fetchMore);

    // Setup debounces
    const debouncedSearchTerm = useDebounce(searchInput, 300);
    const debouncedPokedexSearchTerm = useDebounce(pokedexSearchInput, 300);

    // Sync debounced search terms into the store
    useEffect(() => {
        setFilter('debouncedSearchTerm', debouncedSearchTerm);
    }, [debouncedSearchTerm, setFilter]);

    useEffect(() => {
        setFilter('debouncedPokedexSearchTerm', debouncedPokedexSearchTerm);
    }, [debouncedPokedexSearchTerm, setFilter]);

    // Initial fetch when filters/debounced terms change
    const gen = isPokedex ? pokedexSelectedGeneration : selectedGeneration;
    const game = isPokedex ? pokedexSelectedGame : selectedGame;
    const types = isPokedex ? pokedexSelectedTypes : selectedTypes;
    const activeSearch = isPokedex ? debouncedPokedexSearchTermInStore : debouncedSearchTermInStore;

    // Derived Set of Pokemon IDs for the selected game
    const gamePokemonIds = gameSets && game && game !== 'all' ? (gameSets.get(game)?.ids || null) : null;

    useEffect(() => {
        if (!isAuthReady) return;
        fetchInitial(isPokedex);
    }, [isAuthReady, isPokedex, gen, game, types, activeSearch, fetchInitial]);

    // Infinite scroll observer setup
    const observer = useRef(null);
    const observedNodes = useRef(new Set());
    const fetchMoreRef = useRef(() => {});

    useEffect(() => {
        fetchMoreRef.current = () => fetchMore(isPokedex);
    }, [fetchMore, isPokedex]);

    const lastPokemonElementRef = useCallback((node) => {
        if (!observer.current) {
            observer.current = new IntersectionObserver((entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    fetchMoreRef.current();
                }
            }, { rootMargin: '200px' });
        }

        // Clean stale refs
        observedNodes.current.forEach((tracked) => {
            if (!tracked.isConnected) {
                observer.current.unobserve(tracked);
                observedNodes.current.delete(tracked);
            }
        });

        if (node && !observedNodes.current.has(node)) {
            observedNodes.current.add(node);
            observer.current.observe(node);
        }
    }, []);

    useEffect(() => {
        const currentNodes = observedNodes.current;
        return () => {
            if (observer.current) observer.current.disconnect();
            currentNodes.clear();
        };
    }, []);

    // Stable action callbacks for callers
    const handleSetSelectedGeneration = useCallback((val) => setFilter('selectedGeneration', val), [setFilter]);
    const handleSetSelectedGame = useCallback((val) => setFilter('selectedGame', val), [setFilter]);
    const handleSetSearchInput = useCallback((val) => setFilter('searchInput', val), [setFilter]);
    const handleSetShowOnlyFavorites = useCallback((val) => setFilter('showOnlyFavorites', val), [setFilter]);
    const handleTypeSelectionCall = useCallback((type) => toggleTypeSelection(type, false), [toggleTypeSelection]);

    const handleSetPokedexSelectedGeneration = useCallback((val) => setFilter('pokedexSelectedGeneration', val), [setFilter]);
    const handleSetPokedexSelectedGame = useCallback((val) => setFilter('pokedexSelectedGame', val), [setFilter]);
    const handleSetPokedexSearchInput = useCallback((val) => setFilter('pokedexSearchInput', val), [setFilter]);
    const handleSetPokedexShowOnlyFavorites = useCallback((val) => setFilter('pokedexShowOnlyFavorites', val), [setFilter]);
    const handlePokedexTypeSelectionCall = useCallback((type) => toggleTypeSelection(type, true), [toggleTypeSelection]);

    return {
        pokemons,
        isLoading,
        isFetchingMore,
        hasMore,
        lastPokemonElementRef,
        gamePokemonIds,
        
        // Builder filters & actions
        selectedGeneration,
        selectedGame,
        selectedTypes,
        searchInput,
        showOnlyFavorites,
        setSelectedGeneration: handleSetSelectedGeneration,
        setSelectedGame: handleSetSelectedGame,
        setSearchInput: handleSetSearchInput,
        setShowOnlyFavorites: handleSetShowOnlyFavorites,
        handleTypeSelection: handleTypeSelectionCall,

        // Pokedex filters & actions
        pokedexSelectedGeneration,
        pokedexSelectedGame,
        pokedexSelectedTypes,
        pokedexSearchInput,
        pokedexShowOnlyFavorites,
        setPokedexSelectedGeneration: handleSetPokedexSelectedGeneration,
        setPokedexSelectedGame: handleSetPokedexSelectedGame,
        setPokedexSearchInput: handleSetPokedexSearchInput,
        setPokedexShowOnlyFavorites: handleSetPokedexShowOnlyFavorites,
        handlePokedexTypeSelection: handlePokedexTypeSelectionCall,
    };
}
