import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ThreadHeader } from './ThreadHeader';
import { CommentList } from './CommentList';
import { CommentComposer } from './CommentComposer';
import { ThreadDetailSkeleton } from './ForumSkeletons';
import { ForumTeamCard } from './ForumTeamCard';
import { AvatarSprite } from '../AvatarSprite';
import { TrainerBadge } from '../TrainerBadge';
import { PokeballIcon, HeartIcon, MessageIcon, ShareIcon, SparklesIcon } from '../icons';
import { BattleInviteCard } from '../BattleInviteCard';
import { PuzzleShareCard } from '../PuzzleShareCard';
import { ChallengeShareCard } from '../ChallengeShareCard';
import { useChatAutoScroll } from '../../hooks/useChatAutoScroll';
import { formatForumTime, getCategoryMeta } from '../../utils/forumTime';
import { isPinnedTopic, topicReplies } from '../../utils/forumRanking';

const COMMENT_SORTS = [
    { id: 'top', key: 'forum.commentSortTop' },
    { id: 'new', key: 'forum.commentSortNew' },
    { id: 'old', key: 'forum.commentSortOld' },
];

// How recent a message of mine has to be for its arrival to scroll to it —
// older ones are history arriving through "load earlier".
const JUST_POSTED_MS = 60 * 1000;

/**
 * A topic, in one of two shapes:
 *  - a **post** (any trainer's topic): Reddit's post page — the post with its
 *    title and vote/comment/share pills at the top, then the comments as a
 *    tree with Top / Newest / Oldest. It opens at the post.
 *  - a **chat room** (the pinned megathreads Professor Oak seeded): one
 *    chronological run of messages that opens at the newest and follows it,
 *    because that is how those rooms have always been used.
 * Both keep the composer docked at the bottom, like the Reddit app.
 */
export function ThreadDetail({
    topic,
    messages = [],
    isLoading = false,
    onBack,
    onOpenProfile,
    onDeleteTopic,
    canDeleteTopic = false,
    userId,
    isAdmin,
    language = 'pt',
    t,
    composerRef,
    composerProps,
    messageActions,
    hasOlder = false,
    onLoadOlder,
    onLikeTopic,
    onShareTopic,
    focusCommentId = null,
}) {
    const isChat = isPinnedTopic(topic);
    const opMessage = messages.length > 0 ? messages[0] : null;
    const comments = useMemo(() => (messages.length > 1 ? messages.slice(1) : []), [messages]);
    const [commentSort, setCommentSort] = useState('old');

    // The post's vote: the topic's likes plus, for posts from before
    // 2026-10-17, the likes left on the opening message (no one twice).
    const voters = useMemo(() => new Set([
        ...(Array.isArray(topic.likedBy) ? topic.likedBy : []),
        ...(Array.isArray(opMessage?.likedBy) ? opMessage.likedBy : []),
    ]), [topic.likedBy, opMessage?.likedBy]);
    const liked = !!userId && voters.has(userId);
    const likeCount = voters.size;
    const replyCount = Math.max(comments.length, topicReplies(topic));
    const opTeam = opMessage?.sharedTeam || topic.sharedTeam || null;
    const categoryMeta = getCategoryMeta(topic.category, language);

    const scrollContainerRef = useRef(null);
    const titleRef = useRef(null);

    // The bar names the topic once the post's own title has scrolled away.
    const [titleOutOfView, setTitleOutOfView] = useState(false);
    const hasMessages = messages.length > 0;
    useEffect(() => {
        const root = scrollContainerRef.current;
        const title = titleRef.current;
        if (!root || !title || typeof IntersectionObserver === 'undefined') return undefined;
        const observer = new IntersectionObserver(
            ([entry]) => setTitleOutOfView(!entry.isIntersecting),
            { root, threshold: 0 },
        );
        observer.observe(title);
        return () => observer.disconnect();
        // Re-observed when the skeleton gives way to the real post.
    }, [topic.id, hasMessages]);

    // Only a chat room follows the newest message. A post opens at the post.
    useChatAutoScroll(scrollContainerRef, {
        threadKey: topic?.id,
        count: messages.length,
        lastIsMine: messages[messages.length - 1]?.createdBy === userId,
        enabled: isChat && !focusCommentId,
    });

    // On a post, a comment of mine that just arrived is scrolled into view —
    // under Top it may land anywhere in the list, not at the bottom.
    const seenRef = useRef({ topicId: null, ids: null });
    useEffect(() => {
        const seen = seenRef.current;
        if (seen.topicId !== topic.id || !seen.ids) {
            if (messages.length > 0) seenRef.current = { topicId: topic.id, ids: new Set(messages.map((m) => m.id)) };
            return;
        }
        const fresh = messages.filter((m) => !seen.ids.has(m.id));
        fresh.forEach((m) => seen.ids.add(m.id));
        if (isChat || !userId) return;
        const mine = fresh.find((m) => m.createdBy === userId
            && Date.now() - Date.parse(m.createdAt || 0) < JUST_POSTED_MS);
        if (mine) requestAnimationFrame(() => messageActions.jumpTo(mine.id));
    }, [messages, topic.id, isChat, userId, messageActions]);

    // A comment permalink (?c=) lands on its comment once it has rendered.
    const focusedRef = useRef(null);
    useEffect(() => {
        if (!focusCommentId || focusedRef.current === focusCommentId) return;
        if (!messages.some((m) => m.id === focusCommentId)) return;
        focusedRef.current = focusCommentId;
        requestAnimationFrame(() => messageActions.jumpTo(focusCommentId));
    }, [focusCommentId, messages, messageActions]);

    if (isLoading && (!messages || messages.length === 0)) {
        return <ThreadDetailSkeleton />;
    }

    const openProfile = () => onOpenProfile({
        userId: topic.createdBy,
        name: topic.creatorName,
        avatar: topic.creatorAvatar,
        isShiny: topic.creatorAvatarIsShiny,
        trainerSprite: topic.creatorTrainerSprite,
        selectedBadgeId: topic.creatorBadgeId || null,
    });

    const bodyText = opMessage?.text || (!opMessage ? topic.bodyPreview || topic.lastMessageText : '');
    const loadOlderButton = hasOlder && onLoadOlder && (
        <button type="button" className="btn btn-secondary btn-sm btn-block" onClick={onLoadOlder}>
            {t('forum.loadEarlier', { count: Math.max(0, (topic.messageCount || 0) - messages.length) })}
        </button>
    );
    const olderOnTop = isChat || commentSort === 'old';

    return (
        <section className="thread-detail" aria-label={topic.title}>
            <div className="thread-detail__header-dock">
                <ThreadHeader
                    topic={topic}
                    showTitle={titleOutOfView}
                    onBack={onBack}
                    onShare={() => onShareTopic(topic)}
                    onDelete={() => onDeleteTopic(topic.id)}
                    canDelete={canDeleteTopic}
                    language={language}
                    t={t}
                />
            </div>

            <div ref={scrollContainerRef} className="thread-messages-scroll custom-scrollbar">
                <article className="thread-post">
                    <div className="thread-post__meta">
                        <button type="button" className="thread-post__avatar" onClick={openProfile} aria-label={`@${topic.creatorName}`}>
                            <AvatarSprite
                                trainerSprite={topic.creatorTrainerSprite}
                                pokemonId={topic.creatorAvatar}
                                isShiny={topic.creatorAvatarIsShiny}
                                fallback={<PokeballIcon className="w-4 h-4 text-muted" />}
                            />
                        </button>
                        <button type="button" className="thread-post__author" onClick={openProfile}>
                            @{topic.creatorName}
                        </button>
                        {topic.creatorBadgeId && <TrainerBadge badgeId={topic.creatorBadgeId} size="xs" />}
                        {topic.createdBy === 'system' && (
                            <span className="forum-flair forum-flair--official">
                                <SparklesIcon className="w-3 h-3" />
                                {t('forum.official')}
                            </span>
                        )}
                        <span className="post-row__dot" aria-hidden="true">·</span>
                        <time className="thread-post__time" dateTime={topic.createdAt}>
                            {formatForumTime(topic.createdAt, language)}
                        </time>
                        <span className={`forum-flair forum-flair--${categoryMeta.id}`}>{categoryMeta.label}</span>
                    </div>

                    <h1 ref={titleRef} className="thread-post__title">{topic.title}</h1>

                    {bodyText && <p className="thread-post__text">{bodyText}</p>}

                    {opTeam && (
                        <ForumTeamCard
                            team={opTeam}
                            ownerId={opMessage?.id || topic.id}
                            onImport={messageActions.importTeam}
                            onHoverSlot={messageActions.hoverSlot}
                            t={t}
                        />
                    )}
                    {opMessage?.sharedPuzzle?.rows?.length > 0 && <PuzzleShareCard puzzle={opMessage.sharedPuzzle} />}
                    {opMessage?.sharedChallenge && <ChallengeShareCard share={opMessage.sharedChallenge} />}
                    {opMessage?.battleInvite?.battleId && <BattleInviteCard invite={opMessage.battleInvite} />}

                    <div className="thread-post__actions">
                        <button
                            type="button"
                            onClick={() => onLikeTopic(topic.id, opMessage)}
                            aria-pressed={liked}
                            aria-label={`${liked ? t('forum.unlike') : t('forum.like')} · ${t('forum.likesCount', { count: likeCount })}`}
                            className={`forum-pill ${liked ? 'is-liked' : ''}`}
                        >
                            <HeartIcon className="forum-pill__heart" />
                            <span>{likeCount > 0 ? likeCount : t('forum.like')}</span>
                        </button>
                        <button
                            type="button"
                            className="forum-pill"
                            onClick={() => composerRef?.current?.focus()}
                            aria-label={t('forum.commentsCount', { count: replyCount })}
                        >
                            <MessageIcon className="w-4 h-4" />
                            <span>{replyCount}</span>
                        </button>
                        <button type="button" className="forum-pill" onClick={() => onShareTopic(topic)}>
                            <ShareIcon className="w-4 h-4" />
                            <span>{t('forum.share')}</span>
                        </button>
                    </div>
                </article>

                <section className="thread-comments" aria-label={isChat ? t('forum.chatTitle') : t('forum.commentsTitle')}>
                    <div className="thread-comments__bar">
                        <h2 className="thread-comments__title">
                            {isChat ? t('forum.chatTitle') : t('forum.commentsTitle')}
                            <span className="thread-comments__count">{replyCount}</span>
                        </h2>
                        {!isChat && comments.length > 1 && (
                            <div className="segmented segmented--sm" role="group" aria-label={t('forum.commentSortLabel')}>
                                {COMMENT_SORTS.map(({ id, key }) => (
                                    <button
                                        key={id}
                                        type="button"
                                        className="segmented__item"
                                        aria-pressed={commentSort === id}
                                        onClick={() => setCommentSort(id)}
                                    >
                                        {t(key)}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {olderOnTop && loadOlderButton}

                    <CommentList
                        comments={comments}
                        sort={isChat ? 'old' : commentSort}
                        nest={!isChat}
                        topicCreatorId={topic.createdBy}
                        userId={userId}
                        isAdmin={isAdmin}
                        language={language}
                        t={t}
                        actions={messageActions}
                    />

                    {!olderOnTop && loadOlderButton}
                </section>
            </div>

            <div className="thread-composer-dock">
                <CommentComposer
                    ref={composerRef}
                    {...composerProps}
                    language={language}
                    t={t}
                />
            </div>
        </section>
    );
}
