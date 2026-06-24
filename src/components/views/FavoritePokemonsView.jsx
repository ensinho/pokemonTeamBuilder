import React, { useMemo, useState, useEffect } from 'react';
import '../../styles/team-builder-view.css';
import { typeColors, typeIcons } from '../../constants/types';
import { GENERATION_RANGES } from '../../constants/pokemon';
import { PokemonCard } from '../PokemonCard';
import { ClearIcon, StarIcon } from '../icons';
import { EmptyState } from '../EmptyState';
import { useTranslation } from '../../hooks/useTranslation';
import { useNavigate } from 'react-router-dom';
import { getPokemonArtworkSpriteUrl } from '../../utils/pokemonSprites';
import { useReferenceStore } from '../../store/useReferenceStore';

const getGenerationLabelForRangeKey = (key) => {
    const romanMap = {
        'generation-i': 'Gen I',
        'generation-ii': 'Gen II',
        'generation-iii': 'Gen III',
        'generation-iv': 'Gen IV',
        'generation-v': 'Gen V',
        'generation-vi': 'Gen VI',
        'generation-vii': 'Gen VII',
        'generation-viii': 'Gen VIII',
        'generation-ix': 'Gen IX'
    };
    return romanMap[key] || key;
};

const getGenerationLabel = (pokemonId, language) => {
    const genKeys = Object.keys(GENERATION_RANGES).filter(k => k !== 'all');
    const matchedKey = genKeys.find(key => {
        const range = GENERATION_RANGES[key];
        return pokemonId >= range.start && pokemonId <= range.end;
    });
    if (!matchedKey) return language === 'pt' ? 'Outras Gerações' : 'Other Generations';
    return getGenerationLabelForRangeKey(matchedKey);
};

export function FavoritePokemonsView({
    allPokemons,
    favoritePokemons,
    onToggleFavoritePokemon,
    showDetails,
    colors,
    isLoading,
}) {
    const { t, language } = useTranslation();
    const navigate = useNavigate();
    const [searchInput, setSearchInput] = useState('');
    const [selectedType, setSelectedType] = useState('all');
    const [groupBy, setGroupBy] = useState('none');

    const pokemonIndex = useReferenceStore((s) => s.pokemonIndex);
    const fetchPokemonIndex = useReferenceStore((s) => s.fetchPokemonIndex);
    const isIndexLoading = useReferenceStore((s) => s.isIndexLoading);

    useEffect(() => {
        fetchPokemonIndex();
    }, [fetchPokemonIndex]);

    const activeList = pokemonIndex.length > 0 ? pokemonIndex : allPokemons;
    const activeLoading = isLoading || isIndexLoading;

    const favoritePokemonsList = useMemo(() => {
        return activeList.filter((pokemon) => favoritePokemons.has(pokemon.id));
    }, [activeList, favoritePokemons]);

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

    const groupedByGen = useMemo(() => {
        if (groupBy !== 'generation') return null;
        const groups = {};
        const genKeys = Object.keys(GENERATION_RANGES).filter(k => k !== 'all');
        genKeys.forEach(key => {
            const label = getGenerationLabelForRangeKey(key);
            groups[label] = [];
        });
        const otherLabel = language === 'pt' ? 'Outras Gerações' : 'Other Generations';
        groups[otherLabel] = [];

        filteredFavorites.forEach(pokemon => {
            const label = getGenerationLabel(pokemon.id, language);
            if (!groups[label]) groups[label] = [];
            groups[label].push(pokemon);
        });

        return Object.entries(groups).filter(([_, list]) => list.length > 0);
    }, [filteredFavorites, groupBy, language]);

    const groupedByType = useMemo(() => {
        if (groupBy !== 'type') return null;
        const groups = {};
        
        Object.keys(typeColors).forEach(type => {
            groups[type] = [];
        });

        filteredFavorites.forEach(pokemon => {
            const type = pokemon.types?.[0];
            if (type) {
                if (!groups[type]) groups[type] = [];
                groups[type].push(pokemon);
            }
        });

        return Object.entries(groups).filter(([_, list]) => list.length > 0);
    }, [filteredFavorites, groupBy]);

    return (
        <main className="team-builder grid grid-cols-1">
            <section className="team-builder-panel team-builder-panel--picker p-4">
                <div className="team-builder-panel__header team-builder-panel__header--picker team-builder-panel__header--compact">
                    <div className="team-builder-picker-heading-row team-builder-picker-heading-row--compact min-w-0">
                        <h2 className="team-builder-panel__title team-builder-panel__title--compact">{t('favorites.title')}</h2>
                        <span className="team-builder-panel__meta team-builder-panel__meta--compact">{filteredFavorites.length}</span>
                    </div>
                </div>

                <div className="team-builder-unified-toolbar mt-3 flex flex-wrap gap-2 items-center">
                    <div className="team-builder-search-wrap flex-1 min-w-[200px]">
                        <span className="team-builder-search-icon" aria-hidden="true">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                            </svg>
                        </span>
                        <input
                            type="text"
                            placeholder={t('favorites.searchPlaceholder')}
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            className="team-builder-field team-builder-field--compact team-builder-search-input"
                        />
                        {searchInput && (
                            <button
                                type="button"
                                onClick={() => setSearchInput('')}
                                className="team-builder-search-clear"
                                aria-label={t('common.clear')}
                            >
                                <ClearIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    <div className="team-builder-select-wrap shrink-0">
                        <select
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value)}
                            className="team-builder-field team-builder-field--compact team-builder-select appearance-none capitalize"
                            aria-label={t('pokedex.typesFilterLabel')}
                        >
                            <option value="all">{t('favorites.typeFilterPlaceholder')}</option>
                            {Object.keys(typeColors).map((type) => (
                                <option key={type} value={type}>{t(`types.${type}`)}</option>
                            ))}
                        </select>
                    </div>

                    <div className="team-builder-select-wrap shrink-0">
                        <select
                            value={groupBy}
                            onChange={(e) => setGroupBy(e.target.value)}
                            className="team-builder-field team-builder-field--compact team-builder-select appearance-none"
                            aria-label={t('favorites.groupByLabel')}
                        >
                            <option value="none">{t('favorites.groupNone')}</option>
                            <option value="generation">{t('favorites.groupGeneration')}</option>
                            <option value="type">{t('favorites.groupType')}</option>
                        </select>
                    </div>
                </div>

                <div className="team-builder-results mt-4">
                    {activeLoading ? (
                        <div className="team-builder-spinner-wrap h-full">
                            <div className="team-builder-spinner" aria-hidden="true"></div>
                        </div>
                    ) : (
                        <div className="team-builder-results__scroll custom-scrollbar">
                            {groupBy === 'none' ? (
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
                            ) : groupBy === 'generation' ? (
                                <div className="flex flex-col gap-2 py-4">
                                    {groupedByGen.map(([groupName, pokemonList]) => (
                                        <div key={groupName} className="mb-6 border border-border bg-surface-raised/20 rounded-xl p-4 shadow-sm backdrop-blur-sm transition-all duration-300 hover:shadow-md">
                                            <div className="flex items-center justify-between mb-4 border-b border-border/40 pb-2">
                                                <h3 className="text-base font-bold text-fg capitalize tracking-wide flex items-center gap-2">
                                                    <StarIcon className="w-4 h-4 text-warning shrink-0" />
                                                    <span>{groupName}</span>
                                                </h3>
                                                <span 
                                                    className="text-xs font-mono px-2.5 py-0.5 rounded-full font-bold text-white shadow-sm transition-transform duration-300 hover:scale-105"
                                                    style={{ backgroundColor: colors.primary }}
                                                >
                                                    {pokemonList.length}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8 gap-4 p-1">
                                                {pokemonList.map((pokemon) => (
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
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2 py-4">
                                    {groupedByType.map(([groupName, pokemonList]) => (
                                        <div key={groupName} className="mb-6 border border-border bg-surface-raised/20 rounded-xl p-4 shadow-sm backdrop-blur-sm transition-all duration-300 hover:shadow-md">
                                            <div className="flex items-center justify-between mb-4 border-b border-border/40 pb-2">
                                                <h3 className="text-base font-bold text-fg capitalize tracking-wide flex items-center gap-2">
                                                    {typeIcons[groupName] && (
                                                        <img 
                                                            src={typeIcons[groupName]} 
                                                            alt={groupName} 
                                                            className="w-5 h-5 shrink-0" 
                                                            style={{ filter: `drop-shadow(0 0 3px ${typeColors[groupName]}60)` }}
                                                        />
                                                    )}
                                                    <span>{t(`types.${groupName}`)}</span>
                                                </h3>
                                                <span 
                                                    className="text-xs font-mono px-2.5 py-0.5 rounded-full font-bold text-white shadow-sm transition-transform duration-300 hover:scale-105"
                                                    style={{ backgroundColor: typeColors[groupName] || colors.primary }}
                                                >
                                                    {pokemonList.length}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8 gap-4 p-1">
                                                {pokemonList.map((pokemon) => (
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
                                        </div>
                                    ))}
                                </div>
                            )}

                            {filteredFavorites.length === 0 && !activeLoading && (
                                <div className="px-2 pb-4">
                                    <EmptyState
                                        compact={favoritePokemons.size !== 0}
                                        title={favoritePokemons.size === 0 ? t('favorites.emptyTitle') : t('favorites.noMatchesTitle')}
                                        message={favoritePokemons.size === 0
                                            ? t('favorites.emptyDesc')
                                            : t('favorites.noMatchesDesc')}
                                        spriteSrc={favoritePokemons.size === 0 ? getPokemonArtworkSpriteUrl(385) : undefined}
                                        action={{
                                            label: t('nav.pokedex'),
                                            onClick: () => navigate('/pokedex')
                                        }}
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