import React from 'react';
import '../../styles/tools-views.css';
import { getPokemonFrontSpriteUrl } from '../../utils/pokemonSprites';
import { ShowdownIcon, ShareIcon } from '../icons';

/**
 * One tournament team: name, event and placement, the six (each opens its
 * Meta page), and Import. Shared by the Tournaments list and the best-teams
 * page so the two never drift into two copies of the same card.
 */
export function TournamentTeamCard({ team, onOpen, navigate, linkState, t, pt }) {
    const roster = Array.isArray(team.pokemons) ? team.pokemons.slice(0, 6) : [];
    const openDetail = () => { if (team.id) navigate(`/tournaments/team/${team.id}`, { state: linkState }); };
    const stop = (e) => e.stopPropagation();
    return (
        <article
            className="trn-card trn-card--clickable"
            role={team.id ? 'button' : undefined}
            tabIndex={team.id ? 0 : undefined}
            onClick={team.id ? openDetail : undefined}
            onKeyDown={team.id ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(); } } : undefined}
            title={team.id ? (pt ? 'Ver detalhes do time' : 'View team details') : undefined}
        >
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
                        onClick={(e) => { stop(e); navigate(`/meta/${mon.id}`, { state: linkState }); }}
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
                    onClick={(e) => { stop(e); onOpen({ name: team.title || team.player || 'Tournament Team', pokemons: team.pokemons || [], evScale: team.evScale }); }}
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
                        onClick={stop}
                    >
                        <ShareIcon className="w-4 h-4" />
                    </a>
                )}
            </div>
        </article>
    );
}
