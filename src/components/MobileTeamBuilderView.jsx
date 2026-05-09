import React, { useEffect, useMemo, useRef, useState } from 'react';
import { POKEBALL_PLACEHOLDER_URL } from '../constants/theme';
import { typeIcons } from '../constants/types';
import { EmptyState } from './EmptyState';
import { Sprite } from './Sprite';
import { TypeBadge } from './TypeBadge';
import { AnchoredPopover } from './AnchoredPopover';
import {
    ClearIcon,
    InfoIcon,
    SaveIcon,
    ShareIcon,
    ShowdownIcon,
    StarIcon,
    TrashIcon,
} from './icons';

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
            className={`relative overflow-hidden rounded-2xl border p-2 text-left transition-all duration-200 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                isSuggested ? 'ring-2 ring-success' : ''
            }`}
            style={{
                backgroundColor: colors.card,
                borderColor: colors.cardLight,
                boxShadow: 'var(--elevation-1)',
            }}
        >
            <div className="flex items-start justify-between gap-1">
                {isSuggested ? (
                    <div
                        className="rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.14em] text-white"
                        style={{ backgroundColor: colors.success }}
                    >
                        New
                    </div>
                ) : (
                    <span />
                )}

                <button
                    onClick={handleFavoriteClick}
                    className="rounded-full p-1.5 transition-transform duration-200 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-warning"
                    style={{
                        backgroundColor: isFavorite ? 'rgba(251, 191, 36, 0.16)' : colors.cardLight,
                        color: isFavorite ? '#FBBF24' : colors.textMuted,
                    }}
                    aria-label={isFavorite ? `Remove ${pokemon.name} from favorites` : `Add ${pokemon.name} to favorites`}
                    title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                    <StarIcon className="w-3.5 h-3.5" isFavorite={isFavorite} color="currentColor" />
                </button>
            </div>

            <div className="mt-1.5 rounded-2xl p-1.5" style={{ backgroundColor: colors.background }}>
                <div className="mx-auto aspect-square w-full max-w-[84px]">
                    <Sprite src={pokemon.sprite} alt={pokemon.name} className="h-full w-full" />
                </div>
            </div>

            <div className="mt-2">
                <p className="truncate text-[11px] font-bold capitalize leading-tight" style={{ color: colors.text }}>
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
            className="flex aspect-square w-full items-center justify-center rounded-xl border transition-transform duration-200 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            style={{
                backgroundColor: colors.background,
                borderColor: pokemon ? colors.primary : colors.cardLight,
            }}
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
                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-white shadow-md transition-transform duration-200 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-danger"
                style={{ backgroundColor: colors.danger }}
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
        <div className="space-y-4 lg:hidden">
            <div
                className="sticky top-0 z-20 -mx-4 border-b px-4 pb-4 pt-3 backdrop-blur-xl"
                style={{
                    background: `linear-gradient(180deg, ${colors.background}F5 0%, ${colors.background}EA 100%)`,
                    borderColor: colors.cardLight,
                }}
            >
                <section
                    className="rounded-[24px] border p-3"
                    style={{
                        backgroundColor: colors.card,
                        borderColor: colors.cardLight,
                        boxShadow: 'var(--elevation-2)',
                    }}
                >
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={teamName}
                            onChange={(event) => setTeamName(event.target.value)}
                            placeholder="Team name"
                            className="min-w-0 flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            style={{
                                backgroundColor: colors.background,
                                borderColor: 'transparent',
                                color: colors.text,
                            }}
                            aria-label="Team name"
                        />
                        <button
                            type="button"
                            onClick={handleSaveTeam}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white transition-transform duration-200 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            style={{ backgroundColor: colors.primary }}
                            aria-label={editingTeamId ? 'Update team' : 'Save team'}
                            title={editingTeamId ? 'Update team' : 'Save team'}
                        >
                            <SaveIcon className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            onClick={handleShareTeam}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            style={{ backgroundColor: colors.cardLight, color: colors.text }}
                            aria-label="Share team"
                            title="Share team"
                        >
                            <ShareIcon />
                        </button>
                        <button
                            type="button"
                            onClick={handleExportToShowdown}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            style={{ backgroundColor: colors.cardLight, color: colors.text }}
                            aria-label="Export team"
                            title="Export team"
                        >
                            <ShowdownIcon />
                        </button>
                        <button
                            type="button"
                            onClick={handleClearTeam}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-danger"
                            style={{ backgroundColor: colors.cardLight, color: colors.danger }}
                            aria-label="Clear team"
                            title="Clear team"
                        >
                            <ClearIcon />
                        </button>
                    </div>

                    <div className="mt-3 grid grid-cols-6 gap-1.5">
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

            <section
                className="rounded-[24px] p-4"
                style={{ backgroundColor: colors.card, boxShadow: 'var(--elevation-2)' }}
            >
                <input
                    type="text"
                    placeholder="Search Pokemon..."
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    className="w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    style={{
                        backgroundColor: colors.background,
                        borderColor: 'transparent',
                        color: colors.text,
                    }}
                />

                <div className="mt-2 grid grid-cols-3 gap-2">
                    <select
                        value={selectedGeneration}
                        onChange={(event) => setSelectedGeneration(event.target.value)}
                        className="min-w-0 rounded-xl border px-3 py-3 text-sm capitalize focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        style={{
                            backgroundColor: colors.background,
                            borderColor: 'transparent',
                            color: colors.text,
                        }}
                    >
                        <option value="all">All Generations</option>
                        {generations.map((generation) => (
                            <option key={generation} value={generation} className="capitalize">
                                {generation.replace('-', ' ')}
                            </option>
                        ))}
                    </select>

                    <select
                        value={selectedTypeValue}
                        onChange={(event) => handleTypeSelectChange(event.target.value)}
                        className="min-w-0 rounded-xl border px-3 py-3 text-sm capitalize focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        style={{
                            backgroundColor: colors.background,
                            borderColor: 'transparent',
                            color: colors.text,
                        }}
                    >
                        <option value="all">All Types</option>
                        {Object.keys(typeIcons).map((type) => (
                            <option key={type} value={type} className="capitalize">
                                {type}
                            </option>
                        ))}
                    </select>

                    <button
                        type="button"
                        onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                        className="flex min-h-[44px] items-center justify-center rounded-xl border transition-transform duration-200 active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-warning"
                        style={{
                            backgroundColor: showOnlyFavorites ? 'rgba(251, 191, 36, 0.14)' : colors.background,
                            borderColor: showOnlyFavorites ? '#FBBF24' : 'transparent',
                            color: colors.text,
                        }}
                        aria-label={showOnlyFavorites ? 'Show all Pokemon' : 'Show favorites only'}
                        aria-pressed={showOnlyFavorites}
                        title={showOnlyFavorites ? 'Show all Pokemon' : 'Show favorites only'}
                    >
                        <StarIcon className="w-5 h-5" isFavorite={showOnlyFavorites} color={colors.textMuted} />
                    </button>
                </div>
            </section>

            <section
                className="rounded-[24px] p-4"
                style={{ backgroundColor: colors.card, boxShadow: 'var(--elevation-2)' }}
            >
                <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                        <p
                            className="text-[11px] font-bold uppercase tracking-[0.24em]"
                            style={{ color: colors.textMuted }}
                        >
                            Available Pokemon
                        </p>
                    </div>
                    <span
                        className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em]"
                        style={{ backgroundColor: colors.cardLight, color: colors.textMuted }}
                    >
                        {displayedPokemons.length}
                    </span>
                </div>

                <div className="mt-2 h-[56vh] overflow-hidden rounded-2xl" style={{ backgroundColor: colors.background }}>
                    {isInitialLoading ? (
                        <div className="flex h-full items-center justify-center">
                            <div
                                className="h-12 w-12 animate-spin rounded-full border-b-2"
                                style={{ borderColor: colors.primary }}
                            />
                        </div>
                    ) : (
                        <>
                            <div className="h-full overflow-y-auto p-2 custom-scrollbar">
                                <div className="grid grid-cols-3 gap-2">
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
                                    <div className="flex justify-center py-4">
                                        <div
                                            className="h-8 w-8 animate-spin rounded-full border-b-2"
                                            style={{ borderColor: colors.primary }}
                                        />
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
                <section
                    className="rounded-[28px] p-4 animate-fade-in"
                    style={{ backgroundColor: colors.card, boxShadow: 'var(--elevation-2)' }}
                    aria-label="Team analysis"
                >
                    <div className="flex items-center justify-between gap-2 mb-3">
                        <p
                            className="text-[11px] font-bold uppercase tracking-[0.24em]"
                            style={{ color: colors.textMuted }}
                        >
                            Team Analysis
                        </p>
                        <span className="text-[10px]" style={{ color: colors.textMuted }}>
                            tap chip above for details
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl p-3" style={{ backgroundColor: colors.background }}>
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

                        <div className="rounded-2xl p-3" style={{ backgroundColor: colors.background }}>
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

            <section
                className="rounded-[28px] p-5"
                style={{ backgroundColor: colors.card, boxShadow: 'var(--elevation-2)' }}
            >
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p
                            className="text-[11px] font-bold uppercase tracking-[0.24em]"
                            style={{ color: colors.textMuted }}
                        >
                            Recent Teams
                        </p>
                        <h3 className="mt-2 text-xl font-bold" style={{ color: colors.text }}>
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
                            className="rounded-3xl p-4"
                            style={{ backgroundColor: colors.background }}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-base font-bold" style={{ color: colors.text }}>
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
                                    className="rounded-full p-2"
                                    style={{ backgroundColor: colors.card, color: colors.textMuted }}
                                    aria-label={team.isFavorite ? `Remove ${team.name} from favorites` : `Favorite ${team.name}`}
                                >
                                    <StarIcon isFavorite={team.isFavorite} color={colors.textMuted} />
                                </button>
                            </div>

                            <div className="mt-4 flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleEditTeam(team)}
                                    className="flex-1 rounded-2xl px-3 py-3 text-sm font-semibold text-white"
                                    style={{ backgroundColor: colors.primary }}
                                >
                                    Edit
                                </button>
                                <button
                                    type="button"
                                    onClick={() => requestDeleteTeam(team.id, team.name)}
                                    className="rounded-2xl px-4 py-3 text-sm font-semibold"
                                    style={{ backgroundColor: colors.card, color: colors.danger }}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    )) : (
                        <p className="rounded-3xl p-4 text-sm" style={{ backgroundColor: colors.background, color: colors.textMuted }}>
                            No recent teams yet.
                        </p>
                    )}
                </div>
            </section>

        </div>
    );
};