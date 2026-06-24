import React, { useMemo, useState, useEffect } from 'react';
import '../../styles/team-builder-view.css';
import '../../styles/all-teams-view.css';
import { typeColors, typeIcons } from '../../constants/types';
import { GENERATION_RANGES } from '../../constants/pokemon';
import { PokemonCard } from '../PokemonCard';
import { ClearIcon, StarIcon } from '../icons';
import { ExternalLink } from 'lucide-react';
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

    const favoriteTypesCount = useMemo(() => {
        const set = new Set();
        favoritePokemonsList.forEach((pokemon) => (pokemon.types || []).forEach((type) => set.add(type)));
        return set.size;
    }, [favoritePokemonsList]);

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
        <main className="all-teams-view">
            <section className="team-builder-panel all-teams-view__panel p-5 md:p-6">
                <div className="all-teams-view__header">
                    <div>
                        <p className="team-builder-panel__eyebrow">{language === 'pt' ? 'Coleção' : 'Collection'}</p>
                        <div className="all-teams-view__heading-row">
                            <h2 className="team-builder-panel__title all-teams-view__title">{t('favorites.title')}</h2>
                            <span className="team-builder-panel__meta">{filteredFavorites.length}</span>
                        </div>
                        <p className="team-builder-panel__copy all-teams-view__copy">
                            {t('favorites.subtitle')}
                        </p>
                    </div>

                    <div className="all-teams-view__summary" aria-label={language === 'pt' ? 'Resumo dos favoritos' : 'Favorites summary'}>
                        <span className="team-builder-picker-summary">{`${favoritePokemonsList.length} total`}</span>
                        <span className="team-builder-picker-summary">{language === 'pt' ? `${favoriteTypesCount} tipos` : `${favoriteTypesCount} types`}</span>
                    </div>
                </div>

                <div className="all-teams-view__toolbar">
                    <label className="team-builder-control all-teams-view__search-control" htmlFor="favorites-search">
                        <span className="team-builder-control__label">{language === 'pt' ? 'Pesquisar favoritos' : 'Search favorites'}</span>
                        <input
                            id="favorites-search"
                            type="text"
                            placeholder={t('favorites.searchPlaceholder')}
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            className="team-builder-field"
                        />
                    </label>

                    <div className="all-teams-view__toolbar-actions">
                        {searchInput ? (
                            <button
                                type="button"
                                onClick={() => setSearchInput('')}
                                className="team-builder-button team-builder-button--inline team-builder-button--inline-compact"
                            >
                                {language === 'pt' ? 'Limpar busca' : 'Clear search'}
                            </button>
                        ) : null}

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

                        <span className="team-builder-picker-summary">{language === 'pt' ? `${filteredFavorites.length} visíveis` : `${filteredFavorites.length} visible`}</span>
                    </div>
                </div>

                <div className="all-teams-view__results mt-4">
                    {activeLoading ? (
                        <div className="team-builder-spinner-wrap py-16">
                            <div className="team-builder-spinner" aria-hidden="true"></div>
                        </div>
                    ) : (
                        <div>
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
                                            onClick: () => navigate('/pokedex'),
                                            icon: <ExternalLink className="w-4 h-4" />
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