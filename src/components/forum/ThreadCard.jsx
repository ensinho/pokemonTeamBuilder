import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { AvatarSprite } from '../AvatarSprite';
import { TrainerBadge } from '../TrainerBadge';
import { Pin } from 'lucide-react';
import { PokeballIcon, MessageIcon, HeartIcon, ShareIcon, FlameIcon, ReplyIcon, SparklesIcon } from '../icons';
import { formatForumTime, getCategoryMeta } from '../../utils/forumTime';
import { topicReplies, topicLikes } from '../../utils/forumRanking';
import { POKEBALL_PLACEHOLDER_URL } from '../../constants/theme';
import { getTeamPokemonDisplaySprite } from '../../utils/pokemonSprites';

/**
 * One post in the feed, laid out the way Reddit taught everyone to read one:
 * who · when · flair, the title, a preview of the post, the team as the
 * thumbnail, and the vote / comments / share pills. Rows separate by a
 * hairline, not a box each (the old card list was 4 boxes for 4 topics).
 *
 * The title is a real link (Cmd/middle-click open a new tab); the rest of the
 * row opens the post too, except its own buttons and links.
 */
export const ThreadCard = memo(function ThreadCard({
    topic,
    href,
    liked = false,
    isPinned = false,
    isTrending = false,
    onOpen,
    onBeforeOpen,
    onLike,
    onShare,
    onOpenProfile,
    language = 'pt',
    t,
}) {
    const categoryMeta = getCategoryMeta(topic.category, language);
    const replies = topicReplies(topic);
    const likes = topicLikes(topic);
    // A post is dated by when it was posted; a megathread by when it last moved.
    const when = isPinned ? (topic.lastActivityAt || topic.createdAt) : (topic.createdAt || topic.lastActivityAt);
    const isOfficial = topic.createdBy === 'system';

    const body = (topic.bodyPreview || '').trim()
        || (replies === 0 ? (topic.lastMessageText || '').trim() : '');
    const lastReply = !body && replies > 0 ? (topic.lastMessageText || '').trim() : '';
    const team = Array.isArray(topic.sharedTeam?.pokemons) ? topic.sharedTeam.pokemons.filter(Boolean).slice(0, 6) : [];

    const profile = () => onOpenProfile?.({
        userId: topic.createdBy,
        name: topic.creatorName,
        avatar: topic.creatorAvatar,
        isShiny: topic.creatorAvatarIsShiny,
        trainerSprite: topic.creatorTrainerSprite,
        selectedBadgeId: topic.creatorBadgeId || null,
    });

    const handleRowClick = (e) => {
        if (e.defaultPrevented || e.target.closest('a, button')) return;
        // Selecting text in a preview is not a click on the post.
        if (window.getSelection?.()?.toString()) return;
        onOpen(topic.id);
    };

    return (
        <article
            className={`post-row ${isPinned ? 'post-row--pinned' : ''}`}
            onClick={handleRowClick}
            aria-labelledby={`post-title-${topic.id}`}
        >
            <div className="post-row__meta">
                <button
                    type="button"
                    className="post-row__avatar"
                    onClick={profile}
                    aria-label={`@${topic.creatorName}`}
                >
                    <AvatarSprite
                        trainerSprite={topic.creatorTrainerSprite}
                        pokemonId={topic.creatorAvatar}
                        isShiny={topic.creatorAvatarIsShiny}
                        fallback={<PokeballIcon className="w-3.5 h-3.5 text-muted" />}
                    />
                </button>
                <button type="button" className="post-row__author" onClick={profile}>
                    @{topic.creatorName}
                </button>
                {topic.creatorBadgeId && <TrainerBadge badgeId={topic.creatorBadgeId} size="xs" />}
                <span className="post-row__dot" aria-hidden="true">·</span>
                <time className="post-row__time" dateTime={when}>{formatForumTime(when, language)}</time>

                <span className="post-row__flairs">
                    {isPinned && (
                        <span className="forum-flair forum-flair--pinned">
                            <Pin className="w-3 h-3" aria-hidden="true" />
                            {t('forum.pinned')}
                        </span>
                    )}
                    {isTrending && (
                        <span className="forum-flair forum-flair--trending">
                            <FlameIcon className="w-3 h-3" />
                            {t('forum.trending')}
                        </span>
                    )}
                    {isOfficial && !isPinned && (
                        <span className="forum-flair forum-flair--official">
                            <SparklesIcon className="w-3 h-3" />
                            {t('forum.official')}
                        </span>
                    )}
                    <span className={`forum-flair forum-flair--${categoryMeta.id}`}>{categoryMeta.label}</span>
                </span>
            </div>

            <div className="post-row__main">
                <div className="post-row__text">
                    <h3 className="post-row__title" id={`post-title-${topic.id}`}>
                        <Link to={href} onClick={() => onBeforeOpen(topic.id)} className="post-row__link">
                            {topic.title}
                        </Link>
                    </h3>
                    {body && <p className="post-row__preview">{body}</p>}
                    {lastReply && (
                        <p className="post-row__reply">
                            <ReplyIcon className="w-3.5 h-3.5 shrink-0" />
                            <span className="post-row__reply-label">{t('forum.lastReply')}</span>
                            <span className="post-row__reply-text">{lastReply}</span>
                        </p>
                    )}
                </div>

                {team.length > 0 && (
                    <div className="post-row__thumb" aria-label={topic.sharedTeam?.name || ''}>
                        {team.map((pk, idx) => (
                            <img
                                key={pk.instanceId || `${pk.id}-${idx}`}
                                src={getTeamPokemonDisplaySprite(pk)}
                                alt={pk.name || ''}
                                title={pk.name || ''}
                                width="32"
                                height="32"
                                loading="lazy"
                                decoding="async"
                                className="post-row__sprite"
                                onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                            />
                        ))}
                    </div>
                )}
            </div>

            <div className="post-row__actions">
                <button
                    type="button"
                    className={`forum-pill ${liked ? 'is-liked' : ''}`}
                    aria-pressed={liked}
                    aria-label={`${liked ? t('forum.unlike') : t('forum.like')} · ${t('forum.likesCount', { count: likes })}`}
                    onClick={() => onLike(topic.id)}
                >
                    <HeartIcon className="forum-pill__heart" />
                    <span>{likes > 0 ? likes : t('forum.like')}</span>
                </button>
                <Link
                    to={href}
                    onClick={() => onBeforeOpen(topic.id)}
                    className="forum-pill"
                    aria-label={t('forum.commentsCount', { count: replies })}
                >
                    <MessageIcon className="w-4 h-4" />
                    <span>{replies}</span>
                </Link>
                <button
                    type="button"
                    className="forum-pill"
                    onClick={() => onShare(topic)}
                    aria-label={t('forum.share')}
                >
                    <ShareIcon className="w-4 h-4" />
                    <span className="forum-pill__label">{t('forum.share')}</span>
                </button>
            </div>
        </article>
    );
});
