import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/tools-views.css';
import { getPokemonFrontSpriteUrl } from '../../utils/pokemonSprites';
import { useTournamentData } from '../../hooks/useTournamentData';
import { useTranslation } from '../../hooks/useTranslation';
import { EmptyState } from '../EmptyState';
import { PokeballIcon, TrophyIcon, ShowdownIcon, ShareIcon, ClearIcon } from '../icons';

// Match a team against the search term across its Pokémon, title/player,
// tournament name, placement, format and date — so any of those finds it.
function teamMatches(team, q) {
    if (!q) return true;
    const haystack = [
        team.title, team.player, team.tournament, team.placement, team.format, team.date,
        ...(Array.isArray(team.pokemons) ? team.pokemons.map((m) => m.name) : []),
    ];
    return haystack.some((v) => typeof v === 'string' && v.toLowerCase().includes(q));
}

function TeamCard({ team, onOpen, navigate, t }) {
    const roster = Array.isArray(team.pokemons) ? team.pokemons.slice(0, 6) : [];
    return (
        <article className="trn-card">
            <div className="trn-card__head">
                <div>
                    <div className="trn-card__name">{team.title || team.player || 'Tournament Team'}</div>
                    <div className="trn-card__meta">
                        {[team.tournament, team.placement, team.date].filter(Boolean).join(' · ')}
                    </div>
                </div>
                {team.format && <span className="trn-card__badge">{team.format}</span>}
            </div>

            <div className="trn-card__roster">
                {roster.map((mon, i) => (
                    <button
                        key={mon.instanceId || `${mon.id}-${i}`}
                        type="button"
                        className="trn-card__mon-btn"
                        title={(mon.name || '').replace(/-/g, ' ')}
                        onClick={() => navigate(`/pokemon/${mon.id}`)}
                    >
                        <img
                            src={getPokemonFrontSpriteUrl(mon.id)}
                            alt={mon.name || ''}
                            className="trn-card__mon"
                            loading="lazy"
                            onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                        />
                    </button>
                ))}
            </div>

            <div className="trn-card__actions">
                <button
                    type="button"
                    className="trn-card__btn trn-card__btn--primary"
                    onClick={() => onOpen({ name: team.title || team.player || 'Tournament Team', pokemons: team.pokemons || [] })}
                >
                    <ShowdownIcon /> {t('tools.importToBuilder')}
                </button>
                {(team.pokepaste || team.sourceUrl) && (
                    <a
                        href={team.pokepaste || team.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="trn-card__btn trn-card__btn--ghost"
                        title={team.pokepaste ? 'Poképaste' : 'Source'}
                    >
                        <ShareIcon className="w-4 h-4" />
                    </a>
                )}
            </div>
        </article>
    );
}

export function TournamentsView({ onOpenTeam }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { teams, status } = useTournamentData();
    const [search, setSearch] = useState('');

    const query = search.trim().toLowerCase();
    const { featured, tournament } = useMemo(() => {
        const matched = query ? teams.filter((tm) => teamMatches(tm, query)) : teams;
        return {
            featured: matched.filter((tm) => tm.featured),
            tournament: matched.filter((tm) => !tm.featured),
        };
    }, [teams, query]);

    if (status === 'loading') {
        return (
            <div className="flex items-center justify-center" style={{ minHeight: '40vh', color: 'var(--color-primary)' }} role="status" aria-label="Loading">
                <PokeballIcon className="w-14 h-14 animate-spin opacity-70" />
            </div>
        );
    }

    if (teams.length === 0) {
        return <EmptyState title={t('tools.tournamentsEmpty')} message={t('tools.tournamentsEmptyDesc')} />;
    }

    const noMatches = query && featured.length === 0 && tournament.length === 0;

    return (
        <div>
            <div className="trn-toolbar">
                <div className="trn-search-wrap">
                    <span className="trn-search-icon" aria-hidden="true">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                        </svg>
                    </span>
                    <input
                        type="text"
                        placeholder={t('tools.searchTournaments')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="trn-search-input"
                    />
                    {search && (
                        <button type="button" onClick={() => setSearch('')} className="trn-search-clear" aria-label={t('common.clear')}>
                            <ClearIcon className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {noMatches && <EmptyState compact title={t('tools.tournamentsNoMatch')} message={t('db.noMatchesDesc')} />}

            {featured.length > 0 && (
                <section className="trn-section">
                    <h2 className="trn-section__title"><TrophyIcon className="w-5 h-5" /> {t('tools.featuredTeams')}</h2>
                    <div className="trn-grid">
                        {featured.map((tm, i) => <TeamCard key={tm.id || `f${i}`} team={tm} onOpen={onOpenTeam} navigate={navigate} t={t} />)}
                    </div>
                </section>
            )}

            {tournament.length > 0 && (
                <section className="trn-section">
                    <h2 className="trn-section__title"><TrophyIcon className="w-5 h-5" /> {t('tools.tournamentTeams')}</h2>
                    <div className="trn-grid">
                        {tournament.map((tm, i) => <TeamCard key={tm.id || `t${i}`} team={tm} onOpen={onOpenTeam} navigate={navigate} t={t} />)}
                    </div>
                </section>
            )}
        </div>
    );
}
