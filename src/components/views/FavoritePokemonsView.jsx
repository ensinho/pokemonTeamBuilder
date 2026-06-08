import React, { useMemo, useState } from 'react';
import '../../styles/team-builder-view.css';
import { typeColors } from '../../constants/types';
import { PokemonCard } from '../PokemonCard';
import { ClearIcon, StarIcon } from '../icons';
import { EmptyState } from '../EmptyState';

export function FavoritePokemonsView({
    allPokemons,
    favoritePokemons,
    onToggleFavoritePokemon,
    showDetails,
    colors,
    isLoading,
}) {
    const [searchInput, setSearchInput] = useState('');
    const [selectedType, setSelectedType] = useState('all');

    const favoritePokemonsList = useMemo(() => {
        return allPokemons.filter((pokemon) => favoritePokemons.has(pokemon.id));
    }, [allPokemons, favoritePokemons]);

    const filteredFavorites = useMemo(() => {
        let filtered = favoritePokemonsList;

        if (searchInput) {
            filtered = filtered.filter((pokemon) =>
                pokemon.name.toLowerCase().includes(searchInput.toLowerCase())
            );
        }

        if (selectedType !== 'all') {
            filtered = filtered.filter((pokemon) => pokemon.types.includes(selectedType));
        }

        return filtered;
    }, [favoritePokemonsList, searchInput, selectedType]);

    return (
        <main className="team-builder grid grid-cols-1">
            <section className="team-builder-panel team-builder-panel--picker p-4">
                <div className="team-builder-panel__header team-builder-panel__header--picker team-builder-panel__header--compact">
                    <div className="team-builder-picker-heading-row team-builder-picker-heading-row--compact min-w-0">
                        <h2 className="team-builder-panel__title team-builder-panel__title--compact">Favorite Pokémon</h2>
                        <span className="team-builder-panel__meta team-builder-panel__meta--compact">{filteredFavorites.length}</span>
                    </div>
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
                            placeholder="Search favorites..."
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
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value)}
                            className="team-builder-field team-builder-field--compact team-builder-select appearance-none capitalize"
                            aria-label="Type filter"
                        >
                            <option value="all">All Types</option>
                            {Object.keys(typeColors).map((type) => (
                                <option key={type} value={type} className="capitalize">{type}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="team-builder-results mt-4">
                    {isLoading ? (
                        <div className="team-builder-spinner-wrap h-full">
                            <div className="team-builder-spinner" aria-hidden="true"></div>
                        </div>
                    ) : (
                        <div className="team-builder-results__scroll custom-scrollbar">
                            <div className="team-builder-results__grid grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8 gap-4 p-1 py-4">
                                {filteredFavorites.map((pokemon) => (
                                    <PokemonCard
                                        key={pokemon.id}
                                        details={pokemon}
                                        onCardClick={showDetails}
                                        colors={colors}
                                        isFavorite={true}
                                        onToggleFavorite={onToggleFavoritePokemon}
                                    />
                                ))}
                            </div>

                            {filteredFavorites.length === 0 && !isLoading && (
                                <div className="px-2 pb-4">
                                    <EmptyState
                                        compact
                                        title={favoritePokemons.size === 0 ? 'No favorites yet!' : 'No matches found'}
                                        message={favoritePokemons.size === 0
                                            ? 'Start adding Pokémon to your favorites by clicking the star icon on any Pokémon card.'
                                            : 'Try adjusting your search or filter criteria.'}
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