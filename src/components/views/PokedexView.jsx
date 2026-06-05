import React from 'react';
import '../../styles/team-builder-view.css';
import { typeColors, typeIcons } from '../../constants/types';
import { EmptyState } from '../EmptyState';
import { PokemonCard } from '../PokemonCard';
import { ClearIcon, StarIcon } from '../icons';

export function PokedexView({
    pokemons,
    lastPokemonElementRef,
    isFetchingMore,
    searchInput,
    setSearchInput,
    selectedTypes,
    handleTypeSelection,
    selectedGeneration,
    setSelectedGeneration,
    generations,
    isInitialLoading,
    colors,
    showDetails,
    favoritePokemons,
    onToggleFavoritePokemon,
    showOnlyFavorites,
    setShowOnlyFavorites,
}) {
    const displayedPokemons = showOnlyFavorites
        ? pokemons.filter((pokemon) => favoritePokemons.has(pokemon.id))
        : pokemons;
    const selectedTypeCount = selectedTypes.size;

    return (
        <main className="team-builder grid grid-cols-1">
            <section className="team-builder-panel team-builder-panel--picker p-4">
                <div className="team-builder-panel__header team-builder-panel__header--picker team-builder-panel__header--compact">
                    <div className="team-builder-picker-heading-row team-builder-picker-heading-row--compact min-w-0">
                        <h2 className="team-builder-panel__title team-builder-panel__title--compact">Pokédex</h2>
                        <span className="team-builder-panel__meta team-builder-panel__meta--compact">{displayedPokemons.length}</span>
                    </div>
                </div>

                <div className="team-builder-picker-toolbar team-builder-picker-toolbar--compact mt-3">
                    <div className="team-builder-picker-focus" role="group" aria-label="Type focus">
                        <div className="team-builder-type-grid team-builder-type-grid--compact">
                            {Object.keys(typeColors).map((type) => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => handleTypeSelection(type)}
                                    className={`team-builder-type-button team-builder-type-button--compact ${selectedTypes.has(type) ? 'is-active' : ''}`}
                                    title={type}
                                    aria-pressed={selectedTypes.has(type)}
                                >
                                    <img src={typeIcons[type]} alt={type} className="w-full h-full object-contain" />
                                </button>
                            ))}
                        </div>
                    </div>
                    <span className="team-builder-picker-summary">{selectedTypeCount === 0 ? 'All types' : `${selectedTypeCount} active`}</span>
                </div>

                <div className="team-builder-unified-toolbar mt-3">
                    <div className="team-builder-search-wrap">
                        <span className="team-builder-search-icon" aria-hidden="true">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                            </svg>
                        </span>
                        <input
                            type="text"
                            placeholder="Search by name..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            className="team-builder-field team-builder-field--compact team-builder-search-input"
                        />
                        {searchInput && (
                            <button
                                type="button"
                                onClick={() => setSearchInput('')}
                                className="team-builder-search-clear"
                                aria-label="Clear search"
                            >
                                <ClearIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    <div className="team-builder-select-wrap">
                        <select
                            value={selectedGeneration}
                            onChange={(e) => setSelectedGeneration(e.target.value)}
                            className="team-builder-field team-builder-field--compact team-builder-select"
                            aria-label="Generation filter"
                        >
                            <option value="all">All generations</option>
                            {generations.map((generation) => (
                                <option key={generation} value={generation} className="capitalize">
                                    {generation.replace('-', ' ')}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="button"
                        onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                        className={`team-builder-toggle team-builder-toggle--compact ${showOnlyFavorites ? 'is-active' : ''}`}
                        aria-pressed={showOnlyFavorites}
                    >
                        <StarIcon className="w-4 h-4" isFavorite={showOnlyFavorites} color="currentColor" />
                        <span>{showOnlyFavorites ? 'Favorites' : 'All'}</span>
                    </button>
                </div>

                <div className="team-builder-results mt-4">
                    {isInitialLoading ? (
                        <div className="team-builder-spinner-wrap h-full">
                            <div className="team-builder-spinner" aria-hidden="true"></div>
                        </div>
                    ) : (
                        <div className="team-builder-results__scroll custom-scrollbar">
                            <div className="team-builder-results__grid grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8 gap-4 p-1 py-4">
                                {displayedPokemons.map((pokemon, index) => (
                                    <PokemonCard
                                        key={pokemon.id}
                                        details={pokemon}
                                        onCardClick={showDetails}
                                        lastRef={index === displayedPokemons.length - 1 ? lastPokemonElementRef : null}
                                        colors={colors}
                                        isFavorite={favoritePokemons.has(pokemon.id)}
                                        onToggleFavorite={onToggleFavoritePokemon}
                                    />
                                ))}
                            </div>

                            {isFetchingMore && (
                                <div className="team-builder-spinner-wrap py-4">
                                    <div className="team-builder-spinner team-builder-spinner--small" aria-hidden="true"></div>
                                </div>
                            )}

                            {displayedPokemons.length === 0 && !isInitialLoading && (
                                <div className="px-2 pb-4">
                                    <EmptyState
                                        compact
                                        title={showOnlyFavorites ? 'No favorites match' : 'No Pokémon found'}
                                        message={showOnlyFavorites ? 'Try clearing filters or favoriting more Pokémon.' : 'Try a different search, generation, or type.'}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </section>
        </main>
    );
}