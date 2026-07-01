import React from 'react';
import { ChevronDown } from 'lucide-react';
import '../../styles/team-builder-view.css';
import { POKEBALL_PLACEHOLDER_URL } from '../../constants/theme';
import { typeColors, typeIcons } from '../../constants/types';
import { getTeamPokemonDisplaySprite, getPokemonArtworkSpriteUrl, getPokemonFrontSpriteUrl } from '../../utils/pokemonSprites';
import { EmptyState } from '../EmptyState';
import { MobileTeamBuilderView } from './MobileTeamBuilderView';
import { GameCoverBanner, GameFilterChip, GamePickerModal } from '../GameCover';
import { Dices } from 'lucide-react';
import { PokemonDetailModal } from '../modals/PokemonDetailModal';
import { PokemonCard } from '../PokemonCard';
import { Sprite } from '../Sprite';
import { TeamIdentitySummary } from '../TeamIdentitySummary';
import { TypeBadge } from '../TypeBadge';
import { MetaCoresModal } from '../modals/MetaCoresModal';
import { Atom } from 'lucide-react';
import { coreIconFor } from '../coreIcons';
import { detectTeamCores } from '../../utils/metaCores';
import { buildSynergySuggestions } from '../../utils/synergySuggestions';
import { buildGameSections } from '../../utils/gameDex';
// SynergySuggestions strip removed — synergy picks now appear in-grid
import { useSmogonData } from '../../hooks/useSmogonData';
import { useCompetitiveUsage } from '../../hooks/useCompetitiveUsage';
import { useTranslation } from '../../hooks/useTranslation';
import { useTournamentData } from '../../hooks/useTournamentData';
import { useReferenceStore } from '../../store/useReferenceStore';
import { useMegaStones, megaFormFor, megaDisplayName } from '../../hooks/useMegaStones';
import { useMetaUsage } from '../../hooks/useMetaUsage';
import {
    ClearIcon,
    EditIcon,
    SaveIcon,
    ShareIcon,
    ShowdownIcon,
    StarIcon,
    TrashIcon,
    TrophyIcon,
} from '../icons';

// Convert a hex color (#rgb or #rrggbb) to an rgba() string with the given alpha.
function hexToRgba(hex, alpha) {
    if (typeof hex !== 'string') return `rgba(119,119,119,${alpha})`;
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    if ([r, g, b].some(Number.isNaN)) return `rgba(119,119,119,${alpha})`;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Inline CSS custom properties driving the per-type disc/ring behind a team
// member's sprite. Falls back to a single colour for mono-type Pokémon.
export function typeDiscStyle(pokemon) {
    const types = pokemon?.types || [];
    const a = typeColors[types[0]] || '#6390F0';
    const b = typeColors[types[1]] || a;
    return { '--type-a': a, '--type-b': b };
}

function AnalysisTypeBadge({ type }) {
    const { t } = useTranslation();
    const typeLower = type.toLowerCase();
    const color = typeColors[typeLower] || '#777';
    const icon = typeIcons[typeLower];

    return (
        <span
            className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-md border"
            style={{
                backgroundColor: hexToRgba(color, 0.13),
                borderColor: hexToRgba(color, 0.55),
                color,
            }}
        >
            {icon && <img src={icon} alt="" className="w-3 h-3 object-contain shrink-0" aria-hidden="true" />}
            <span className="leading-none">{t(`types.${typeLower}`, { defaultValue: type }).toUpperCase()}</span>
        </span>
    );
}

export function TeamBuilderView({
    currentTeam,
    teamName,
    setTeamName,
    handleRemoveFromTeam,
    handleReorderTeam,
    handleSaveTeam,
    editingTeamId,
    activeTeamId,
    setActiveTeamId,
    handleClearTeam,
    recentTeams,
    onNavigateToTeams,
    handleToggleFavorite,
    handleEditTeam,
    handleShareTeam,
    requestDeleteTeam,
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
    availablePokemons,
    gamePokemonIds,
    gameDexes,
    handleAddPokemonToTeam,
    handleRandomizeTeam,
    isRandomizing,
    lastPokemonElementRef,
    isFetchingMore,
    selectedTypes,
    handleTypeSelection,
    showDetails,
    suggestedPokemonIds,
    colors,
    onEditTeamPokemon,
    favoritePokemons,
    onToggleFavoritePokemon,
    showOnlyFavorites,
    setShowOnlyFavorites,
    db,
    fetchPokemonDetails,
    pokemonDetailsCache = {},
    setPokemonDetailsCache,
}) {
    const { t, language } = useTranslation();
    const [dragIndex, setDragIndex] = React.useState(null);
    const [isGamePickerOpen, setIsGamePickerOpen] = React.useState(false);
    const [isCoresOpen, setIsCoresOpen] = React.useState(false);
    const [isDesktopLayout, setIsDesktopLayout] = React.useState(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
            return false;
        }
        return window.matchMedia('(min-width: 1024px)').matches;
    });

    React.useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
            return undefined;
        }

        const desktopMediaQuery = window.matchMedia('(min-width: 1024px)');
        const handleDesktopLayoutChange = (event) => {
            setIsDesktopLayout(event.matches);
        };

        setIsDesktopLayout(desktopMediaQuery.matches);

        if (typeof desktopMediaQuery.addEventListener === 'function') {
            desktopMediaQuery.addEventListener('change', handleDesktopLayoutChange);
            return () => {
                desktopMediaQuery.removeEventListener('change', handleDesktopLayoutChange);
            };
        }

        desktopMediaQuery.addListener(handleDesktopLayoutChange);
        return () => {
            desktopMediaQuery.removeListener(handleDesktopLayoutChange);
        };
    }, []);

    // Collapsible picker header — keep type filter + search always visible, tuck
    // the rest (generation, game, favorites, tournament partners) behind a chevron.
    const [filtersExpanded, setFiltersExpanded] = React.useState(() => {
        if (typeof window === 'undefined') return false;
        return window.localStorage.getItem('tb-filters-expanded') === '1';
    });
    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            window.localStorage.setItem('tb-filters-expanded', filtersExpanded ? '1' : '0');
        }
    }, [filtersExpanded]);

    const displayedPokemons = showOnlyFavorites
        ? availablePokemons.filter((pokemon) => favoritePokemons.has(pokemon.id))
        : availablePokemons;
    const selectedTypeCount = selectedTypes.size;
    const hasActiveFilters = (selectedGeneration && selectedGeneration !== 'all')
        || (selectedGame && selectedGame !== 'all')
        || showOnlyFavorites;

    // Tournament partner suggestions: Pokémon most often built alongside the
    // current team (weighted toward the last-added one), drawn from the FULL
    // index — not just the Pokémon currently visible in the picker.
    const pokemonIndex = useReferenceStore((s) => s.pokemonIndex);
    const fetchPokemonIndex = useReferenceStore((s) => s.fetchPokemonIndex);
    const { partnersFor, status: tournamentStatus, popular, synergy } = useTournamentData();
    const { byId: smogonById } = useSmogonData();
    const { byId: usageById } = useCompetitiveUsage();
    // Real Smogon ladder usage for the current regulation — drives the "meta" signal.
    const { ranked: metaRanked, usageMap: metaUsageMap } = useMetaUsage();

    React.useEffect(() => { fetchPokemonIndex(); }, [fetchPokemonIndex]);

    // Which meta core(s) the current roster already commits to (has a setter for).
    const teamCores = React.useMemo(
        () => detectTeamCores(currentTeam.map((p) => p.id), { smogonById, usageById }),
        [currentTeam, smogonById, usageById]
    );

    // Team-aware synergy suggestions: by ability/core, tournament partner, and
    // type coverage — ranked across the whole relevant dex, reactive to the team.
    const synergySuggestions = React.useMemo(() => {
        if (currentTeam.length >= 6) return [];
        // When a game filter is active, keep suggestions to that game's obtainable
        // Pokémon so they respect in-game availability (types/weather cores still rank).
        const allowedIds = (selectedGame && selectedGame !== 'all' && gamePokemonIds) ? gamePokemonIds : null;
        return buildSynergySuggestions({
            team: currentTeam,
            pokemonIndex,
            synergy,
            smogonById,
            usageById,
            popular: metaRanked.length ? metaRanked : popular,
            metaUsage: metaUsageMap,
            limit: 20,
            allowedIds,
        });
    }, [currentTeam, pokemonIndex, synergy, smogonById, usageById, popular, metaRanked, metaUsageMap, selectedGame, gamePokemonIds]);

    const suggestionIndexById = React.useMemo(() => new Map(pokemonIndex.map((p) => [p.id, p])), [pokemonIndex]);
    const addSuggestion = React.useCallback(
        (s) => handleAddPokemonToTeam(suggestionIndexById.get(s.id) || s),
        [handleAddPokemonToTeam, suggestionIndexById]
    );
    // Map synergy id → primary reason for in-grid border/icon rendering.
    const synergyReasonById = React.useMemo(
        () => new Map(synergySuggestions.map((s) => [s.id, s.primary])),
        [synergySuggestions]
    );

    // Synergy-only picks that aren't already in the displayed list, prepended as
    // enriched cards at the top of the grid so the user sees them immediately.
    const displayedIdSet = React.useMemo(() => new Set(displayedPokemons.map((p) => p.id)), [displayedPokemons]);
    const synergyOnlyCards = React.useMemo(() => {
        // While searching, surface the matching Pokémon first — don't prepend
        // synergy suggestions ahead of the actual search results.
        if (searchInput.trim() || !synergySuggestions.length) return [];
        return synergySuggestions
            .filter((s) => !displayedIdSet.has(s.id) && suggestionIndexById.has(s.id))
            .map((s) => ({ ...suggestionIndexById.get(s.id), ...s, _synergyOnly: true }));
    }, [synergySuggestions, displayedIdSet, suggestionIndexById, searchInput]);

    const megaStones = useMegaStones();

    const isGameFilterActive = !!(selectedGame && selectedGame !== 'all' && gamePokemonIds);
    const selectedGameObj = React.useMemo(() => {
        return isGameFilterActive ? games.find((g) => g.key === selectedGame) : null;
    }, [games, selectedGame, isGameFilterActive]);
    const gameLabel = selectedGameObj ? selectedGameObj.label : selectedGame;

    // When a game is selected, show ONLY that game's obtainable Pokémon: its real
    // sub-dexes in regional ORDER, each base species followed inline by its legal
    // battle forms (Mega X/Y…), then a National Pokédex section. Resolved from the
    // full index so the whole dex shows regardless of pagination; search / type /
    // favourites still filter every entry.
    const gameSections = React.useMemo(() => {
        if (!isGameFilterActive || !gameDexes) return null;
        const search = (searchInput || '').toLowerCase().trim();
        const typeList = [...selectedTypes];
        const matches = (entry) => {
            if (!entry) return false;
            if (showOnlyFavorites && !favoritePokemons.has(entry.id)) return false;
            if (selectedGeneration && selectedGeneration !== 'all' && entry.generation !== selectedGeneration) return false;
            if (typeList.length && !typeList.some((tp) => (entry.types || []).includes(tp))) return false;
            if (search && !entry.name.toLowerCase().includes(search)) return false;
            return true;
        };
        return buildGameSections({ fullIndex: pokemonIndex, gameDexes, game: selectedGameObj, matches });
    }, [isGameFilterActive, gameDexes, selectedGameObj, pokemonIndex, searchInput, selectedTypes, showOnlyFavorites, selectedGeneration, favoritePokemons]);

    const gameVisibleCount = React.useMemo(
        () => (gameSections ? gameSections.reduce((n, s) => n + s.mons.length, 0) : 0),
        [gameSections]
    );

    // Picker cards open a detail MODAL (not the fullscreen page). Show immediately
    // with the list data, then enrich with full stats/abilities once they resolve.
    const [detailPokemon, setDetailPokemon] = React.useState(null);
    const openDetailModal = React.useCallback(async (pokemon) => {
        if (pokemon?.id == null) return;
        setDetailPokemon(pokemon);
        if (typeof fetchPokemonDetails !== 'function') return;
        const full = await fetchPokemonDetails(pokemon.id);
        if (full) {
            setDetailPokemon((cur) => (cur && cur.id === pokemon.id ? { ...pokemon, ...full } : cur));
        }
    }, [fetchPokemonDetails]);

    return (
        <>
            {!isDesktopLayout ? (
                <MobileTeamBuilderView
                    currentTeam={currentTeam}
                    teamName={teamName}
                    setTeamName={setTeamName}
                    handleRemoveFromTeam={handleRemoveFromTeam}
                    handleSaveTeam={handleSaveTeam}
                    editingTeamId={editingTeamId}
                    activeTeamId={activeTeamId}
                    setActiveTeamId={setActiveTeamId}
                    handleClearTeam={handleClearTeam}
                    recentTeams={recentTeams}
                    onNavigateToTeams={onNavigateToTeams}
                    handleToggleFavorite={handleToggleFavorite}
                    handleEditTeam={handleEditTeam}
                    requestDeleteTeam={requestDeleteTeam}
                    handleShareTeam={handleShareTeam}
                    handleExportToShowdown={handleExportToShowdown}
                    teamAnalysis={teamAnalysis}
                    searchInput={searchInput}
                    setSearchInput={setSearchInput}
                    selectedGeneration={selectedGeneration}
                    setSelectedGeneration={setSelectedGeneration}
                    selectedGame={selectedGame}
                    setSelectedGame={setSelectedGame}
                    games={games}
                    generations={generations}
                    isInitialLoading={isInitialLoading}
                    displayedPokemons={displayedPokemons}
                    gamePokemonIds={gamePokemonIds}
                    gameDexes={gameDexes}
                    synergySuggestions={synergySuggestions}
                    addSuggestion={addSuggestion}
                    handleAddPokemonToTeam={handleAddPokemonToTeam}
                    handleRandomizeTeam={handleRandomizeTeam}
                    isRandomizing={isRandomizing}
                    lastPokemonElementRef={lastPokemonElementRef}
                    isFetchingMore={isFetchingMore}
                    selectedTypes={selectedTypes}
                    onToggleFavoritePokemon={onToggleFavoritePokemon}
                    handleTypeSelection={handleTypeSelection}
                    showDetails={openDetailModal}
                    suggestedPokemonIds={suggestedPokemonIds}
                    colors={colors}
                    onEditTeamPokemon={onEditTeamPokemon}
                    favoritePokemons={favoritePokemons}
                    showOnlyFavorites={showOnlyFavorites}
                    setShowOnlyFavorites={setShowOnlyFavorites}
                />
            ) : null}

            {isDesktopLayout ? <main className="team-builder grid grid-cols-12 gap-6 xl:gap-7">
                <div className="lg:col-span-3 space-y-6 lg:sticky lg:top-6 lg:self-start">
                    <button
                        type="button"
                        onClick={() => setIsCoresOpen(true)}
                        className="team-builder-panel flex w-full items-center gap-2.5 p-3 text-left transition-all hover:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        title={language === 'pt' ? 'Montar a partir de um core do meta' : 'Build around a meta core'}
                    >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15">
                            <Atom className="h-4 w-4 text-primary" />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block text-[11px] font-bold uppercase tracking-wider text-muted">{language === 'pt' ? 'Core do Meta' : 'Meta Core'}</span>
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
                                    <span className="inline-flex items-center gap-1 rounded-full bg-surface-raised px-1.5 py-0.5 text-[10px] font-semibold text-muted">
                                        {language === 'pt' ? 'Nenhum core ainda' : 'No core yet'}
                                    </span>
                                )}
                                {teamCores.length > 3 && <span className="text-[10px] font-bold text-muted">+{teamCores.length - 3}</span>}
                            </span>
                        </span>
                        <ChevronDown className="h-4 w-4 shrink-0 -rotate-90 text-muted" />
                    </button>
                    <section className="team-builder-panel p-4">
                        <div className="team-builder-current-head">
                            <div className="team-builder-panel__header team-builder-panel__header--compact flex items-center justify-between gap-3 mb-4">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <input
                                        id="team-builder-name"
                                        type="text"
                                        value={teamName}
                                        onChange={(e) => setTeamName(e.target.value)}
                                        placeholder={t('builder.teamNamePlaceholder')}
                                        className="team-builder-header-input font-bold text-base text-fg focus:outline-none focus:ring-0 m-0 w-full truncate"
                                        aria-label={language === 'pt' ? 'Nome do time' : 'Team name'}
                                    />
                                    {editingTeamId && (
                                        editingTeamId === activeTeamId ? (
                                            <span className="home-active-badge flex items-center gap-1 text-[11px] font-bold text-primary px-2 py-0.5 rounded-full bg-primary-soft border border-primary-border shrink-0 self-center">★ {t('common.active')}</span>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => setActiveTeamId(editingTeamId)}
                                                className="team-builder-button team-builder-button--inline team-builder-button--inline-compact text-[11px] rounded-xl uppercase font-bold tracking-wider shrink-0"
                                                style={{ padding: '0.25rem 0.5rem', minHeight: 'auto', borderRadius: '12px  ' }}
                                            >
                                                {language === 'pt' ? 'Ativar' : 'Set Active'}
                                            </button>
                                        )
                                    )}
                                </div>
                                <span className="team-builder-panel__meta team-builder-panel__meta--compact shrink-0">{currentTeam.length}/6</span>
                            </div>
                        </div>

                        <div className="team-builder-slots" aria-label="Current team slots">
                            {currentTeam.map((pokemon, idx) => {
                                // A held mega stone morphs the slot into its Mega form (sprite/name/types).
                                const mega = megaFormFor(pokemon, megaStones);
                                return (
                                <div
                                    key={pokemon.instanceId}
                                    className={`team-builder-slot group ${dragIndex === idx ? 'is-dragging' : ''}`}
                                    draggable
                                    tabIndex={0}
                                    role="button"
                                    aria-label={`${pokemon.name}, slot ${idx + 1} of ${currentTeam.length}. Drag to reorder, or hold Alt and press Arrow keys.`}
                                    onClick={() => onEditTeamPokemon(pokemon)}
                                    onKeyDown={(e) => {
                                        if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowUp')) {
                                            e.preventDefault();
                                            handleReorderTeam?.(idx, Math.max(0, idx - 1));
                                        } else if (e.altKey && (e.key === 'ArrowRight' || e.key === 'ArrowDown')) {
                                            e.preventDefault();
                                            handleReorderTeam?.(idx, Math.min(currentTeam.length - 1, idx + 1));
                                        } else if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            onEditTeamPokemon(pokemon);
                                        }
                                    }}
                                    onDragStart={(e) => {
                                        setDragIndex(idx);
                                        e.dataTransfer.effectAllowed = 'move';
                                        e.dataTransfer.setData('text/plain', String(idx));
                                    }}
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        e.dataTransfer.dropEffect = 'move';
                                    }}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        const from = Number(e.dataTransfer.getData('text/plain'));
                                        if (!Number.isNaN(from)) handleReorderTeam?.(from, idx);
                                        setDragIndex(null);
                                    }}
                                    onDragEnd={() => setDragIndex(null)}
                                >
                                    <div className="team-builder-slot__media tb-type-disc" style={typeDiscStyle(mega ? { types: mega.types } : pokemon)}>
                                        <Sprite
                                            src={mega ? getPokemonFrontSpriteUrl(mega.spriteId) : getTeamPokemonDisplaySprite(pokemon, { animated: true })}
                                            artworkSrc={getPokemonArtworkSpriteUrl(mega ? mega.spriteId : pokemon.id)}
                                            alt={mega ? megaDisplayName(mega.form) : pokemon.name}
                                            className="w-full h-full"
                                        />
                                    </div>
                                    <p className="team-builder-slot__name">{mega ? megaDisplayName(mega.form) : pokemon.name}</p>

                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEditTeamPokemon(pokemon);
                                        }}
                                        aria-label={`Edit ${pokemon.name}`}
                                        className="team-builder-slot__control team-builder-slot__control--edit"
                                    >
                                        <EditIcon />
                                    </button>

                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveFromTeam(pokemon.instanceId);
                                        }}
                                        aria-label={`${t('common.remove')} ${pokemon.name}`}
                                        className="team-builder-slot__control team-builder-slot__control--remove"
                                    >
                                        <TrashIcon />
                                    </button>
                                </div>
                                );
                            })}

                            {Array.from({ length: 6 - currentTeam.length }).map((_, index) => (
                                <div key={index} className="team-builder-slot team-builder-slot--empty" aria-hidden="true">
                                    <img src={POKEBALL_PLACEHOLDER_URL} alt="Empty team slot" />
                                </div>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={() => handleRandomizeTeam?.(displayedPokemons)}
                            disabled={isRandomizing || displayedPokemons.length === 0}
                            className="team-builder-button team-builder-button--secondary team-builder-button--grow team-builder-randomize mt-3 w-full"
                            title={t('builder.randomizeTeam')}
                        >
                            <Dices className="h-4 w-4" />
                            {isRandomizing ? t('builder.randomizing') : t('builder.randomizeTeam')}
                        </button>

                        <TeamIdentitySummary team={currentTeam} />

                        <div className="team-builder-action-row">
                            <button type="button" onClick={handleSaveTeam} className="team-builder-button team-builder-button--primary team-builder-button--grow">
                                <SaveIcon />
                                {editingTeamId ? t('builder.updateTeam') : t('builder.saveTeam')}
                            </button>
                            <button onClick={handleExportToShowdown} type="button" aria-label="Export team to Pokémon Showdown" className="team-builder-icon-button" title={t('builder.exportShowdown')}><ShowdownIcon /></button>
                            <button onClick={handleShareTeam} type="button" aria-label="Share team" className="team-builder-icon-button" title={t('builder.shareTeam')}><ShareIcon /></button>
                            <button onClick={handleClearTeam} type="button" aria-label="Clear team" className="team-builder-icon-button team-builder-icon-button--danger" title={t('builder.clearTeam')}><ClearIcon /></button>
                        </div>
                    </section>

                    <section className="team-builder-panel p-4">
                        <div className="team-builder-panel__header team-builder-panel__header--compact">
                            <h3 className="team-builder-panel__title team-builder-panel__title--compact">{t('builder.analysisTitle')}</h3>
                        </div>

                        <div className="team-builder-analysis-grid mt-4">
                            <div className="team-builder-analysis-card">
                                <h4 className="team-builder-analysis-card__title team-builder-analysis-card__title--success">{language === 'pt' ? 'Cobertura Ofensiva' : 'Offensive coverage'}</h4>
                                <div className="flex flex-wrap gap-1.5">
                                    {currentTeam.length > 0
                                        ? (teamAnalysis.strengths.size > 0
                                            ? Array.from(teamAnalysis.strengths).sort().map((type) => <AnalysisTypeBadge key={type} type={type} colors={colors} />)
                                            : <p className="team-builder-empty-note !p-0 text-xs">{language === 'pt' ? 'Nenhuma vantagem de tipo encontrada.' : 'No type advantages found.'}</p>)
                                        : <p className="team-builder-empty-note !p-0 text-xs">{language === 'pt' ? 'Adicione Pokémon para ver a cobertura.' : 'Add Pokemon to preview your coverage.'}</p>}
                                </div>
                            </div>

                            <div className="team-builder-analysis-card">
                                <h4 className="team-builder-analysis-card__title team-builder-analysis-card__title--success">{language === 'pt' ? 'Cobertura Defensiva' : 'Defensive coverage'}</h4>
                                <div className="flex flex-wrap gap-1.5">
                                    {currentTeam.length > 0
                                        ? (teamAnalysis.defensiveCoverage && Object.keys(teamAnalysis.defensiveCoverage).length > 0
                                            ? Object.entries(teamAnalysis.defensiveCoverage).sort(([, a], [, b]) => b - a).map(([type, count]) => (
                                                <div key={type} className="flex items-center gap-1">
                                                    <AnalysisTypeBadge type={type} colors={colors} />
                                                    {count > 1 && (
                                                        <span className="team-builder-analysis-score team-builder-analysis-score--success">({count}x)</span>
                                                    )}
                                                </div>
                                            ))
                                            : <p className="team-builder-empty-note !p-0 text-xs">{language === 'pt' ? 'Nenhuma cobertura defensiva.' : 'No defensive coverage.'}</p>)
                                        : <p className="team-builder-empty-note !p-0 text-xs">{language === 'pt' ? 'Cobertura defensiva aparece após a primeira escolha.' : 'Defensive coverage appears after the first pick.'}</p>}
                                </div>
                            </div>

                            <div className="team-builder-analysis-card">
                                <h4 className="team-builder-analysis-card__title team-builder-analysis-card__title--danger">{language === 'pt' ? 'Fraquezas Defensivas' : 'Defensive weaknesses'}</h4>
                                <div className="flex flex-wrap gap-1.5">
                                    {currentTeam.length > 0
                                        ? (Object.keys(teamAnalysis.weaknesses).length > 0
                                            ? Object.entries(teamAnalysis.weaknesses).sort(([, a], [, b]) => b - a).map(([type, score]) => (
                                                <div key={type} className="flex items-center gap-1">
                                                    <AnalysisTypeBadge type={type} colors={colors} />
                                                    <span className="team-builder-analysis-score">({score}x)</span>
                                                </div>
                                            ))
                                            : <p className="team-builder-empty-note !p-0 text-xs">{language === 'pt' ? 'Seu time é sólido como rocha.' : 'Your team is rock solid.'}</p>)
                                        : <p className="team-builder-empty-note !p-0 text-xs">{language === 'pt' ? 'Fraquezas aparecem após a primeira escolha.' : 'Weaknesses appear after the first pick.'}</p>}
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                <div className="lg:col-span-9 space-y-6">
                    <section className="team-builder-panel team-builder-panel--picker p-4">
                        <div className="team-builder-picker-cover-row">
                            <GameCoverBanner
                                games={games}
                                selectedGame={selectedGame}
                                onOpen={() => setIsGamePickerOpen(true)}
                                className="game-cover--compact"
                            />
                            <span className="team-builder-panel__meta team-builder-panel__meta--compact shrink-0">{isGameFilterActive ? gameVisibleCount : displayedPokemons.length}</span>
                        </div>

                        <div className="team-builder-filterbar mt-3">
                            <div className="team-builder-search-wrap team-builder-search-wrap--inline">
                                <span className="team-builder-search-icon" aria-hidden="true">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                                    </svg>
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
                                        <ClearIcon className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            <div className="team-builder-type-grid team-builder-type-grid--compact" role="group" aria-label="Type focus">
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

                            <button
                                type="button"
                                onClick={() => setFiltersExpanded((v) => !v)}
                                className={`team-builder-filter-toggle ${filtersExpanded ? 'is-open' : ''}`}
                                aria-expanded={filtersExpanded}
                                aria-label={filtersExpanded
                                    ? t('builder.fewerFilters', { defaultValue: language === 'pt' ? 'Menos filtros' : 'Fewer filters' })
                                    : t('builder.moreFilters', { defaultValue: language === 'pt' ? 'Mais filtros' : 'More filters' })}
                                title={filtersExpanded
                                    ? t('builder.fewerFilters', { defaultValue: language === 'pt' ? 'Menos filtros' : 'Fewer filters' })
                                    : t('builder.moreFilters', { defaultValue: language === 'pt' ? 'Mais filtros' : 'More filters' })}
                            >
                                <ChevronDown className="team-builder-filter-toggle__chevron w-4 h-4" />
                                {!filtersExpanded && hasActiveFilters && <span className="team-builder-filter-toggle__dot" aria-hidden="true" />}
                            </button>
                        </div>

                        {filtersExpanded && (
                            <div className="team-builder-unified-toolbar mt-3">
                                <span className="team-builder-picker-summary">{selectedTypeCount === 0 ? t('pokedex.allTypes') : t('pokedex.selectedTypes', { count: selectedTypeCount })}</span>

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

                                {games.length > 0 && setSelectedGame && (
                                    <GameFilterChip
                                        games={games}
                                        selectedGame={selectedGame}
                                        onOpen={() => setIsGamePickerOpen(true)}
                                    />
                                )}

                                <button
                                    type="button"
                                    onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                                    className={`team-builder-toggle team-builder-toggle--compact ${showOnlyFavorites ? 'is-active' : ''}`}
                                    aria-pressed={showOnlyFavorites}
                                >
                                    <StarIcon className="w-4 h-4" isFavorite={showOnlyFavorites} color="currentColor" />
                                    <span>{showOnlyFavorites ? t('pokedex.favoritesOnly') : t('common.all')}</span>
                                </button>
                            </div>
                        )}



                        <div className="team-builder-results mt-4">
                            {isInitialLoading ? (
                                <div className="team-builder-spinner-wrap">
                                    <div className="team-builder-spinner" aria-hidden="true"></div>
                                </div>
                            ) : (
                                <div className="team-builder-results__scroll custom-scrollbar">
                                    <div className="team-builder-results__grid grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 p-1 py-2">
                                        {isGameFilterActive ? (
                                            (gameSections || []).map((section) => (
                                                <React.Fragment key={section.key}>
                                                    <h4 className={`pokedex-section-title ${section.key === 'national' ? 'pokedex-section-title--national' : ''}`}>
                                                        {`${section.name} Pokédex`}
                                                    </h4>
                                                    {section.mons.map((pokemon) => (
                                                        <PokemonCard
                                                            key={pokemon.id}
                                                            details={pokemon}
                                                            onCardClick={openDetailModal}
                                                            onAddToTeam={handleAddPokemonToTeam}
                                                            synergyReason={synergyReasonById.get(pokemon.id)}
                                                            isSuggested={synergyReasonById.has(pokemon.id)}
                                                            colors={colors}
                                                            isFavorite={favoritePokemons.has(pokemon.id)}
                                                            onToggleFavorite={onToggleFavoritePokemon}
                                                        />
                                                    ))}
                                                </React.Fragment>
                                            ))
                                        ) : (
                                            <>
                                                {/* Synergy-only picks (not in the current filtered list) */}
                                                {synergyOnlyCards.map((pokemon) => (
                                                    <PokemonCard
                                                        key={`syn-${pokemon.id}`}
                                                        details={pokemon}
                                                        onCardClick={openDetailModal}
                                                        onAddToTeam={handleAddPokemonToTeam}
                                                        synergyReason={pokemon.primary}
                                                        colors={colors}
                                                        isFavorite={favoritePokemons.has(pokemon.id)}
                                                        onToggleFavorite={onToggleFavoritePokemon}
                                                    />
                                                ))}
                                                {displayedPokemons.map((pokemon, index) => (
                                                    <PokemonCard
                                                        key={pokemon.id}
                                                        details={pokemon}
                                                        onCardClick={openDetailModal}
                                                        onAddToTeam={handleAddPokemonToTeam}
                                                        lastRef={index === displayedPokemons.length - 1 ? lastPokemonElementRef : null}
                                                        synergyReason={synergyReasonById.get(pokemon.id)}
                                                        isSuggested={synergyReasonById.has(pokemon.id)}
                                                        colors={colors}
                                                        isFavorite={favoritePokemons.has(pokemon.id)}
                                                        onToggleFavorite={onToggleFavoritePokemon}
                                                    />
                                                ))}
                                            </>
                                        )}
                                    </div>
                                    {!isGameFilterActive && isFetchingMore && <div className="team-builder-spinner-wrap py-4"><div className="team-builder-spinner team-builder-spinner--small" aria-hidden="true"></div></div>}
                                    {((isGameFilterActive && gameVisibleCount === 0 && pokemonIndex.length > 0) || (!isGameFilterActive && displayedPokemons.length === 0)) && !isInitialLoading && (
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

                    <section className="team-builder-panel p-4">
                        <div className="team-builder-panel__header team-builder-panel__header--compact">
                            <h2 className="team-builder-panel__title team-builder-panel__title--compact">{language === 'pt' ? 'Times recentes' : 'Recent teams'}</h2>
                            <button type="button" onClick={onNavigateToTeams} className="team-builder-button team-builder-button--inline team-builder-button--inline-compact">{language === 'pt' ? 'Ver todos' : 'View all'}</button>
                        </div>

                        <div className="team-builder-recent-list team-builder-recent-list--wide custom-scrollbar mt-4">
                            {recentTeams.length > 0 ? recentTeams.map((team) => (
                                <article key={team.id} className="team-builder-recent-card team-builder-recent-card--wide">
                                    <div className="team-builder-recent-card__main">
                                        <div className="min-w-0 flex-1">
                                            <p className="team-builder-recent-card__title">{team.name}</p>
                                            <div className="team-builder-sprite-stack mt-3">
                                                {team.pokemons.map((pokemon) => (
                                                    <img
                                                        key={pokemon.instanceId || `${team.id}-${pokemon.id}`}
                                                        src={getTeamPokemonDisplaySprite(pokemon)}
                                                        onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                                                        alt={pokemon.name}
                                                        className="team-builder-sprite-stack__item"
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleToggleFavorite(team)}
                                            title={team.isFavorite ? (language === 'pt' ? 'Desfavoritar time' : 'Unfavorite team') : (language === 'pt' ? 'Favoritar time' : 'Favorite team')}
                                            className={`team-builder-icon-button team-builder-icon-button--small ${team.isFavorite ? 'team-builder-icon-button--accent' : ''}`}
                                        >
                                            <StarIcon isFavorite={team.isFavorite} color="currentColor" />
                                        </button>
                                    </div>

                                    <div className="team-builder-recent-card__actions">
                                        {(() => {
                                            const isActive = team.id === activeTeamId || (activeTeamId === null && recentTeams[0]?.id === team.id);
                                            return (
                                                <button
                                                    type="button"
                                                    onClick={() => setActiveTeamId(isActive ? null : team.id)}
                                                    className={`team-builder-button team-builder-button--small ${isActive ? 'team-builder-button--primary' : 'team-builder-button--secondary'}`}
                                                    style={isActive ? { backgroundColor: 'var(--color-success)', borderColor: 'var(--color-success)', color: '#fff' } : undefined}
                                                >
                                                    {isActive ? `★ ${t('common.active')}` : (language === 'pt' ? 'Ativar' : 'Set Active')}
                                                </button>
                                            );
                                        })()}
                                        <button type="button" onClick={() => handleEditTeam(team)} className="team-builder-button team-builder-button--secondary team-builder-button--grow team-builder-button--small">{t('common.edit')}</button>
                                        <button type="button" onClick={() => requestDeleteTeam(team.id, team.name)} className="team-builder-icon-button team-builder-icon-button--danger team-builder-icon-button--small" aria-label={`Delete ${team.name}`}><TrashIcon /></button>
                                    </div>
                                </article>
                            )) : <div className="team-builder-empty-note">{language === 'pt' ? 'Nenhum time recente ainda.' : 'No recent teams yet.'}</div>}
                        </div>
                    </section>
                </div>
            </main> : null}

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

            {detailPokemon && (
                <PokemonDetailModal
                    pokemon={detailPokemon}
                    onClose={() => setDetailPokemon(null)}
                    onAdd={handleAddPokemonToTeam}
                    currentTeam={currentTeam}
                    colors={colors}
                    showPokemonDetails={openDetailModal}
                    db={db}
                    pokemonDetailsCache={pokemonDetailsCache}
                    setPokemonDetailsCache={setPokemonDetailsCache}
                    isFavorite={favoritePokemons.has(detailPokemon.id)}
                    onToggleFavorite={onToggleFavoritePokemon}
                />
            )}
        </>
    );
}