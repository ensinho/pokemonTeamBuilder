import React from 'react';
import { Link } from 'react-router-dom';
import '../../styles/tools-views.css';
import { getPokemonFrontSpriteUrl } from '../../utils/pokemonSprites';
import { ShowdownIcon, ShareIcon } from '../icons';

// A win is earned, so it is the one placement that wears Shiny Gold.
const isTopPlacement = (placement = '') => /^(champion|winner|1st|1º|campe)/i.test(String(placement).trim());

/**
 * One tournament team: name, event and placement, the six (each opens its
 * Meta page), and Import. Shared by the Tournaments list and the best-teams
 * page so the two never drift into two copies of the same card.
 *
 * The whole card opens the team, but through a real link — the name — whose
 * hit area is stretched over the card (`.trn-card__link::after`), so Cmd- and
 * middle-click work and no control is nested inside another. The sprites and
 * actions sit above that layer.
 */
export function TournamentTeamCard({ team, onOpen, linkState, t, pt }) {
    const roster = Array.isArray(team.pokemons) ? team.pokemons.slice(0, 6) : [];
    const metaParts = [team.tournament, team.placement, team.date].filter(Boolean);
    const topPlacement = isTopPlacement(team.placement);
    const name = team.title || team.player || 'Tournament Team';
    return (
        <article className={`trn-card ${team.id ? 'trn-card--clickable' : ''}`}>
            <div className="trn-card__head">
                <div>
                    <div className="trn-card__name">
                        {team.id ? (
                            <Link
                                to={`/tournaments/team/${team.id}`}
                                state={linkState}
                                className="trn-card__link"
                                title={pt ? 'Ver detalhes do time' : 'View team details'}
                            >
                                {name}
                            </Link>
                        ) : name}
                    </div>
                    <div className="trn-card__meta">
                        {metaParts.map((part, i) => (
                            <React.Fragment key={`${i}-${part}`}>
                                {i > 0 && ' · '}
                                {topPlacement && part === team.placement
                                    ? <span className="trn-card__place is-top">{part}</span>
                                    : part}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
                {team.format && <span className="trn-card__badge">{team.format}</span>}
            </div>

            <div className="trn-card__roster">
                {roster.map((mon, i) => (
                    <Link
                        key={mon.instanceId || `${mon.id}-${i}`}
                        to={`/meta/${mon.id}`}
                        state={linkState}
                        className="trn-card__mon-btn"
                        title={(mon.name || '').replace(/-/g, ' ')}
                    >
                        <img
                            src={getPokemonFrontSpriteUrl(mon.id)}
                            alt={mon.name || ''}
                            className="trn-card__mon"
                            loading="lazy"
                            onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                        />
                    </Link>
                ))}
            </div>

            <div className="trn-card__actions">
                <button
                    type="button"
                    className="trn-card__btn trn-card__btn--primary"
                    onClick={() => { onOpen({ name: team.title || team.player || 'Tournament Team', pokemons: team.pokemons || [], evScale: team.evScale }); }}
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
                        aria-label={team.pokepaste ? 'Poképaste' : 'Source'}
                    >
                        <ShareIcon className="w-4 h-4" />
                    </a>
                )}
            </div>
        </article>
    );
}
