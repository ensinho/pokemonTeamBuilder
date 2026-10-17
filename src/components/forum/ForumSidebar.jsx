import React from 'react';
import { Link } from 'react-router-dom';
import { SwordsIcon, PokeballIcon, ShieldCheckIcon, FlameIcon, HeartIcon, MessageIcon, ChevronDownIcon } from '../icons';
import { getTeamPokemonDisplaySprite } from '../../utils/pokemonSprites';
import { POKEBALL_PLACEHOLDER_URL } from '../../constants/theme';
import { formatForumTime } from '../../utils/forumTime';
import { topicLikes, topicReplies } from '../../utils/forumRanking';

/**
 * The forum's rail (desktop), on Reddit's model: the community card with its
 * figures and rules, what is trending, and the one thing this community is
 * for — sharing a team.
 */
export function ForumSidebar({
    stats,
    trending = [],
    currentTopicId = null,
    hrefFor,
    onBeforeOpen,
    featuredTeam,
    onShareTeam,
    navigate,
    language = 'pt',
    t,
}) {
    const trendingHere = trending.filter((tp) => tp.id !== currentTopicId);

    return (
        <aside className="forum-sidebar-right" aria-label={t('forum.aboutTitle')}>
            <section className="forum-sidebar-card">
                <h4 className="forum-sidebar-card__title">{t('forum.aboutTitle')}</h4>
                <p className="forum-sidebar-card__text">{t('forum.aboutText')}</p>
                {stats && (
                    <dl className="forum-community-stats">
                        <div>
                            <dt>{t('forum.aboutTopics')}</dt>
                            <dd>{stats.topics}</dd>
                        </div>
                        <div>
                            <dt>{t('forum.aboutTrainers')}</dt>
                            <dd>{stats.trainers}</dd>
                        </div>
                        <div>
                            <dt>{t('forum.aboutToday')}</dt>
                            <dd className={stats.activeToday > 0 ? 'is-live' : ''}>{stats.activeToday}</dd>
                        </div>
                    </dl>
                )}
                <details className="forum-rules">
                    <summary className="forum-rules__summary">
                        <ShieldCheckIcon className="w-4 h-4 shrink-0" />
                        <span>{t('forum.rulesTitle')}</span>
                        <ChevronDownIcon className="forum-rules__chevron" />
                    </summary>
                    <ol className="forum-rules-list">
                        <li>{t('forum.rule1')}</li>
                        <li>{t('forum.rule2')}</li>
                        <li>{t('forum.rule3')}</li>
                    </ol>
                </details>
            </section>

            <section className="forum-sidebar-card">
                <h4 className="forum-sidebar-card__title">
                    <FlameIcon className="w-4 h-4 shrink-0 text-primary" />
                    {t('forum.trendingTitle')}
                </h4>
                {trendingHere.length === 0 ? (
                    <p className="forum-sidebar-card__text">{t('forum.trendingEmpty')}</p>
                ) : (
                    <ol className="forum-trending">
                        {trendingHere.map((tp, i) => (
                            <li key={tp.id}>
                                <Link
                                    to={hrefFor(tp.id)}
                                    onClick={() => onBeforeOpen?.(tp.id)}
                                    className="forum-trending__item"
                                >
                                    <span className="forum-trending__rank">{i + 1}</span>
                                    <span className="forum-trending__body">
                                        <span className="forum-trending__title">{tp.title}</span>
                                        <span className="forum-trending__meta">
                                            <HeartIcon className="w-3 h-3" /><span>{topicLikes(tp)}</span>
                                            <MessageIcon className="w-3 h-3" /><span>{topicReplies(tp)}</span>
                                            <span aria-hidden="true">·</span>
                                            {formatForumTime(tp.lastActivityAt || tp.createdAt, language)}
                                        </span>
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ol>
                )}
            </section>

            <section className="forum-sidebar-card">
                <h4 className="forum-sidebar-card__title">
                    <SwordsIcon className="w-4 h-4 shrink-0 text-primary" />
                    {t('forum.shareTeamTitle')}
                </h4>
                {featuredTeam ? (
                    <>
                        <p className="forum-sidebar-card__text">
                            <span className="forum-sidebar-card__team-name">{featuredTeam.name}</span>
                            {' — '}{t('forum.shareTeamHint')}
                        </p>
                        <div className="forum-sidebar-team-slots">
                            {Array.from({ length: 6 }).map((_, idx) => {
                                const pk = featuredTeam.pokemons?.[idx];
                                return (
                                    <div key={idx} className="forum-sidebar-team-slot" title={pk?.name}>
                                        {pk ? (
                                            <img
                                                src={getTeamPokemonDisplaySprite(pk)}
                                                alt={pk.name || ''}
                                                width="40"
                                                height="40"
                                                loading="lazy"
                                                className="w-full h-full object-contain"
                                                onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                                            />
                                        ) : (
                                            <PokeballIcon className="w-3.5 h-3.5 text-muted" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <button type="button" onClick={() => onShareTeam(featuredTeam)} className="btn btn-secondary btn-sm btn-block">
                            {t('forum.shareTeamAction')}
                        </button>
                    </>
                ) : (
                    <>
                        <p className="forum-sidebar-card__text">{t('forum.noTeamHint')}</p>
                        <button type="button" onClick={() => navigate('/builder')} className="btn btn-secondary btn-sm btn-block">
                            {t('forum.openBuilder')}
                        </button>
                    </>
                )}
            </section>
        </aside>
    );
}
