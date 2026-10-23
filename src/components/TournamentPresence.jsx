import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import '../styles/tournament-presence.css';

import { useTranslation } from '../hooks/useTranslation';
import { useEntityNavigate } from '../hooks/useEntityNavigate';
import { presenceShare } from '../utils/tournamentPresence';
import { titleCaseSlug } from '../utils/smogonSets';
import { MonSprite } from './views/metaShared';

const TEAMS_SHOWN = 3;

/**
 * How a Pokémon fares in the recent tournament teams (utils/tournamentPresence.js):
 * its share of teams, the partners it is built with most and its latest teams.
 * The page's host draws the frame and the title (a card on desktop, a band on
 * the phone); this is the inside, fills only. api/render-meta.js writes the
 * same facts into the HTML, so what a search result promises is on the page.
 */
export function TournamentPresence({ presence, onShowAll }) {
    const { t } = useTranslation();
    const location = useLocation();
    const { linkState } = useEntityNavigate();
    if (!presence) return null;

    return (
        <div className="tp">
            <p className="tp__share">
                <span className="tp__figure">{presenceShare(presence)}%</span>
                <span>{t('pdetail.tournaments.share', { count: presence.count, total: presence.total })}</span>
            </p>

            {presence.partners.length > 0 && (
                <section className="tp__group">
                    <h5 className="tp__label">{t('pdetail.tournaments.partners')}</h5>
                    <ul className="tp__partners">
                        {presence.partners.map((partner) => (
                            <li key={partner.id}>
                                <Link to={`/pokemon/${partner.id}`} state={location.state} className="tp__partner">
                                    <MonSprite id={partner.id} name={partner.name} className="tp__sprite image-pixelated" />
                                    <span className="tp__name">{titleCaseSlug(partner.name)}</span>
                                    <span className="tp__count">{t('pdetail.tournaments.together', { count: partner.count })}</span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            <section className="tp__group">
                <h5 className="tp__label">{t('pdetail.tournaments.teams')}</h5>
                <ul className="tp__teams">
                    {presence.teams.slice(0, TEAMS_SHOWN).map((team) => (
                        <li key={team.id}>
                            <Link to={`/tournaments/team/${team.id}`} state={linkState} className="tp__team">
                                <span className="tp__roster" aria-hidden="true">
                                    {(team.pokemons || []).slice(0, 6).map((p, i) => (
                                        <MonSprite key={`${p.id}-${i}`} id={p.id} name={p.name} className="tp__mini image-pixelated" />
                                    ))}
                                </span>
                                <span className="tp__event">
                                    <span className="tp__name">{team.tournament || team.title}</span>
                                    <span className="tp__count">{[team.placement, team.format].filter(Boolean).join(' · ')}</span>
                                </span>
                                <ArrowUpRight className="tp__go" aria-hidden="true" />
                            </Link>
                        </li>
                    ))}
                </ul>
            </section>

            {onShowAll && presence.count > TEAMS_SHOWN && (
                <button type="button" className="btn btn-ghost btn-sm tp__all" onClick={onShowAll}>
                    {t('pdetail.tournaments.showAll')}
                </button>
            )}
        </div>
    );
}
