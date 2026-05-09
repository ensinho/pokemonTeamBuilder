import React from 'react';
import { typeColors, typeIcons } from '../../constants/types';
import { EmptyState } from '../EmptyState';
import { PokemonCard } from '../PokemonCard';
import { StarIcon } from '../icons';

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

    return (
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-9">
                <section className="p-6 rounded-xl shadow-lg h-full flex flex-col" style={{ backgroundColor: colors.card }}>
                    <div className="mb-4">
                        <h2 className="text-xl md:text-2xl font-bold mb-4" style={{ color: colors.text }}>Pokédex</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <input
                                type="text"
                                placeholder="Search Pokémon..."
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                className="w-full p-3 rounded-lg border-2 focus:outline-none"
                                style={{ backgroundColor: colors.cardLight, borderColor: 'transparent', color: colors.text }}
                            />
                            <select
                                value={selectedGeneration}
                                onChange={(e) => setSelectedGeneration(e.target.value)}
                                className="w-full p-3 rounded-lg border-2 focus:outline-none appearance-none capitalize"
                                style={{ backgroundColor: colors.cardLight, borderColor: 'transparent', color: colors.text }}
                            >
                                <option value="all" style={{ color: colors.text }}>All Generations</option>
                                {generations.map((generation) => (
                                    <option key={generation} value={generation} className="capitalize" style={{ color: colors.text }}>
                                        {generation.replace('-', ' ')}
                                    </option>
                                ))}
                            </select>
                            <button
                                onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                                className={`w-full p-3 rounded-lg border-2 focus:outline-none flex items-center justify-center gap-2 font-semibold transition-all duration-200 ${showOnlyFavorites ? 'ring-2 ring-yellow-400' : ''}`}
                                style={{ backgroundColor: showOnlyFavorites ? 'rgba(251, 191, 36, 0.2)' : colors.cardLight, borderColor: 'transparent', color: colors.text }}
                            >
                                <StarIcon className="w-5 h-5" isFavorite={showOnlyFavorites} color={colors.textMuted} />
                                {showOnlyFavorites ? 'Showing Favorites' : 'Show Favorites'}
                            </button>
                        </div>
                    </div>
                    <div className="relative flex-grow h-[75vh]">
                        {isInitialLoading ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: colors.primary }}></div>
                            </div>
                        ) : (
                            <>
                                <div className="h-full overflow-y-auto custom-scrollbar" style={{ '--scrollbar-track-color': colors.card, '--scrollbar-thumb-color': colors.primary, '--scrollbar-thumb-border-color': colors.card }}>
                                    <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 p-2">
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
                                    {isFetchingMore && <div className="flex justify-center py-4"><div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: colors.primary }}></div></div>}
                                    {displayedPokemons.length === 0 && !isInitialLoading && (
                                        <EmptyState
                                            compact
                                            title={showOnlyFavorites ? 'No favorites match' : 'Nothing here'}
                                            message={showOnlyFavorites ? 'Try clearing filters or favoriting more Pokémon.' : 'Try a different search or filter combination.'}
                                        />
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </section>
            </div>

            <div className="lg:col-span-3 space-y-8">
                <section className="p-6 rounded-xl shadow-lg" style={{ backgroundColor: colors.card }}>
                    <h3 className="text-sm md:text-base font-bold mb-3 text-center uppercase tracking-wider" style={{ color: colors.text }}>Filter by Type</h3>
                    <div className="grid grid-cols-5 lg:grid-cols-5 gap-1.5">
                        {Object.keys(typeColors).map((type) => (
                            <button key={type} onClick={() => handleTypeSelection(type)} className={`p-1.5 rounded-lg bg-transparent transition-colors hover:opacity-75 ${selectedTypes.has(type) ? 'ring-2 ring-primary' : ''}`} style={{ backgroundColor: colors.cardLight }} title={type}>
                                <img src={typeIcons[type]} alt={type} className="w-full h-full object-contain" />
                            </button>
                        ))}
                    </div>
                </section>
            </div>
        </main>
    );
}