import React from 'react';
import '../../styles/team-builder-view.css';
import { POKEBALL_PLACEHOLDER_URL } from '../../constants/theme';
import { typeColors, typeIcons } from '../../constants/types';
import { EmptyState } from '../EmptyState';
import { MobileTeamBuilderView } from './MobileTeamBuilderView';
import { PokemonCard } from '../PokemonCard';
import { Sprite } from '../Sprite';
import { TeamIdentitySummary } from '../TeamIdentitySummary';
import { TypeBadge } from '../TypeBadge';
import {
    ClearIcon,
    EditIcon,
    SaveIcon,
    ShareIcon,
    ShowdownIcon,
    StarIcon,
    TrashIcon,
} from '../icons';

export function TeamBuilderView({
    currentTeam,
    teamName,
    setTeamName,
    handleRemoveFromTeam,
    handleReorderTeam,
    handleSaveTeam,
    editingTeamId,
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
    generations,
    isInitialLoading,
    availablePokemons,
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
}) {
    const [dragIndex, setDragIndex] = React.useState(null);

    const displayedPokemons = showOnlyFavorites
        ? availablePokemons.filter((pokemon) => favoritePokemons.has(pokemon.id))
        : availablePokemons;
    const selectedTypeCount = selectedTypes.size;

    return (
        <>
            <MobileTeamBuilderView
                currentTeam={currentTeam}
                teamName={teamName}
                setTeamName={setTeamName}
                handleRemoveFromTeam={handleRemoveFromTeam}
                handleSaveTeam={handleSaveTeam}
                editingTeamId={editingTeamId}
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
                generations={generations}
                isInitialLoading={isInitialLoading}
                displayedPokemons={displayedPokemons}
                handleAddPokemonToTeam={handleAddPokemonToTeam}
                lastPokemonElementRef={lastPokemonElementRef}
                isFetchingMore={isFetchingMore}
                selectedTypes={selectedTypes}
                onToggleFavoritePokemon={onToggleFavoritePokemon}
                handleTypeSelection={handleTypeSelection}
                showDetails={showDetails}
                suggestedPokemonIds={suggestedPokemonIds}
                colors={colors}
                onEditTeamPokemon={onEditTeamPokemon}
                favoritePokemons={favoritePokemons}
                showOnlyFavorites={showOnlyFavorites}
                setShowOnlyFavorites={setShowOnlyFavorites}
            />

            <main className="team-builder hidden lg:grid lg:grid-cols-12 gap-6 xl:gap-7">
                <div className="lg:col-span-3 space-y-6 lg:sticky lg:top-6 lg:self-start">
                    <section className="team-builder-panel p-4">
                        <div className="team-builder-current-head">
                            <div className="team-builder-panel__header team-builder-panel__header--compact">
                                <h2 className="team-builder-panel__title team-builder-panel__title--compact">Current team</h2>
                                <span className="team-builder-panel__meta team-builder-panel__meta--compact">{currentTeam.length}/6</span>
                            </div>

                            <label className="team-builder-control team-builder-control--compact" htmlFor="team-builder-name">
                                <span className="team-builder-control__label team-builder-control__label--compact">Team name</span>
                                <input
                                    id="team-builder-name"
                                    type="text"
                                    value={teamName}
                                    onChange={(e) => setTeamName(e.target.value)}
                                    placeholder="Name this lineup"
                                    className="team-builder-field team-builder-field--compact"
                                />
                            </label>
                        </div>

                        <div className="team-builder-slots" aria-label="Current team slots">
                            {currentTeam.map((pokemon, idx) => (
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
                                    <div className="team-builder-slot__media">
                                        <Sprite src={pokemon.animatedSprite || pokemon.sprite} alt={pokemon.name} className="w-full h-full" />
                                    </div>
                                    <p className="team-builder-slot__name">{pokemon.name}</p>

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
                                        aria-label={`Remove ${pokemon.name} from team`}
                                        className="team-builder-slot__control team-builder-slot__control--remove"
                                    >
                                        <TrashIcon />
                                    </button>
                                </div>
                            ))}

                            {Array.from({ length: 6 - currentTeam.length }).map((_, index) => (
                                <div key={index} className="team-builder-slot team-builder-slot--empty" aria-hidden="true">
                                    <img src={POKEBALL_PLACEHOLDER_URL} alt="Empty team slot" />
                                </div>
                            ))}
                        </div>

                        <TeamIdentitySummary team={currentTeam} />

                        <div className="team-builder-action-row">
                            <button type="button" onClick={handleSaveTeam} className="team-builder-button team-builder-button--primary team-builder-button--grow">
                                <SaveIcon />
                                {editingTeamId ? 'Update team' : 'Save team'}
                            </button>
                            <button onClick={handleExportToShowdown} type="button" aria-label="Export team to Pokémon Showdown" className="team-builder-icon-button" title="Export to Showdown"><ShowdownIcon /></button>
                            <button onClick={handleShareTeam} type="button" aria-label="Share team" className="team-builder-icon-button" title="Share team"><ShareIcon /></button>
                            <button onClick={handleClearTeam} type="button" aria-label="Clear team" className="team-builder-icon-button team-builder-icon-button--danger" title="Clear team"><ClearIcon /></button>
                        </div>
                    </section>

                    <section className="team-builder-panel p-4">
                        <div className="team-builder-panel__header team-builder-panel__header--compact">
                            <h3 className="team-builder-panel__title team-builder-panel__title--compact">Team analysis</h3>
                        </div>

                        <div className="team-builder-analysis-grid mt-4">
                            <div className="team-builder-analysis-card">
                                <h4 className="team-builder-analysis-card__title team-builder-analysis-card__title--success">Offensive coverage</h4>
                                <div className="flex flex-wrap gap-1">
                                    {currentTeam.length > 0
                                        ? (teamAnalysis.strengths.size > 0
                                            ? Array.from(teamAnalysis.strengths).sort().map((type) => <TypeBadge key={type} type={type} colors={colors} />)
                                            : <p className="team-builder-empty-note !p-0">No type advantages found.</p>)
                                        : <p className="team-builder-empty-note !p-0">Add Pokemon to preview your coverage.</p>}
                                </div>
                            </div>
                            <div className="team-builder-analysis-card">
                                <h4 className="team-builder-analysis-card__title team-builder-analysis-card__title--danger">Defensive weaknesses</h4>
                                <div className="flex flex-wrap gap-1">
                                    {currentTeam.length > 0
                                        ? (Object.keys(teamAnalysis.weaknesses).length > 0
                                            ? Object.entries(teamAnalysis.weaknesses).sort(([, a], [, b]) => b - a).map(([type, score]) => (
                                                <div key={type} className="flex items-center gap-1">
                                                    <TypeBadge type={type} colors={colors} />
                                                    <span className="team-builder-analysis-score">({score}x)</span>
                                                </div>
                                            ))
                                            : <p className="team-builder-empty-note !p-0">Your team is rock solid.</p>)
                                        : <p className="team-builder-empty-note !p-0">Weaknesses appear after the first pick.</p>}
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                <div className="lg:col-span-9 space-y-6">
                    <section className="team-builder-panel team-builder-panel--picker p-4">
                        <div className="team-builder-panel__header team-builder-panel__header--picker team-builder-panel__header--compact">
                            <div className="team-builder-picker-heading-row team-builder-picker-heading-row--compact min-w-0">
                                <h2 className="team-builder-panel__title team-builder-panel__title--compact">Pokédex</h2>
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
                            <span className="team-builder-picker-summary">{selectedTypeCount === 0 ? 'All types' : `${selectedTypeCount} active`}</span>
                        </div>

                        <div className="team-builder-filter-layout team-builder-filter-layout--compact mt-3">
                            <label className="team-builder-control team-builder-control--compact">
                                <span className="team-builder-control__label team-builder-control__label--compact">Search</span>
                                <input type="text" placeholder="Search by name" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="team-builder-field team-builder-field--compact" />
                            </label>
                            <label className="team-builder-control team-builder-control--compact">
                                <span className="team-builder-control__label team-builder-control__label--compact">Generation</span>
                                <select value={selectedGeneration} onChange={(e) => setSelectedGeneration(e.target.value)} className="team-builder-field team-builder-field--compact team-builder-select">
                                    <option value="all">All generations</option>
                                    {generations.map((generation) => <option key={generation} value={generation} className="capitalize">{generation.replace('-', ' ')}</option>)}
                                </select>
                            </label>
                            <label className="team-builder-control team-builder-control--compact">
                                <span className="team-builder-control__label team-builder-control__label--compact">Pinned only</span>
                                <button
                                    type="button"
                                    onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                                    className={`team-builder-toggle team-builder-toggle--compact ${showOnlyFavorites ? 'is-active' : ''}`}
                                    aria-pressed={showOnlyFavorites}
                                >
                                    <StarIcon className="w-5 h-5" isFavorite={showOnlyFavorites} color="currentColor" />
                                    {showOnlyFavorites ? 'Showing favorites' : 'Show favorites'}
                                </button>
                            </label>
                        </div>

                        <div className="team-builder-results mt-4">
                            {isInitialLoading ? (
                                <div className="team-builder-spinner-wrap">
                                    <div className="team-builder-spinner" aria-hidden="true"></div>
                                </div>
                            ) : (
                                <div className="team-builder-results__scroll custom-scrollbar">
                                    <div className="team-builder-results__grid grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 p-1 py-4">
                                        {displayedPokemons.map((pokemon, index) => (
                                            <PokemonCard
                                                key={pokemon.id}
                                                details={pokemon}
                                                onCardClick={showDetails}
                                                onAddToTeam={handleAddPokemonToTeam}
                                                lastRef={index === displayedPokemons.length - 1 ? lastPokemonElementRef : null}
                                                isSuggested={suggestedPokemonIds.has(pokemon.id)}
                                                colors={colors}
                                                isFavorite={favoritePokemons.has(pokemon.id)}
                                                onToggleFavorite={onToggleFavoritePokemon}
                                            />
                                        ))}
                                    </div>
                                    {isFetchingMore && <div className="team-builder-spinner-wrap py-4"><div className="team-builder-spinner team-builder-spinner--small" aria-hidden="true"></div></div>}
                                    {displayedPokemons.length === 0 && !isInitialLoading && (
                                        <div className="px-2 pb-4">
                                            <EmptyState
                                                compact
                                                title={showOnlyFavorites ? 'No favorites match' : 'No Pokémon found'}
                                                message={showOnlyFavorites ? 'Try clearing filters or favoriting more Pokémon.' : 'Try a different search, generation, or type.'}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="team-builder-panel p-4">
                        <div className="team-builder-panel__header team-builder-panel__header--compact">
                            <h2 className="team-builder-panel__title team-builder-panel__title--compact">Recent teams</h2>
                            <button type="button" onClick={onNavigateToTeams} className="team-builder-button team-builder-button--inline team-builder-button--inline-compact">View all</button>
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
                                                        src={pokemon.sprite || POKEBALL_PLACEHOLDER_URL}
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
                                            title={team.isFavorite ? 'Unfavorite team' : 'Favorite team'}
                                            className={`team-builder-icon-button team-builder-icon-button--small ${team.isFavorite ? 'team-builder-icon-button--accent' : ''}`}
                                        >
                                            <StarIcon isFavorite={team.isFavorite} color="currentColor" />
                                        </button>
                                    </div>

                                    <div className="team-builder-recent-card__actions">
                                        <button type="button" onClick={() => handleEditTeam(team)} className="team-builder-button team-builder-button--secondary team-builder-button--grow team-builder-button--small">Edit</button>
                                        <button type="button" onClick={() => requestDeleteTeam(team.id, team.name)} className="team-builder-icon-button team-builder-icon-button--danger team-builder-icon-button--small" aria-label={`Delete ${team.name}`}><TrashIcon /></button>
                                    </div>
                                </article>
                            )) : <div className="team-builder-empty-note">No recent teams yet.</div>}
                        </div>
                    </section>
                </div>
            </main>
        </>
    );
}