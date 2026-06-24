import React, { useEffect, useMemo, useRef, useState } from 'react';
import { POKEBALL_PLACEHOLDER_URL } from '../../constants/theme';
import { typeIcons, typeColors } from '../../constants/types';
import { Dices, Trophy, ShieldCheck, Sparkles, ChevronDown, SlidersHorizontal, Search } from 'lucide-react';
import { GameCoverBanner, GameFilterChip, GamePickerModal } from '../GameCover';
import { EmptyState } from '../EmptyState';
import { Sprite } from '../Sprite';
import { TypeBadge } from '../TypeBadge';
import { AnchoredPopover } from '../AnchoredPopover';
import { MetaCoresModal } from '../modals/MetaCoresModal';
import { Atom, ChevronRight } from 'lucide-react';
import { coreIconFor } from '../coreIcons';
// SynergySuggestions strip removed — synergy picks now appear in-grid
import { detectTeamCores } from '../../utils/metaCores';
import { useSmogonData } from '../../hooks/useSmogonData';
import { useCompetitiveUsage } from '../../hooks/useCompetitiveUsage';
import { getPokemonDisplaySprite, getTeamPokemonDisplaySprite, getPokemonArtworkSpriteUrl, getPokemonFrontSpriteUrl } from '../../utils/pokemonSprites';
import { useTranslation } from '../../hooks/useTranslation';
import {
    ClearIcon,
    InfoIcon,
    SaveIcon,
    ShareIcon,
    ShowdownIcon,
    StarIcon,
    TrashIcon,
    TrophyIcon,
} from '../icons';
import { Save, SaveAll } from 'lucide-react';

// Inline CSS custom properties for the per-type ring/tint behind a sprite.
const typeVars = (pokemon) => {
    const types = pokemon?.types || [];
    const a = typeColors[types[0]] || '#6390F0';
    const b = typeColors[types[1]] || a;
    return { '--type-a': a, '--type-b': b };
};

// Map reason kind → icon + default colour (same logic as PokemonCard)
const REASON_VISUALS = {
    ability: (r) => ({ Icon: coreIconFor(r.coreId), color: r.accent || 'var(--color-primary)' }),
    partner: () => ({ Icon: Trophy, color: 'var(--color-primary)' }),
    type:    () => ({ Icon: ShieldCheck, color: '#38bdf8' }),
    meta:    () => ({ Icon: Sparkles, color: 'var(--color-primary)' }),
};
function reasonVisual(reason) {
    const fn = REASON_VISUALS[reason?.kind];
    return fn ? fn(reason) : { Icon: Sparkles, color: 'var(--color-primary)' };
}

const MobilePokemonPickerCard = ({
    pokemon,
    onAddToTeam,
    isSuggested,
    synergyReason,
    isFavorite,
    onToggleFavorite,
    lastRef,
}) => {
    const { t, language } = useTranslation();
    const handleCardClick = () => {
        onAddToTeam?.(pokemon);
    };

    const handleKeyDown = (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onAddToTeam?.(pokemon);
        }
    };

    const handleFavoriteClick = (event) => {
        event.stopPropagation();
        onToggleFavorite?.(pokemon.id);
    };

    const hasSynergy = !!synergyReason;
    const { Icon: ReasonIcon, color: reasonColor } = hasSynergy ? reasonVisual(synergyReason) : {};

    return (
        <article
            ref={lastRef}
            role="button"
            tabIndex={0}
            aria-label={`${language === 'pt' ? 'Adicionar' : 'Add'} ${pokemon.name} ${language === 'pt' ? 'ao time' : 'to team'}`}
            onClick={handleCardClick}
            onKeyDown={handleKeyDown}
            className={`team-builder-mobile-card ${hasSynergy ? 'is-synergy' : isSuggested ? 'is-suggested' : ''}`}
            style={hasSynergy ? { '--synergy-color': reasonColor } : undefined}
        >
            {hasSynergy && (
                <span className="team-builder-mobile-card__reason-icon" title={synergyReason.label}>
                    <ReasonIcon />
                </span>
            )}
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
                    {!hasSynergy && isSuggested && (
                        <div className="team-builder-mobile-card__badge ml-1">
                            {language === 'pt' ? 'Novo' : 'New'}
                        </div>
                    )}
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

            <div className="team-builder-mobile-card__media tb-type-tint" style={typeVars(pokemon)}>
                <div className="mx-auto aspect-square w-full max-w-[84px]">
                    <Sprite src={getPokemonDisplaySprite(pokemon)} artworkSrc={getPokemonArtworkSpriteUrl(pokemon.id)} alt={pokemon.name} className="h-full w-full" />
                </div>
            </div>

            <div className="mt-2">
                <p className="team-builder-mobile-card__name font-bold capitalize">
                    {pokemon.name}
                </p>
                {hasSynergy && synergyReason.label && (
                    <span className="team-builder-mobile-card__reason-label" style={{ color: reasonColor }}>{synergyReason.label}</span>
                )}
            </div>
        </article>
    );
};

// ---------------------------------------------------------------------------
// TeamAnalysisChip — condensed indicator that lives under the team slots.
// Tap toggles a small popover with the breakdown so users on mobile can
// glance at the team rating without scrolling to the full analysis section.
// ---------------------------------------------------------------------------
const TeamAnalysisChip = ({ teamAnalysis, teamSize, colors }) => {
    const [isOpen, setIsOpen] = useState(false);
    const triggerRef = useRef(null);
    const popoverRef = useRef(null);
    const { t, language } = useTranslation();

    const { rating, ratingColor, strengthCount, weaknessCount, topStrengths, topWeaknesses } = useMemo(() => {
        const sCount = teamAnalysis?.strengths?.size || 0;
        const wEntries = Object.entries(teamAnalysis?.weaknesses || {});
        const wCount = wEntries.length;
        // Score ranges roughly -12..+18; coarse bucketing keeps the chip
        // language honest without pretending to be a deep tier list.
        const score = sCount * 2 - wEntries.reduce((sum, [, v]) => sum + Math.max(0, v), 0);
        let label = language === 'pt' ? 'Montando' : 'Building';
        let color = colors.textMuted;
        if (teamSize >= 1) {
            if (score >= 8) { label = language === 'pt' ? 'Excelente' : 'Excellent'; color = colors.success; }
            else if (score >= 3) { label = language === 'pt' ? 'Forte' : 'Strong'; color = colors.success; }
            else if (score >= -2) { label = language === 'pt' ? 'Equilibrado' : 'Balanced'; color = colors.info || colors.primary; }
            else { label = language === 'pt' ? 'Arriscado' : 'Risky'; color = colors.danger; }
        }
        return {
            rating: label,
            ratingColor: color,
            strengthCount: sCount,
            weaknessCount: wCount,
            topStrengths: Array.from(teamAnalysis?.strengths || []).sort().slice(0, 6),
            topWeaknesses: wEntries.sort(([, a], [, b]) => b - a).slice(0, 6),
        };
    }, [teamAnalysis, teamSize, colors, language]);

    useEffect(() => {
        if (!isOpen) return undefined;
        const onDocClick = (event) => {
            if (triggerRef.current?.contains(event.target) || popoverRef.current?.contains(event.target)) {
                return;
            }
            if (triggerRef.current || popoverRef.current) {
                setIsOpen(false);
            }
        };
        const onKey = (event) => { if (event.key === 'Escape') setIsOpen(false); };
        document.addEventListener('mousedown', onDocClick);
        document.addEventListener('touchstart', onDocClick);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDocClick);
            document.removeEventListener('touchstart', onDocClick);
            document.removeEventListener('keydown', onKey);
        };
    }, [isOpen]);

    if (teamSize === 0) return null;

    return (
        <div className="mt-2.5 flex justify-center">
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setIsOpen((v) => !v)}
                aria-expanded={isOpen}
                aria-label={t('builder.analysisTitle')}
                className="inline-flex items-center gap-2 rounded-full bg-surface-raised px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-fg transition-transform duration-200 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                style={{
                    border: `1px solid ${ratingColor}55`,
                }}
            >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ratingColor }} aria-hidden="true" />
                <span style={{ color: ratingColor }}>{rating}</span>
                <span className="opacity-70">·</span>
                <span className="text-success">{strengthCount}↑</span>
                <span className="text-danger">{weaknessCount}↓</span>
                <InfoIcon />
            </button>

            <AnchoredPopover
                isOpen={isOpen}
                anchorRef={triggerRef}
                popoverRef={popoverRef}
                role="dialog"
                ariaLabel={t('builder.analysisTitle')}
                className="w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-surface-raised bg-surface p-3 shadow-2xl"
                arrowStyle={{
                    backgroundColor: colors.card,
                    borderTop: `1px solid ${colors.cardLight}`,
                    borderLeft: `1px solid ${colors.cardLight}`,
                }}
            >
                <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
                        {language === 'pt' ? 'Resumo do Time' : 'Team Snapshot'}
                    </p>
                    <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                        style={{ backgroundColor: `${ratingColor}22`, color: ratingColor }}
                    >
                        {rating}
                    </span>
                </div>

                <div className="mb-2">
                    <p className="mb-1 text-[10px] font-semibold text-success">
                        {language === 'pt' ? 'Cobertura Ofensiva' : 'Offensive Coverage'} ({strengthCount})
                    </p>
                    <div className="flex flex-wrap gap-1">
                        {topStrengths.length > 0 ? topStrengths.map((type) => (
                            <TypeBadge key={type} type={type} colors={colors} />
                        )) : (
                            <span className="text-[11px] text-muted">{language === 'pt' ? 'Sem vantagens ainda.' : 'No advantages yet.'}</span>
                        )}
                    </div>
                </div>

                <div>
                    <p className="mb-1 text-[10px] font-semibold text-danger">
                        {language === 'pt' ? 'Fraquezas Defensivas' : 'Defensive Weaknesses'} ({weaknessCount})
                    </p>
                    <div className="flex flex-wrap items-center gap-1">
                        {topWeaknesses.length > 0 ? topWeaknesses.map(([type, score]) => (
                            <span key={type} className="inline-flex items-center gap-1">
                                <TypeBadge type={type} colors={colors} />
                                <span className="text-[10px] font-bold text-danger">×{score}</span>
                            </span>
                        )) : (
                            <span className="text-[11px] text-muted">{language === 'pt' ? 'Defesa sólida.' : 'Rock solid defence.'}</span>
                        )}
                    </div>
                </div>
            </AnchoredPopover>
        </div>
    );
};

const MobileTeamSlot = ({ pokemon, index, onEdit, onRemove }) => {
    const { t } = useTranslation();
    return (
        <div className="relative min-w-0">
            <button
                type="button"
                onClick={() => pokemon && onEdit?.(pokemon)}
                className={`team-builder-mobile-slot ${pokemon ? 'is-filled tb-type-ring' : 'is-empty'}`}
                style={pokemon ? typeVars(pokemon) : undefined}
                aria-label={pokemon ? `${t('common.edit')} ${pokemon.name}` : `Empty team slot ${index + 1}`}
                title={pokemon ? pokemon.name : `Empty slot ${index + 1}`}
            >
                {pokemon ? (
                    <Sprite src={getTeamPokemonDisplaySprite(pokemon, { animated: true })} artworkSrc={getPokemonArtworkSpriteUrl(pokemon.id)} alt={pokemon.name} className="h-9 w-9" />
                ) : (
                    <img
                        src={POKEBALL_PLACEHOLDER_URL}
                        alt=""
                        className="h-8 w-8 opacity-35"
                        aria-hidden="true"
                    />
                )}
            </button>

            {pokemon && (
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        onRemove?.(pokemon.instanceId);
                    }}
                    className="team-builder-mobile-slot__remove"
                    aria-label={`${t('common.remove')} ${pokemon.name}`}
                    title="Remove from team"
                >
                    <TrashIcon />
                </button>
            )}
        </div>
    );
};

export const MobileTeamBuilderView = ({
    currentTeam,
    teamName,
    setTeamName,
    handleRemoveFromTeam,
    handleSaveTeam,
    editingTeamId,
    activeTeamId,
    setActiveTeamId,
    handleClearTeam,
    recentTeams,
    onNavigateToTeams,
    handleToggleFavorite,
    handleEditTeam,
    requestDeleteTeam,
    handleShareTeam,
    handleExportToShowdown,
    teamAnalysis,
    searchInput,
    setSearchInput,
    selectedGeneration,
    setSelectedGeneration,
    selectedGame,
    setSelectedGame,
    games = [],
    generations,
    isInitialLoading,
    displayedPokemons,
    gamePokemonIds,
    synergySuggestions = [],
    addSuggestion,
    handleAddPokemonToTeam,
    handleRandomizeTeam,
    isRandomizing,
    lastPokemonElementRef,
    isFetchingMore,
    selectedTypes,
    handleTypeSelection,
    suggestedPokemonIds,
    colors,
    onEditTeamPokemon,
    favoritePokemons,
    onToggleFavoritePokemon,
    showOnlyFavorites,
    setShowOnlyFavorites,
}) => {
    const { t, language } = useTranslation();
    const [isGamePickerOpen, setIsGamePickerOpen] = React.useState(false);
    const [isCoresOpen, setIsCoresOpen] = React.useState(false);
    const [filtersExpanded, setFiltersExpanded] = React.useState(false);
    const { byId: smogonById } = useSmogonData();
    const { byId: usageById } = useCompetitiveUsage();
    const teamCores = React.useMemo(
        () => detectTeamCores(currentTeam.map((p) => p.id), { smogonById, usageById }),
        [currentTeam, smogonById, usageById]
    );
    const synergyReasonById = React.useMemo(
        () => new Map(synergySuggestions.map((s) => [s.id, s.primary])),
        [synergySuggestions]
    );

    // Synergy-only picks not in the displayed list, prepended to grid.
    const displayedIdSet = React.useMemo(() => new Set(displayedPokemons.map((p) => p.id)), [displayedPokemons]);
    const pokemonIndexById = React.useMemo(() => {
        const m = new Map();
        // displayedPokemons itself is the best source for index data
        for (const p of displayedPokemons) m.set(p.id, p);
        return m;
    }, [displayedPokemons]);
    const synergyOnlyCards = React.useMemo(() => {
        if (!synergySuggestions.length) return [];
        return synergySuggestions
            .filter((s) => !displayedIdSet.has(s.id))
            .map((s) => ({ ...s, _synergyOnly: true }));
    }, [synergySuggestions, displayedIdSet]);

    React.useEffect(() => {
        if (selectedTypes.size <= 1) return;
        const [, ...extraTypes] = Array.from(selectedTypes);
        extraTypes.forEach((type) => handleTypeSelection(type));
    }, [selectedTypes, handleTypeSelection]);

    const selectedTypeValue = selectedTypes.size > 0 ? Array.from(selectedTypes)[0] : 'all';

    const handleTypeSelectChange = (nextType) => {
        const activeTypes = Array.from(selectedTypes);

        activeTypes.forEach((type) => {
            if (nextType === 'all' || type !== nextType) {
                handleTypeSelection(type);
            }
        });

        if (nextType !== 'all' && !selectedTypes.has(nextType)) {
            handleTypeSelection(nextType);
        }
    };

    const isGameFilterActive = !!(selectedGame && selectedGame !== 'all' && gamePokemonIds);
    const selectedGameObj = React.useMemo(() => {
        return isGameFilterActive ? games.find((g) => g.key === selectedGame) : null;
    }, [games, selectedGame, isGameFilterActive]);
    const gameLabel = selectedGameObj ? selectedGameObj.label : selectedGame;

    // How many of the collapsible filters are currently narrowing the list —
    // surfaced as a badge on the toggle so users know filters are active even
    // while the panel is closed.
    const activeFilterCount =
        (selectedGeneration && selectedGeneration !== 'all' ? 1 : 0) +
        (isGameFilterActive ? 1 : 0) +
        (selectedTypes.size > 0 ? 1 : 0) +
        (showOnlyFavorites ? 1 : 0);

    const regionalPokemons = React.useMemo(() => {
        if (!isGameFilterActive) return [];
        return displayedPokemons.filter((p) => gamePokemonIds.has(p.id));
    }, [displayedPokemons, isGameFilterActive, gamePokemonIds]);

    const nationalPokemons = React.useMemo(() => {
        if (!isGameFilterActive) return [];
        return displayedPokemons.filter((p) => !gamePokemonIds.has(p.id));
    }, [displayedPokemons, isGameFilterActive, gamePokemonIds]);

    return (
        <div className="team-builder-mobile space-y-3">
            <div className="team-builder-mobile__sticky">
                <section className="team-builder-panel team-builder-mobile__composer p-3.5">
                    <div className="team-builder-panel__header flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div>
                                <p className="team-builder-panel__eyebrow">{language === 'pt' ? 'Escalação atual' : 'Current team'}</p>
                            </div>
                            {editingTeamId && (
                                editingTeamId === activeTeamId ? (
                                    <span className="home-active-badge flex items-center gap-1 text-[10px] font-bold text-primary px-2 py-0.5 rounded-full bg-primary-soft border border-primary-border shrink-0 self-center">★ {t('common.active')}</span>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setActiveTeamId(editingTeamId)}
                                        className="team-builder-button team-builder-button--inline team-builder-button--inline-compact text-[10px] uppercase font-bold tracking-wider"
                                        style={{ padding: '0.15rem 0.5rem', minHeight: 'auto', borderRadius: '4px' }}
                                    >
                                        {language === 'pt' ? 'Ativar' : 'Set Active'}
                                    </button>
                                )
                            )}
                        </div>
                        <span className="team-builder-panel__meta">{currentTeam.length}/6</span>
                    </div>

                    <div className="team-builder-mobile__composer-row mt-3">
                        <input
                            type="text"
                            value={teamName}
                            onChange={(event) => setTeamName(event.target.value)}
                            placeholder={t('builder.teamNamePlaceholder')}
                            className="team-builder-field min-w-0 flex-1"
                            aria-label={t('builder.teamNamePlaceholder')}
                        />
                        <button
                            type="button"
                            onClick={handleSaveTeam}
                            className="team-builder-icon-button team-builder-icon-button--primary"
                            aria-label={editingTeamId ? t('builder.updateTeam') : t('builder.saveTeam')}
                            title={editingTeamId ? t('builder.updateTeam') : t('builder.saveTeam')}
                        >
                            <Save className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            onClick={handleShareTeam}
                            className="team-builder-icon-button"
                            aria-label={t('builder.shareTeam')}
                            title={t('builder.shareTeam')}
                        >
                            <ShareIcon />
                        </button>
                        <button
                            type="button"
                            onClick={handleExportToShowdown}
                            className="team-builder-icon-button"
                            aria-label={t('builder.exportShowdown')}
                            title={t('builder.exportShowdown')}
                        >
                            <ShowdownIcon />
                        </button>
                        <button
                            type="button"
                            onClick={handleClearTeam}
                            className="team-builder-icon-button team-builder-icon-button--danger"
                            aria-label={t('builder.clearTeam')}
                            title={t('builder.clearTeam')}
                        >
                            <ClearIcon />
                        </button>
                    </div>

                    <div className="team-builder-mobile__slots mt-2.5">
                        {Array.from({ length: 6 }).map((_, index) => (
                            <MobileTeamSlot
                                key={currentTeam[index]?.instanceId ?? `mobile-slot-${index}`}
                                pokemon={currentTeam[index]}
                                index={index}
                                colors={colors}
                                onEdit={onEditTeamPokemon}
                                onRemove={handleRemoveFromTeam}
                            />
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={() => handleRandomizeTeam?.(displayedPokemons)}
                        disabled={isRandomizing || displayedPokemons.length === 0}
                        className="team-builder-button team-builder-button--secondary team-builder-randomize mt-2.5 w-full"
                        title={t('builder.randomizeTeam')}
                    >
                        <Dices className="h-4 w-4" />
                        {isRandomizing ? t('builder.randomizing') : t('builder.randomizeTeam')}
                    </button>

                    <TeamAnalysisChip
                        teamAnalysis={teamAnalysis}
                        teamSize={currentTeam.length}
                        colors={colors}
                    />
                </section>
            </div>

            <section className="team-builder-panel p-3.5">
                <div className="team-builder-mobile__filter-bar">
                    <div className="team-builder-mobile__search">
                        <Search className="team-builder-mobile__search-icon" aria-hidden="true" />
                        <input
                            type="text"
                            placeholder={t('pokedex.searchPlaceholder')}
                            value={searchInput}
                            onChange={(event) => setSearchInput(event.target.value)}
                            className="team-builder-field team-builder-mobile__search-field"
                            aria-label={t('common.search')}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={() => setFiltersExpanded((value) => !value)}
                        className={`team-builder-mobile__filter-toggle ${filtersExpanded ? 'is-open' : ''} ${activeFilterCount > 0 ? 'has-active' : ''}`}
                        aria-expanded={filtersExpanded}
                        aria-label={language === 'pt' ? 'Filtros' : 'Filters'}
                    >
                        <SlidersHorizontal className="h-4 w-4 shrink-0" />
                        {activeFilterCount > 0 && (
                            <span className="team-builder-mobile__filter-count">{activeFilterCount}</span>
                        )}
                        <ChevronDown className={`team-builder-mobile__filter-chevron h-4 w-4 shrink-0 ${filtersExpanded ? 'is-open' : ''}`} />
                    </button>
                </div>

                {filtersExpanded && (
                    <div className="team-builder-mobile__filters mt-3">
                        <label className="team-builder-control team-builder-mobile__filter-control">
                            <span className="team-builder-control__label">{t('pokedex.genFilterLabel')}</span>
                            <select
                                value={selectedGeneration}
                                onChange={(event) => setSelectedGeneration(event.target.value)}
                                className="team-builder-field team-builder-select"
                            >
                                <option value="all">{t('pokedex.allGens')}</option>
                                {generations.map((generation) => (
                                    <option key={generation} value={generation} className="capitalize">
                                        {generation.replace('-', ' ')}
                                    </option>
                                ))}
                            </select>
                        </label>

                        {games.length > 0 && setSelectedGame && (
                            <label className="team-builder-control team-builder-mobile__filter-control">
                                <span className="team-builder-control__label">{t('builder.gameFilterLabel')}</span>
                                <GameFilterChip
                                    games={games}
                                    selectedGame={selectedGame}
                                    onOpen={() => setIsGamePickerOpen(true)}
                                    className="w-full"
                                />
                            </label>
                        )}

                        <div className="team-builder-control team-builder-mobile__filter-control team-builder-mobile__filter-control--full">
                            <span className="team-builder-control__label">{t('pokedex.typesFilterLabel')}</span>
                            <div className="team-builder-mobile__filter-group">
                                <select
                                    value={selectedTypeValue}
                                    onChange={(event) => handleTypeSelectChange(event.target.value)}
                                    className="team-builder-field team-builder-select"
                                >
                                    <option value="all">{t('pokedex.allTypes')}</option>
                                    {Object.keys(typeIcons).map((type) => (
                                        <option key={type} value={type} className="capitalize">
                                            {t(`types.${type}`)}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                                    className={`team-builder-toggle team-builder-mobile__toggle-favorite ${showOnlyFavorites ? 'is-active' : ''}`}
                                    aria-pressed={showOnlyFavorites}
                                    title={t('pokedex.favoritesOnly')}
                                >
                                    <StarIcon className="w-5 h-5" isFavorite={showOnlyFavorites} color="currentColor" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </section>

            <section className="team-builder-panel p-3.5">
                <div className="team-builder-picker-cover-row mb-3">
                    <GameCoverBanner
                        games={games}
                        selectedGame={selectedGame}
                        onOpen={() => setIsGamePickerOpen(true)}
                        className="game-cover--compact"
                    />
                    <span className="team-builder-panel__meta shrink-0">
                        {displayedPokemons.length}
                    </span>
                </div>



                <button
                    type="button"
                    onClick={() => setIsCoresOpen(true)}
                    className="mt-2.5 flex w-full items-center gap-3 rounded-xl border border-border bg-bg p-2.5 text-left active:border-primary"
                >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15">
                        <Atom className="h-4 w-4 text-primary" />
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold text-fg">{language === 'pt' ? 'Core do Meta' : 'Meta Core'}</span>
                        <span className="mt-1 flex flex-wrap items-center gap-1">
                            {teamCores.length > 0 ? (
                                teamCores.slice(0, 3).map((c) => {
                                    const CIcon = coreIconFor(c.id);
                                    return (
                                        <span key={c.id} className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold" style={{ color: c.accent, backgroundColor: `${c.accent}22` }}>
                                            <CIcon className="h-3 w-3" />{c.name}
                                        </span>
                                    );
                                })
                            ) : (
                                <span className="text-[11px] text-muted">{language === 'pt' ? 'Toque para montar um core' : 'Tap to build a core'}</span>
                            )}
                            {teamCores.length > 3 && <span className="text-[10px] font-bold text-muted">+{teamCores.length - 3}</span>}
                        </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
                </button>

                <div className="team-builder-mobile__available mt-2">
                    {isInitialLoading ? (
                        <div className="team-builder-spinner-wrap h-full">
                            <div className="team-builder-spinner" aria-hidden="true" />
                        </div>
                    ) : (
                        <>
                            <div className="p-1 custom-scrollbar">
                                <div className="team-builder-mobile__grid grid grid-cols-3 gap-2">
                                    {/* Synergy-only picks (not in current filtered list) */}
                                    {synergyOnlyCards.map((pokemon) => (
                                        <MobilePokemonPickerCard
                                            key={`syn-${pokemon.id}`}
                                            pokemon={pokemon}
                                            onAddToTeam={handleAddPokemonToTeam}
                                            synergyReason={pokemon.primary}
                                            isFavorite={favoritePokemons.has(pokemon.id)}
                                            onToggleFavorite={onToggleFavoritePokemon}
                                            colors={colors}
                                        />
                                    ))}
                                    {isGameFilterActive ? (
                                        <>
                                            {regionalPokemons.length > 0 && (
                                                <>
                                                    <h4 className="pokedex-section-title pokedex-section-title--mobile">
                                                        {t('builder.regionalDex', { game: gameLabel })}
                                                    </h4>
                                                    {regionalPokemons.map((pokemon, index) => (
                                                        <MobilePokemonPickerCard
                                                            key={pokemon.id}
                                                            pokemon={pokemon}
                                                            onAddToTeam={handleAddPokemonToTeam}
                                                            synergyReason={synergyReasonById.get(pokemon.id)}
                                                            isSuggested={synergyReasonById.has(pokemon.id)}
                                                            isFavorite={favoritePokemons.has(pokemon.id)}
                                                            onToggleFavorite={onToggleFavoritePokemon}
                                                            colors={colors}
                                                            lastRef={index === regionalPokemons.length - 1 && nationalPokemons.length === 0 ? lastPokemonElementRef : null}
                                                        />
                                                    ))}
                                                </>
                                            )}
                                            {nationalPokemons.length > 0 && (
                                                <>
                                                    <h4 className="pokedex-section-title pokedex-section-title--national pokedex-section-title--mobile">
                                                        {t('builder.nationalDex')}
                                                    </h4>
                                                    {nationalPokemons.map((pokemon, index) => (
                                                        <MobilePokemonPickerCard
                                                            key={pokemon.id}
                                                            pokemon={pokemon}
                                                            onAddToTeam={handleAddPokemonToTeam}
                                                            synergyReason={synergyReasonById.get(pokemon.id)}
                                                            isSuggested={synergyReasonById.has(pokemon.id)}
                                                            isFavorite={favoritePokemons.has(pokemon.id)}
                                                            onToggleFavorite={onToggleFavoritePokemon}
                                                            colors={colors}
                                                            lastRef={index === nationalPokemons.length - 1 ? lastPokemonElementRef : null}
                                                        />
                                                    ))}
                                                </>
                                            )}
                                        </>
                                    ) : (
                                        displayedPokemons.map((pokemon, index) => (
                                            <MobilePokemonPickerCard
                                                key={pokemon.id}
                                                pokemon={pokemon}
                                                onAddToTeam={handleAddPokemonToTeam}
                                                synergyReason={synergyReasonById.get(pokemon.id)}
                                                isSuggested={synergyReasonById.has(pokemon.id)}
                                                isFavorite={favoritePokemons.has(pokemon.id)}
                                                onToggleFavorite={onToggleFavoritePokemon}
                                                colors={colors}
                                                lastRef={index === displayedPokemons.length - 1 ? lastPokemonElementRef : null}
                                            />
                                        ))
                                    )}
                                </div>

                                {isFetchingMore && (
                                    <div className="team-builder-spinner-wrap py-4">
                                        <div className="team-builder-spinner team-builder-spinner--small" aria-hidden="true" />
                                    </div>
                                )}

                                {displayedPokemons.length === 0 && (
                                    <div className="pt-6">
                                        <EmptyState
                                            compact
                                            title={showOnlyFavorites ? t('favorites.noMatchesTitle') : t('pokedex.noPokemonFound')}
                                            message={showOnlyFavorites ? t('favorites.noMatchesDesc') : t('favorites.noMatchesDesc')}
                                        />
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </section>

            {currentTeam.length > 0 && (
                <section className="team-builder-panel p-3.5 animate-fade-in" aria-label="Team analysis">
                    <div className="flex items-center justify-between gap-2 mb-3">
                        <div>
                            <p className="team-builder-panel__eyebrow">{language === 'pt' ? 'Análise' : 'Analysis'}</p>
                            <h3 className="team-builder-panel__title team-builder-panel__title--small mt-2">{t('builder.analysisTitle')}</h3>
                        </div>
                        <span className="text-[10px] text-muted">
                            {language === 'pt' ? 'toque no botão acima para detalhes' : 'tap chip above for details'}
                        </span>
                    </div>

                    <div className="team-builder-analysis-grid">
                        <div className="team-builder-analysis-card">
                            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-success">
                                {language === 'pt' ? 'Vantagens' : 'Strengths'} · {teamAnalysis.strengths.size}
                            </p>
                            <div className="flex flex-wrap gap-1">
                                {teamAnalysis.strengths.size > 0 ? Array.from(teamAnalysis.strengths).sort().slice(0, 8).map((type) => (
                                    <TypeBadge key={type} type={type} colors={colors} />
                                )) : (
                                    <span className="text-[11px] text-muted">{language === 'pt' ? 'Nenhuma ainda.' : 'None yet.'}</span>
                                )}
                            </div>
                        </div>

                        <div className="team-builder-analysis-card">
                            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-danger">
                                {language === 'pt' ? 'Fraquezas' : 'Weaknesses'} · {Object.keys(teamAnalysis.weaknesses).length}
                            </p>
                            <div className="flex flex-wrap items-center gap-1">
                                {Object.keys(teamAnalysis.weaknesses).length > 0 ? Object.entries(teamAnalysis.weaknesses)
                                    .sort(([, a], [, b]) => b - a)
                                    .slice(0, 8)
                                    .map(([type, score]) => (
                                        <span key={type} className="inline-flex items-center gap-0.5">
                                            <TypeBadge type={type} colors={colors} />
                                            <span className="text-[10px] font-bold text-danger">×{score}</span>
                                        </span>
                                    )) : (
                                    <span className="text-[11px] text-muted">{language === 'pt' ? 'Sólido como rocha.' : 'Rock solid.'}</span>
                                )}
                            </div>
                        </div>
                    </div>
                </section>
            )}

            <section className="team-builder-panel p-4">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="team-builder-panel__eyebrow">{language === 'pt' ? 'Trabalho salvo' : 'Saved work'}</p>
                        <h3 className="team-builder-panel__title team-builder-panel__title--small mt-2">
                            {language === 'pt' ? 'Retomar equipe salva' : 'Resume a saved lineup'}
                        </h3>
                    </div>
                    <button
                        type="button"
                        onClick={onNavigateToTeams}
                        className="team-builder-button team-builder-button--inline team-builder-button--inline-compact"
                    >
                        {t('home.seeAll')}
                    </button>
                </div>

                <div className="mt-3 space-y-2.5">
                    {recentTeams.length > 0 ? recentTeams.map((team) => (
                        <div
                            key={team.id}
                            className="team-builder-mobile__recent-card"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-base font-bold text-fg">
                                        {team.name}
                                    </p>
                                    <div className="mt-2 flex">
                                        {team.pokemons.map((pokemon) => (
                                            <img
                                                key={pokemon.instanceId || `${team.id}-${pokemon.id}`}
                                                src={getTeamPokemonDisplaySprite(pokemon)}
                                                alt={pokemon.name}
                                                className="-ml-2 h-9 w-9 rounded-full border-2 border-bg bg-surface first:ml-0"
                                                onError={(event) => { event.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => handleToggleFavorite(team)}
                                    className={`team-builder-icon-button ${team.isFavorite ? 'team-builder-icon-button--accent' : ''}`}
                                    aria-label={team.isFavorite ? (language === 'pt' ? `Remover ${team.name} dos favoritos` : `Remove ${team.name} from favorites`) : (language === 'pt' ? `Favoritar ${team.name}` : `Favorite ${team.name}`)}
                                >
                                    <StarIcon isFavorite={team.isFavorite} color="currentColor" />
                                </button>
                            </div>

                            <div className="mt-3 flex gap-2">
                                {(() => {
                                    const isActive = team.id === activeTeamId || (activeTeamId === null && recentTeams[0]?.id === team.id);
                                    return (
                                        <button
                                            type="button"
                                            onClick={() => setActiveTeamId(isActive ? null : team.id)}
                                            className={`team-builder-button team-builder-button--grow ${isActive ? 'team-builder-button--primary' : 'team-builder-button--secondary'} text-xs`}
                                            style={isActive ? { backgroundColor: 'var(--color-success)', borderColor: 'var(--color-success)', color: '#fff' } : undefined}
                                        >
                                            {isActive ? `★ ${t('common.active')}` : (language === 'pt' ? 'Ativar' : 'Set Active')}
                                        </button>
                                    );
                                })()}
                                <button
                                    type="button"
                                    onClick={() => handleEditTeam(team)}
                                    className="team-builder-button team-builder-button--secondary team-builder-button--grow"
                                >
                                    {t('common.edit')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => requestDeleteTeam(team.id, team.name)}
                                    className="team-builder-button team-builder-button--secondary !text-danger"
                                >
                                    {t('common.delete')}
                                </button>
                            </div>
                        </div>
                    )) : (
                        <p className="team-builder-empty-note text-sm">
                            {language === 'pt' ? 'Nenhum time recente ainda.' : 'No recent teams yet.'}
                        </p>
                    )}
                </div>
            </section>

            <GamePickerModal
                isOpen={isGamePickerOpen}
                onClose={() => setIsGamePickerOpen(false)}
                games={games}
                selectedGame={selectedGame}
                onSelectGame={setSelectedGame}
            />

            {isCoresOpen && (
                <MetaCoresModal
                    onClose={() => setIsCoresOpen(false)}
                    currentTeam={currentTeam}
                    onAddToTeam={handleAddPokemonToTeam}
                />
            )}
        </div>
    );
};