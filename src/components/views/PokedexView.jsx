import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';
import { Search, Star, X, SlidersHorizontal } from 'lucide-react';

import '../../styles/team-builder-view.css';
import { typeColors, typeIcons } from '../../constants/types';
import { EmptyState } from '../EmptyState';
import { BottomSheet } from '../BottomSheet';
import { PokemonCard } from '../PokemonCard';
import { Sprite } from '../Sprite';
import { StarIcon } from '../icons';
import { GameFilterChip, GamePickerModal } from '../GameCover';
import { getPokemonDisplaySprite, getPokemonArtworkSpriteUrl } from '../../utils/pokemonSprites';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';

const MobilePokedexPokemonCard = ({
    pokemon,
    onCardClick,
    isFavorite,
    onToggleFavorite,
    lastRef,
}) => {
    const { t, language } = useTranslation();
    const handleCardClick = () => {
        onCardClick?.(pokemon);
    };

    const handleKeyDown = (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onCardClick?.(pokemon);
        }
    };

    const handleFavoriteClick = (event) => {
        event.stopPropagation();
        onToggleFavorite?.(pokemon.id);
    };

    return (
        <article
            ref={lastRef}
            role="button"
            tabIndex={0}
            aria-label={`View details for ${pokemon.name}`}
            onClick={handleCardClick}
            onKeyDown={handleKeyDown}
            className="team-builder-mobile-card"
        >
            <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1">
                    {pokemon.types.map((type) => (
                        <img
                            key={type}
                            src={typeIcons[type]}
                            alt={type}
                            className="h-4 w-4 rounded-full"
                        />
                    ))}
                </div>
                <button
                    onClick={handleFavoriteClick}
                    className={`team-builder-mobile-card__favorite ${isFavorite ? 'is-active' : ''}`}
                    aria-label={isFavorite ? `Remove ${pokemon.name} from favorites` : `Add ${pokemon.name} to favorites`}
                    title={isFavorite ? t('common.remove') : (language === 'pt' ? 'Adicionar aos favoritos' : 'Add to favorites')}
                >
                    <StarIcon className="w-3.5 h-3.5" isFavorite={isFavorite} color="currentColor" />
                </button>
            </div>

            <div className="team-builder-mobile-card__media">
                <div className="mx-auto aspect-square w-full max-w-[84px]">
                    <Sprite src={getPokemonDisplaySprite(pokemon)} artworkSrc={getPokemonArtworkSpriteUrl(pokemon.id)} alt={pokemon.name} className="h-full w-full" />
                </div>
            </div>

            <div className="mt-0">
                <p className="team-builder-mobile-card__name font-bold capitalize">
                    {pokemon.name}
                </p>
            </div>
        </article>
    );
};

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
    games = [],
    selectedGame,
    setSelectedGame,
    isInitialLoading,
    colors,
    favoritePokemons,
    onToggleFavoritePokemon,
    showOnlyFavorites,
    setShowOnlyFavorites,
}) {
    const { t, language } = useTranslation();
    useDocumentMeta({
        title: 'Pokédex',
        description: 'Browse every Pokémon with stats, types, abilities, and forms across every generation and game.',
        path: '/pokedex',
    });
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const pokemonQueryParam = searchParams.get('pokemon');

    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    const [isGamePickerOpen, setIsGamePickerOpen] = useState(false);
    const [isFiltersOpen, setIsFiltersOpen] = useState(false);

    const displayedPokemons = useMemo(() => {
        return showOnlyFavorites
            ? pokemons.filter((pokemon) => favoritePokemons.has(Number(pokemon.id)))
            : pokemons;
    }, [pokemons, showOnlyFavorites, favoritePokemons]);

    // Count of active filters (excluding search + favorites, which stay inline) —
    // drives the badge on the mobile "Filtros" button.
    const activeFilterCount = selectedTypes.size
        + (selectedGeneration && selectedGeneration !== 'all' ? 1 : 0)
        + (selectedGame && selectedGame !== 'all' ? 1 : 0);

    const selectedTypeCount = selectedTypes.size;

    // Detect mobile view size
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 1024);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Backward-compat: old deep links used /pokedex?pokemon=<id|name> to open an
    // inline panel. Details now live on their own page — redirect those links there.
    useEffect(() => {
        if (pokemonQueryParam) {
            navigate(`/pokemon/${pokemonQueryParam}`, { replace: true, state: { from: '/pokedex' } });
        }
    }, [pokemonQueryParam, navigate]);

    // Clicking a Pokémon opens its dedicated detail page (researchable, shareable URL).
    const handleSelectPokemon = (pokemon) => {
        if (!pokemon?.id) return;
        navigate(`/pokemon/${pokemon.id}`, { state: { from: '/pokedex' } });
    };

    // --- MOBILE VIEW TEMPLATE ---
    if (isMobile) {
        return (
            <div className="team-builder-mobile space-y-4 font-mono">
                <section className="team-builder-panel p-4">
                    <div className="pokedex-mobile-filterbar">
                        <div className="relative flex-1 min-w-0">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none flex items-center">
                                <Search className="w-4 h-4" />
                            </span>
                            <input
                                type="text"
                                placeholder={t('pokedex.searchPlaceholder')}
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                className="team-builder-field w-full pl-9 pr-8"
                                style={{ boxShadow: 'none' }}
                            />
                            {searchInput && (
                                <button
                                    type="button"
                                    onClick={() => setSearchInput('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-fg"
                                    aria-label={t('common.clear')}
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {/* Favorites stays inline (one tap, high-frequency) */}
                        <button
                            type="button"
                            onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                            className={`pokedex-mobile-iconbtn ${showOnlyFavorites ? 'is-active-fav' : ''}`}
                            aria-pressed={showOnlyFavorites}
                            title={showOnlyFavorites ? t('pokedex.favoritesOnly') : t('common.all')}
                        >
                            <Star className={`w-4 h-4 ${showOnlyFavorites ? 'fill-[#FBBF24] text-[#FBBF24]' : ''}`} />
                        </button>

                        {/* Gen · game · types collapse into a bottom sheet */}
                        <button
                            type="button"
                            onClick={() => setIsFiltersOpen(true)}
                            className={`pokedex-mobile-iconbtn ${activeFilterCount > 0 ? 'is-active' : ''}`}
                            aria-label={language === 'pt' ? 'Filtros' : 'Filters'}
                        >
                            <SlidersHorizontal className="w-4 h-4" />
                            {activeFilterCount > 0 && (
                                <span className="pokedex-mobile-iconbtn__badge">{activeFilterCount}</span>
                            )}
                        </button>
                    </div>
                </section>

                {isFiltersOpen && (
                    <BottomSheet onClose={() => setIsFiltersOpen(false)} title={language === 'pt' ? 'Filtros' : 'Filters'}>
                        <div className="space-y-5">
                            <div>
                                <p className="pokedex-sheet-label">{language === 'pt' ? 'Geração' : 'Generation'}</p>
                                <div className="relative w-full">
                                    <select
                                        value={selectedGeneration}
                                        onChange={(e) => setSelectedGeneration(e.target.value)}
                                        className="team-builder-field team-builder-select w-full pr-8 appearance-none capitalize"
                                        aria-label={t('pokedex.genFilterLabel')}
                                        style={{ background: 'none' }}
                                    >
                                        <option value="all">Gen: {language === 'pt' ? 'Todas' : 'All'}</option>
                                        {generations.map((generation) => (
                                            <option key={generation} value={generation} className="capitalize">
                                                {generation.replace('generation-', '').replace('-', ' ').toUpperCase()}
                                            </option>
                                        ))}
                                    </select>
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted text-[10px]">▼</span>
                                </div>
                            </div>

                            <div>
                                <p className="pokedex-sheet-label">{language === 'pt' ? 'Jogo' : 'Game'}</p>
                                <GameFilterChip
                                    games={games}
                                    selectedGame={selectedGame}
                                    onOpen={() => setIsGamePickerOpen(true)}
                                    className="w-full"
                                />
                            </div>

                            <div>
                                <p className="pokedex-sheet-label">{language === 'pt' ? 'Tipos' : 'Types'}</p>
                                <div className="pokedex-sheet-types">
                                    {Object.keys(typeColors).map((type) => {
                                        const isActive = selectedTypes.has(type);
                                        return (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => handleTypeSelection(type)}
                                                className={`pokedex-mobile-type-badge ${isActive ? 'is-active' : ''}`}
                                                style={{
                                                    '--type-color': typeColors[type],
                                                    backgroundColor: isActive ? typeColors[type] : 'var(--color-surface-raised)',
                                                    borderColor: isActive ? typeColors[type] : 'var(--color-border)',
                                                    color: isActive ? '#fff' : 'var(--color-fg)'
                                                }}
                                                title={type}
                                            >
                                                <img src={typeIcons[type]} alt={type} className="w-3.5 h-3.5 object-contain" />
                                                <span className="text-[10px] font-bold capitalize select-none">{type}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <button
                                type="button"
                                className="btn btn-primary w-full"
                                onClick={() => setIsFiltersOpen(false)}
                            >
                                {language === 'pt' ? 'Ver resultados' : 'Show results'}
                            </button>
                        </div>
                    </BottomSheet>
                )}

                <section className="team-builder-panel p-4">
                    {isInitialLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="team-builder-spinner" aria-hidden="true"></div>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                                {displayedPokemons.map((pokemon, index) => (
                                    <MobilePokedexPokemonCard
                                        key={pokemon.id}
                                        pokemon={pokemon}
                                        onCardClick={handleSelectPokemon}
                                        lastRef={index === displayedPokemons.length - 1 ? lastPokemonElementRef : null}
                                        isFavorite={favoritePokemons.has(pokemon.id)}
                                        onToggleFavorite={onToggleFavoritePokemon}
                                    />
                                ))}
                            </div>

                            {isFetchingMore && (
                                <div className="flex items-center justify-center py-4">
                                    <div className="team-builder-spinner team-builder-spinner--small" aria-hidden="true"></div>
                                </div>
                            )}

                            {displayedPokemons.length === 0 && (
                                <div className="py-12 text-center">
                                    <EmptyState
                                        compact
                                        title={showOnlyFavorites ? t('favorites.noMatchesTitle') : t('pokedex.noPokemonFound')}
                                        message={showOnlyFavorites ? t('favorites.noMatchesDesc') : t('favorites.noMatchesDesc')}
                                    />
                                </div>
                            )}
                        </>
                    )}
                </section>

                <GamePickerModal
                    isOpen={isGamePickerOpen}
                    onClose={() => setIsGamePickerOpen(false)}
                    games={games}
                    selectedGame={selectedGame}
                    onSelectGame={setSelectedGame}
                />
            </div>
        );
    }

    // --- DESKTOP VIEW TEMPLATE (Width >= 1024px) ---
    return (
        <main className="team-builder grid grid-cols-1 relative">
            <div className="grid gap-5 grid-cols-1">
                <section className="team-builder-panel team-builder-panel--picker p-4">
                    <div className="team-builder-panel__header team-builder-panel__header--picker team-builder-panel__header--compact">
                        <div className="team-builder-picker-heading-row team-builder-picker-heading-row--compact min-w-0">
                            <h2 className="team-builder-panel__title team-builder-panel__title--compact">{t('nav.pokedex')}</h2>
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
                        <span className="team-builder-picker-summary">{selectedTypeCount === 0 ? t('pokedex.allTypes') : t('pokedex.selectedTypes', { count: selectedTypeCount })}</span>
                    </div>

                    <div className="team-builder-unified-toolbar mt-3">
                        <div className="team-builder-search-wrap">
                            <span className="team-builder-search-icon" aria-hidden="true">
                                <Search className="w-4 h-4" />
                            </span>
                            <input
                                type="text"
                                placeholder={t('pokedex.searchPlaceholder')}
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
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        <div className="team-builder-select-wrap">
                            <select
                                value={selectedGeneration}
                                onChange={(e) => setSelectedGeneration(e.target.value)}
                                className="team-builder-field team-builder-field--compact team-builder-select"
                                aria-label={t('pokedex.genFilterLabel')}
                            >
                                <option value="all">{t('pokedex.allGens')}</option>
                                {generations.map((generation) => (
                                    <option key={generation} value={generation} className="capitalize">
                                        {generation.replace('-', ' ')}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <GameFilterChip
                            games={games}
                            selectedGame={selectedGame}
                            onOpen={() => setIsGamePickerOpen(true)}
                        />

                        <button
                            type="button"
                            onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                            className={`team-builder-toggle team-builder-toggle--compact ${showOnlyFavorites ? 'is-active' : ''}`}
                            aria-pressed={showOnlyFavorites}
                        >
                            <Star className={`w-4 h-4 ${showOnlyFavorites ? 'fill-[#FBBF24] text-[#FBBF24]' : 'text-muted'}`} />
                            <span>{showOnlyFavorites ? t('pokedex.favoritesOnly') : t('common.all')}</span>
                        </button>
                    </div>

                    <div className="team-builder-results mt-4">
                        {isInitialLoading ? (
                            <div className="team-builder-spinner-wrap h-full">
                                <div className="team-builder-spinner" aria-hidden="true"></div>
                            </div>
                        ) : (
                            <div className="team-builder-results__scroll custom-scrollbar">
                                <div className="team-builder-results__grid grid gap-4 p-1 py-4 grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8">
                                    {displayedPokemons.map((pokemon, index) => (
                                        <PokemonCard
                                            key={pokemon.id}
                                            details={pokemon}
                                            onCardClick={handleSelectPokemon}
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
                                            title={showOnlyFavorites ? t('favorites.noMatchesTitle') : t('pokedex.noPokemonFound')}
                                            message={showOnlyFavorites ? t('favorites.noMatchesDesc') : t('favorites.noMatchesDesc')}
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </section>
            </div>

            <GamePickerModal
                isOpen={isGamePickerOpen}
                onClose={() => setIsGamePickerOpen(false)}
                games={games}
                selectedGame={selectedGame}
                onSelectGame={setSelectedGame}
            />
        </main>
    );
}
