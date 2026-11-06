import React, { useCallback, useDeferredValue, useEffect, useState, useMemo, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';
import { Search, Star, X, SlidersHorizontal } from 'lucide-react';

import '../../styles/team-builder-view.css';
import '../../styles/pokemon-card.css';
import '../../styles/pokedex-view.css';
import { typeColors, typeIcons } from '../../constants/types';
import { EmptyState } from '../EmptyState';
import { BottomSheet } from '../BottomSheet';
import { Sprite } from '../Sprite';
import { StarIcon } from '../icons';
import { GameFilterChip, GamePickerModal } from '../GameCover';
import { TypeMatchToggle } from '../TypeMatchToggle';
import { getPokemonDisplaySprite, getPokemonArtworkSpriteUrl } from '../../utils/pokemonSprites';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { useScrollRestoration } from '../../hooks/useScrollRestoration';
import { usePokedexStore } from '../../store/usePokedexStore';
import { Loader } from '../Loader';
import { navigateWithHero } from '../../utils/heroTransition';
import { useReplaceSearchParams } from '../../hooks/useUrlParam';
import { useShinyBurst } from '../../hooks/useShinyBurst';
import {
    DEFAULT_POKEDEX_FILTERS,
    filtersFromParams,
    filtersFromStore,
    hasPokedexFilterParams,
    storePatchForFilters,
    writeFilterParams,
} from '../../utils/pokedexUrlFilters';

// ---------------------------------------------------------------------------
// Cards. Each is a real link to the Pokémon's page (Cmd/middle-click open a tab,
// long-press offers the link), and the favourite star is its own control beside
// the link — positioned over the card's corner, never nested inside it
// (pokedex-view.css). An unmodified primary click is intercepted so the sprite
// can travel into the detail hero (utils/heroTransition.js).
//
// Both are memoised with stable props: before, every card re-rendered on every
// reveal of the next page (an inline click handler per render), which is where
// the long frames scrolling the desktop grid came from.
// ---------------------------------------------------------------------------

const DETAIL_STATE = { from: '/pokedex' };

const isPlainClick = (event) => !event.defaultPrevented
    && event.button === 0
    && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

function PokedexStar({ pokemon, isFavorite, onToggle, className, iconClassName, burst = false, t }) {
    const shiny = useShinyBurst();
    const label = t(isFavorite ? 'pokedex.removeFavoriteAria' : 'pokedex.addFavoriteAria', { name: pokemon.name });
    return (
        <button
            type="button"
            onClick={() => {
                // Starring earns the sparkle; un-starring does not.
                if (burst && !isFavorite) shiny.fire();
                onToggle(pokemon.id);
            }}
            className={`${className} pokedex-card-cell__star ${isFavorite ? 'is-active' : ''} ${shiny.isBursting ? 'is-bursting' : ''}`}
            aria-label={label}
            title={label}
        >
            <StarIcon className={iconClassName} isFavorite={isFavorite} color="currentColor" />
            {burst && shiny.burst}
        </button>
    );
}

const MobilePokedexPokemonCard = React.memo(function MobilePokedexPokemonCard({
    pokemon,
    onOpen,
    isFavorite,
    onToggleFavorite,
    lastRef,
    t,
}) {
    return (
        <div ref={lastRef} className="pokedex-card-cell pokedex-card-cell--mobile">
            <Link
                to={`/pokemon/${pokemon.id}`}
                state={DETAIL_STATE}
                onClick={(event) => onOpen(event, pokemon)}
                aria-label={t('pokedex.viewDetailsAria', { name: pokemon.name })}
                className="team-builder-mobile-card"
            >
                {/* Types only. Id, types and the favourite star on one row needed
                    98px of a 98px card at 390px wide — and more than a 360px phone
                    has — so something was always cut: first the second type icon,
                    then the id. The star sits on the sprite's corner and the number
                    beside the name now (Enzo's call), so this row has nothing to fight. */}
                <div className="flex items-center gap-1">
                    {(pokemon.types || []).map((type) => (
                        <img
                            key={type}
                            src={typeIcons[type]}
                            alt={type}
                            className="h-4 w-4 rounded-full"
                        />
                    ))}
                </div>

                <div className="team-builder-mobile-card__media" data-hero-source={pokemon.id}>
                    <div className="mx-auto aspect-square w-full max-w-[84px]">
                        <Sprite src={getPokemonDisplaySprite(pokemon)} artworkSrc={getPokemonArtworkSpriteUrl(pokemon.id)} alt={pokemon.name} className="h-full w-full" />
                    </div>
                </div>

                {/* Name left, number right. The name is what people read, so it
                    is the one that gives way when a long name meets a narrow card;
                    the number never truncates. No leading zeros here — right-aligned
                    numbers already line up at their edge, and "#0005" spent 18px a
                    name could use. */}
                <div className="flex items-baseline justify-between gap-1">
                    <p className="team-builder-mobile-card__name min-w-0 font-bold capitalize">
                        {pokemon.name}
                    </p>
                    <span className="shrink-0 font-mono text-2xs font-semibold tabular-nums text-muted select-none">
                        #{pokemon.id}
                    </span>
                </div>
            </Link>
            <PokedexStar
                pokemon={pokemon}
                isFavorite={isFavorite}
                onToggle={onToggleFavorite}
                className="team-builder-mobile-card__favorite team-builder-mobile-card__favorite--overlay"
                iconClassName="w-3.5 h-3.5"
                t={t}
            />
        </div>
    );
});

// The desktop card: PokemonCard's look (pokemon-card.css), minus the Builder's
// picker machinery and with the star moved out of the link.
const PokedexDesktopCard = React.memo(function PokedexDesktopCard({
    pokemon,
    onOpen,
    isFavorite,
    onToggleFavorite,
    lastRef,
    t,
}) {
    return (
        <div ref={lastRef} className="pokedex-card-cell pokedex-card-cell--desktop">
            <Link
                to={`/pokemon/${pokemon.id}`}
                state={DETAIL_STATE}
                onClick={(event) => onOpen(event, pokemon)}
                aria-label={t('pokedex.viewDetailsAria', { name: pokemon.name })}
                className="pokemon-card group"
            >
                <div className="pokemon-card__topbar">
                    <div className="pokemon-card__types">
                        <span className="pokemon-card__dex-number">
                            #{String(pokemon.id).padStart(4, '0')}
                        </span>
                        {(pokemon.types || []).map((type) => (
                            <img
                                key={type}
                                src={typeIcons[type]}
                                alt={type}
                                className="pokemon-card__type-icon"
                            />
                        ))}
                    </div>
                    {/* Holds the star's place in the row; the star itself is a
                        sibling of the link, positioned over this slot. */}
                    <span className="pokemon-card__favorite pokedex-card-cell__slot" aria-hidden="true" />
                </div>
                <div className="pokemon-card__media" data-hero-source={pokemon.id}>
                    <Sprite src={getPokemonDisplaySprite(pokemon)} artworkSrc={getPokemonArtworkSpriteUrl(pokemon.id)} alt={pokemon.name} className="w-full h-full" />
                </div>
                <p className="pokemon-card__name">{pokemon.name}</p>
            </Link>
            <PokedexStar
                pokemon={pokemon}
                isFavorite={isFavorite}
                onToggle={onToggleFavorite}
                className="pokemon-card__favorite"
                iconClassName="w-4 h-4"
                burst
                t={t}
            />
        </div>
    );
});

// The grid, memoised and fed a deferred list: typing in the search stays
// instant (the input is urgent), and the grid catches up in an interruptible
// render instead of blocking the next keystroke.
const PokedexGrid = React.memo(function PokedexGrid({ pokemons, mobile, favoritePokemons, onOpen, onToggleFavorite, lastRef, t }) {
    const Card = mobile ? MobilePokedexPokemonCard : PokedexDesktopCard;
    return pokemons.map((pokemon, index) => (
        <Card
            key={pokemon.id}
            pokemon={pokemon}
            onOpen={onOpen}
            isFavorite={favoritePokemons.has(pokemon.id)}
            onToggleFavorite={onToggleFavorite}
            lastRef={index === pokemons.length - 1 ? lastRef : null}
            t={t}
        />
    ));
});

// ---------------------------------------------------------------------------
// Filters <-> URL. The Pokédex filters live in its store (the Builder and the
// detail screen read it), and are mirrored to `?q=&gen=&game=&types=&match=&fav=`
// so Back, a refresh and a shared link all reopen the same list. The store's
// list signature — and with it the remembered reveal depth and scroll offset —
// is untouched by the mirror.
// ---------------------------------------------------------------------------

const KNOWN_TYPES = new Set(Object.keys(typeColors));

const applyFiltersToStore = (filters) => {
    const patch = storePatchForFilters(usePokedexStore.getState(), filters);
    if (Object.keys(patch).length) usePokedexStore.setState(patch);
};

function usePokedexUrlSync(storeFilterDeps) {
    const [searchParams] = useSearchParams();
    const writeParams = useReplaceSearchParams();
    const paramsKey = searchParams.toString();
    // Queries this view wrote that the (transitioned) router has not echoed yet;
    // an echo must not overwrite what the user changed since.
    const pending = useRef([]);
    const isFirstRun = useRef(true);

    // URL -> store: on arrival, and on Back/Forward or a link while open.
    useEffect(() => {
        const firstRun = isFirstRun.current;
        isFirstRun.current = false;
        const index = pending.current.indexOf(paramsKey);
        if (index !== -1) {
            pending.current = pending.current.slice(index + 1);
            return;
        }
        pending.current = [];
        const params = new URLSearchParams(paramsKey);
        // A bare /pokedex on arrival (the nav link, the detail page's back
        // button) keeps the filters the session already has; the effect below
        // then writes them into the URL.
        if (firstRun && !hasPokedexFilterParams(params)) return;
        applyFiltersToStore(filtersFromParams(params, KNOWN_TYPES));
    }, [paramsKey]);

    // Store -> URL, replacing the entry: filtering is not a step Back should walk.
    useEffect(() => {
        const filters = filtersFromStore(usePokedexStore.getState());
        const written = writeParams((params) => writeFilterParams(params, filters));
        if (written !== null) pending.current.push(written);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, storeFilterDeps);
}

export function PokedexView({
    pokemons,
    lastPokemonElementRef,
    isFetchingMore,
    searchInput,
    setSearchInput,
    selectedTypes,
    handleTypeSelection,
    typeMatchMode,
    setTypeMatchMode,
    selectedGeneration,
    setSelectedGeneration,
    generations,
    games = [],
    selectedGame,
    setSelectedGame,
    isInitialLoading,
    listSignature = '',
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
    const setBrowseSequence = usePokedexStore((s) => s.setBrowseSequence);
    // The real result count, not the loaded page (it read "50" for 1025).
    const filteredTotal = usePokedexStore((s) => s.filteredPokemons.length);

    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    const [isGamePickerOpen, setIsGamePickerOpen] = useState(false);
    const [isFiltersOpen, setIsFiltersOpen] = useState(false);
    const desktopResultsRef = useRef(null);

    const displayedPokemons = useMemo(() => {
        return showOnlyFavorites
            ? pokemons.filter((pokemon) => favoritePokemons.has(Number(pokemon.id)))
            : pokemons;
    }, [pokemons, showOnlyFavorites, favoritePokemons]);
    // What the grid draws: one render behind while the user types (see PokedexGrid).
    const gridPokemons = useDeferredValue(displayedPokemons);

    usePokedexUrlSync([searchInput, selectedGeneration, selectedGame, selectedTypes, typeMatchMode, showOnlyFavorites]);

    // Opening a Pokémon leaves this page and comes back through a fresh render,
    // so the browser has nothing to restore — put the user back where they were
    // instead of at the top of 1025 Pokémon. Mobile scrolls the app shell;
    // desktop scrolls the results panel.
    useScrollRestoration(listSignature, {
        ready: !isInitialLoading && gridPokemons.length > 0,
        containerRef: isMobile ? undefined : desktopResultsRef,
    });

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

    // `?q=` (and the other filters) are read by usePokedexUrlSync — `?q=` is
    // also the site search box Google may show under the result for this site
    // (Home's WebSite/SearchAction JSON-LD, seoPages.js).

    // Clicking a Pokémon opens its dedicated detail page (researchable, shareable
    // URL). The *filtered* order goes with it: on a phone the detail screen is a
    // carousel, and "next" has to mean the next card in the list the user is
    // looking at — not the next national id. Only an unmodified primary click
    // is taken over; Cmd/Ctrl/Shift/middle-click stay the browser's.
    const handleOpenCard = useCallback((event, pokemon) => {
        if (!isPlainClick(event) || !pokemon?.id) return;
        event.preventDefault();
        setBrowseSequence(usePokedexStore.getState().filteredPokemons);
        // The card's sprite travels into the detail hero (utils/heroTransition.js).
        const source = document.querySelector(`[data-hero-source="${pokemon.id}"]`);
        // The origin carries the filters, so the detail page's back button
        // returns to this exact list.
        const from = `/pokedex${window.location.search}`;
        navigateWithHero(navigate, `/pokemon/${pokemon.id}`, { state: { from } }, source);
    }, [navigate, setBrowseSequence]);

    // AppLayout's toggle is not guaranteed stable; the memoised cards need one
    // that is, or every card re-renders whenever the shell does.
    const toggleFavoriteRef = useRef(onToggleFavoritePokemon);
    useEffect(() => { toggleFavoriteRef.current = onToggleFavoritePokemon; }, [onToggleFavoritePokemon]);
    const handleToggleFavorite = useCallback((id) => toggleFavoriteRef.current?.(id), []);

    const hasActiveFilters = Boolean(searchInput) || showOnlyFavorites || activeFilterCount > 0;
    const clearFilters = useCallback(() => {
        applyFiltersToStore(DEFAULT_POKEDEX_FILTERS);
    }, []);
    // Says why the list is empty, and offers the one way out.
    const emptyState = (
        <EmptyState mascot="search"
            compact
            title={showOnlyFavorites ? t('favorites.noMatchesTitle') : t('pokedex.noPokemonFound')}
            message={showOnlyFavorites ? t('favorites.noMatchesDesc') : t('pokedex.noPokemonFoundDesc')}
            action={hasActiveFilters ? { label: t('common.clearFilters'), onClick: clearFilters } : undefined}
        />
    );

    // --- MOBILE VIEW TEMPLATE ---
    if (isMobile) {
        return (
            <div className="team-builder-mobile space-y-4">
                <section className="pokedex-mobile-filterbar-band">
                    <div className="pokedex-mobile-filterbar">
                        <div className="relative flex-1 min-w-0">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none flex items-center">
                                <Search className="w-4 h-4" />
                            </span>
                            {/* Tell the software keyboard what this field is: a
                                search return key instead of a newline, and no
                                autocapitalise/autocorrect — "pikachu" was being
                                corrected to "Pikachi" mid-search. Kept as
                                type="text" because type="search" would add the
                                browser's own clear button next to ours. */}
                            <input
                                type="text"
                                inputMode="search"
                                enterKeyHint="search"
                                autoCapitalize="none"
                                autoCorrect="off"
                                spellCheck={false}
                                placeholder={t('pokedex.searchPlaceholderShort')}
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
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted text-2xs">▼</span>
                                </div>
                            </div>

                            <div>
                                <p className="pokedex-sheet-label">{language === 'pt' ? 'Jogo' : 'Game'}</p>
                                {/* Closing the sheet before opening the picker is deliberate:
                                    the sheet is portaled to <body>, so leaving it mounted paints
                                    it over the picker it just opened. */}
                                <GameFilterChip
                                    games={games}
                                    selectedGame={selectedGame}
                                    onOpen={() => { setIsFiltersOpen(false); setIsGamePickerOpen(true); }}
                                    className="w-full"
                                />
                            </div>

                            <div>
                                {/* The switch belongs on the heading, not below the
                                    badges: it changes what picking two of them means. */}
                                <div className="pokedex-sheet-heading-row">
                                    <p className="pokedex-sheet-label">{language === 'pt' ? 'Tipos' : 'Types'}</p>
                                    <TypeMatchToggle
                                        value={typeMatchMode}
                                        onChange={setTypeMatchMode}
                                        className="type-match-toggle--sheet"
                                    />
                                </div>
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
                                                <span className="text-2xs font-bold capitalize select-none">{type}</span>
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

                {/* No panel: the cards are filled, so they separate from the page
                    on their own. The box that wrapped them spent 34px of width to
                    draw a line around ~1000 cards, and those pixels were exactly
                    what the card header needed to stop clipping its type icons. */}
                <section>
                    {isInitialLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader />
                        </div>
                    ) : (
                        <>
                            <div className="pokedex-mobile-grid grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                                <PokedexGrid
                                    mobile
                                    pokemons={gridPokemons}
                                    favoritePokemons={favoritePokemons}
                                    onOpen={handleOpenCard}
                                    onToggleFavorite={handleToggleFavorite}
                                    lastRef={lastPokemonElementRef}
                                    t={t}
                                />
                            </div>

                            {isFetchingMore && (
                                <div className="flex items-center justify-center py-4">
                                    <Loader size="sm" />
                                </div>
                            )}

                            {gridPokemons.length === 0 && (
                                <div className="py-12 text-center">
                                    {emptyState}
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
                            <span className="team-builder-panel__meta team-builder-panel__meta--compact">{filteredTotal}</span>
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
                        <TypeMatchToggle value={typeMatchMode} onChange={setTypeMatchMode} />
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
                                <Loader />
                            </div>
                        ) : (
                            <div ref={desktopResultsRef} className="team-builder-results__scroll custom-scrollbar">
                                <div className="team-builder-results__grid grid gap-4 p-1 py-4 grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8">
                                    <PokedexGrid
                                        pokemons={gridPokemons}
                                        favoritePokemons={favoritePokemons}
                                        onOpen={handleOpenCard}
                                        onToggleFavorite={handleToggleFavorite}
                                        lastRef={lastPokemonElementRef}
                                        t={t}
                                    />
                                </div>

                                {isFetchingMore && (
                                    <div className="team-builder-spinner-wrap py-4">
                                        <Loader size="sm" />
                                    </div>
                                )}

                                {gridPokemons.length === 0 && !isInitialLoading && (
                                    <div className="px-2 pb-4">
                                        {emptyState}
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
