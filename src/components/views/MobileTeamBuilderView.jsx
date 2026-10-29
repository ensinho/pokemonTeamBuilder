import React, { useMemo, useRef } from 'react';
import { POKEBALL_PLACEHOLDER_URL } from '../../constants/theme';
import { typeIcons, typeColors } from '../../constants/types';
import {
    Dices, Trophy, ShieldCheck, Sparkles, SlidersHorizontal, Search, HelpCircle, Info,
    Atom, ChevronRight, ChevronDown, MoreHorizontal, Save, SaveAll, Check, Share2, Trash2,
} from 'lucide-react';
import { GameFilterChip, GamePickerModal } from '../GameCover';
import { EmptyState } from '../EmptyState';
import { BottomSheet } from '../BottomSheet';
import { Sprite } from '../Sprite';
import { TypeChip } from '../TypeChip';
import { MetaCoresModal } from '../modals/MetaCoresModal';
import { coreIconFor } from '../coreIcons';
import { TeamRatingBadge } from '../TeamIdentitySummary';
import { detectTeamCores } from '../../utils/metaCores';
import { rateTeam } from '../../utils/teamAnalysis';
import { LegacyTypesSwitch } from '../LegacyTypesSwitch';
import { buildGameSections } from '../../utils/gameDex';
import { matchesTypeFilter } from '../../utils/typeFilter';
import { TeamThreats } from '../TeamThreats';
import { useSmogonData } from '../../hooks/useSmogonData';
import { useCompetitiveUsage } from '../../hooks/useCompetitiveUsage';
import { useReferenceStore } from '../../store/useReferenceStore';
import { getPokemonDisplaySprite, getTeamPokemonDisplaySprite, getPokemonArtworkSpriteUrl, getPokemonFrontSpriteUrl, matchesPokemonSearch } from '../../utils/pokemonSprites';
import { useMegaStones, megaFormFor, megaDisplayName } from '../../hooks/useMegaStones';
import { useTranslation } from '../../hooks/useTranslation';
import { usePickerGridWindow } from '../../hooks/usePickerGridWindow';
import { ShowdownIcon, StarIcon } from '../icons';
import { Loader } from '../Loader';
import { TeamShareRow } from '../TeamShareRow';

// Inline CSS custom properties for the per-type ring/tint behind a sprite.
const typeVars = (pokemon) => {
    const types = pokemon?.types || [];
    const a = typeColors[types[0]] || 'var(--color-primary)';
    const b = typeColors[types[1]] || a;
    return { '--type-a': a, '--type-b': b };
};

// Map reason kind → icon + default colour (same logic as PokemonCard)
const REASON_VISUALS = {
    ability: (r) => ({ Icon: coreIconFor(r.coreId), color: r.accent || 'var(--color-primary)' }),
    partner: () => ({ Icon: Trophy, color: 'var(--color-primary)' }),
    type:    () => ({ Icon: ShieldCheck, color: 'var(--color-info)' }),
    meta:    () => ({ Icon: Sparkles, color: 'var(--color-primary)' }),
};
function reasonVisual(reason) {
    const fn = REASON_VISUALS[reason?.kind];
    return fn ? fn(reason) : { Icon: Sparkles, color: 'var(--color-primary)' };
}

// Memoised: the grid holds up to a thousand of these, and the view re-renders on
// every team change and every time the sticky composer condenses. Keep the
// props stable (no inline callbacks, no per-render objects) or this does nothing.
const MobilePokemonPickerCard = React.memo(function MobilePokemonPickerCard({
    pokemon,
    onAddToTeam,
    onShowDetails,
    isSuggested,
    synergyReason,
    isFavorite,
    onToggleFavorite,
    lastRef,
}) {
    const { t } = useTranslation();
    const handleCardClick = () => {
        onAddToTeam?.(pokemon);
    };

    const handleKeyDown = (event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onAddToTeam?.(pokemon);
        }
    };

    const handleFavoriteClick = (event) => {
        event.stopPropagation();
        onToggleFavorite?.(pokemon.id);
    };

    const handleInfoClick = (event) => {
        event.stopPropagation();
        onShowDetails?.(pokemon);
    };

    const hasSynergy = !!synergyReason;
    const { Icon: ReasonIcon, color: reasonColor } = hasSynergy ? reasonVisual(synergyReason) : {};

    // Same anatomy as the Pokédex card (MobilePokedexPokemonCard) — types on top,
    // the star on the sprite's corner, name left and number right — so the two
    // grids a phone user moves between read as one object. A tap adds; the
    // details are the small info button in the top row.
    return (
        <article
            ref={lastRef}
            role="button"
            tabIndex={0}
            aria-label={t('builder.addToTeamAria', { name: pokemon.name })}
            onClick={handleCardClick}
            onKeyDown={handleKeyDown}
            className={`team-builder-mobile-card ${hasSynergy ? 'is-synergy' : isSuggested ? 'is-suggested' : ''}`}
            style={hasSynergy ? { '--synergy-color': reasonColor } : undefined}
        >
            <div className="flex items-center gap-1">
                {(pokemon.types || []).map((type) => (
                    <img
                        key={type}
                        src={typeIcons[type]}
                        alt={type}
                        className="h-4 w-4 rounded-full"
                    />
                ))}
                {onShowDetails && (
                    <button
                        type="button"
                        onClick={handleInfoClick}
                        className="team-builder-mobile-card__info touch-target"
                        aria-label={t('builder.detailsAria', { name: pokemon.name })}
                    >
                        <Info aria-hidden="true" />
                    </button>
                )}
            </div>

            <div className="team-builder-mobile-card__media tb-type-tint" style={typeVars(pokemon)}>
                <button
                    type="button"
                    onClick={handleFavoriteClick}
                    className={`team-builder-mobile-card__favorite team-builder-mobile-card__favorite--overlay ${isFavorite ? 'is-active' : ''}`}
                    aria-label={isFavorite ? t('builder.unfavoriteAria', { name: pokemon.name }) : t('builder.favoriteAria', { name: pokemon.name })}
                >
                    <StarIcon className="w-3.5 h-3.5" isFavorite={isFavorite} color="currentColor" />
                </button>
                <div className="mx-auto aspect-square w-full max-w-[96px]">
                    <Sprite src={getPokemonDisplaySprite(pokemon)} artworkSrc={getPokemonArtworkSpriteUrl(pokemon.id)} alt={pokemon.name} className="h-full w-full" />
                </div>
            </div>

            <div className="flex items-baseline justify-between gap-1">
                <p className="team-builder-mobile-card__name min-w-0 font-bold capitalize">
                    {pokemon.name}
                </p>
                <span className="shrink-0 font-mono text-2xs font-semibold tabular-nums text-muted select-none">
                    #{pokemon.id}
                </span>
            </div>
            {hasSynergy && synergyReason.label ? (
                <span className="team-builder-mobile-card__reason-label">
                    <ReasonIcon aria-hidden="true" />
                    <span className="truncate">{synergyReason.label}</span>
                </span>
            ) : !hasSynergy && isSuggested ? (
                <span className="team-builder-mobile-card__reason-label is-suggested">
                    {t('builder.newPick')}
                </span>
            ) : null}
        </article>
    );
});

// ---------------------------------------------------------------------------
// The analysis, whole. The phone used to show a chip whose popover cut each
// list at six types while its label promised all of them ("Fraquezas (14)"),
// plus a second copy of the analysis at the bottom of the page — under a grid
// that never ends, so nobody reached it. Now the chip opens this sheet, and the
// sheet holds every type; meta threats are its second segment instead of a
// chip of their own.
// ---------------------------------------------------------------------------
function TypeList({ entries, empty, showCount = false }) {
    if (!entries.length) return <p className="team-builder-mobile__analysis-empty">{empty}</p>;
    return (
        <div className="team-builder-mobile__analysis-types">
            {entries.map(([type, count]) => (
                <span key={type} className="team-builder-mobile__analysis-type">
                    <TypeChip type={type} size="sm" />
                    {showCount && count > 1 && <span className="count-badge">×{count}</span>}
                </span>
            ))}
        </div>
    );
}

function TeamAnalysisSheet({ teamAnalysis, teamSize, teamThreats, isPlaythrough, onClose, onOpenDetail }) {
    const { t } = useTranslation();
    const [tab, setTab] = React.useState('coverage');
    const { score, grade } = rateTeam(teamAnalysis, teamSize);
    const weaknesses = Object.entries(teamAnalysis?.weaknesses || {}).sort(([, a], [, b]) => b - a);
    const resists = Object.entries(teamAnalysis?.defensiveCoverage || {}).sort(([, a], [, b]) => b - a);
    const offense = Array.from(teamAnalysis?.strengths || []).sort().map((type) => [type, 1]);

    return (
        <BottomSheet onClose={onClose} title={t('builder.analysisTitle')}>
            <div className="team-builder-mobile__analysis-sheet">
                <div className="flex items-center justify-between gap-2">
                    <TeamRatingBadge score={score} grade={grade} />
                </div>
                {!isPlaythrough && (
                    <div className="segmented segmented--block" role="group" aria-label={t('builder.analysisTitle')}>
                        <button type="button" className="segmented__item" aria-pressed={tab === 'coverage'} onClick={() => setTab('coverage')}>
                            {t('builder.coverageTab')}
                        </button>
                        <button type="button" className="segmented__item" aria-pressed={tab === 'threats'} onClick={() => setTab('threats')}>
                            {t('builder.threatsShort')}
                            {teamThreats.length > 0 && <span className="count-badge">{teamThreats.length}</span>}
                        </button>
                    </div>
                )}

                {tab === 'coverage' || isPlaythrough ? (
                    <>
                        <section className="team-builder-mobile__analysis-group">
                            <h3 className="team-builder-mobile__analysis-title">
                                <span className="tb-analysis__mark tb-analysis__mark--bad" aria-hidden="true" />
                                {t('builder.analysisWeaknesses')}
                                <span className="count-badge">{weaknesses.length}</span>
                            </h3>
                            <TypeList entries={weaknesses} empty={t('builder.noWeaknesses')} showCount />
                        </section>
                        <section className="team-builder-mobile__analysis-group">
                            <h3 className="team-builder-mobile__analysis-title">
                                <span className="tb-analysis__mark tb-analysis__mark--good" aria-hidden="true" />
                                {t('builder.defensiveCoverage')}
                                <span className="count-badge">{resists.length}</span>
                            </h3>
                            <TypeList entries={resists} empty={t('builder.noResistances')} showCount />
                        </section>
                        <section className="team-builder-mobile__analysis-group">
                            <h3 className="team-builder-mobile__analysis-title">
                                <span className="tb-analysis__mark tb-analysis__mark--good" aria-hidden="true" />
                                {t('builder.offensiveCoverage')}
                                <span className="count-badge">{offense.length}</span>
                            </h3>
                            <TypeList entries={offense} empty={t('builder.noOffense')} />
                        </section>
                        <LegacyTypesSwitch />
                    </>
                ) : (
                    <>
                        <p className="text-xs text-muted">{t('builder.threatsSubtitle')}</p>
                        <TeamThreats threats={teamThreats} hasTeam={teamSize > 0} onOpenDetail={onOpenDetail} bare />
                    </>
                )}
            </div>
        </BottomSheet>
    );
}

const MobileTeamSlot = ({ pokemon, index, onEdit, peeling = false, onSettle }) => {
    const { t } = useTranslation();
    const megaStones = useMegaStones();
    const mega = pokemon ? megaFormFor(pokemon, megaStones) : null;
    const displayName = mega ? megaDisplayName(mega.form) : pokemon?.name;
    // Removing lives in the editor's footer ("Remover do time", with undo):
    // six 19px red discs over the slots were the loudest thing on the screen
    // and sat a thumb's width from the tap that edits.
    return (
        <button
            type="button"
            onClick={() => pokemon && onEdit?.(pokemon)}
            className={`team-builder-mobile-slot ${pokemon ? 'is-filled tb-type-ring' : 'is-empty'} ${peeling ? 'is-peeling' : ''}`}
            onAnimationEnd={(e) => { if (pokemon && e.animationName === 'sticker-peel') onSettle?.(pokemon.instanceId); }}
            style={pokemon ? typeVars(mega ? { types: mega.types } : pokemon) : undefined}
            aria-label={pokemon ? t('builder.editAria', { name: displayName }) : t('builder.emptySlotAria', { slot: index + 1 })}
            disabled={!pokemon}
        >
            {pokemon ? (
                <Sprite src={mega ? getPokemonFrontSpriteUrl(mega.spriteId) : getTeamPokemonDisplaySprite(pokemon, { animated: true })} artworkSrc={getPokemonArtworkSpriteUrl(mega ? mega.spriteId : pokemon.id)} alt={displayName} className="h-9 w-9" />
            ) : (
                <img
                    src={POKEBALL_PLACEHOLDER_URL}
                    alt=""
                    className="h-8 w-8 opacity-35"
                    aria-hidden="true"
                />
            )}
        </button>
    );
};

// A suggestion of kind "meta" says the same thing on every card ("Top meta
// pick" ×30 with an empty team), so the group gets one heading instead.
const META_REASON = { kind: 'meta' };
const quietReason = (reason) => (reason?.kind === 'meta' ? META_REASON : reason);

export const MobileTeamBuilderView = ({
    currentTeam,
    teamName,
    setTeamName,
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
    teamThreats = [],
    searchInput,
    setSearchInput,
    selectedGeneration,
    setSelectedGeneration,
    selectedGame,
    setSelectedGame,
    games = [],
    regulations = [],
    tiers = [],
    tierCounts = null,
    selectedRegulation,
    isPlaythrough = false,
    onSelectRegulation,
    formatLabel = '',
    totalCount = 0,
    defaultName = '',
    isDirty = false,
    generations,
    isInitialLoading,
    displayedPokemons,
    gamePokemonIds,
    gameDexes,
    synergySuggestions = [],
    handleAddPokemonToTeam,
    handleRandomizeTeam,
    isRandomizing,
    lastPokemonElementRef,
    isFetchingMore,
    selectedTypes,
    handleTypeSelection,
    typeMatchMode,
    onEditTeamPokemon,
    showDetails,
    favoritePokemons,
    onToggleFavoritePokemon,
    showOnlyFavorites,
    setShowOnlyFavorites,
    onOpenOnboarding,
}) => {
    const { t } = useTranslation();
    const [isGamePickerOpen, setIsGamePickerOpen] = React.useState(false);
    const [isCoresOpen, setIsCoresOpen] = React.useState(false);
    const [filtersExpanded, setFiltersExpanded] = React.useState(false);
    const [savedTeamsOpen, setSavedTeamsOpen] = React.useState(false);
    const [analysisOpen, setAnalysisOpen] = React.useState(false);
    const [actionsOpen, setActionsOpen] = React.useState(false);
    // The peel (Neon Sticker), as on desktop: only a member added while this
    // view is open is laid down; it settles when its animation ends.
    const [settledSlotIds, setSettledSlotIds] = React.useState(() => new Set(currentTeam.map((p) => p.instanceId)));
    const settleSlot = React.useCallback((id) => {
        setSettledSlotIds((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
    }, []);
    // Sticky composer condenses to a 2-row header once the user scrolls past
    // the top, then re-expands near the top. Hysteresis (56/16) keeps it from
    // flickering right at the threshold. The scroll surface is the app shell's
    // content column (`.app-shell__content`), not the window.
    //
    // The band is in flow, so the height it gives up — the fold: actions row
    // and analysis chip — stays behind as flow space (`--composer-collapse`, a
    // bottom margin) and the grid never moves. **Both halves of that swap must
    // land in the same layout.** Until 2026-09-24 the margin was measured in a
    // layout effect *after* the band had shrunk; that measurement forced a
    // layout with the band short and the margin missing, the browser's scroll
    // anchoring compensated for the grid "moving up" by lowering scrollTop, and
    // once the fold outgrew the 56px threshold (any team with a Pokémon: the
    // analysis chip appears) scrollTop hit 0, the band re-expanded, and the
    // page snapped back to the top every ~50px of scrolling. So the fold's
    // height is kept in the variable at all times — measured from its natural
    // size, which does not depend on whether it is folded — and flipping the
    // state is layout-neutral by construction.
    const [isComposerCondensed, setIsComposerCondensed] = React.useState(false);
    const stickyRef = useRef(null);
    const foldRef = useRef(null);
    const condensedRef = useRef(false);
    React.useLayoutEffect(() => {
        const band = stickyRef.current;
        const fold = foldRef.current;
        if (!band || !fold) return undefined;
        // scrollHeight is the fold's natural height folded or not: folding caps
        // its max-height at 0 but its rows still lay out at full size inside.
        const sync = () => band.style.setProperty('--composer-collapse', `${fold.scrollHeight}px`);
        sync();
        if (typeof ResizeObserver !== 'function') return undefined;
        // The rows, not the fold: while folded the fold is 0 tall whatever its
        // rows do, and the analysis row swaps its hint for the chip with the team.
        const observer = new ResizeObserver(sync);
        Array.from(fold.children).forEach((row) => observer.observe(row));
        return () => observer.disconnect();
    }, []);
    React.useEffect(() => {
        const scroller = document.querySelector('.app-shell__content') || window;
        const readY = () => (scroller === window ? window.scrollY : scroller.scrollTop);
        let raf = 0;
        const onScroll = () => {
            if (raf) return;
            raf = requestAnimationFrame(() => {
                raf = 0;
                const y = readY();
                const next = condensedRef.current ? y >= 16 : y > 56;
                if (next === condensedRef.current) return;
                condensedRef.current = next;
                setIsComposerCondensed(next);
            });
        };
        scroller.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
        return () => {
            scroller.removeEventListener('scroll', onScroll);
            if (raf) cancelAnimationFrame(raf);
        };
    }, []);
    const wantsMeta = { enabled: !isPlaythrough };
    const { byId: smogonById } = useSmogonData(wantsMeta);
    const { byId: usageById } = useCompetitiveUsage(wantsMeta);
    const teamCores = React.useMemo(
        () => (isPlaythrough ? [] : detectTeamCores(currentTeam.map((p) => p.id), { smogonById, usageById })),
        [currentTeam, smogonById, usageById, isPlaythrough]
    );

    // Filter suggestions by active user filters (type, generation, favorites, search)
    const activeFilteredSuggestions = React.useMemo(() => {
        if (!synergySuggestions.length) return [];
        const typeList = [...selectedTypes];
        const search = (searchInput || '').toLowerCase().trim();
        return synergySuggestions.filter((s) => {
            const entry = s.id ? displayedPokemons.find((p) => p.id === s.id) : null;
            if (showOnlyFavorites && entry && !favoritePokemons.has(entry.id)) return false;
            if (selectedGeneration && selectedGeneration !== 'all' && entry && entry.generation !== selectedGeneration) return false;
            if (entry && !matchesTypeFilter(entry.types, typeList, typeMatchMode)) return false;
            if (search && !matchesPokemonSearch(entry || s, search)) return false;
            return true;
        });
    }, [synergySuggestions, displayedPokemons, selectedTypes, typeMatchMode, selectedGeneration, showOnlyFavorites, favoritePokemons, searchInput]);

    const synergyReasonById = React.useMemo(
        () => new Map(activeFilteredSuggestions.map((s) => [s.id, quietReason(s.primary)])),
        [activeFilteredSuggestions]
    );

    // Synergy-only picks not in the displayed list, prepended to grid.
    const displayedIdSet = React.useMemo(() => new Set(displayedPokemons.map((p) => p.id)), [displayedPokemons]);
    const synergyOnlyCards = React.useMemo(() => {
        // While searching, show the matching Pokémon first (no synergy prepend).
        if (searchInput.trim() || !activeFilteredSuggestions.length) return [];
        return activeFilteredSuggestions
            .filter((s) => !displayedIdSet.has(s.id))
            .map((s) => ({ ...s, primary: quietReason(s.primary), _synergyOnly: true }));
    }, [activeFilteredSuggestions, displayedIdSet, searchInput]);
    const suggestionHeading = synergyOnlyCards.length > 0
        ? (synergyOnlyCards.every((c) => c.primary?.kind === 'meta') ? t('builder.metaPicksHeading') : t('builder.suggestionsHeading'))
        : null;

    React.useEffect(() => {
        if (selectedTypes.size <= 1) return;
        const [, ...extraTypes] = Array.from(selectedTypes);
        extraTypes.forEach((type) => handleTypeSelection(type));
    }, [selectedTypes, handleTypeSelection]);

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

    // How many of the collapsible filters are currently narrowing the list —
    // surfaced as a badge on the toggle so users know filters are active even
    // while the panel is closed.
    const activeFilterCount =
        (selectedGeneration && selectedGeneration !== 'all' ? 1 : 0) +
        (isGameFilterActive ? 1 : 0) +
        (selectedTypes.size > 0 ? 1 : 0) +
        (showOnlyFavorites ? 1 : 0);

    // Game filter → only that game's obtainable Pokémon, split by real sub-dexes
    // (Central/Coastal/Mountain Kalos…) in regional order, resolved from the full
    // index so the whole dex shows regardless of pagination.
    const fullIndex = useReferenceStore((s) => s.pokemonIndex);
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
        return buildGameSections({ fullIndex, gameDexes, game: selectedGameObj, matches });
    }, [isGameFilterActive, gameDexes, selectedGameObj, fullIndex, searchInput, selectedTypes, typeMatchMode, showOnlyFavorites, selectedGeneration, favoritePokemons]);
    const gameVisibleCount = React.useMemo(
        () => (gameSections ? gameSections.reduce((n, s) => n + s.mons.length, 0) : 0),
        [gameSections]
    );

    const grid = usePickerGridWindow({
        list: displayedPokemons,
        sections: isGameFilterActive ? gameSections : null,
        filters: {
            regulation: selectedRegulation,
            generation: selectedGeneration,
            game: selectedGame,
            types: selectedTypes,
            typeMatchMode,
            search: searchInput,
            favoritesOnly: showOnlyFavorites,
        },
    });

    const teamSize = currentTeam.length;
    const isTeamFull = teamSize >= 6;
    const rating = useMemo(() => rateTeam(teamAnalysis, teamSize), [teamAnalysis, teamSize]);
    const weaknessCount = Object.keys(teamAnalysis?.weaknesses || {}).length;
    const coveredCount = teamAnalysis?.strengths?.size || 0;

    // Save says what saving would do: nothing to save on a loaded team that has
    // not changed ("Salvo"), an update when it has, a first save otherwise. The
    // dot marks unsaved work.
    const isSavedClean = Boolean(editingTeamId) && !isDirty;
    const hasUnsaved = teamSize > 0 && !isSavedClean;
    const saveLabel = isSavedClean ? t('builder.saved') : (editingTeamId ? t('builder.update') : t('builder.save'));
    const SaveGlyph = isSavedClean ? Check : Save;

    const gameName = selectedGameObj ? selectedGameObj.label : t('builder.allFormats');
    const formatChipLabel = formatLabel ? `${gameName} · ${formatLabel}` : gameName;

    const runAction = (fn) => () => { setActionsOpen(false); fn?.(); };

    return (
        <div className="team-builder-mobile space-y-3">
            <div ref={stickyRef} className={`team-builder-mobile__sticky ${isComposerCondensed ? 'is-condensed' : ''}`}>
                <section className={`team-builder-panel team-builder-mobile__composer p-3.5 ${isComposerCondensed ? 'is-condensed' : ''}`}>
                    {/* Row 1: team name (+ active state) and, condensed, a compact Save */}
                    <div className="team-builder-mobile__composer-top">
                        {/* A team name is a title, so it capitalises; "done"
                            dismisses the keyboard rather than offering a
                            newline this single-line field cannot take. The
                            placeholder is the name a save would use. */}
                        <input
                            type="text"
                            enterKeyHint="done"
                            autoCapitalize="words"
                            autoCorrect="off"
                            value={teamName}
                            onChange={(event) => setTeamName(event.target.value)}
                            placeholder={defaultName || t('builder.teamNamePlaceholder')}
                            className="team-builder-field min-w-0 flex-1"
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
                        {isComposerCondensed && (
                            <button
                                type="button"
                                onClick={handleSaveTeam}
                                className={`btn ${isSavedClean ? 'btn-secondary' : 'btn-primary'} btn-sm btn-icon team-builder-mobile__save-compact shrink-0`}
                                aria-label={saveLabel}
                                title={saveLabel}
                            >
                                <SaveGlyph aria-hidden="true" />
                                {hasUnsaved && <span className="tb-unsaved-dot" aria-hidden="true" />}
                            </button>
                        )}
                    </div>

                    {/* Row 2: team slots */}
                    <div className="team-builder-mobile__slots mt-2.5">
                        {Array.from({ length: 6 }).map((_, index) => (
                            <MobileTeamSlot
                                key={currentTeam[index]?.instanceId ?? `mobile-slot-${index}`}
                                pokemon={currentTeam[index]}
                                index={index}
                                onEdit={onEditTeamPokemon}
                                peeling={Boolean(currentTeam[index]) && !settledSlotIds.has(currentTeam[index].instanceId)}
                                onSettle={settleSlot}
                            />
                        ))}
                    </div>

                    {/* The fold: everything that tucks away when the band
                        condenses. One element, so its height is one number —
                        see the --composer-collapse comment above. `inert`
                        while folded: invisible controls must not take focus.
                        Its two rows are always rendered (the ResizeObserver
                        watches them); what is inside them changes. */}
                    <div ref={foldRef} className="team-builder-mobile__composer-fold" inert={isComposerCondensed}>
                        {/* Row 3: Save · Export · more. Five icon-only buttons
                            (one a Showdown glyph nobody could read) became the
                            two things people came to do, labelled, and a sheet
                            for the rest. */}
                        <div className="team-builder-mobile__composer-actions mt-2.5">
                            <button
                                type="button"
                                onClick={handleSaveTeam}
                                className={`btn ${isSavedClean ? 'btn-secondary' : 'btn-primary'} team-builder-mobile__save`}
                                aria-label={hasUnsaved ? `${saveLabel} — ${t('builder.unsavedChanges')}` : saveLabel}
                            >
                                <SaveGlyph aria-hidden="true" />
                                <span>{saveLabel}</span>
                                {hasUnsaved && <span className="tb-unsaved-dot" aria-hidden="true" />}
                            </button>
                            <button
                                type="button"
                                onClick={handleExportToShowdown}
                                className="btn btn-secondary team-builder-mobile__export"
                                aria-label={t('builder.exportShowdown')}
                            >
                                <ShowdownIcon className="h-4 w-4" />
                                <span>{t('builder.exportShort')}</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setActionsOpen(true)}
                                className="btn btn-secondary btn-icon shrink-0"
                                aria-haspopup="dialog"
                                aria-label={t('builder.moreActions')}
                            >
                                <MoreHorizontal aria-hidden="true" />
                            </button>
                        </div>
                        <TeamShareRow onImage={handleShareTeam} disabled={teamSize === 0} className="mt-2" />

                        <div className="team-builder-mobile__composer-analysis">
                            {teamSize === 0 ? (
                                // The onboarding, inline: what to do here, said once
                                // where the team will be — instead of a modal that
                                // opened itself on the first visit.
                                <p className="tb-empty-hint">
                                    {t('builder.emptyHint')}{' '}
                                    <button type="button" className="btn-link tb-empty-hint__link" onClick={onOpenOnboarding}>
                                        {t('builder.howItWorks')}
                                    </button>
                                </p>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setAnalysisOpen(true)}
                                    aria-haspopup="dialog"
                                    className="team-builder-mobile__analysis-chip"
                                    aria-label={`${t('builder.analysisTitle')}: ${t(`builder.grade.${rating.grade}`)} ${rating.score}, ${t('builder.analysisChipCounts', { weak: weaknessCount, covered: coveredCount })}`}
                                >
                                    <TeamRatingBadge score={rating.score} grade={rating.grade} compact />
                                    <span className="team-builder-mobile__analysis-chip-counts">
                                        {t('builder.analysisChipCounts', { weak: weaknessCount, covered: coveredCount })}
                                    </span>
                                    <ChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                                </button>
                            )}
                        </div>
                    </div>
                </section>
            </div>

            <section className="team-builder-panel p-3.5">
                <div className="team-builder-mobile__filter-bar">
                    <div className="team-builder-mobile__search">
                        <Search className="team-builder-mobile__search-icon" aria-hidden="true" />
                        {/* Search keyboard, search return key, and no
                            autocorrect mangling Pokémon names. */}
                        <input
                            type="text"
                            inputMode="search"
                            enterKeyHint="search"
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck={false}
                            placeholder={t('pokedex.searchPlaceholderShort')}
                            value={searchInput}
                            onChange={(event) => setSearchInput(event.target.value)}
                            className="team-builder-field team-builder-mobile__search-field"
                            aria-label={t('common.search')}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={() => setFiltersExpanded((value) => !value)}
                        className={`team-builder-mobile__filter-toggle ${filtersExpanded ? 'is-open' : ''}  ${activeFilterCount > 0 ? 'has-active' : ''}`}
                        aria-expanded={filtersExpanded}
                        aria-label={t('builder.filters')}
                    >
                        <SlidersHorizontal className="h-4 w-4 shrink-0" />
                        {activeFilterCount > 0 && (
                            <span className="team-builder-mobile__filter-count">{activeFilterCount}</span>
                        )}
                    </button>
                </div>

                {filtersExpanded && (
                    <BottomSheet onClose={() => setFiltersExpanded(false)} title={t('builder.filters')}>
                        <div className="team-builder-mobile__filters">
                            {games.length > 0 && setSelectedGame && (
                                <div className="team-builder-mobile__filter-block">
                                    <span className="team-builder-control__label">{t('builder.gameFilterLabel')}</span>
                                    <GameFilterChip
                                        games={games}
                                        selectedGame={selectedGame}
                                        onOpen={() => { setFiltersExpanded(false); setIsGamePickerOpen(true); }}
                                        className="w-full"
                                    />
                                </div>
                            )}

                            <div className="team-builder-mobile__filter-block">
                                <span className="team-builder-control__label">
                                    {isPlaythrough ? t('builder.favoritesOnly') : t('builder.metaCore')}
                                </span>
                                <div className="team-builder-mobile__filter-row">
                                    {!isPlaythrough && <button
                                        type="button"
                                        onClick={() => { setFiltersExpanded(false); setIsCoresOpen(true); }}
                                        className="team-builder-mobile__sheet-core min-w-0 flex-1"
                                    >
                                        <span className="flex min-w-0 items-center gap-2">
                                            <Atom className="h-4 w-4 shrink-0 text-primary" />
                                            <span className="truncate">
                                                {teamCores.length > 0 ? t('builder.coresBuilt', { count: teamCores.length }) : t('builder.buildCore')}
                                            </span>
                                        </span>
                                        <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
                                    </button>}
                                    <button
                                        type="button"
                                        onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                                        className={`team-builder-mobile__fav-icon ${showOnlyFavorites ? 'is-active' : ''}`}
                                        aria-pressed={showOnlyFavorites}
                                        aria-label={t('builder.favoritesOnly')}
                                    >
                                        <StarIcon className="w-4 h-4" isFavorite={showOnlyFavorites} color="currentColor" />
                                    </button>
                                </div>
                            </div>

                            <div className="team-builder-mobile__filter-block">
                                <span className="team-builder-control__label">{t('pokedex.genFilterLabel')}</span>
                                <select
                                    value={selectedGeneration}
                                    onChange={(event) => setSelectedGeneration(event.target.value)}
                                    className="team-builder-field team-builder-select w-full"
                                >
                                    <option value="all">{t('pokedex.allGens')}</option>
                                    {generations.map((generation) => (
                                        <option key={generation} value={generation} className="capitalize">
                                            {generation.replace('-', ' ')}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="team-builder-mobile__filter-block team-builder-mobile__filter-block--types">
                                <span className="team-builder-control__label">{t('pokedex.typesFilterLabel')}</span>
                                <div className="pokedex-sheet-types">
                                    {Object.keys(typeColors).map((type) => {
                                        const isActive = selectedTypes.has(type);
                                        return (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => handleTypeSelectChange(isActive ? 'all' : type)}
                                                className={`pokedex-mobile-type-badge ${isActive ? 'is-active' : ''}`}
                                                style={{ '--type-color': typeColors[type] }}
                                                aria-pressed={isActive}
                                            >
                                                <img src={typeIcons[type]} alt="" className="w-3.5 h-3.5 object-contain" />
                                                <span className="text-2xs font-bold capitalize select-none">{t(`types.${type}`, { defaultValue: type })}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                        <button
                            type="button"
                            className="btn btn-primary w-full"
                            onClick={() => setFiltersExpanded(false)}
                        >
                            {t('builder.showResults')}
                        </button>
                    </BottomSheet>
                )}
            </section>

            <section className="team-builder-panel p-3.5">
                {/* The result row says what the list is: the game and format
                    the builder is paired with (one tap changes it — it used to
                    be three taps deep and never shown), the real number of
                    matches (it said "50 Pokémon", the loaded page size), and
                    the saved-teams caller. */}
                <div className="team-builder-mobile__result-head mb-2.5">
                    <button
                        type="button"
                        onClick={() => setIsGamePickerOpen(true)}
                        className="team-builder-mobile__format-chip"
                        aria-haspopup="dialog"
                        aria-label={t('builder.formatAria', { label: formatChipLabel })}
                    >
                        <span className="truncate">{formatChipLabel}</span>
                        <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />
                    </button>
                    <span className="team-builder-mobile__result-count">{t('builder.resultCount', { count: totalCount })}</span>
                    <button
                        type="button"
                        onClick={() => setSavedTeamsOpen(true)}
                        className="team-builder-mobile__saved-icon touch-target"
                        aria-label={t('builder.savedTeams')}
                        title={t('builder.savedTeams')}
                    >
                        <SaveAll className="h-4 w-4" />
                        {recentTeams.length > 0 && (
                            <span className="team-builder-mobile__saved-icon-badge">{recentTeams.length}</span>
                        )}
                    </button>
                </div>

                {isTeamFull && <p className="tb-full-note">{t('builder.teamFullNote')}</p>}

                <div className={`team-builder-mobile__available mt-2 ${isTeamFull ? 'is-team-full' : ''}`}>
                    {isInitialLoading ? (
                        <div className="team-builder-spinner-wrap h-full">
                            <Loader />
                        </div>
                    ) : (
                        <>
                            <div className="custom-scrollbar">
                                <div className="team-builder-mobile__grid grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1.5">
                                    {isGameFilterActive ? (
                                        (grid.visibleSections || []).map((section) => (
                                            <React.Fragment key={section.key}>
                                                <h4 className={`pokedex-section-title pokedex-section-title--mobile ${section.key === 'national' ? 'pokedex-section-title--national' : ''}`}>
                                                    {`${section.name} Pokédex`}
                                                </h4>
                                                {section.mons.map((pokemon) => (
                                                    <MobilePokemonPickerCard
                                                        key={pokemon.id}
                                                        pokemon={pokemon}
                                                        onAddToTeam={handleAddPokemonToTeam}
                                                        onShowDetails={showDetails}
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
                                            {suggestionHeading && (
                                                <h4 className="pokedex-section-title pokedex-section-title--mobile tb-grid-heading">{suggestionHeading}</h4>
                                            )}
                                            {/* Synergy-only picks (not in current filtered list) */}
                                            {synergyOnlyCards.map((pokemon) => (
                                                <MobilePokemonPickerCard
                                                    key={`syn-${pokemon.id}`}
                                                    pokemon={pokemon}
                                                    onAddToTeam={handleAddPokemonToTeam}
                                                    onShowDetails={showDetails}
                                                    synergyReason={pokemon.primary}
                                                    isFavorite={favoritePokemons.has(pokemon.id)}
                                                    onToggleFavorite={onToggleFavoritePokemon}
                                                />
                                            ))}
                                            {suggestionHeading && (
                                                <h4 className="pokedex-section-title pokedex-section-title--mobile pokedex-section-title--national">{t('builder.allPokemonHeading')}</h4>
                                            )}
                                            {grid.visibleList.map((pokemon, index) => (
                                                <MobilePokemonPickerCard
                                                    key={pokemon.id}
                                                    pokemon={pokemon}
                                                    onAddToTeam={handleAddPokemonToTeam}
                                                    onShowDetails={showDetails}
                                                    synergyReason={synergyReasonById.get(pokemon.id)}
                                                    isSuggested={synergyReasonById.has(pokemon.id)}
                                                    isFavorite={favoritePokemons.has(pokemon.id)}
                                                    onToggleFavorite={onToggleFavoritePokemon}
                                                    lastRef={index === displayedPokemons.length - 1 ? lastPokemonElementRef : null}
                                                />
                                            ))}
                                        </>
                                    )}
                                </div>
                                {grid.hasMore && <div ref={grid.sentinelRef} className="h-px" aria-hidden="true" />}

                                {!isGameFilterActive && isFetchingMore && (
                                    <div className="team-builder-spinner-wrap py-4">
                                        <Loader size="sm" />
                                    </div>
                                )}

                                {((isGameFilterActive && gameVisibleCount === 0 && fullIndex.length > 0) || (!isGameFilterActive && displayedPokemons.length === 0)) && (
                                    <div className="pt-6">
                                        <EmptyState
                                            compact
                                            title={showOnlyFavorites ? t('favorites.noMatchesTitle') : t('pokedex.noPokemonFound')}
                                            message={t('favorites.noMatchesDesc')}
                                        />
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </section>

            {analysisOpen && (
                <TeamAnalysisSheet
                    teamAnalysis={teamAnalysis}
                    teamSize={teamSize}
                    teamThreats={teamThreats}
                    isPlaythrough={isPlaythrough}
                    onClose={() => setAnalysisOpen(false)}
                    onOpenDetail={showDetails ? (mon) => { setAnalysisOpen(false); showDetails(mon); } : undefined}
                />
            )}

            {actionsOpen && (
                <BottomSheet onClose={() => setActionsOpen(false)} title={t('builder.moreActions')}>
                    <div className="tb-actions-sheet">
                        <button
                            type="button"
                            className="menu-item"
                            onClick={runAction(() => handleRandomizeTeam?.(displayedPokemons))}
                            disabled={isRandomizing || displayedPokemons.length === 0}
                        >
                            <Dices aria-hidden="true" /> {t('builder.randomizeTeam')}
                        </button>
                        {teamSize > 0 && (
                            <button type="button" className="menu-item" onClick={runAction(onOpenOnboarding)}>
                                <HelpCircle aria-hidden="true" /> {t('builder.howItWorks')}
                            </button>
                        )}
                        <hr className="menu-separator" />
                        <button type="button" className="menu-item menu-item--danger" onClick={runAction(handleClearTeam)} disabled={teamSize === 0 && !teamName}>
                            <Trash2 aria-hidden="true" /> {t('builder.clearTeam')}
                        </button>
                    </div>
                </BottomSheet>
            )}

            {savedTeamsOpen && (
                <BottomSheet onClose={() => setSavedTeamsOpen(false)} title={t('builder.savedTeams')}>
                    <div className="space-y-2.5">
                        {recentTeams.length > 0 ? recentTeams.map((team) => {
                            const isActive = team.id === activeTeamId || (activeTeamId === null && recentTeams[0]?.id === team.id);
                            return (
                                <div key={team.id} className="team-builder-mobile__recent-card">
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
                                            className={`btn btn-ghost btn-icon btn-sm touch-target ${team.isFavorite ? 'team-builder-icon-button--accent' : ''}`}
                                            aria-pressed={!!team.isFavorite}
                                            aria-label={team.isFavorite ? t('builder.unfavoriteTeam', { name: team.name }) : t('builder.favoriteTeam', { name: team.name })}
                                        >
                                            <StarIcon isFavorite={team.isFavorite} color="currentColor" />
                                        </button>
                                    </div>

                                    <div className="mt-3 flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleEditTeam(team)}
                                            className="btn btn-secondary btn-sm flex-1"
                                        >
                                            {t('common.edit')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setActiveTeamId(isActive ? null : team.id)}
                                            aria-pressed={isActive}
                                            className="btn btn-ghost btn-sm flex-1 tb-recent-card__active"
                                        >
                                            {isActive ? `★ ${t('common.active')}` : t('builder.setActive')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => requestDeleteTeam(team.id, team.name)}
                                            className="btn btn-ghost btn-sm btn-icon team-builder-icon-button--danger"
                                            aria-label={t('builder.deleteTeamAria', { name: team.name })}
                                        >
                                            <Trash2 aria-hidden="true" />
                                        </button>
                                    </div>
                                </div>
                            );
                        }) : (
                            <p className="team-builder-empty-note text-sm">
                                {t('builder.noRecentTeams')}
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => { setSavedTeamsOpen(false); onNavigateToTeams(); }}
                        className="btn btn-outline w-full mt-3"
                    >
                        {t('home.seeAll')}
                    </button>
                </BottomSheet>
            )}

            <GamePickerModal
                isOpen={isGamePickerOpen}
                onClose={() => setIsGamePickerOpen(false)}
                games={games}
                selectedGame={selectedGame}
                onSelectGame={setSelectedGame}
                regulations={regulations}
                tiers={tiers}
                tierCounts={tierCounts}
                selectedRegulation={selectedRegulation}
                onSelectRegulation={onSelectRegulation}
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
