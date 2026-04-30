import React from 'react';
import { POKEBALL_PLACEHOLDER_URL } from '../constants/theme';
import { typeIcons } from '../constants/types';
import { EmptyState } from './EmptyState';
import { Sprite } from './Sprite';
import { TypeBadge } from './TypeBadge';
import {
    ClearIcon,
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
                    type="button"
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
    showDetails,
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
                className="sticky top-0 z-30 -mx-4 border-b px-4 pb-4 pt-3 backdrop-blur-xl"
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

            {currentTeam.length > 0 && (
                <section
                    className="rounded-[28px] p-5"
                    style={{ backgroundColor: colors.card, boxShadow: 'var(--elevation-2)' }}
                >
                    <p
                        className="text-[11px] font-bold uppercase tracking-[0.24em]"
                        style={{ color: colors.textMuted }}
                    >
                        Team Analysis
                    </p>
                    <h3 className="mt-2 text-xl font-bold" style={{ color: colors.text }}>
                        Coverage snapshot
                    </h3>

                    <div className="mt-4">
                        <h4 className="font-semibold" style={{ color: colors.success }}>
                            Offensive Coverage
                        </h4>
                        <div className="mt-2 flex flex-wrap gap-1">
                            {teamAnalysis.strengths.size > 0 ? Array.from(teamAnalysis.strengths).sort().map((type) => (
                                <TypeBadge key={type} type={type} colors={colors} />
                            )) : (
                                <p className="text-sm" style={{ color: colors.textMuted }}>
                                    No type advantages found.
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="mt-4">
                        <h4 className="font-semibold" style={{ color: colors.danger }}>
                            Defensive Weaknesses
                        </h4>
                        <div className="mt-2 flex flex-wrap gap-1">
                            {Object.keys(teamAnalysis.weaknesses).length > 0 ? Object.entries(teamAnalysis.weaknesses)
                                .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
                                .map(([type, score]) => (
                                    <div key={type} className="flex items-center gap-1">
                                        <TypeBadge type={type} colors={colors} />
                                        <span className="text-xs" style={{ color: colors.danger }}>
                                            ({score}x)
                                        </span>
                                    </div>
                                )) : (
                                <p className="text-sm" style={{ color: colors.textMuted }}>
                                    Your team is rock solid.
                                </p>
                            )}
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
};