import React from 'react';
import { Link } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import { HeartIcon, DownloadIcon } from '../icons';
import { getTeamPokemonDisplaySprite } from '../../utils/pokemonSprites';
import { POKEBALL_PLACEHOLDER_URL } from '../../constants/theme';
import { topicLikes } from '../../utils/forumRanking';
import { track } from '../../services/analytics';
import { MonSprite } from '../views/metaShared';

/**
 * The top of the feed (utils/teamOfTheWeek.js): the community's most liked
 * team of the last seven days, or a tournament pick when nobody posted one —
 * and the line that tells a trainer how to take the spot.
 */
export function TeamOfTheWeek({ pick, hrefFor, onBeforeOpen, onImport, onPostOwn, t }) {
    if (!pick) return null;
    const isCommunity = pick.kind === 'community';
    const { team, topic } = pick;
    const href = isCommunity ? hrefFor(topic.id) : `/tournaments/team/${team.id}`;
    const title = isCommunity ? (topic.title || team.name) : (team.title || team.tournament);
    const meta = isCommunity
        ? [t('forum.teamOfWeek.by', { name: topic.creatorName || '—' })]
        : [team.placement, team.tournament, team.format].filter(Boolean);
    const open = () => {
        track('team_of_week_open', { kind: pick.kind });
        if (isCommunity) onBeforeOpen?.(topic.id);
    };

    return (
        <section className="totw" aria-labelledby="totw-title">
            <div className="totw__head">
                <span className="totw__kicker">
                    <Trophy className="w-3.5 h-3.5" aria-hidden="true" />
                    {t('forum.teamOfWeek.kicker')}
                </span>
                <span className="totw__source">{t(isCommunity ? 'forum.teamOfWeek.community' : 'forum.teamOfWeek.tournament')}</span>
            </div>

            <div className="totw__body">
                <div className="totw__copy">
                    <h3 id="totw-title" className="totw__title">
                        <Link to={href} onClick={open}>{title}</Link>
                    </h3>
                    <p className="totw__meta">
                        <span>{meta.join(' · ')}</span>
                        {isCommunity && (
                            <span className="totw__likes">
                                <HeartIcon className="w-3 h-3" aria-hidden="true" />
                                {t('forum.teamOfWeek.likes', { count: topicLikes(topic) })}
                            </span>
                        )}
                    </p>
                </div>
                <ul className="totw__roster" aria-label={title}>
                    {team.pokemons.map((pk, i) => (
                        <li key={`${pk.id}-${i}`} className="totw__slot" title={pk.name}>
                            {isCommunity ? (
                                <img
                                    src={getTeamPokemonDisplaySprite(pk)}
                                    alt={pk.name || ''}
                                    loading="lazy"
                                    className="totw__sprite"
                                    onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                                />
                            ) : (
                                <MonSprite id={pk.id} name={pk.name} className="totw__sprite image-pixelated" />
                            )}
                        </li>
                    ))}
                </ul>
            </div>

            <div className="totw__actions">
                <Link to={href} onClick={open} className="btn btn-outline btn-sm">
                    {t(isCommunity ? 'forum.teamOfWeek.openPost' : 'forum.teamOfWeek.viewTeam')}
                </Link>
                {isCommunity && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => onImport(team)}>
                        <DownloadIcon className="w-3.5 h-3.5" />
                        {t('forum.importTeam')}
                    </button>
                )}
            </div>

            <p className="totw__hint">
                <span>{t('forum.teamOfWeek.hint')}</span>
                <button type="button" className="totw__post" onClick={onPostOwn}>{t('forum.teamOfWeek.postOwn')}</button>
            </p>
        </section>
    );
}
