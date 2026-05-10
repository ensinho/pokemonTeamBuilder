import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { collection, getDocs, limit, orderBy, query, startAfter, where } from 'firebase/firestore';

import { POKEBALL_PLACEHOLDER_URL } from '../../constants/theme';
import { typeIcons } from '../../constants/types';
import { useDebounce } from '../../hooks/useDebounce';
import { useModalA11y } from '../../hooks/useModalA11y';
import { getPokemonDisplaySprite } from '../../utils/pokemonSprites';
import { EmptyState } from '../EmptyState';
import { CloseIcon } from '../icons';

export function GreetingPokemonSelectorModal({ onClose, onSelect, allPokemons, currentPokemonId, currentPokemonIsShiny, colors, db }) {
    const dialogRef = useModalA11y(onClose);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearch = useDebounce(searchTerm, 350);
    const [selectedType, setSelectedType] = useState(null);
    const [isShinySelection, setIsShinySelection] = useState(Boolean(currentPokemonIsShiny));

    const [browseList, setBrowseList] = useState(allPokemons || []);
    const [lastDoc, setLastDoc] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    const isSearchActive = debouncedSearch.trim().length > 0;

    useEffect(() => {
        setIsShinySelection(Boolean(currentPokemonIsShiny));
    }, [currentPokemonId, currentPokemonIsShiny]);

    const loadMorePokemons = useCallback(async () => {
        if (!db || isLoadingMore || !hasMore) return;

        setIsLoadingMore(true);
        try {
            const constraints = [orderBy('id'), limit(200)];
            if (lastDoc) constraints.push(startAfter(lastDoc));

            const searchQuery = query(collection(db, 'artifacts/pokemonTeamBuilder/pokemons'), ...constraints);
            const snapshot = await getDocs(searchQuery);
            if (snapshot.empty || snapshot.docs.length < 200) setHasMore(false);

            const newPokemons = snapshot.docs.map((docSnap) => docSnap.data());
            const lastVisible = snapshot.docs[snapshot.docs.length - 1];

            setBrowseList((previous) => {
                const combined = [...previous, ...newPokemons];
                return combined.filter((pokemon, index, self) => index === self.findIndex((candidate) => candidate.id === pokemon.id));
            });
            setLastDoc(lastVisible);
        } catch (error) {
            console.error('Error loading more Pokemon:', error);
            setHasMore(false);
        } finally {
            setIsLoadingMore(false);
        }
    }, [db, hasMore, isLoadingMore, lastDoc]);

    useEffect(() => {
        if (browseList.length < 100 && hasMore) loadMorePokemons();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!isSearchActive) {
            setSearchResults([]);
            return;
        }
        if (!db) return;

        let cancelled = false;
        const run = async () => {
            setIsSearching(true);
            try {
                const term = debouncedSearch.toLowerCase();
                const constraints = [
                    orderBy('name'),
                    where('name', '>=', term),
                    where('name', '<=', term + '\uf8ff'),
                    limit(100),
                ];
                if (selectedType) constraints.push(where('types', 'array-contains', selectedType));

                const searchQuery = query(collection(db, 'artifacts/pokemonTeamBuilder/pokemons'), ...constraints);
                const snapshot = await getDocs(searchQuery);
                if (!cancelled) {
                    setSearchResults(snapshot.docs.map((docSnap) => docSnap.data()));
                }
            } catch (error) {
                console.error('Pokemon search error:', error);
            } finally {
                if (!cancelled) setIsSearching(false);
            }
        };

        run();
        return () => {
            cancelled = true;
        };
    }, [db, debouncedSearch, isSearchActive, selectedType]);

    const displayedPokemons = useMemo(() => {
        if (isSearchActive) return searchResults;
        if (!selectedType) return browseList;
        return browseList.filter((pokemon) => pokemon.types?.includes(selectedType));
    }, [browseList, isSearchActive, searchResults, selectedType]);

    const highestLoadedId = useMemo(
        () => browseList.reduce((max, pokemon) => Math.max(max, Number(pokemon?.id) || 0), 0),
        [browseList],
    );
    const selectedTypeLabel = selectedType ? `${selectedType.charAt(0).toUpperCase()}${selectedType.slice(1)}` : 'All types';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose} role="presentation">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="greeting-selector-title"
                tabIndex={-1}
                className="rounded-2xl shadow-xl w-full max-w-7xl max-h-[85vh] overflow-y-auto custom-scrollbar p-6 relative animate-fade-in focus:outline-none"
                style={{ backgroundColor: colors.card, '--scrollbar-track-color': colors.card, '--scrollbar-thumb-color': colors.primary, '--scrollbar-thumb-border-color': colors.card }}
                onClick={(event) => event.stopPropagation()}
            >
                <button onClick={onClose} type="button" aria-label="Close partner selector" className="absolute top-4 right-4 text-muted hover:text-fg transition-colors z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg p-1">
                    <CloseIcon />
                </button>

                <div className="mb-6">
                    <h2 id="greeting-selector-title" className="text-2xl font-bold mb-2" style={{ color: colors.text }}>
                        Choose Your Partner Pokémon
                    </h2>
                    <p className="text-sm" style={{ color: colors.textMuted }}>
                        Select a Pokémon to display on your greeting card and trainer icon.
                    </p>
                </div>

                <div className="mb-4 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="team-builder-panel__eyebrow">Partner filters</p>
                            {isSearchActive ? (
                                <p className="mt-1 text-xs" style={{ color: colors.textMuted }}>
                                    {isSearching
                                        ? 'Searching...'
                                        : `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''} for "${debouncedSearch}"`}
                                </p>
                            ) : (
                                <p className="mt-1 text-xs" style={{ color: colors.textMuted }}>
                                    Browsing {browseList.length} loaded Pokemon — or type to search all of them.
                                </p>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={() => setIsShinySelection((previous) => !previous)}
                            className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all"
                            style={{
                                backgroundColor: isShinySelection ? `${colors.accent}18` : colors.cardLight,
                                borderColor: isShinySelection ? `${colors.accent}44` : colors.border,
                                color: isShinySelection ? colors.accent : colors.text,
                            }}
                        >
                            <span>Shiny partner</span>
                            <span>{isShinySelection ? 'On' : 'Off'}</span>
                        </button>
                    </div>

                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search Pokémon by name…"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            className="w-full px-4 py-2 rounded-lg border-2 transition-all focus:outline-none pr-10"
                            style={{
                                backgroundColor: colors.cardLight,
                                color: colors.text,
                                borderColor: isSearchActive ? colors.primary : colors.cardLight,
                            }}
                        />
                        {isSearchActive && (
                            <button
                                type="button"
                                onClick={() => setSearchTerm('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded transition-colors hover:opacity-70"
                                aria-label="Clear search"
                                style={{ color: colors.textMuted }}
                            >
                                <CloseIcon />
                            </button>
                        )}
                    </div>

                    <div
                        className="team-builder-picker-toolbar team-builder-picker-toolbar--compact"
                        style={{ borderBottomColor: colors.border }}
                    >
                        <div className="team-builder-picker-focus" role="group" aria-label="Partner type filter">
                            <button
                                type="button"
                                onClick={() => setSelectedType(null)}
                                className={`team-builder-type-button team-builder-type-button--compact ${!selectedType ? 'is-active' : ''}`}
                                title="All types"
                                aria-pressed={!selectedType}
                            >
                                <span className="text-[0.6rem] font-bold uppercase tracking-[0.08em]">All</span>
                            </button>
                            <div className="team-builder-type-grid team-builder-type-grid--compact">
                                {Object.keys(typeIcons).map((type) => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => setSelectedType(type)}
                                        className={`team-builder-type-button team-builder-type-button--compact ${selectedType === type ? 'is-active' : ''}`}
                                        title={type}
                                        aria-pressed={selectedType === type}
                                    >
                                        <img src={typeIcons[type]} alt={type} className="w-full h-full object-contain" />
                                    </button>
                                ))}
                            </div>
                        </div>

                        <span className="team-builder-picker-summary">{selectedTypeLabel}</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => setSelectedType(null)}
                            className="team-builder-button team-builder-button--inline team-builder-button--inline-compact"
                            style={{
                                borderColor: !selectedType ? colors.primary : colors.border,
                                backgroundColor: !selectedType ? colors.primary + '14' : colors.cardLight,
                                color: !selectedType ? colors.primary : colors.textMuted,
                            }}
                        >
                            Clear type filter
                        </button>
                    </div>
                </div>

                {currentPokemonId && (
                    <button
                        onClick={() => onSelect({ pokemonId: null, isShiny: false })}
                        className="w-full mb-4 p-3 rounded-lg border-2 border-dashed transition-all hover:scale-[1.02]"
                        style={{ borderColor: colors.textMuted, color: colors.textMuted }}
                    >
                        <span className="text-2xl mb-1 block">✨</span>
                        Remove custom Pokémon (use default)
                    </button>
                )}

                {isSearching ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: colors.primary }} />
                    </div>
                ) : (
                    <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-3">
                        {displayedPokemons.map((pokemon) => (
                            <button
                                key={pokemon.id}
                                onClick={() => onSelect({ pokemonId: pokemon.id, isShiny: isShinySelection })}
                                className="p-3 rounded-xl text-center transition-all hover:scale-105 hover:shadow-lg relative"
                                style={{
                                    backgroundColor: currentPokemonId === pokemon.id ? colors.primary + '20' : colors.cardLight,
                                    border: currentPokemonId === pokemon.id ? `2px solid ${colors.primary}` : 'none',
                                }}
                            >
                                {currentPokemonId === pokemon.id && (
                                    <div className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: colors.primary }}>
                                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                )}
                                <img
                                    src={getPokemonDisplaySprite(pokemon, { shiny: isShinySelection })}
                                    alt={pokemon.name}
                                    className="w-16 h-16 mx-auto"
                                    onError={(event) => { event.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                                />
                                <p className="text-xs capitalize truncate mt-1" style={{ color: colors.text }}>
                                    {pokemon.name}
                                </p>
                            </button>
                        ))}
                    </div>
                )}

                {!isSearchActive && hasMore && (
                    <div className="mt-4 text-center">
                        <button
                            onClick={loadMorePokemons}
                            disabled={isLoadingMore}
                            className="px-6 py-3 rounded-lg font-semibold transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ backgroundColor: colors.primary, color: 'white' }}
                        >
                            {isLoadingMore ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Loading more…
                                </div>
                            ) : (
                                `Load more Pokémon (${browseList.length} loaded · up to #${highestLoadedId})`
                            )}
                        </button>
                    </div>
                )}

                {!isSearching && displayedPokemons.length === 0 && (
                    <EmptyState
                        compact
                        title={isSearchActive || selectedType ? 'No matches' : 'No Pokémon available'}
                        message={isSearchActive ? `Nothing found for "${debouncedSearch}". Try a different name.` : selectedType ? 'Try clearing the type filter.' : 'Pokémon data is loading.'}
                    />
                )}
            </div>
        </div>
    );
}