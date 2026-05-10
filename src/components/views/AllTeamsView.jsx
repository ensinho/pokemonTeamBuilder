import React from 'react';
import { POKEBALL_PLACEHOLDER_URL } from '../../constants/theme';
import { getTeamPokemonDisplaySprite } from '../../utils/pokemonSprites';
import { ShareIcon, ShowdownIcon, StarIcon, TrashIcon } from '../icons';

export function AllTeamsView({ teams, onEdit, onExport, onShare, requestDelete, onToggleFavorite, searchTerm, setSearchTerm, colors }) {
    return (
        <div className="p-6 rounded-xl shadow-lg" style={{ backgroundColor: colors.card }}>
            <h2 className="text-2xl md:text-3xl font-bold mb-6" style={{ color: colors.text }}>All Saved Teams</h2>
            <input
                type="text"
                placeholder="Search teams by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-3 mb-6 rounded-lg border-2 focus:outline-none"
                style={{ backgroundColor: colors.cardLight, borderColor: 'transparent', color: colors.text }}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {teams.length > 0 ? teams.map((team) => (
                    <div key={team.id} className="p-4 rounded-lg flex flex-col justify-between transition-all duration-200 hover:shadow-xl hover:scale-[1.02]" style={{ backgroundColor: colors.cardLight }}>
                        <div className="flex justify-between items-start">
                            <p className="font-bold text-xl truncate mb-2" style={{ color: colors.text }}>{team.name}</p>
                            <button onClick={() => onToggleFavorite(team)} title="Favorite" className="transition-transform duration-200 hover:scale-110 active:scale-95">
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
                                    className="h-12 w-12 -ml-3 border-2 rounded-full transition-transform duration-200 hover:scale-110 hover:z-10"
                                    style={{ borderColor: colors.cardLight, backgroundColor: colors.card }}
                                />
                            ))}
                        </div>
                        <div className="flex items-center gap-2 mt-auto pt-2">
                            <button onClick={() => onEdit(team)} className="w-full bg-primary hover:bg-purple-500/30 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]">Edit</button>
                            <button
                                type="button"
                                onClick={() => onExport(team)}
                                aria-label={`Export ${team.name} to Pokémon Showdown`}
                                title="Export to Showdown"
                                className="p-2 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
                                style={{ backgroundColor: colors.card, color: colors.text }}
                            >
                                <ShowdownIcon />
                            </button>
                            <button
                                type="button"
                                onClick={() => onShare(team)}
                                aria-label={`Share ${team.name}`}
                                title="Share Team"
                                className="p-2 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
                                style={{ backgroundColor: colors.card, color: colors.text }}
                            >
                                <ShareIcon />
                            </button>
                            <button onClick={() => requestDelete(team.id, team.name)} className="p-2 bg-danger hover:opacity-90 text-white rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"><TrashIcon /></button>
                        </div>
                    </div>
                )) : <p className="col-span-full text-center py-8" style={{ color: colors.textMuted }}>No teams found.</p>}
            </div>
        </div>
    );
}