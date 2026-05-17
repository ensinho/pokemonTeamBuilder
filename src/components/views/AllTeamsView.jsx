import React from 'react';
import '../../styles/team-builder-view.css';
import '../../styles/all-teams-view.css';
import { POKEBALL_PLACEHOLDER_URL } from '../../constants/theme';
import { getTeamPokemonDisplaySprite } from '../../utils/pokemonSprites';
import { ShareIcon, ShowdownIcon, StarIcon, TrashIcon } from '../icons';

const timestampToDate = (value) => {
    if (!value) return null;
    if (typeof value.toDate === 'function') return value.toDate();
    if (value instanceof Date) return value;
    if (typeof value === 'number') return new Date(value);
    if (typeof value === 'string') {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
};

const formatTeamDate = (value) => {
    const date = timestampToDate(value);
    if (!date) return 'Unknown date';
    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(date);
};

export function AllTeamsView({ teams, onEdit, onExport, onShare, requestDelete, onToggleFavorite, searchTerm, setSearchTerm }) {
    const filteredTeams = React.useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();
        if (!normalizedSearch) return teams;

        return teams.filter((team) => team.name?.toLowerCase().includes(normalizedSearch));
    }, [teams, searchTerm]);

    const favoriteCount = React.useMemo(() => {
        return teams.filter((team) => team.isFavorite).length;
    }, [teams]);

    const iconButtonClassName = 'team-builder-icon-button team-builder-icon-button--small';

    return (
        <main className="all-teams-view">
            <section className="team-builder-panel all-teams-view__panel p-5 md:p-6">
                <div className="all-teams-view__header">
                    <div>
                        <p className="team-builder-panel__eyebrow">Saved work</p>
                        <div className="all-teams-view__heading-row">
                            <h2 className="team-builder-panel__title all-teams-view__title">Saved teams</h2>
                            <span className="team-builder-panel__meta">{filteredTeams.length}</span>
                        </div>
                        <p className="team-builder-panel__copy all-teams-view__copy">
                            Reopen, export, share, or prune the lineups you have already refined.
                        </p>
                    </div>

                    <div className="all-teams-view__summary" aria-label="Saved team summary">
                        <span className="team-builder-picker-summary">{teams.length} total</span>
                        <span className="team-builder-picker-summary">{favoriteCount} favorites</span>
                    </div>
                </div>

                <div className="all-teams-view__toolbar">
                    <label className="team-builder-control all-teams-view__search-control" htmlFor="saved-teams-search">
                        <span className="team-builder-control__label">Search lineups</span>
                        <input
                            id="saved-teams-search"
                            type="text"
                            placeholder="Search teams by name..."
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            className="team-builder-field"
                        />
                    </label>

                    <div className="all-teams-view__toolbar-actions">
                        {searchTerm ? (
                            <button
                                type="button"
                                onClick={() => setSearchTerm('')}
                                className="team-builder-button team-builder-button--inline team-builder-button--inline-compact"
                            >
                                Clear search
                            </button>
                        ) : null}
                        <span className="team-builder-picker-summary">{filteredTeams.length} visible</span>
                    </div>
                </div>

                {filteredTeams.length > 0 ? (
                    <div className="all-teams-view__grid">
                        {filteredTeams.map((team) => (
                            <article key={team.id} className="team-builder-recent-card team-builder-recent-card--wide all-teams-view__card">
                                <div className="all-teams-view__card-head">
                                    <div className="min-w-0 flex-1">
                                        <div className="all-teams-view__card-heading">
                                            <p className="team-builder-recent-card__title all-teams-view__card-title">{team.name}</p>
                                            {team.isFavorite ? <span className="all-teams-view__status">Pinned</span> : null}
                                        </div>

                                        <div className="all-teams-view__meta-list">
                                            <span className="all-teams-view__meta-pill">Updated {formatTeamDate(team.updatedAt || team.createdAt)}</span>
                                            <span className="all-teams-view__meta-pill">
                                                {team.pokemons.length} {team.pokemons.length === 1 ? 'member' : 'members'}
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => onToggleFavorite(team)}
                                        title={team.isFavorite ? 'Unfavorite team' : 'Favorite team'}
                                        aria-label={team.isFavorite ? `Unfavorite ${team.name}` : `Favorite ${team.name}`}
                                        className={`${iconButtonClassName} ${team.isFavorite ? 'team-builder-icon-button--accent' : ''}`}
                                    >
                                        <StarIcon className="h-4 w-4" isFavorite={team.isFavorite} color="currentColor" />
                                    </button>
                                </div>

                                <div className="all-teams-view__preview">
                                    <div className="team-builder-sprite-stack all-teams-view__sprite-stack" aria-label={`${team.name} team preview`}>
                                        {team.pokemons.length > 0 ? team.pokemons.map((pokemon) => (
                                            <img
                                                key={pokemon.instanceId || `${team.id}-${pokemon.id}`}
                                                src={getTeamPokemonDisplaySprite(pokemon)}
                                                onError={(event) => { event.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                                                alt={pokemon.name}
                                                className="team-builder-sprite-stack__item all-teams-view__sprite-item"
                                            />
                                        )) : (
                                            <span className="all-teams-view__empty-stack">No Pokémon saved in this lineup yet.</span>
                                        )}
                                    </div>
                                </div>

                                <div className="team-builder-recent-card__actions all-teams-view__actions">
                                    <button
                                        type="button"
                                        onClick={() => onEdit(team)}
                                        className="team-builder-button team-builder-button--primary team-builder-button--grow team-builder-button--small"
                                    >
                                        Edit lineup
                                    </button>
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
                                        title="Share team"
                                        className={iconButtonClassName}
                                    >
                                        <ShareIcon />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => requestDelete(team.id, team.name)}
                                        aria-label={`Delete ${team.name}`}
                                        title="Delete team"
                                        className={`${iconButtonClassName} team-builder-icon-button--danger`}
                                    >
                                        <TrashIcon />
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                ) : (
                    <div className="team-builder-empty-note all-teams-view__empty">
                        <p className="all-teams-view__empty-copy">
                            {teams.length === 0
                                ? 'Save a lineup from Builder to start your archive.'
                                : 'No teams match the current search.'}
                        </p>
                        {teams.length > 0 && searchTerm ? (
                            <button
                                type="button"
                                onClick={() => setSearchTerm('')}
                                className="team-builder-button team-builder-button--inline team-builder-button--inline-compact"
                            >
                                Clear search
                            </button>
                        ) : null}
                    </div>
                )}
            </section>
        </main>
    );
}