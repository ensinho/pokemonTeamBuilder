import React from 'react';
import { POKEBALL_PLACEHOLDER_URL } from '../../constants/theme';
import { getTeamPokemonDisplaySprite } from '../../utils/pokemonSprites';
import { ShareIcon, ShowdownIcon, StarIcon, TrashIcon } from '../icons';

export function AllTeamsView({ teams, onEdit, onExport, onShare, requestDelete, onToggleFavorite, searchTerm, setSearchTerm, colors }) {
    const searchControlClassName = 'mb-6 w-full rounded-lg border-2 border-transparent bg-surface-raised p-3 text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary';
    const iconButtonClassName = 'rounded-lg bg-surface p-2 text-fg transition-all duration-200 hover:scale-105 active:scale-95';

    return (
        <div className="rounded-xl bg-surface p-6 shadow-lg">
            <h2 className="mb-6 text-2xl font-bold text-fg md:text-3xl">All Saved Teams</h2>
            <input
                type="text"
                placeholder="Search teams by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={searchControlClassName}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {teams.length > 0 ? teams.map((team) => (
                    <div key={team.id} className="flex flex-col justify-between rounded-lg bg-surface-raised p-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-xl">
                        <div className="flex justify-between items-start">
                            <p className="mb-2 truncate text-xl font-bold text-fg">{team.name}</p>
                            <button onClick={() => onToggleFavorite(team)} title="Favorite" className="text-muted transition-transform duration-200 hover:scale-110 active:scale-95">
                                <StarIcon isFavorite={team.isFavorite} color={colors.textMuted} />
                            </button>
                        </div>
                        <div className="flex my-2">
                            {team.pokemons.map((pokemon) => (
                                <img
                                    key={pokemon.id}
                                    src={getTeamPokemonDisplaySprite(pokemon)}
                                    onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                                    alt={pokemon.name}
                                    className="-ml-3 h-12 w-12 rounded-full border-2 border-surface-raised bg-surface transition-transform duration-200 hover:z-10 hover:scale-110"
                                />
                            ))}
                        </div>
                        <div className="flex items-center gap-2 mt-auto pt-2">
                            <button onClick={() => onEdit(team)} className="w-full rounded-lg bg-primary px-4 py-2 font-bold text-white transition-all duration-200 hover:scale-[1.03] hover:opacity-90 active:scale-[0.98]">Edit</button>
                            <button
                                type="button"
                                onClick={() => onExport(team)}
                                aria-label={`Export ${team.name} to Pokémon Showdown`}
                                title="Export to Showdown"
                                className={iconButtonClassName}
                            >
                                <ShowdownIcon />
                            </button>
                            <button
                                type="button"
                                onClick={() => onShare(team)}
                                aria-label={`Share ${team.name}`}
                                title="Share Team"
                                className={iconButtonClassName}
                            >
                                <ShareIcon />
                            </button>
                            <button onClick={() => requestDelete(team.id, team.name)} className="p-2 bg-danger hover:opacity-90 text-white rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"><TrashIcon /></button>
                        </div>
                    </div>
                )) : <p className="col-span-full py-8 text-center text-muted">No teams found.</p>}
            </div>
        </div>
    );
}