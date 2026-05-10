import React, { useEffect, useMemo, useRef, useState } from 'react';
import { POKEBALL_PLACEHOLDER_URL } from '../../constants/theme';
import { typeIcons } from '../../constants/types';
import { EmptyState } from '../EmptyState';
import { Sprite } from '../Sprite';
import { TypeBadge } from '../TypeBadge';
import { AnchoredPopover } from '../AnchoredPopover';
import {
    ClearIcon,
    InfoIcon,
    SaveIcon,
    ShareIcon,
    ShowdownIcon,
    StarIcon,
    TrashIcon,
} from '../icons';

const MobilePokemonPickerCard = ({
    pokemon,
    onAddToTeam,
    isSuggested,
    isFavorite,
    onToggleFavorite,
    colors,
    lastRef,
}) => {
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

    return (
        <article
            ref={lastRef}
            role="button"
            tabIndex={0}
            aria-label={`Add ${pokemon.name} to team`}
            onClick={handleCardClick}
            onKeyDown={handleKeyDown}
            className={`team-builder-mobile-card ${
                isSuggested ? 'is-suggested' : ''
            }`}
        >
            <div className="flex items-start justify-between gap-1">
                {isSuggested ? (
                    <div className="team-builder-mobile-card__badge">
                        New
                    </div>
                ) : (
                    <span />
                )}

                <button
                    onClick={handleFavoriteClick}
                    className={`team-builder-mobile-card__favorite ${isFavorite ? 'is-active' : ''}`}
                    aria-label={isFavorite ? `Remove ${pokemon.name} from favorites` : `Add ${pokemon.name} to favorites`}
                    title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                    <StarIcon className="w-3.5 h-3.5" isFavorite={isFavorite} color="currentColor" />
                </button>
            </div>

            <div className="team-builder-mobile-card__media">
                <div className="mx-auto aspect-square w-full max-w-[84px]">
                    <Sprite src={pokemon.sprite} alt={pokemon.name} className="h-full w-full" />
                </div>
            </div>

            <div className="mt-2">
                <p className="team-builder-mobile-card__name">
                    {pokemon.name}
                </p>
                <div className="mt-1 flex items-center gap-1">
                    {pokemon.types.map((type) => (
                        <img
                            key={type}
                            src={typeIcons[type]}
                            alt={type}
                            className="h-4 w-4 rounded-full"
                        />
                    ))}
                </div>
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

    const { rating, ratingColor, strengthCount, weaknessCount, topStrengths, topWeaknesses } = useMemo(() => {
        const sCount = teamAnalysis?.strengths?.size || 0;
        const wEntries = Object.entries(teamAnalysis?.weaknesses || {});
        const wCount = wEntries.length;
        // Score ranges roughly -12..+18; coarse bucketing keeps the chip
        // language honest without pretending to be a deep tier list.
        const score = sCount * 2 - wEntries.reduce((sum, [, v]) => sum + Math.max(0, v), 0);
        let label = 'Building';
        let color = colors.textMuted;
        if (teamSize >= 1) {
            if (score >= 8) { label = 'Excellent'; color = colors.success; }
            else if (score >= 3) { label = 'Strong'; color = colors.success; }
            else if (score >= -2) { label = 'Balanced'; color = colors.info || colors.primary; }
            else { label = 'Risky'; color = colors.danger; }
        }
        return {
            rating: label,
            ratingColor: color,
            strengthCount: sCount,
            weaknessCount: wCount,
            topStrengths: Array.from(teamAnalysis?.strengths || []).sort().slice(0, 6),
            topWeaknesses: wEntries.sort(([, a], [, b]) => b - a).slice(0, 6),
        };
    }, [teamAnalysis, teamSize, colors]);

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
                aria-label="Show team analysis"
                className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] transition-transform duration-200 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                style={{
                    backgroundColor: colors.cardLight,
                    color: colors.text,
                    border: `1px solid ${ratingColor}55`,
                }}
            >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ratingColor }} aria-hidden="true" />
                <span style={{ color: ratingColor }}>{rating}</span>
                <span className="opacity-70">·</span>
                <span style={{ color: colors.success }}>{strengthCount}↑</span>
                <span style={{ color: colors.danger }}>{weaknessCount}↓</span>
                <InfoIcon />
            </button>

            <AnchoredPopover
                isOpen={isOpen}
                anchorRef={triggerRef}
                popoverRef={popoverRef}
                role="dialog"
                ariaLabel="Team analysis summary"
                className="w-[min(20rem,calc(100vw-2rem))] rounded-2xl p-3 shadow-2xl"
                style={{
                    backgroundColor: colors.card,
                    border: `1px solid ${colors.cardLight}`,
                }}
                arrowStyle={{
                    backgroundColor: colors.card,
                    borderTop: `1px solid ${colors.cardLight}`,
                    borderLeft: `1px solid ${colors.cardLight}`,
                }}
            >
                    <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: colors.textMuted }}>
                            Team Snapshot
                        </p>
                        <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                            style={{ backgroundColor: `${ratingColor}22`, color: ratingColor }}
                        >
                            {rating}
                        </span>
                    </div>

                    <div className="mb-2">
                        <p className="text-[10px] font-semibold mb-1" style={{ color: colors.success }}>
                            Offensive Coverage ({strengthCount})
                        </p>
                        <div className="flex flex-wrap gap-1">
                            {topStrengths.length > 0 ? topStrengths.map((type) => (
                                <TypeBadge key={type} type={type} colors={colors} />
                            )) : (
                                <span className="text-[11px]" style={{ color: colors.textMuted }}>No advantages yet.</span>
                            )}
                        </div>
                    </div>

                    <div>
                        <p className="text-[10px] font-semibold mb-1" style={{ color: colors.danger }}>
                            Defensive Weaknesses ({weaknessCount})
                        </p>
                        <div className="flex flex-wrap items-center gap-1">
                            {topWeaknesses.length > 0 ? topWeaknesses.map(([type, score]) => (
                                <span key={type} className="inline-flex items-center gap-1">
                                    <TypeBadge type={type} colors={colors} />
                                    <span className="text-[10px] font-bold" style={{ color: colors.danger }}>×{score}</span>
                                </span>
                            )) : (
                                <span className="text-[11px]" style={{ color: colors.textMuted }}>Rock solid defence.</span>
                            )}
                        </div>
                    </div>
            </AnchoredPopover>
        </div>
    );
};

const MobileTeamSlot = ({ pokemon, index, colors, onEdit, onRemove }) => (
    <div className="relative min-w-0">
        <button
            type="button"
            onClick={() => pokemon && onEdit?.(pokemon)}
            className={`team-builder-mobile-slot ${pokemon ? 'is-filled' : 'is-empty'}`}
            aria-label={pokemon ? `Edit ${pokemon.name}` : `Empty team slot ${index + 1}`}
            title={pokemon ? pokemon.name : `Empty slot ${index + 1}`}
        >
            {pokemon ? (
                <Sprite src={pokemon.animatedSprite || pokemon.sprite} alt={pokemon.name} className="h-9 w-9" />
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
                aria-label={`Remove ${pokemon.name} from team`}
                title="Remove from team"
            >
                <TrashIcon />
            </button>
        )}
    </div>
);

export const MobileTeamBuilderView = ({
    currentTeam,
    teamName,
    setTeamName,
    handleRemoveFromTeam,
    handleSaveTeam,
    editingTeamId,
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
    generations,
    isInitialLoading,
    displayedPokemons,
    handleAddPokemonToTeam,
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

    return (
        <div className="team-builder-mobile space-y-4 lg:hidden">
            <div className="team-builder-mobile__sticky">
                <section className="team-builder-panel team-builder-mobile__composer p-4">
                    <div className="team-builder-panel__header">
                        <div>
                            <p className="team-builder-panel__eyebrow">Current roster</p>
                            <h2 className="team-builder-panel__title team-builder-panel__title--small">Team builder</h2>
                        </div>
                        <span className="team-builder-panel__meta">{currentTeam.length}/6</span>
                    </div>

                    <div className="team-builder-mobile__composer-row mt-4">
                        <input
                            type="text"
                            value={teamName}
                            onChange={(event) => setTeamName(event.target.value)}
                            placeholder="Team name"
                            className="team-builder-field min-w-0 flex-1"
                            aria-label="Team name"
                        />
                        <button
                            type="button"
                            onClick={handleSaveTeam}
                            className="team-builder-icon-button team-builder-icon-button--primary"
                            aria-label={editingTeamId ? 'Update team' : 'Save team'}
                            title={editingTeamId ? 'Update team' : 'Save team'}
                        >
                            <SaveIcon className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            onClick={handleShareTeam}
                            className="team-builder-icon-button"
                            aria-label="Share team"
                            title="Share team"
                        >
                            <ShareIcon />
                        </button>
                        <button
                            type="button"
                            onClick={handleExportToShowdown}
                            className="team-builder-icon-button"
                            aria-label="Export team"
                            title="Export team"
                        >
                            <ShowdownIcon />
                        </button>
                        <button
                            type="button"
                            onClick={handleClearTeam}
                            className="team-builder-icon-button team-builder-icon-button--danger"
                            aria-label="Clear team"
                            title="Clear team"
                        >
                            <ClearIcon />
                        </button>
                    </div>

                    <div className="team-builder-mobile__slots mt-3">
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

                    <TeamAnalysisChip
                        teamAnalysis={teamAnalysis}
                        teamSize={currentTeam.length}
                        colors={colors}
                    />
                </section>
            </div>

            <section className="team-builder-panel p-4">
                <div className="team-builder-mobile__filters">
                    <label className="team-builder-control team-builder-mobile__filter-control team-builder-mobile__filter-control--full">
                        <span className="team-builder-control__label">Search</span>
                        <input
                            type="text"
                            placeholder="Search Pokemon"
                            value={searchInput}
                            onChange={(event) => setSearchInput(event.target.value)}
                            className="team-builder-field"
                        />
                    </label>

                    <label className="team-builder-control team-builder-mobile__filter-control">
                        <span className="team-builder-control__label">Generation</span>
                        <select
                            value={selectedGeneration}
                            onChange={(event) => setSelectedGeneration(event.target.value)}
                            className="team-builder-field team-builder-select"
                        >
                            <option value="all">All Generations</option>
                            {generations.map((generation) => (
                                <option key={generation} value={generation} className="capitalize">
                                    {generation.replace('-', ' ')}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="team-builder-control team-builder-mobile__filter-control">
                        <span className="team-builder-control__label">Type</span>
                        <select
                            value={selectedTypeValue}
                            onChange={(event) => handleTypeSelectChange(event.target.value)}
                            className="team-builder-field team-builder-select"
                        >
                            <option value="all">All Types</option>
                            {Object.keys(typeIcons).map((type) => (
                                <option key={type} value={type} className="capitalize">
                                    {type}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="team-builder-control team-builder-mobile__filter-control">
                        <span className="team-builder-control__label">Pinned only</span>
                        <button
                            type="button"
                            onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                            className={`team-builder-toggle ${showOnlyFavorites ? 'is-active' : ''}`}
                            aria-label={showOnlyFavorites ? 'Show all Pokemon' : 'Show favorites only'}
                            aria-pressed={showOnlyFavorites}
                            title={showOnlyFavorites ? 'Show all Pokemon' : 'Show favorites only'}
                        >
                            <StarIcon className="w-5 h-5" isFavorite={showOnlyFavorites} color="currentColor" />
                            {showOnlyFavorites ? 'Favorites' : 'All'}
                        </button>
                    </label>
                </div>
            </section>

            <section className="team-builder-panel p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                        <p className="team-builder-panel__eyebrow">Pokédex feed</p>
                        <h3 className="team-builder-panel__title team-builder-panel__title--small mt-2">Available Pokémon</h3>
                    </div>
                    <span className="team-builder-panel__meta">
                        {displayedPokemons.length}
                    </span>
                </div>

                <div className="team-builder-mobile__available mt-2">
                    {isInitialLoading ? (
                        <div className="team-builder-spinner-wrap h-full">
                            <div className="team-builder-spinner" aria-hidden="true" />
                        </div>
                    ) : (
                        <>
                            <div className="h-full overflow-y-auto p-2 custom-scrollbar">
                                <div className="team-builder-mobile__grid grid grid-cols-3 gap-2">
                                    {displayedPokemons.map((pokemon, index) => (
                                        <MobilePokemonPickerCard
                                            key={pokemon.id}
                                            pokemon={pokemon}
                                            onAddToTeam={handleAddPokemonToTeam}
                                            isSuggested={suggestedPokemonIds.has(pokemon.id)}
                                            isFavorite={favoritePokemons.has(pokemon.id)}
                                            onToggleFavorite={onToggleFavoritePokemon}
                                            colors={colors}
                                            lastRef={index === displayedPokemons.length - 1 ? lastPokemonElementRef : null}
                                        />
                                    ))}
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
                                            title={showOnlyFavorites ? 'No favorites match' : 'No Pokemon found'}
                                            message={showOnlyFavorites ? 'Try clearing filters or favoriting more Pokemon.' : 'Try a different search, generation, or type.'}
                                        />
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </section>

            {currentTeam.length > 0 && (
                <section className="team-builder-panel p-4 animate-fade-in" aria-label="Team analysis">
                    <div className="flex items-center justify-between gap-2 mb-3">
                        <div>
                            <p className="team-builder-panel__eyebrow">Analysis</p>
                            <h3 className="team-builder-panel__title team-builder-panel__title--small mt-2">Team analysis</h3>
                        </div>
                        <span className="text-[10px] text-muted">
                            tap chip above for details
                        </span>
                    </div>

                    <div className="team-builder-analysis-grid">
                        <div className="team-builder-analysis-card">
                            <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: colors.success }}>
                                Strengths · {teamAnalysis.strengths.size}
                            </p>
                            <div className="flex flex-wrap gap-1">
                                {teamAnalysis.strengths.size > 0 ? Array.from(teamAnalysis.strengths).sort().slice(0, 8).map((type) => (
                                    <TypeBadge key={type} type={type} colors={colors} />
                                )) : (
                                    <span className="text-[11px]" style={{ color: colors.textMuted }}>None yet.</span>
                                )}
                            </div>
                        </div>

                        <div className="team-builder-analysis-card">
                            <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: colors.danger }}>
                                Weaknesses · {Object.keys(teamAnalysis.weaknesses).length}
                            </p>
                            <div className="flex flex-wrap items-center gap-1">
                                {Object.keys(teamAnalysis.weaknesses).length > 0 ? Object.entries(teamAnalysis.weaknesses)
                                    .sort(([, a], [, b]) => b - a)
                                    .slice(0, 8)
                                    .map(([type, score]) => (
                                        <span key={type} className="inline-flex items-center gap-0.5">
                                            <TypeBadge type={type} colors={colors} />
                                            <span className="text-[10px] font-bold" style={{ color: colors.danger }}>×{score}</span>
                                        </span>
                                    )) : (
                                    <span className="text-[11px]" style={{ color: colors.textMuted }}>Rock solid.</span>
                                )}
                            </div>
                        </div>
                    </div>
                </section>
            )}

            <section className="team-builder-panel p-5">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="team-builder-panel__eyebrow">Saved work</p>
                        <h3 className="team-builder-panel__title team-builder-panel__title--small mt-2">
                            Resume a saved lineup
                        </h3>
                    </div>
                    <button
                        type="button"
                        onClick={onNavigateToTeams}
                        className="text-sm font-semibold"
                        style={{ color: colors.primary }}
                    >
                        View all
                    </button>
                </div>

                <div className="mt-4 space-y-3">
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
                                                src={pokemon.sprite || POKEBALL_PLACEHOLDER_URL}
                                                alt={pokemon.name}
                                                className="-ml-2 h-9 w-9 rounded-full border-2 first:ml-0"
                                                style={{ borderColor: colors.background, backgroundColor: colors.card }}
                                                onError={(event) => { event.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => handleToggleFavorite(team)}
                                    className={`team-builder-icon-button ${team.isFavorite ? 'team-builder-icon-button--accent' : ''}`}
                                    aria-label={team.isFavorite ? `Remove ${team.name} from favorites` : `Favorite ${team.name}`}
                                >
                                    <StarIcon isFavorite={team.isFavorite} color="currentColor" />
                                </button>
                            </div>

                            <div className="mt-4 flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleEditTeam(team)}
                                    className="team-builder-button team-builder-button--primary team-builder-button--grow"
                                >
                                    Edit
                                </button>
                                <button
                                    type="button"
                                    onClick={() => requestDeleteTeam(team.id, team.name)}
                                    className="team-builder-button team-builder-button--secondary !text-danger"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    )) : (
                        <p className="team-builder-empty-note text-sm">
                            No recent teams yet.
                        </p>
                    )}
                </div>
            </section>

        </div>
    );
};