import React, { useMemo, useState } from 'react';
import { typeColors } from '../../constants/types';
import { PokemonCard } from '../PokemonCard';
import { StarIcon } from '../icons';

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
    const controlClassName = 'w-full rounded-lg border-2 border-transparent bg-surface-raised p-3 text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary';

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
        <main className="space-y-6">
            <section className="rounded-xl bg-surface p-6 shadow-lg">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
                    <div>
                        <h2 className="text-xl font-bold tracking-tight text-fg md:text-2xl">
                            Favorite Pokémon
                        </h2>
                        <p className="mt-1 text-sm text-muted">
                            {favoritePokemons.size} Pokémon saved as favorites
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <input
                        type="text"
                        placeholder="Search favorites..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className={controlClassName}
                    />
                    <select
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                        className={`${controlClassName} appearance-none capitalize`}
                    >
                        <option value="all">All Types</option>
                        {Object.keys(typeColors).map((type) => (
                            <option key={type} value={type} className="capitalize">{type}</option>
                        ))}
                    </select>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
                    </div>
                ) : filteredFavorites.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4">
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
                ) : (
                    <div className="text-center py-16">
                        <div className="mb-4">
                            <StarIcon className="w-16 h-16 mx-auto" isFavorite={false} color={colors.textMuted} />
                        </div>
                        <h3 className="mb-2 text-xl font-bold text-fg">
                            {favoritePokemons.size === 0 ? 'No favorites yet!' : 'No matches found'}
                        </h3>
                        <p className="text-muted">
                            {favoritePokemons.size === 0
                                ? 'Start adding Pokémon to your favorites by clicking the star icon on any Pokémon card.'
                                : 'Try adjusting your search or filter criteria.'}
                        </p>
                    </div>
                )}
            </section>
        </main>
    );
}