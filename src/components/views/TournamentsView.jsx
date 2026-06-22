import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/tools-views.css';
import { getPokemonFrontSpriteUrl } from '../../utils/pokemonSprites';
import { useTournamentData } from '../../hooks/useTournamentData';
import { useTranslation } from '../../hooks/useTranslation';
import { EmptyState } from '../EmptyState';
import { PokeballIcon, TrophyIcon, ShowdownIcon, ShareIcon } from '../icons';

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

    const { featured, tournament } = useMemo(() => ({
        featured: teams.filter((tm) => tm.featured),
        tournament: teams.filter((tm) => !tm.featured),
    }), [teams]);

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

    return (
        <div>
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
