import React, { memo, useState, useMemo, useCallback } from 'react';
import { CircleMinus, CirclePlus } from 'lucide-react';
import { AvatarSprite } from '../AvatarSprite';
import { TrainerBadge } from '../TrainerBadge';
import { PokeballIcon, ReplyIcon, HeartIcon, TrashIcon, ShareIcon } from '../icons';
import { formatForumTime } from '../../utils/forumTime';
import { buildCommentTree, displayAncestors } from '../../utils/forumTree';
import { BattleInviteCard } from '../BattleInviteCard';
import { PuzzleShareCard } from '../PuzzleShareCard';
import { ChallengeShareCard } from '../ChallengeShareCard';
import { ForumTeamCard } from './ForumTeamCard';

const isStaff = (c) => c.createdBy === 'system' || c.creatorName === 'Professor Oak' || c.userEmail === 'enzopo625@gmail.com';

/**
 * One comment and everything under it, Reddit style: avatar and byline, the
 * text, the action row, then the replies indented one column with a thread
 * line back to this avatar. The line (and the ⊖ on it) collapses the branch;
 * a collapsed comment is one line that says how much it hides.
 */
const CommentNode = memo(function CommentNode({
    node,
    collapsedIds,
    topicCreatorId,
    userId,
    isAdmin,
    language,
    t,
    actions,
}) {
    const { comment, children, showQuote, descendants } = node;
    const id = comment.id;
    const isCollapsed = collapsedIds.has(id);
    const hasChildren = children.length > 0;
    const likeCount = Array.isArray(comment.likedBy) ? comment.likedBy.length : (comment.likeCount || 0);
    const liked = !!userId && Array.isArray(comment.likedBy) && comment.likedBy.includes(userId);
    const canDelete = isAdmin || (!!userId && comment.createdBy === userId);
    const isOP = !!topicCreatorId && comment.createdBy === topicCreatorId && topicCreatorId !== 'system';
    const repliesLabel = descendants === 1 ? t('forum.repliesOne') : t('forum.repliesMany', { count: descendants });

    const byline = (
        <div className="cmt__byline">
            <button type="button" className="cmt__author" onClick={() => actions.openProfile(comment)}>
                @{comment.creatorName}
            </button>
            {comment.creatorBadgeId && <TrainerBadge badgeId={comment.creatorBadgeId} size="xs" />}
            {isOP && <span className="cmt__tag cmt__tag--op" title="Original Poster">OP</span>}
            {isStaff(comment) && (
                <span className="cmt__tag cmt__tag--staff">{comment.creatorName === 'Professor Oak' ? 'System' : 'Admin'}</span>
            )}
            <span className="cmt__dot" aria-hidden="true">·</span>
            <time className="cmt__time" dateTime={comment.createdAt}>{formatForumTime(comment.createdAt, language)}</time>
            {isCollapsed && descendants > 0 && (
                <span className="cmt__hidden">
                    <span className="cmt__dot" aria-hidden="true">·</span>
                    {repliesLabel}
                </span>
            )}
        </div>
    );

    if (isCollapsed) {
        return (
            <div id={`forum-msg-${id}`} className="cmt is-collapsed">
                <button
                    type="button"
                    className="cmt__expand"
                    onClick={() => actions.toggle(id)}
                    aria-expanded="false"
                    aria-label={`${t('forum.expandThread')} · @${comment.creatorName}`}
                >
                    <CirclePlus className="w-4 h-4" aria-hidden="true" />
                </button>
                {byline}
            </div>
        );
    }

    return (
        <div id={`forum-msg-${id}`} className={`cmt ${hasChildren ? 'has-children' : ''}`}>
            <button
                type="button"
                className="cmt__avatar"
                onClick={() => actions.openProfile(comment)}
                aria-label={`@${comment.creatorName}`}
            >
                <AvatarSprite
                    trainerSprite={comment.creatorTrainerSprite}
                    pokemonId={comment.creatorAvatar}
                    isShiny={comment.creatorAvatarIsShiny}
                    fallback={<PokeballIcon className="w-4 h-4 text-muted" />}
                />
            </button>
            {byline}

            {hasChildren && (
                <button
                    type="button"
                    className="cmt__line"
                    onClick={() => actions.toggle(id)}
                    aria-expanded="true"
                    aria-label={`${t('forum.collapseThread')} (${repliesLabel})`}
                >
                    <CircleMinus className="cmt__line-icon" aria-hidden="true" />
                </button>
            )}

            <div className="cmt__content">
                {showQuote && comment.replyTo && (
                    <button
                        type="button"
                        onClick={() => actions.jumpTo(comment.replyTo.messageId)}
                        className="cmt__quote"
                    >
                        <ReplyIcon className="w-3.5 h-3.5 shrink-0" />
                        <span className="cmt__quote-name">@{comment.replyTo.creatorName}</span>
                        {comment.replyTo.textSnippet && (
                            <span className="cmt__quote-text">{comment.replyTo.textSnippet}</span>
                        )}
                    </button>
                )}

                {comment.text && <p className="cmt__text">{comment.text}</p>}

                {comment.sharedPuzzle?.rows?.length > 0 && <PuzzleShareCard puzzle={comment.sharedPuzzle} />}
                {comment.sharedChallenge && <ChallengeShareCard share={comment.sharedChallenge} />}
                {comment.battleInvite?.battleId && <BattleInviteCard invite={comment.battleInvite} />}
                {comment.sharedTeam && (
                    <ForumTeamCard
                        team={comment.sharedTeam}
                        ownerId={id}
                        onImport={actions.importTeam}
                        onHoverSlot={actions.hoverSlot}
                        t={t}
                    />
                )}

                <div className="cmt__actions">
                    <button
                        type="button"
                        onClick={() => actions.like(id)}
                        aria-pressed={liked}
                        aria-label={`${liked ? t('forum.unlike') : t('forum.like')} · ${t('forum.likesCount', { count: likeCount })}`}
                        className={`cmt-action ${liked ? 'is-liked' : ''}`}
                    >
                        <HeartIcon className="cmt-action__icon" />
                        <span>{likeCount > 0 ? likeCount : t('forum.like')}</span>
                    </button>
                    <button type="button" onClick={() => actions.reply(comment)} className="cmt-action">
                        <ReplyIcon className="cmt-action__icon" />
                        <span>{t('forum.reply')}</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => actions.share(comment)}
                        className="cmt-action"
                        aria-label={t('forum.share')}
                    >
                        <ShareIcon className="cmt-action__icon" />
                        <span className="cmt-action__label">{t('forum.share')}</span>
                    </button>
                    {canDelete && (
                        <button
                            type="button"
                            onClick={() => actions.remove(comment)}
                            className="cmt-action cmt-action--danger"
                            aria-label={t('forum.deleteComment')}
                            title={t('forum.deleteComment')}
                        >
                            <TrashIcon className="cmt-action__icon" />
                        </button>
                    )}
                </div>
            </div>

            {hasChildren && (
                <div className="cmt__children">
                    {children.map((child) => (
                        <CommentNode
                            key={child.comment.id}
                            node={child}
                            collapsedIds={collapsedIds}
                            topicCreatorId={topicCreatorId}
                            userId={userId}
                            isAdmin={isAdmin}
                            language={language}
                            t={t}
                            actions={actions}
                        />
                    ))}
                </div>
            )}
        </div>
    );
});

/**
 * The comments of a post as a tree (`nest`), or a chat room's messages as one
 * chronological run with quotes (`nest={false}` — a reply moved up next to
 * its parent would never be seen by people reading at the bottom).
 *
 * Memoised with stable props, so typing in the composer re-renders the
 * thread's frame and not every comment in it (wound 2026-09-24).
 */
export const CommentList = memo(function CommentList({
    comments = [],
    sort = 'old',
    nest = true,
    topicCreatorId,
    userId,
    isAdmin,
    language = 'pt',
    t,
    actions,
}) {
    const { roots, parentOf } = useMemo(() => buildCommentTree(comments, { sort, nest }), [comments, sort, nest]);
    // Everything starts open (Reddit): a reply is part of the conversation,
    // not something to dig for. The user folds what they are done with.
    const [collapsedIds, setCollapsedIds] = useState(() => new Set());

    const toggle = useCallback((id) => {
        setCollapsedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }, []);

    const nodeActions = useMemo(() => ({
        ...actions,
        toggle,
        // A jump opens every folded branch on the way to its target first.
        jumpTo: (messageId) => {
            const ancestors = displayAncestors(parentOf, messageId);
            setCollapsedIds((prev) => {
                if (!ancestors.some((a) => prev.has(a)) && !prev.has(messageId)) return prev;
                const next = new Set(prev);
                ancestors.forEach((a) => next.delete(a));
                next.delete(messageId);
                return next;
            });
            requestAnimationFrame(() => actions.jumpTo(messageId));
        },
    }), [actions, toggle, parentOf]);

    if (comments.length === 0) {
        return (
            <div className="comment-list__empty">
                <PokeballIcon className="w-8 h-8 text-muted mb-2" />
                <p className="comment-list__empty-title">{t('forum.noComments')}</p>
                <p className="comment-list__empty-hint">{t('forum.noCommentsHint')}</p>
            </div>
        );
    }

    return (
        <div className={`comment-list ${nest ? '' : 'comment-list--flat'}`}>
            {roots.map((node) => (
                <CommentNode
                    key={node.comment.id}
                    node={node}
                    collapsedIds={collapsedIds}
                    topicCreatorId={topicCreatorId}
                    userId={userId}
                    isAdmin={isAdmin}
                    language={language}
                    t={t}
                    actions={nodeActions}
                />
            ))}
        </div>
    );
});
