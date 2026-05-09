import React from 'react';
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

            <main className="hidden lg:grid lg:grid-cols-12 gap-8">
                <div className="lg:col-span-3 space-y-8 lg:sticky lg:top-4 lg:self-start">
                    <section className="p-6 rounded-xl shadow-lg" style={{ backgroundColor: colors.card }}>
                        <h2 className="text-lg md:text-xl font-bold mb-4 border-b-2 pb-2" style={{ borderColor: colors.primary, color: colors.text }}>Current Team</h2>
                        <input type="text" value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Team Name" className="w-full p-3 rounded-lg border-2 focus:outline-none" style={{ backgroundColor: colors.cardLight, borderColor: 'transparent', color: colors.text }} />
                        <div className="grid grid-cols-3 gap-4 min-h-[120px] p-4 rounded-lg mt-4" style={{ backgroundColor: colors.background }}>
                            {currentTeam.map((pokemon, idx) => (
                                <div
                                    key={pokemon.instanceId}
                                    className={`text-center relative group cursor-grab active:cursor-grabbing rounded-lg transition-all ${dragIndex === idx ? 'opacity-40' : 'opacity-100'} hover:bg-surface-raised/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
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
                                    onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        const from = Number(e.dataTransfer.getData('text/plain'));
                                        if (!Number.isNaN(from)) handleReorderTeam?.(from, idx);
                                        setDragIndex(null);
                                    }}
                                    onDragEnd={() => setDragIndex(null)}
                                >
                                    <div className="mx-auto h-20 w-20">
                                        <Sprite src={pokemon.animatedSprite || pokemon.sprite} alt={pokemon.name} className="w-full h-full" />
                                    </div>
                                    <p className="text-xs capitalize truncate" style={{ color: colors.text }}>{pokemon.name}</p>

                                    <button
                                        onClick={(e) => { e.stopPropagation(); onEditTeamPokemon(pokemon); }}
                                        aria-label={`Edit ${pokemon.name}`}
                                        className="absolute top-1 left-1 bg-gray-700 bg-opacity-50 text-white rounded-full h-6 w-6 flex items-center justify-center transition-opacity text-sm opacity-100 visible lg:opacity-0 lg:invisible lg:group-hover:opacity-100 lg:group-hover:visible"
                                    >
                                        <EditIcon />
                                    </button>

                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleRemoveFromTeam(pokemon.instanceId); }}
                                        aria-label={`Remove ${pokemon.name} from team`}
                                        className="absolute top-1 right-1 bg-danger text-white rounded-full h-6 w-6 flex items-center justify-center text-sm opacity-100 visible lg:opacity-0 lg:invisible lg:group-hover:opacity-100 lg:group-hover:visible transition-opacity duration-200"
                                    >
                                        <TrashIcon />
                                    </button>
                                </div>
                            ))}

                            {Array.from({ length: 6 - currentTeam.length }).map((_, index) => (
                                <div key={index} className="flex items-center justify-center"><img src={POKEBALL_PLACEHOLDER_URL} alt="Empty team slot" className="w-12 h-12 opacity-40" /></div>
                            ))}
                        </div>

                        <TeamIdentitySummary team={currentTeam} />
                        <div className="flex items-center gap-2 mt-4">
                            <button onClick={handleSaveTeam} className="w-full flex items-center justify-center gap-2 font-bold py-2 px-4 rounded-lg transition-all duration-200 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]" style={{ backgroundColor: colors.primary, color: colors.background }}> <SaveIcon /> {editingTeamId ? 'Update' : 'Save'} </button>
                            <button onClick={handleExportToShowdown} type="button" aria-label="Export team to Pokémon Showdown" className="p-2 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary" style={{ backgroundColor: colors.cardLight, color: colors.text }} title="Export to Showdown"><ShowdownIcon /></button>
                            <button onClick={handleShareTeam} type="button" aria-label="Share team" className="p-2 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary" style={{ backgroundColor: colors.cardLight, color: colors.text }} title="Share Team"><ShareIcon /></button>
                            <button onClick={handleClearTeam} type="button" aria-label="Clear team" className="p-2 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary" style={{ backgroundColor: colors.cardLight, color: colors.text }} title="Clear Team"><ClearIcon /></button>
                        </div>
                    </section>

                    <section className="p-6 rounded-xl shadow-lg backdrop-blur-sm" style={{ backgroundColor: colors.card, borderTop: `1px solid ${colors.cardLight}` }}>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg md:text-xl font-bold" style={{ color: colors.text }}>Recent Teams</h2>
                            <button onClick={onNavigateToTeams} className="text-sm hover:underline transition-all duration-200 hover:scale-105" style={{ color: colors.primary }}>View All</button>
                        </div>
                        <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar" style={{ '--scrollbar-track-color': colors.card, '--scrollbar-thumb-color': colors.primary, '--scrollbar-thumb-border-color': colors.card }}>
                            {recentTeams.length > 0 ? recentTeams.map((team) => (
                                <div key={team.id} className="p-4 rounded-lg flex items-center justify-between transition-all duration-200 hover:shadow-md" style={{ backgroundColor: colors.cardLight }}>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-lg truncate" style={{ color: colors.text }}>{team.name}</p>
                                        <div className="flex mt-1">
                                            {team.pokemons.map((pokemon) => <img key={pokemon.id} src={pokemon.sprite || POKEBALL_PLACEHOLDER_URL} onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }} alt={pokemon.name} className="h-8 w-8 -ml-2 border-2 rounded-full transition-transform duration-200 hover:scale-110 hover:z-10" style={{ borderColor: colors.cardLight, backgroundColor: colors.card }} />)}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                        <button onClick={() => handleToggleFavorite(team)} title="Favorite">
                                            <StarIcon isFavorite={team.isFavorite} color={colors.textMuted} />
                                        </button>
                                        <button onClick={() => handleEditTeam(team)} className="text-xs font-bold py-1 px-3 rounded-full transition-all duration-200 hover:scale-105 active:scale-95" style={{ backgroundColor: colors.primary, color: colors.background }}>Edit</button>
                                        <button onClick={() => requestDeleteTeam(team.id, team.name)} className="bg-danger p-1 hover:opacity-90 text-white rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"><TrashIcon /></button>
                                    </div>
                                </div>
                            )) : <p className="text-center py-4" style={{ color: colors.textMuted }}>No recent teams yet.</p>}
                        </div>
                    </section>
                </div>

                <div className="lg:col-span-6">
                    <section className="p-6 rounded-xl shadow-lg h-full flex flex-col" style={{ backgroundColor: colors.card }}>
                        <div className="mb-4">
                            <h2 className="text-xl md:text-2xl font-bold mb-4" style={{ color: colors.text }}>Choose your Pokémon!</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <input type="text" placeholder="Search Pokémon..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="w-full p-3 rounded-lg border-2 focus:outline-none" style={{ backgroundColor: colors.cardLight, borderColor: 'transparent', color: colors.text }} />
                                <select value={selectedGeneration} onChange={(e) => setSelectedGeneration(e.target.value)} className="w-full p-3 rounded-lg border-2 focus:outline-none appearance-none capitalize" style={{ backgroundColor: colors.cardLight, borderColor: 'transparent', color: colors.text }}>
                                    <option value="all" style={{ color: colors.text }}>All Generations</option>
                                    {generations.map((generation) => <option key={generation} value={generation} className="capitalize" style={{ color: colors.text }}>{generation.replace('-', ' ')}</option>)}
                                </select>
                                <button
                                    onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                                    className={`w-full p-3 rounded-lg border-2 focus:outline-none flex items-center justify-center gap-2 font-semibold transition-all duration-200 ${showOnlyFavorites ? 'ring-2 ring-yellow-400' : ''}`}
                                    style={{ backgroundColor: showOnlyFavorites ? 'rgba(251, 191, 36, 0.2)' : colors.cardLight, borderColor: 'transparent', color: colors.text }}
                                >
                                    <StarIcon className="w-5 h-5" isFavorite={showOnlyFavorites} color={colors.textMuted} />
                                    {showOnlyFavorites ? 'Showing Favorites' : 'Show Favorites'}
                                </button>
                            </div>
                        </div>
                        <div className="relative flex-grow h-[60vh]">
                            {isInitialLoading ? (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: colors.primary }}></div>
                                </div>
                            ) : (
                                <>
                                    <div className="h-full overflow-y-auto custom-scrollbar" style={{ '--scrollbar-track-color': colors.card, '--scrollbar-thumb-color': colors.primary, '--scrollbar-thumb-border-color': colors.card }}>
                                        <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-2 py-4">
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
                                        {isFetchingMore && <div className="flex justify-center py-4"><div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: colors.primary }}></div></div>}
                                        {displayedPokemons.length === 0 && !isInitialLoading && (
                                            <EmptyState
                                                compact
                                                title={showOnlyFavorites ? 'No favorites match' : 'No Pokémon found'}
                                                message={showOnlyFavorites ? 'Try clearing filters or favoriting more Pokémon.' : 'Try a different search, generation, or type.'}
                                            />
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </section>
                </div>

                <div className="lg:col-span-3 space-y-8 lg:sticky lg:top-4 lg:self-start">
                    <section className="p-6 rounded-xl shadow-lg" style={{ backgroundColor: colors.card }}>
                        <h3 className="text-sm md:text-base font-bold mb-3 text-center uppercase tracking-wider" style={{ color: colors.text }}>Filter by Type</h3>
                        <div className="grid grid-cols-5 lg:grid-cols-5 gap-1.5">
                            {Object.keys(typeColors).map((type) => (
                                <button key={type} onClick={() => handleTypeSelection(type)} className={`p-1.5 rounded-lg bg-transparent transition-colors hover:opacity-75 ${selectedTypes.has(type) ? 'ring-2 ring-primary' : ''}`} style={{ backgroundColor: colors.cardLight }} title={type}>
                                    <img src={typeIcons[type]} alt={type} className="w-full h-full object-contain" />
                                </button>
                            ))}
                        </div>
                    </section>
                    {currentTeam.length > 0 && (
                        <section className="p-6 rounded-xl shadow-lg" style={{ backgroundColor: colors.card }}>
                            <h3 className="text-lg md:text-xl font-bold mb-4" style={{ color: colors.text }}>Team Analysis</h3>
                            <div>
                                <h4 className="font-semibold mb-2 text-success">Offensive Coverage:</h4>
                                <div className="flex flex-wrap gap-1">
                                    {teamAnalysis.strengths.size > 0 ? Array.from(teamAnalysis.strengths).sort().map((type) => <TypeBadge key={type} type={type} colors={colors} />) : <p className="text-sm" style={{ color: colors.textMuted }}>No type advantages found.</p>}
                                </div>
                            </div>
                            <div className="mt-4">
                                <h4 className="font-semibold mb-2 text-danger">Defensive Weaknesses:</h4>
                                <div className="flex flex-wrap gap-1">
                                    {Object.keys(teamAnalysis.weaknesses).length > 0 ? Object.entries(teamAnalysis.weaknesses).sort(([, a], [, b]) => b - a).map(([type, score]) => (
                                        <div key={type} className="flex items-center">
                                            <TypeBadge type={type} colors={colors} />
                                            <span className="text-xs text-danger">({score}x)</span>
                                        </div>
                                    )) : <p className="text-sm" style={{ color: colors.textMuted }}>Your team is rock solid!</p>}
                                </div>
                            </div>
                        </section>
                    )}
                </div>
            </main>
        </>
    );
}