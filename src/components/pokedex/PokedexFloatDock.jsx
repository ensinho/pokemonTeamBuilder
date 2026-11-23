import React, { useEffect, useRef, useState } from 'react';
import { LayoutGrid, Search, SlidersHorizontal, Star, X } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { typeColors, typeIcons } from '../../constants/types';
import { AnchoredPopover } from '../AnchoredPopover';
import { GameFilterChip } from '../GameCover';
import { TypeMatchToggle } from '../TypeMatchToggle';

const ALL_TYPES = Object.keys(typeColors);

const isTypingTarget = (target) => Boolean(
    target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)),
);

const hasOpenDialog = () => Boolean(
    typeof document !== 'undefined' && document.querySelector('[role="dialog"][aria-modal="true"]'),
);

/**
 * Floating bottom command & filter dock for the desktop Pokédex.
 * Solid raised pill chrome — zero backdrop blur, works identically across Dark and Light themes.
 */
export function PokedexFloatDock({
    searchInput,
    setSearchInput,
    selectedTypes,
    handleTypeSelection,
    typeMatchMode,
    setTypeMatchMode,
    selectedGeneration,
    setSelectedGeneration,
    generations,
    games,
    selectedGame,
    onOpenGamePicker,
    showOnlyFavorites,
    setShowOnlyFavorites,
    activeFilterCount,
    onClearFilters,
    cols,
    onCycleCols,
}) {
    const { t } = useTranslation();
    const [popoverOpen, setPopoverOpen] = useState(false);
    const searchInputRef = useRef(null);
    const filterBtnRef = useRef(null);
    const popoverRef = useRef(null);

    // Keyboard shortcuts on /pokedex desktop:
    //  `/` focuses the dock search field (intercepted in capture phase before AppLayout's global search)
    //  `F` toggles the filter popover when not typing and no modal is open.
    useEffect(() => {
        const onKeyDown = (event) => {
            if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
            if (isTypingTarget(event.target) || hasOpenDialog()) return;

            if (event.key === '/') {
                event.preventDefault();
                event.stopPropagation();
                searchInputRef.current?.focus();
                searchInputRef.current?.select();
                return;
            }

            if (event.key === 'f' || event.key === 'F') {
                event.preventDefault();
                event.stopPropagation();
                setPopoverOpen((prev) => !prev);
            }
        };

        window.addEventListener('keydown', onKeyDown, true);
        return () => window.removeEventListener('keydown', onKeyDown, true);
    }, []);

    // Dismiss filter popover on Escape or outside pointer click.
    useEffect(() => {
        if (!popoverOpen) return undefined;
        const onPointerDown = (event) => {
            if (popoverRef.current?.contains(event.target) || filterBtnRef.current?.contains(event.target)) return;
            setPopoverOpen(false);
        };
        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.stopPropagation();
                setPopoverOpen(false);
                filterBtnRef.current?.focus();
            }
        };
        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [popoverOpen]);

    const selectedTypeCount = selectedTypes.size;
    const totalPopoverFilters = activeFilterCount + (showOnlyFavorites ? 1 : 0);

    return (
        <div className="pokedex-dock-wrap">
            <div className="pokedex-dock" role="toolbar" aria-label={t('markedUi.pokedex.exploreTitle')}>
                <div className="pokedex-dock__search">
                    <Search className="pokedex-dock__search-icon" aria-hidden="true" />
                    <input
                        ref={searchInputRef}
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder={t('markedUi.pokedex.searchPlaceholder')}
                        aria-label={t('markedUi.pokedex.searchPlaceholder')}
                        className="pokedex-dock__input"
                    />
                    {searchInput ? (
                        <button
                            type="button"
                            onClick={() => {
                                setSearchInput('');
                                searchInputRef.current?.focus();
                            }}
                            className="pokedex-dock__clear"
                            aria-label={t('common.clear')}
                        >
                            <X className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                    ) : (
                        <kbd className="pokedex-dock__kbd" aria-hidden="true">/</kbd>
                    )}
                </div>

                <span className="pokedex-dock__divider" aria-hidden="true" />

                <button
                    ref={filterBtnRef}
                    type="button"
                    onClick={() => setPopoverOpen((prev) => !prev)}
                    aria-expanded={popoverOpen}
                    aria-haspopup="dialog"
                    className={`pokedex-dock__btn ${popoverOpen || totalPopoverFilters > 0 ? 'is-active' : ''}`}
                >
                    <SlidersHorizontal className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{t('markedUi.pokedex.filters')}</span>
                    {totalPopoverFilters > 0 && <span className="live-dot" aria-hidden="true" />}
                    <kbd className="pokedex-dock__kbd" aria-hidden="true">F</kbd>
                </button>

                <span className="pokedex-dock__divider" aria-hidden="true" />

                <button
                    type="button"
                    onClick={onCycleCols}
                    aria-label={t('markedUi.pokedex.densityAria', { cols })}
                    title={t('markedUi.pokedex.densityAria', { cols })}
                    className="pokedex-dock__btn pokedex-dock__density"
                >
                    <LayoutGrid className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="figure">{cols}</span>
                </button>
            </div>

            <AnchoredPopover
                isOpen={popoverOpen}
                anchorRef={filterBtnRef}
                popoverRef={popoverRef}
                placement="top"
                offset={12}
                zIndex={45}
                role="dialog"
                ariaLabel={t('markedUi.pokedex.filterHeading')}
                className="pokedex-filter-popover"
            >
                <div className="pokedex-filter-popover__head">
                    <h3 className="pokedex-filter-popover__title">{t('markedUi.pokedex.filterHeading')}</h3>
                    {totalPopoverFilters > 0 && (
                        <button
                            type="button"
                            onClick={onClearFilters}
                            className="pokedex-filter-popover__clear"
                        >
                            <X className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>{t('markedUi.pokedex.clearCount', { count: totalPopoverFilters })}</span>
                        </button>
                    )}
                </div>

                <div className="pokedex-filter-popover__types" role="group" aria-label={t('pokedex.typeFilterLabel', { defaultValue: 'Types' })}>
                    {ALL_TYPES.map((type) => {
                        const isActive = selectedTypes.has(type);
                        return (
                            <button
                                key={type}
                                type="button"
                                onClick={() => handleTypeSelection(type)}
                                aria-pressed={isActive}
                                className={`pokedex-filter-type ${isActive ? 'is-active' : ''}`}
                                style={{ '--type-chip': typeColors[type] }}
                            >
                                {typeIcons[type] && (
                                    <img src={typeIcons[type]} alt="" aria-hidden="true" className="pokedex-filter-type__icon" />
                                )}
                                <span>{t(`types.${type}`, { defaultValue: type })}</span>
                            </button>
                        );
                    })}
                </div>

                {selectedTypeCount >= 2 && (
                    <div className="pokedex-filter-popover__match">
                        <TypeMatchToggle value={typeMatchMode} onChange={setTypeMatchMode} />
                    </div>
                )}

                <div className="pokedex-filter-popover__controls">
                    <select
                        value={selectedGeneration}
                        onChange={(e) => setSelectedGeneration(e.target.value)}
                        className="select-clean pokedex-filter-popover__select"
                        aria-label={t('pokedex.genFilterLabel')}
                    >
                        <option value="all">{t('pokedex.allGens')}</option>
                        {generations.map((generation) => (
                            <option key={generation} value={generation} className="capitalize">
                                {generation.replace('-', ' ')}
                            </option>
                        ))}
                    </select>

                    <GameFilterChip
                        games={games}
                        selectedGame={selectedGame}
                        onOpen={() => {
                            setPopoverOpen(false);
                            onOpenGamePicker();
                        }}
                    />

                    <button
                        type="button"
                        onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                        aria-pressed={showOnlyFavorites}
                        className={`pokedex-filter-fav ${showOnlyFavorites ? 'is-active' : ''}`}
                    >
                        <Star className={`h-4 w-4 ${showOnlyFavorites ? 'fill-current' : ''}`} aria-hidden="true" />
                        <span>{t('pokedex.favoritesOnly')}</span>
                    </button>
                </div>
            </AnchoredPopover>
        </div>
    );
}
