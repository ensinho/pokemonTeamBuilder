import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { collection, getDocs, limit, orderBy, query, startAfter, where } from 'firebase/firestore';

import { POKEBALL_PLACEHOLDER_URL } from '../../constants/theme';
import { typeIcons } from '../../constants/types';
import { useDebounce } from '../../hooks/useDebounce';
import { useModalA11y } from '../../hooks/useModalA11y';
import { getPokemonDisplaySprite } from '../../utils/pokemonSprites';
import { EmptyState } from '../EmptyState';
import { CloseIcon } from '../icons';
import { useTranslation } from '../../hooks/useTranslation';
import '../../styles/greeting-selector-modal.css';

export function GreetingPokemonSelectorModal({ onClose, onSelect, allPokemons, currentPokemonId, currentPokemonIsShiny, colors, db }) {
    const { t, language } = useTranslation();
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
    const selectedTypeLabel = selectedType
        ? t(`types.${selectedType.toLowerCase()}`, { defaultValue: selectedType })
        : t('modals.greetingSelectorAllTypes');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4" onClick={onClose} role="presentation">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="greeting-selector-title"
                tabIndex={-1}
                className="greeting-selector relative w-full max-w-7xl max-h-[85vh] overflow-y-auto rounded-xl border border-border bg-surface p-4 sm:p-6 shadow-lg custom-scrollbar animate-scale-in focus:outline-none"
                style={{ '--scrollbar-track-color': colors.card, '--scrollbar-thumb-color': colors.primary, '--scrollbar-thumb-border-color': colors.card }}
                onClick={(event) => event.stopPropagation()}
            >
                <button onClick={onClose} type="button" aria-label={t('modals.greetingSelectorCloseAria')} className="absolute top-4 right-4 text-muted hover:text-fg transition-colors z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg p-1">
                    <CloseIcon />
                </button>

                <div className="mb-3 pr-8">
                    <h2 id="greeting-selector-title" className="text-lg font-bold text-fg">
                        {t('modals.greetingSelectorTitle')}
                    </h2>
                </div>

                <div className="mb-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                            {isSearchActive ? (
                                <p className="text-xs text-muted">
                                    {isSearching
                                        ? t('modals.greetingSelectorSearching')
                                        : t('modals.greetingSelectorSearchResults', {
                                              count: searchResults.length,
                                              plural: searchResults.length !== 1 ? 's' : '',
                                              term: debouncedSearch
                                          })}
                                </p>
                            ) : (
                                <p className="text-xs text-muted">
                                    {t('modals.greetingSelectorBrowsing', { count: browseList.length })}
                                </p>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={() => setIsShinySelection((previous) => !previous)}
                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${isShinySelection ? 'border-accent bg-accent-soft text-accent' : 'border-border bg-surface-raised text-fg'}`}
                        >
                            <span>{t('modals.greetingSelectorShinyLabel')}</span>
                            <span>{isShinySelection ? t('common.yes') : t('common.no')}</span>
                        </button>
                    </div>

                    <div className="relative">
                        <input
                            type="text"
                            placeholder={t('modals.greetingSelectorSearchPlaceholder')}
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            className={`w-full rounded-lg border bg-surface-raised px-4 py-2 pr-10 text-sm text-fg transition-colors focus:outline-none ${isSearchActive ? 'border-primary' : 'border-border focus:border-primary'}`}
                        />
                        {isSearchActive && (
                            <button
                                type="button"
                                onClick={() => setSearchTerm('')}
                                aria-label="Clear search"
                                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted transition-colors hover:opacity-70"
                            >
                                <CloseIcon />
                            </button>
                        )}
                    </div>

                    <div className="greeting-selector__types">
                        <div className="greeting-selector__types-head">
                            <p className="greeting-selector__types-label">{language === 'pt' ? 'Tipo' : 'Type'}</p>
                            <span className="greeting-selector__types-current">{selectedTypeLabel}</span>
                        </div>
                        <div className="greeting-selector__types-grid" role="group" aria-label="Partner type filter">
                            <button
                                type="button"
                                onClick={() => setSelectedType(null)}
                                className={`team-builder-type-button greeting-selector__type-button greeting-selector__type-button--all ${!selectedType ? 'is-active' : ''}`}
                                title={t('modals.greetingSelectorAllTypes')}
                                aria-pressed={!selectedType}
                            >
                                {t('common.all')}
                            </button>
                            {Object.keys(typeIcons).map((type) => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setSelectedType(type)}
                                    className={`team-builder-type-button greeting-selector__type-button ${selectedType === type ? 'is-active' : ''}`}
                                    title={t(`types.${type.toLowerCase()}`, { defaultValue: type })}
                                    aria-pressed={selectedType === type}
                                >
                                    <img src={typeIcons[type]} alt={type} />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {currentPokemonId && (
                    <div className="mb-3 flex justify-center">
                        <button
                            onClick={() => onSelect({ pokemonId: null, isShiny: false })}
                            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-raised px-3 py-1 text-xs font-medium text-muted transition-colors hover:text-fg"
                        >
                            <span aria-hidden="true">✨</span>
                            {t('modals.greetingSelectorRemoveCustom')}
                        </button>
                    </div>
                )}

                {isSearching ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
                    </div>
                ) : (
                    <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-3">
                        {displayedPokemons.map((pokemon) => (
                            <button
                                key={pokemon.id}
                                onClick={() => onSelect({ pokemonId: pokemon.id, isShiny: isShinySelection })}
                                className={`interactive-lift relative rounded-lg border p-3 text-center ${currentPokemonId === pokemon.id ? 'border-primary bg-primary-soft' : 'border-border bg-surface-raised'}`}
                            >
                                {currentPokemonId === pokemon.id && (
                                    <div className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
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
                                <p className="mt-1 truncate text-xs capitalize text-fg">
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
                            className="rounded-lg bg-primary px-6 py-3 font-semibold text-white transition-all hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isLoadingMore ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    {t('modals.greetingSelectorLoadingMore')}
                                </div>
                            ) : (
                                `${t('modals.greetingSelectorLoadMore')} ${t('modals.greetingSelectorStatsLoaded', { count: browseList.length, highestId: highestLoadedId })}`
                            )}
                        </button>
                    </div>
                )}

                {!isSearching && displayedPokemons.length === 0 && (
                    <EmptyState
                        compact
                        title={isSearchActive || selectedType ? t('modals.greetingSelectorNoMatches') : t('modals.greetingSelectorNoPokemonAvailable')}
                        message={isSearchActive ? t('modals.greetingSelectorNothingFound', { term: debouncedSearch }) : selectedType ? t('modals.greetingSelectorClearFilterHint') : t('modals.greetingSelectorLoadingHint')}
                    />
                )}
            </div>
        </div>
    );
}