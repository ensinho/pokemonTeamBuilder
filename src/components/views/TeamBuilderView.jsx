import React from 'react';
import { ChevronDown, ChevronRight, MoreHorizontal, Check, Save, Share2, Trash2, Dices, HelpCircle, Atom } from 'lucide-react';
import '../../styles/team-builder-view.css';
import { POKEBALL_PLACEHOLDER_URL } from '../../constants/theme';
import { typeColors, typeIcons } from '../../constants/types';
import { getTeamPokemonDisplaySprite, getPokemonArtworkSpriteUrl, getPokemonFrontSpriteUrl, matchesPokemonSearch } from '../../utils/pokemonSprites';
import { EmptyState } from '../EmptyState';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { MobileTeamBuilderView } from './MobileTeamBuilderView';
import { GameCoverBanner, GameFilterChip, GamePickerModal } from '../GameCover';
import { PokemonDetailModal } from '../modals/PokemonDetailModal';
import { TeamBuilderOnboardingModal } from '../modals/TeamBuilderOnboardingModal';
import { PokemonCard } from '../PokemonCard';
import { usePickerGridWindow } from '../../hooks/usePickerGridWindow';
import { Sprite } from '../Sprite';
import { TeamIdentitySummary } from '../TeamIdentitySummary';
import { MetaCoresModal } from '../modals/MetaCoresModal';
import { coreIconFor } from '../coreIcons';
import { detectTeamCores } from '../../utils/metaCores';
import { buildSynergySuggestions } from '../../utils/synergySuggestions';
import { buildTeamThreats } from '../../utils/teamThreats';
import { TeamThreats } from '../TeamThreats';
import { buildGameSections } from '../../utils/gameDex';
import { matchesTypeFilter } from '../../utils/typeFilter';
import { TypeMatchToggle } from '../TypeMatchToggle';
import { isPlaythroughMode } from '../../constants/regulations';
import { isPreFairyGeneration } from '../../utils/teamAnalysis';
import { LegacyTypesSwitch } from '../LegacyTypesSwitch';
import { toast } from '../../store/useToastStore';
// SynergySuggestions strip removed — synergy picks now appear in-grid
import { useSmogonData } from '../../hooks/useSmogonData';
import { useCompetitiveUsage } from '../../hooks/useCompetitiveUsage';
import { useTranslation } from '../../hooks/useTranslation';
import { useTournamentData } from '../../hooks/useTournamentData';
import { useReferenceStore } from '../../store/useReferenceStore';
import { useMegaStones, megaFormFor, megaDisplayName } from '../../hooks/useMegaStones';
import { useMetaUsage } from '../../hooks/useMetaUsage';
import { useTierLegality } from '../../hooks/useTierLegality';
import {
    ClearIcon,
    EditIcon,
    ShowdownIcon,
    StarIcon,
    TrashIcon,
    PokeballIcon,
} from '../icons';
import { Loader } from '../Loader';
import { AnchoredPopover } from '../AnchoredPopover';
import { useActiveTeamStore, selectIsTeamDirty, defaultTeamName } from '../../store/useActiveTeamStore';
import { useFirestoreTeamsStore } from '../../store/useFirestoreTeamsStore';
import { usePokedexStore } from '../../store/usePokedexStore';

// Inline CSS custom properties driving the per-type disc/ring behind a team
// member's sprite. Falls back to a single colour for mono-type Pokémon.
function typeDiscStyle(pokemon) {
    const types = pokemon?.types || [];
    const a = typeColors[types[0]] || '#6390F0';
    const b = typeColors[types[1]] || a;
    return { '--type-a': a, '--type-b': b };
}

// Compact, borderless icon-only type mark for the team-analysis cards (saves
// space vs the full type name). The type name still ships as the tooltip / label.
function AnalysisTypeBadge({ type }) {
    const { t } = useTranslation();
    const typeLower = type.toLowerCase();
    const icon = typeIcons[typeLower];
    const label = t(`types.${typeLower}`, { defaultValue: type });

    return icon ? (
        <img src={icon} alt={label} title={label} className="w-5 h-5 shrink-0 object-contain" />
    ) : (
        <span className="text-2xs font-bold leading-none text-muted" title={label}>{label.slice(0, 1)}</span>
    );
}

// A suggestion of kind "meta" says the same words on every card ("Top meta
// pick" ×30 with an empty team), so the group carries one heading instead.
const META_REASON = { kind: 'meta' };
const quietReason = (reason) => (reason?.kind === 'meta' ? META_REASON : reason);

// The composer's secondary actions (desktop). Save and Export are the two
// things people come to do, so they are labelled buttons; the rest — randomise,
// share, clear — wait one click away instead of crowding a 17rem column.
function ComposerMoreMenu({ items }) {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = React.useState(false);
    const anchorRef = React.useRef(null);
    const popoverRef = React.useRef(null);

    React.useEffect(() => {
        if (!isOpen) return undefined;
        const onDown = (event) => {
            if (anchorRef.current?.contains(event.target) || popoverRef.current?.contains(event.target)) return;
            setIsOpen(false);
        };
        const onKey = (event) => {
            if (event.key === 'Escape') { setIsOpen(false); anchorRef.current?.focus(); }
        };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [isOpen]);

    return (
        <>
            <button
                ref={anchorRef}
                type="button"
                onClick={() => setIsOpen((v) => !v)}
                className="btn btn-secondary btn-icon shrink-0"
                aria-haspopup="menu"
                aria-expanded={isOpen}
                aria-label={t('builder.moreActions')}
                title={t('builder.moreActions')}
            >
                <MoreHorizontal aria-hidden="true" />
            </button>
            <AnchoredPopover
                isOpen={isOpen}
                anchorRef={anchorRef}
                popoverRef={popoverRef}
                role="menu"
                ariaLabel={t('builder.moreActions')}
                offset={6}
                className="menu-surface tb-more-menu"
            >
                {items.map((item) => (item.separator ? (
                    <hr key={item.id} className="menu-separator" />
                ) : (
                    <button
                        key={item.id}
                        type="button"
                        role="menuitem"
                        disabled={item.disabled}
                        className={`menu-item ${item.danger ? 'menu-item--danger' : ''}`}
                        onClick={() => { setIsOpen(false); item.onClick?.(); }}
                    >
                        {item.icon}
                        {item.label}
                    </button>
                )))}
            </AnchoredPopover>
        </>
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
    typeMatchMode,
    setTypeMatchMode,
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
    useDocumentMeta({
        title: 'Team Builder',
        description: 'Build your competitive Pokémon team with live type coverage, speed checks, damage previews, and Smogon set suggestions.',
        path: '/builder',
    });
    const handleAddPokemonWithClear = React.useCallback((pokemon) => {
        handleAddPokemonToTeam(pokemon);
        setSearchInput('');
    }, [handleAddPokemonToTeam, setSearchInput]);
    const [dragIndex, setDragIndex] = React.useState(null);
    const [isGamePickerOpen, setIsGamePickerOpen] = React.useState(false);
    const [isCoresOpen, setIsCoresOpen] = React.useState(false);
    // The guide opens on request only. It used to open itself on the first
    // visit, in front of the very screen it describes; the empty composer now
    // says what to do inline and links here ("Como funciona").
    const [isOnboardingOpen, setIsOnboardingOpen] = React.useState(false);
    // Analysis panel tab: type-coverage analysis vs meta threats (same card).
    const [analysisTab, setAnalysisTab] = React.useState('analysis');
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

    // Favorites filtering already happened upstream (usePokedexStore, over the
    // full index before pagination) — availablePokemons only trims teamed mons.
    // This is the default list; a Smogon tier replaces it with `tierRoster` below.
    const displayedPokemonsSource = availablePokemons;
    const selectedTypeCount = selectedTypes.size;
    const hasActiveFilters = (selectedGeneration && selectedGeneration !== 'all')
        || (selectedGame && selectedGame !== 'all')
        || showOnlyFavorites;

    // Tournament partner suggestions: Pokémon most often built alongside the
    // current team (weighted toward the last-added one), drawn from the FULL
    // index — not just the Pokémon currently visible in the picker.
    const pokemonIndex = useReferenceStore((s) => s.pokemonIndex);
    const fetchPokemonIndex = useReferenceStore((s) => s.fetchPokemonIndex);
    // Competitive regulation the user has paired the builder with (persisted).
    // null → use the default regulation from the usage index; NO_REGULATION →
    // playthrough mode. Read before the dataset hooks below so they can skip
    // their downloads entirely in that mode.
    const [selectedRegulation, setSelectedRegulation] = React.useState(() => {
        if (typeof window === 'undefined') return null;
        return window.localStorage.getItem('tb-regulation') || null;
    });
    // Playthrough mode: the user asked for a builder that doesn't push the meta at
    // them. Type coverage stays (a playthrough team still wants to know it has no
    // Water resist) — what goes is everything ranked by competitive usage, and the
    // ~2.6MB of datasets behind it.
    const isPlaythrough = isPlaythroughMode(selectedRegulation);
    // Picking a game sets the type chart it was played with — Azumarill is pure
    // Water in Emerald. Only on an actual change, so a manual override of the
    // switch survives a reload; "all games" leaves the switch where it is.
    const setLegacyTypes = useActiveTeamStore((s) => s.setLegacyTypes);
    const lastGameRef = React.useRef(selectedGame);
    React.useEffect(() => {
        if (lastGameRef.current === selectedGame) return;
        lastGameRef.current = selectedGame;
        const game = games.find((g) => g.key === selectedGame);
        if (!game) return;
        const legacy = isPreFairyGeneration(game.generation);
        if (legacy === useActiveTeamStore.getState().legacyTypes) return;
        setLegacyTypes(legacy);
        toast.info(t(legacy ? 'builder.legacyTypesAutoOn' : 'builder.legacyTypesAutoOff'));
    }, [selectedGame, games, setLegacyTypes, t]);
    const wantsMeta = { enabled: !isPlaythrough };
    const { popular, synergy, status: tournamentStatus } = useTournamentData(wantsMeta);
    const { byId: smogonById, status: smogonStatus } = useSmogonData(wantsMeta);
    const { byId: usageById, status: usageStatus } = useCompetitiveUsage(wantsMeta);
    React.useEffect(() => {
        if (typeof window === 'undefined') return;
        if (selectedRegulation) window.localStorage.setItem('tb-regulation', selectedRegulation);
        else window.localStorage.removeItem('tb-regulation');
    }, [selectedRegulation]);
    // The Species Clause is a competitive rule: on with a regulation, off in
    // playthrough mode (the store refuses a repeated species only while on).
    const setSpeciesClause = useActiveTeamStore((s) => s.setSpeciesClause);
    React.useEffect(() => { setSpeciesClause(!isPlaythrough); }, [isPlaythrough, setSpeciesClause]);
    // Real competitive usage + win-rate for the chosen regulation — drives the
    // "meta" signal AND the meta-threats panel.
    const {
        ranked: metaRanked,
        usageMap: metaUsageMap,
        byId: metaById,
        formats: regulations,
        tiers: smogonTiers,
        isTier: isSmogonTier,
        format: activeFormat,
        formatId: activeRegulationId,
        status: metaUsageStatus,
    } = useMetaUsage(selectedRegulation);

    // Tier legality. A Smogon tier is the one meta choice that also narrows WHO
    // may be on the team, so it is a real filter and not just a ranking — but
    // only where a tier ladder exists: VGC, Monotype and 1v1 are rule sets this
    // dataset cannot express, and `legalIdsFor` returns null for them, meaning
    // "allow everything" rather than "allow nothing".
    const { legalIdsFor } = useTierLegality();
    const tierLegalIds = React.useMemo(
        () => (isSmogonTier && !isPlaythrough ? legalIdsFor(activeRegulationId) : null),
        [isSmogonTier, isPlaythrough, legalIdsFor, activeRegulationId],
    );
    const isTierFilterActive = Boolean(tierLegalIds);

    // How many Pokémon each tier allows, for the chip labels. Only the tiers
    // with a ladder get a number; the rest (Monotype, 1v1, CAP) do not filter,
    // and a count beside them would promise one.
    const tierCounts = React.useMemo(() => {
        const counts = {};
        for (const tier of smogonTiers) {
            const ids = legalIdsFor(tier.id);
            if (ids) counts[tier.id] = ids.size;
        }
        return counts;
    }, [smogonTiers, legalIdsFor]);

    // The roster a Smogon tier allows. Built from the FULL index rather than by
    // filtering `availablePokemons`, for the same reason the game filter is:
    // that list is paginated, so filtering it would hide every legal Pokémon
    // past the current page until the user scrolled for them. Ordered by real
    // usage in the tier, then by dex number — the tier's staples first, the
    // legal-but-rare picks still present below them.
    const tierRoster = React.useMemo(() => {
        if (!isTierFilterActive || !pokemonIndex.length) return null;
        const search = (searchInput || '').toLowerCase().trim();
        const typeList = [...selectedTypes];
        return pokemonIndex
            .filter((entry) => {
                if (entry.isForm) return false;
                if (!tierLegalIds.has(entry.id)) return false;
                if (showOnlyFavorites && !favoritePokemons.has(entry.id)) return false;
                if (selectedGeneration && selectedGeneration !== 'all' && entry.generation !== selectedGeneration) return false;
                if (!matchesTypeFilter(entry.types, typeList, typeMatchMode)) return false;
                if (search && !matchesPokemonSearch(entry, search)) return false;
                return true;
            })
            .sort((a, b) => (metaUsageMap.get(b.id) || 0) - (metaUsageMap.get(a.id) || 0) || a.id - b.id);
    }, [isTierFilterActive, tierLegalIds, pokemonIndex, metaUsageMap, searchInput, selectedTypes, typeMatchMode, showOnlyFavorites, selectedGeneration, favoritePokemons]);

    const displayedPokemons = tierRoster || displayedPokemonsSource;

    // The suggestion ranking draws on five sources that land at different
    // moments; drawing the grid as each arrived painted it three times — dex
    // order, then suggestions prepended, then re-sorted — and the cards jumped
    // under the user's finger. Hold the grid's loader until they settle, capped
    // so a slow connection still gets a usable (if unranked) grid quickly.
    const metaSettled = isPlaythrough || (
        pokemonIndex.length > 0
        && [tournamentStatus, smogonStatus, usageStatus, metaUsageStatus].every((st) => st !== 'loading')
    );
    const [metaWaitExpired, setMetaWaitExpired] = React.useState(false);
    React.useEffect(() => {
        if (metaSettled) return undefined;
        const timer = window.setTimeout(() => setMetaWaitExpired(true), 800);
        return () => window.clearTimeout(timer);
    }, [metaSettled]);
    const isGridLoading = isInitialLoading || (!metaSettled && !metaWaitExpired);


    React.useEffect(() => { fetchPokemonIndex(); }, [fetchPokemonIndex]);

    // Which meta core(s) the current roster already commits to (has a setter for).
    const teamCores = React.useMemo(
        () => (isPlaythrough ? [] : detectTeamCores(currentTeam.map((p) => p.id), { smogonById, usageById })),
        [currentTeam, smogonById, usageById, isPlaythrough]
    );

    // Team-aware synergy suggestions: by ability/core, tournament partner, and
    // type coverage — ranked across the whole relevant dex, reactive to the team.
    const synergySuggestions = React.useMemo(() => {
        if (isPlaythrough) return [];
        if (currentTeam.length >= 6) return [];
        // When a game filter is active, keep suggestions to that game's obtainable
        // Pokémon so they respect in-game availability (types/weather cores still rank).
        // A suggestion the tier forbids is worse than no suggestion — it is a
        // recommendation the user cannot act on. Tier legality and the game's
        // obtainable set are both restrictions, so when both are on the
        // suggestion has to satisfy each.
        const gameIds = (selectedGame && selectedGame !== 'all' && gamePokemonIds) ? gamePokemonIds : null;
        let allowedIds = gameIds;
        if (tierLegalIds) {
            allowedIds = gameIds
                ? new Set([...gameIds].filter((id) => tierLegalIds.has(id)))
                : tierLegalIds;
        }
        return buildSynergySuggestions({
            team: currentTeam,
            pokemonIndex,
            synergy,
            smogonById,
            usageById,
            popular: metaRanked.length ? metaRanked : popular,
            metaUsage: metaUsageMap,
            limit: 30,
            allowedIds,
        });
    }, [currentTeam, pokemonIndex, synergy, smogonById, usageById, popular, metaRanked, metaUsageMap, selectedGame, gamePokemonIds, tierLegalIds, isPlaythrough]);

    const suggestionIndexById = React.useMemo(() => new Map(pokemonIndex.map((p) => [p.id, p])), [pokemonIndex]);

    // Meta threats: the most-used / best-winning meta Pokémon (for the selected
    // regulation) that pressure the current team. Join usage/win-rate from the
    // usage dataset with types from the index, then rank against the roster.
    const teamThreats = React.useMemo(() => {
        if (isPlaythrough) return [];
        const teamIds = new Set(currentTeam.map((p) => p.id));
        const meta = Object.entries(metaById || {}).map(([id, e]) => {
            const nid = Number(id);
            return { id: nid, name: e.name, types: suggestionIndexById.get(nid)?.types || [], usage: e.usage, winRate: e.winRate };
        });
        return buildTeamThreats(currentTeam, meta, { limit: 6, excludeIds: teamIds });
    }, [currentTeam, metaById, suggestionIndexById, isPlaythrough]);
    // Filter suggestions by active user filters (type, generation, favorites, search)
    const activeFilteredSuggestions = React.useMemo(() => {
        if (!synergySuggestions.length) return [];
        const typeList = [...selectedTypes];
        const search = (searchInput || '').toLowerCase().trim();
        return synergySuggestions.filter((s) => {
            const entry = suggestionIndexById.get(s.id);
            if (!entry) return false;
            if (showOnlyFavorites && !favoritePokemons.has(entry.id)) return false;
            if (selectedGeneration && selectedGeneration !== 'all' && entry.generation !== selectedGeneration) return false;
            if (!matchesTypeFilter(entry.types, typeList, typeMatchMode)) return false;
            if (search && !matchesPokemonSearch(entry, search)) return false;
            return true;
        });
    }, [synergySuggestions, suggestionIndexById, selectedTypes, typeMatchMode, selectedGeneration, showOnlyFavorites, favoritePokemons, searchInput]);

    // Map synergy id → primary reason for in-grid border/icon rendering.
    const synergyReasonById = React.useMemo(
        () => new Map(activeFilteredSuggestions.map((s) => [s.id, quietReason(s.primary)])),
        [activeFilteredSuggestions]
    );

    // Synergy-only picks that aren't already in the displayed list, prepended as
    // enriched cards at the top of the grid so the user sees them immediately.
    const displayedIdSet = React.useMemo(() => new Set(displayedPokemons.map((p) => p.id)), [displayedPokemons]);
    const synergyOnlyCards = React.useMemo(() => {
        // While searching, surface the matching Pokémon first — don't prepend
        // synergy suggestions ahead of the actual search results.
        if (searchInput.trim() || !activeFilteredSuggestions.length) return [];
        return activeFilteredSuggestions
            .filter((s) => !displayedIdSet.has(s.id) && suggestionIndexById.has(s.id))
            .map((s) => ({ ...suggestionIndexById.get(s.id), ...s, primary: quietReason(s.primary), _synergyOnly: true }));
    }, [activeFilteredSuggestions, displayedIdSet, suggestionIndexById, searchInput]);
    const suggestionHeading = synergyOnlyCards.length > 0
        ? (synergyOnlyCards.every((c) => c.primary?.kind === 'meta') ? t('builder.metaPicksHeading') : t('builder.suggestionsHeading'))
        : null;

    const megaStones = useMegaStones();

    const isGameFilterActive = !!(selectedGame && selectedGame !== 'all' && gamePokemonIds);
    const selectedGameObj = React.useMemo(() => {
        return isGameFilterActive ? games.find((g) => g.key === selectedGame) : null;
    }, [games, selectedGame, isGameFilterActive]);

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
            if (!matchesTypeFilter(entry.types, typeList, typeMatchMode)) return false;
            if (search && !matchesPokemonSearch(entry, search)) return false;
            return true;
        };
        return buildGameSections({ fullIndex: pokemonIndex, gameDexes, game: selectedGameObj, matches });
    }, [isGameFilterActive, gameDexes, selectedGameObj, pokemonIndex, searchInput, selectedTypes, typeMatchMode, showOnlyFavorites, selectedGeneration, favoritePokemons]);

    const gameVisibleCount = React.useMemo(
        () => (gameSections ? gameSections.reduce((n, s) => n + s.mons.length, 0) : 0),
        [gameSections]
    );

    const grid = usePickerGridWindow({
        list: displayedPokemons,
        sections: isGameFilterActive ? gameSections : null,
        filters: {
            regulation: activeRegulationId,
            generation: selectedGeneration,
            game: selectedGame,
            types: selectedTypes,
            typeMatchMode,
            search: searchInput,
            favoritesOnly: showOnlyFavorites,
        },
    });

    // The real number of matches. `displayedPokemons` is the page the store has
    // revealed so far (50 at a time), and both builders printed that as if it
    // were the total.
    const filteredPokemons = usePokedexStore((s) => s.filteredPokemons);
    const totalCount = React.useMemo(() => {
        if (isGameFilterActive) return gameVisibleCount;
        if (tierRoster) return tierRoster.length;
        const teamIds = new Set(currentTeam.map((p) => p.id));
        return filteredPokemons.reduce((n, p) => n + (teamIds.has(p.id) ? 0 : 1), 0);
    }, [isGameFilterActive, gameVisibleCount, tierRoster, filteredPokemons, currentTeam]);

    // What a save would call this team if the field stays empty — shown as the
    // field's placeholder so the name it gets is never a surprise.
    const savedTeams = useFirestoreTeamsStore((s) => s.savedTeams);
    const defaultName = React.useMemo(
        () => defaultTeamName(currentTeam, savedTeams, editingTeamId),
        // language: the name is a translated template.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [currentTeam, savedTeams, editingTeamId, language],
    );
    const isDirty = useActiveTeamStore(selectIsTeamDirty);
    const isSavedClean = Boolean(editingTeamId) && !isDirty;
    const hasUnsaved = currentTeam.length > 0 && !isSavedClean;
    const saveLabel = isSavedClean ? t('builder.saved') : (editingTeamId ? t('builder.update') : t('builder.save'));
    const isTeamFull = currentTeam.length >= 6;

    // The meta the builder is paired with, as words (the phone never showed it).
    const formatLabel = isPlaythrough ? t('builder.playthroughBadge') : (activeFormat?.label || '');

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
                    teamThreats={teamThreats}
                    searchInput={searchInput}
                    setSearchInput={setSearchInput}
                    selectedGeneration={selectedGeneration}
                    setSelectedGeneration={setSelectedGeneration}
                    selectedGame={selectedGame}
                    setSelectedGame={setSelectedGame}
                    games={games}
                    regulations={regulations}
                    tiers={smogonTiers}
                    tierCounts={tierCounts}
                    selectedRegulation={activeRegulationId}
                    onSelectRegulation={setSelectedRegulation}
                    isPlaythrough={isPlaythrough}
                    formatLabel={formatLabel}
                    totalCount={totalCount}
                    defaultName={defaultName}
                    isDirty={isDirty}
                    generations={generations}
                    isInitialLoading={isGridLoading}
                    displayedPokemons={displayedPokemons}
                    gamePokemonIds={gamePokemonIds}
                    gameDexes={gameDexes}
                    synergySuggestions={synergySuggestions}
                    handleAddPokemonToTeam={handleAddPokemonWithClear}
                    handleRandomizeTeam={handleRandomizeTeam}
                    isRandomizing={isRandomizing}
                    lastPokemonElementRef={lastPokemonElementRef}
                    isFetchingMore={isFetchingMore}
                    selectedTypes={selectedTypes}
                    onToggleFavoritePokemon={onToggleFavoritePokemon}
                    handleTypeSelection={handleTypeSelection}
                    typeMatchMode={typeMatchMode}
                    showDetails={openDetailModal}
                    onEditTeamPokemon={onEditTeamPokemon}
                    favoritePokemons={favoritePokemons}
                    showOnlyFavorites={showOnlyFavorites}
                    setShowOnlyFavorites={setShowOnlyFavorites}
                    onOpenOnboarding={() => setIsOnboardingOpen(true)}
                />
            ) : null}

            {isDesktopLayout ? <main className="team-builder tb-desk grid">
                {/* The composer: one surface for the team you are building — its
                    name, its six slots, what it adds up to and what you can do
                    with it. v3 folded the meta-core and guide boxes that sat
                    above it into its footer: three boxes stacked in a 300px
                    column read as three things to look at, not one team. */}
                <div className="tb-desk__composer lg:sticky lg:top-6 lg:self-start">
                    <section className="card tb-team" aria-label={t('builder.currentTeamAria')}>
                        <div className="tb-team__head">
                            <input
                                id="team-builder-name"
                                type="text"
                                value={teamName}
                                onChange={(e) => setTeamName(e.target.value)}
                                placeholder={defaultName || t('builder.teamNamePlaceholder')}
                                className="tb-team__name"
                                aria-label={t('builder.teamNameAria')}
                            />
                            {editingTeamId && (
                                editingTeamId === activeTeamId ? (
                                    <span className="badge badge--primary shrink-0">★ {t('common.active')}</span>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setActiveTeamId(editingTeamId)}
                                        className="btn btn-ghost btn-sm shrink-0"
                                    >
                                        {t('builder.setActive')}
                                    </button>
                                )
                            )}
                            <span className="badge badge--figure shrink-0" aria-label={`${currentTeam.length} / 6`}>{currentTeam.length}/6</span>
                        </div>

                        <div className="team-builder-slots" aria-label={t('builder.teamSlotsAria')}>
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
                                    aria-label={t('builder.slotAria', { name: pokemon.name, slot: idx + 1, total: currentTeam.length })}
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
                                        aria-label={t('builder.editAria', { name: pokemon.name })}
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
                                        aria-label={t('builder.removeAria', { name: pokemon.name })}
                                        className="team-builder-slot__control team-builder-slot__control--remove"
                                    >
                                        <TrashIcon />
                                    </button>
                                </div>
                                );
                            })}

                            {Array.from({ length: 6 - currentTeam.length }).map((_, index) => (
                                <div key={index} className="team-builder-slot team-builder-slot--empty" aria-hidden="true">
                                    <PokeballIcon className="team-builder-slot__placeholder" />
                                </div>
                            ))}
                        </div>

                        {currentTeam.length === 0 ? (
                            // The onboarding, inline: what to do, said once where
                            // the team will be — not a modal that opened itself.
                            <p className="tb-empty-hint">
                                {t('builder.emptyHint')}{' '}
                                <button type="button" className="btn-link tb-empty-hint__link" onClick={() => setIsOnboardingOpen(true)}>
                                    {t('builder.howItWorks')}
                                </button>
                            </p>
                        ) : (
                            <TeamIdentitySummary team={currentTeam} analysis={teamAnalysis} />
                        )}

                        {/* Save says what saving would do — nothing ("Salvo") on a
                            loaded team that has not changed, an update when it has;
                            the dot marks unsaved work. Export is the other thing
                            people came to do, so it is a labelled button, not a
                            Showdown glyph among four others. */}
                        <div className="tb-team__actions">
                            <button
                                type="button"
                                onClick={handleSaveTeam}
                                className={`btn ${isSavedClean ? 'btn-secondary' : 'btn-primary'} tb-team__save`}
                                aria-label={hasUnsaved ? `${saveLabel} — ${t('builder.unsavedChanges')}` : saveLabel}
                            >
                                {isSavedClean ? <Check aria-hidden="true" /> : <Save aria-hidden="true" />}
                                {saveLabel}
                                {hasUnsaved && <span className="tb-unsaved-dot" aria-hidden="true" />}
                            </button>
                            <button
                                type="button"
                                onClick={handleExportToShowdown}
                                className={`btn ${isTeamFull && isSavedClean ? 'btn-primary' : 'btn-secondary'} tb-team__export`}
                                aria-label={t('builder.exportShowdown')}
                                title={t('builder.exportShowdown')}
                            >
                                <ShowdownIcon />
                                {t('builder.exportShort')}
                            </button>
                            <ComposerMoreMenu
                                items={[
                                    { id: 'random', label: t('builder.randomizeTeam'), icon: <Dices aria-hidden="true" />, onClick: () => handleRandomizeTeam?.(displayedPokemons), disabled: isRandomizing || displayedPokemons.length === 0 },
                                    { id: 'share', label: t('builder.shareTeam'), icon: <Share2 aria-hidden="true" />, onClick: handleShareTeam },
                                    { id: 'sep', separator: true },
                                    { id: 'clear', label: t('builder.clearTeam'), icon: <Trash2 aria-hidden="true" />, onClick: handleClearTeam, danger: true, disabled: currentTeam.length === 0 && !teamName },
                                ]}
                            />
                        </div>

                        {(!isPlaythrough || currentTeam.length > 0) && <div className="tb-team__tools">
                            {!isPlaythrough && (
                                <button
                                    type="button"
                                    onClick={() => setIsCoresOpen(true)}
                                    className="tb-core-row"
                                    title={t('builder.metaCoreHint')}
                                >
                                    <Atom className="tb-core-row__icon" aria-hidden="true" />
                                    <span className="tb-core-row__label">{t('builder.metaCore')}</span>
                                    <span className="tb-core-row__value">
                                        {teamCores.length > 0 ? (
                                            <>
                                                {teamCores.slice(0, 2).map((c) => {
                                                    const CIcon = coreIconFor(c.id);
                                                    return (
                                                        <span key={c.id} className="tb-core-chip" style={{ '--core-accent': c.accent }}>
                                                            <CIcon aria-hidden="true" />{c.name}
                                                        </span>
                                                    );
                                                })}
                                                {teamCores.length > 2 && <span className="tb-core-row__more">+{teamCores.length - 2}</span>}
                                            </>
                                        ) : (
                                            <span className="tb-core-row__empty">{t('builder.metaCoreNone')}</span>
                                        )}
                                    </span>
                                    <ChevronRight className="tb-core-row__chevron" aria-hidden="true" />
                                </button>
                            )}
                            {/* One help entry at a time: the empty composer's inline
                                hint links the guide; once the team has members, this. */}
                            {currentTeam.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setIsOnboardingOpen(true)}
                                    className="btn btn-ghost btn-icon btn-sm btn-muted touch-target"
                                    title={t('builder.howItWorks')}
                                    aria-label={t('builder.howItWorks')}
                                >
                                    <HelpCircle />
                                </button>
                            )}
                        </div>}
                    </section>

                    <section className="card tb-analysis">
                        <div role="tablist" aria-label={t('builder.analysisTitle')} className="tabs">
                            {[
                                { id: 'analysis', label: t('builder.analysisTitle') },
                                // Meta threats are ranked by competitive usage — no tab in playthrough mode.
                                ...(isPlaythrough ? [] : [{ id: 'threats', label: t('builder.threatsTitle'), count: currentTeam.length > 0 ? teamThreats.length : 0 }]),
                            ].map((tb) => (
                                <button
                                    key={tb.id}
                                    type="button"
                                    role="tab"
                                    aria-selected={analysisTab === tb.id}
                                    onClick={() => setAnalysisTab(tb.id)}
                                    className="tabs__item"
                                >
                                    {tb.label}
                                    {tb.count > 0 && <span className="count-badge">{tb.count}</span>}
                                </button>
                            ))}
                        </div>

                        {(analysisTab === 'analysis' || isPlaythrough) ? (
                            currentTeam.length === 0 ? (
                                // One line, not three groups each saying "after
                                // the first pick".
                                <p className="tb-analysis__empty">{t('builder.analysisEmpty')}</p>
                            ) : (
                                // Exposure first: a weakness is what the next pick
                                // should fix, so it leads; coverage follows.
                                <div className="tb-analysis__groups">
                                    <div className="tb-analysis__group">
                                        <h3 className="tb-analysis__title"><span className="tb-analysis__mark tb-analysis__mark--bad" aria-hidden="true" />{t('builder.analysisWeaknesses')}</h3>
                                        <div className="tb-analysis__types">
                                            {Object.keys(teamAnalysis.weaknesses).length > 0
                                                ? Object.entries(teamAnalysis.weaknesses).sort(([, a], [, b]) => b - a).map(([type, score]) => (
                                                    <div key={type} className="flex items-center gap-1">
                                                        <AnalysisTypeBadge type={type} />
                                                        <span className="team-builder-analysis-score">({score}x)</span>
                                                    </div>
                                                ))
                                                : <p className="tb-analysis__empty">{t('builder.noWeaknesses')}</p>}
                                        </div>
                                    </div>

                                    <div className="tb-analysis__group">
                                        <h3 className="tb-analysis__title"><span className="tb-analysis__mark tb-analysis__mark--good" aria-hidden="true" />{t('builder.defensiveCoverage')}</h3>
                                        <div className="tb-analysis__types">
                                            {teamAnalysis.defensiveCoverage && Object.keys(teamAnalysis.defensiveCoverage).length > 0
                                                ? Object.entries(teamAnalysis.defensiveCoverage).sort(([, a], [, b]) => b - a).map(([type, count]) => (
                                                    <div key={type} className="flex items-center gap-1">
                                                        <AnalysisTypeBadge type={type} />
                                                        {count > 1 && (
                                                            <span className="team-builder-analysis-score team-builder-analysis-score--success">({count}x)</span>
                                                        )}
                                                    </div>
                                                ))
                                                : <p className="tb-analysis__empty">{t('builder.noResistances')}</p>}
                                        </div>
                                    </div>

                                    <div className="tb-analysis__group">
                                        <h3 className="tb-analysis__title"><span className="tb-analysis__mark tb-analysis__mark--good" aria-hidden="true" />{t('builder.offensiveCoverage')}</h3>
                                        <div className="tb-analysis__types">
                                            {teamAnalysis.strengths.size > 0
                                                ? Array.from(teamAnalysis.strengths).sort().map((type) => <AnalysisTypeBadge key={type} type={type} />)
                                                : <p className="tb-analysis__empty">{t('builder.noOffense')}</p>}
                                        </div>
                                    </div>
                                </div>
                            )
                        ) : (
                            <div className="tb-analysis__threats">
                                <TeamThreats threats={teamThreats} hasTeam={currentTeam.length > 0} onOpenDetail={openDetailModal} bare />
                            </div>
                        )}
                        {/* Under the groups it changes, so the setting reads as part of the analysis. */}
                        {(analysisTab === 'analysis' || isPlaythrough) && <LegacyTypesSwitch />}
                    </section>
                </div>

                <div className="tb-desk__picker">
                    <section className="team-builder-panel team-builder-panel--picker p-4">
                        <div className="team-builder-picker-cover-row">
                            <GameCoverBanner
                                games={games}
                                selectedGame={selectedGame}
                                // A tier is a real restriction on the roster, not
                                // just a ranking, so the banner says which one is
                                // narrowing the list — otherwise a short list
                                // reads as missing data.
                                note={formatLabel || null}
                                onOpen={() => setIsGamePickerOpen(true)}
                                className="game-cover--compact"
                            />
                            {/* The real number of matches — it showed the loaded
                                page (50) as if it were the total. */}
                            <span className="team-builder-panel__meta team-builder-panel__meta--compact shrink-0" title={t('builder.resultCount', { count: totalCount })}>{totalCount}</span>
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

                            <div className="team-builder-type-grid team-builder-type-grid--compact" role="group" aria-label={t('builder.typeFocusAria')}>
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
                                aria-label={filtersExpanded ? t('builder.fewerFilters') : t('builder.moreFilters')}
                                title={filtersExpanded ? t('builder.fewerFilters') : t('builder.moreFilters')}
                            >
                                <ChevronDown className="team-builder-filter-toggle__chevron w-4 h-4" />
                                {!filtersExpanded && hasActiveFilters && <span className="team-builder-filter-toggle__dot" aria-hidden="true" />}
                            </button>
                        </div>

                        {filtersExpanded && (
                            <div className="team-builder-unified-toolbar mt-3">
                                <TypeMatchToggle value={typeMatchMode} onChange={setTypeMatchMode} />
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



                        {/* A full team: the picker steps back (dimmed, one line
                            saying why) and the composer's Save/Export lead. */}
                        {isTeamFull && <p className="tb-full-note mt-3">{t('builder.teamFullNote')}</p>}

                        <div className={`team-builder-results mt-4 ${isTeamFull ? 'is-team-full' : ''}`}>
                            {isGridLoading ? (
                                <div className="team-builder-spinner-wrap">
                                    <Loader />
                                </div>
                            ) : (
                                <div className="team-builder-results__scroll custom-scrollbar">
                                    <div className="team-builder-results__grid grid grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 p-1 py-2">
                                        {isGameFilterActive ? (
                                            (grid.visibleSections || []).map((section) => (
                                                <React.Fragment key={section.key}>
                                                    <h4 className={`pokedex-section-title ${section.key === 'national' ? 'pokedex-section-title--national' : ''}`}>
                                                        {`${section.name} Pokédex`}
                                                    </h4>
                                                    {section.mons.map((pokemon) => (
                                                        <PokemonCard
                                                            key={pokemon.id}
                                                            details={pokemon}
                                                            addOnClick
                                                            onCardClick={openDetailModal}
                                                            onAddToTeam={handleAddPokemonWithClear}
                                                            synergyReason={synergyReasonById.get(pokemon.id)}
                                                            isSuggested={synergyReasonById.has(pokemon.id)}
                                                            isFavorite={favoritePokemons.has(pokemon.id)}
                                                            onToggleFavorite={onToggleFavoritePokemon}
                                                        />
                                                    ))}
                                                </React.Fragment>
                                            ))
                                        ) : (
                                            <>
                                                {suggestionHeading && <h4 className="pokedex-section-title tb-grid-heading">{suggestionHeading}</h4>}
                                                {/* Synergy-only picks (not in the current filtered list) */}
                                                {synergyOnlyCards.map((pokemon) => (
                                                    <PokemonCard
                                                        key={`syn-${pokemon.id}`}
                                                        details={pokemon}
                                                        addOnClick
                                                        onCardClick={openDetailModal}
                                                        onAddToTeam={handleAddPokemonWithClear}
                                                        synergyReason={pokemon.primary}
                                                        isFavorite={favoritePokemons.has(pokemon.id)}
                                                        onToggleFavorite={onToggleFavoritePokemon}
                                                    />
                                                ))}
                                                {suggestionHeading && <h4 className="pokedex-section-title pokedex-section-title--national">{t('builder.allPokemonHeading')}</h4>}
                                                {grid.visibleList.map((pokemon, index) => (
                                                    <PokemonCard
                                                        key={pokemon.id}
                                                        details={pokemon}
                                                        addOnClick
                                                        onCardClick={openDetailModal}
                                                        onAddToTeam={handleAddPokemonWithClear}
                                                        lastRef={!isTierFilterActive && index === displayedPokemons.length - 1 ? lastPokemonElementRef : null}
                                                        synergyReason={synergyReasonById.get(pokemon.id)}
                                                        isSuggested={synergyReasonById.has(pokemon.id)}
                                                        isFavorite={favoritePokemons.has(pokemon.id)}
                                                        onToggleFavorite={onToggleFavoritePokemon}
                                                    />
                                                ))}
                                            </>
                                        )}
                                    </div>
                                    {grid.hasMore && <div ref={grid.sentinelRef} className="h-px" aria-hidden="true" />}
                                    {!isGameFilterActive && !isTierFilterActive && isFetchingMore && <div className="team-builder-spinner-wrap py-4"><Loader size="sm" /></div>}
                                    {((isGameFilterActive && gameVisibleCount === 0 && pokemonIndex.length > 0) || (!isGameFilterActive && displayedPokemons.length === 0)) && !isGridLoading && (
                                        <div className="px-2 pb-4">
                                            <EmptyState
                                                compact
                                                title={showOnlyFavorites ? t('favorites.noMatchesTitle') : t('pokedex.noPokemonFound')}
                                                message={t('favorites.noMatchesDesc')}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="section tb-recent">
                        <div className="section-head">
                            <h2 className="section-title">{t('builder.recentTeams')}</h2>
                            {recentTeams.length > 0 && <span className="section-meta">{recentTeams.length}</span>}
                            <button type="button" onClick={onNavigateToTeams} className="section-action btn btn-link">{t('builder.viewAll')}</button>
                        </div>

                        {recentTeams.length > 0 ? (
                            <div className="tb-recent__grid">
                                {recentTeams.map((team) => {
                                    const isActive = team.id === activeTeamId || (activeTeamId === null && recentTeams[0]?.id === team.id);
                                    const favLabel = team.isFavorite ? t('builder.unfavoriteTeam', { name: team.name }) : t('builder.favoriteTeam', { name: team.name });
                                    return (
                                        <article key={team.id} className="card card--compact tb-recent-card">
                                            <div className="tb-recent-card__head">
                                                <p className="tb-recent-card__title">{team.name}</p>
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleFavorite(team)}
                                                    title={favLabel}
                                                    aria-label={favLabel}
                                                    aria-pressed={!!team.isFavorite}
                                                    className={`btn btn-ghost btn-icon btn-sm btn-muted tb-recent-card__star ${team.isFavorite ? 'is-on' : ''}`}
                                                >
                                                    <StarIcon isFavorite={team.isFavorite} color="currentColor" />
                                                </button>
                                            </div>
                                            <div className="team-builder-sprite-stack">
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
                                            <div className="tb-recent-card__actions">
                                                <button
                                                    type="button"
                                                    onClick={() => setActiveTeamId(isActive ? null : team.id)}
                                                    aria-pressed={isActive}
                                                    className="btn btn-secondary btn-sm tb-recent-card__active"
                                                >
                                                    {isActive ? `★ ${t('common.active')}` : t('builder.setActive')}
                                                </button>
                                                <button type="button" onClick={() => handleEditTeam(team)} className="btn btn-secondary btn-sm tb-recent-card__edit">{t('common.edit')}</button>
                                                <button type="button" onClick={() => requestDeleteTeam(team.id, team.name)} className="btn btn-ghost btn-icon btn-sm btn-muted tb-recent-card__delete" aria-label={t('builder.deleteTeamAria', { name: team.name })}><TrashIcon /></button>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="tb-recent__empty">{t('builder.noRecentTeams')}</p>
                        )}
                    </section>
                </div>
            </main> : null}

            <GamePickerModal
                isOpen={isGamePickerOpen}
                onClose={() => setIsGamePickerOpen(false)}
                games={games}
                selectedGame={selectedGame}
                onSelectGame={setSelectedGame}
                regulations={regulations}
                tiers={smogonTiers}
                tierCounts={tierCounts}
                selectedRegulation={activeRegulationId}
                onSelectRegulation={setSelectedRegulation}
            />

            {isCoresOpen && (
                                <MetaCoresModal
                                    onClose={() => setIsCoresOpen(false)}
                                    currentTeam={currentTeam}
                                    onAddToTeam={handleAddPokemonWithClear}
                                />
                            )}
                
                            {detailPokemon && (
                                <PokemonDetailModal
                                    pokemon={detailPokemon}
                                    onClose={() => setDetailPokemon(null)}
                                    onAdd={handleAddPokemonWithClear}
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

            {isOnboardingOpen && (
                <TeamBuilderOnboardingModal
                    onClose={() => setIsOnboardingOpen(false)}
                />
            )}
        </>
    );
}