import React, { memo, useState, useMemo, useCallback } from 'react';
import { AvatarSprite } from '../AvatarSprite';
import { TrainerBadge } from '../TrainerBadge';
import {
    PokeballIcon,
    ReplyIcon,
    HeartIcon,
    TrashIcon,
    DownloadIcon,
    MessageIcon,
    ChevronDownIcon,
} from '../icons';
import { ChevronUp, ChevronsUpDown } from 'lucide-react';
import { formatForumTime } from '../../utils/forumTime';
import { BattleInviteCard } from '../BattleInviteCard';
import { PuzzleShareCard } from '../PuzzleShareCard';
import { getTeamPokemonDisplaySprite } from '../../utils/pokemonSprites';
import { POKEBALL_PLACEHOLDER_URL } from '../../constants/theme';

export const CommentItem = memo(function CommentItem({
    comment,
    topicCreatorId,
    repliesByParentId,
    expandedCommentIds,
    onToggleExpand,
    likedByMe,
    canDelete,
    isConfirmingDelete,
    canLike,
    language = 'pt',
    t,
    actions,
    depth = 0,
}) {
    const isOP = comment.createdBy === topicCreatorId;
    const isMsgAdmin = comment.createdBy === 'system' || comment.userEmail === 'enzopo625@gmail.com' || (comment.creatorName === 'Professor Oak');
    const likeCount = comment.likeCount || comment.likedBy?.length || 0;
    const timeFormatted = formatForumTime(comment.createdAt, language);

    // Direct replies to this comment
    const childReplies = repliesByParentId?.get(comment.id) || [];
    const hasReplies = childReplies.length > 0;
    const isExpanded = expandedCommentIds?.has(comment.id);

    const handleReplyClick = () => {
        if (hasReplies && onToggleExpand && !isExpanded) {
            onToggleExpand(comment.id, true);
        }
        actions.reply(comment);
    };

    return (
        <div id={`forum-msg-${comment.id}`} className={`comment-item ${depth > 0 ? 'comment-item--nested' : ''}`}>
            {/* Guide line for threaded visual hierarchy */}
            <div className="comment-item__guide" aria-hidden="true" />

            {/* Avatar */}
            <button
                type="button"
                className="comment-item__avatar"
                onClick={() => actions.openProfile(comment)}
                aria-label={`@${comment.creatorName}`}
            >
                <AvatarSprite
                    trainerSprite={comment.creatorTrainerSprite}
                    pokemonId={comment.creatorAvatar}
                    isShiny={comment.creatorAvatarIsShiny}
                    fallback={<PokeballIcon className="w-5 h-5 text-muted opacity-50" />}
                />
            </button>

            {/* Body */}
            <div className="comment-item__body">
                {/* Header: Author + Badges + Timestamp */}
                <div className="comment-item__header">
                    <div className="comment-item__author-row">
                        <button
                            type="button"
                            className="comment-item__author-name"
                            onClick={() => actions.openProfile(comment)}
                        >
                            @{comment.creatorName}
                        </button>
                        {comment.creatorBadgeId && (
                            <TrainerBadge badgeId={comment.creatorBadgeId} size="xs" />
                        )}
                        {isOP && (
                            <span className="comment-item__tag comment-item__tag--op" title="Original Poster">
                                OP
                            </span>
                        )}
                        {isMsgAdmin && (
                            <span className="comment-item__tag comment-item__tag--admin">
                                {comment.creatorName === 'Professor Oak' ? 'System' : 'Admin'}
                            </span>
                        )}
                    </div>
                    <span className="comment-item__time" title={comment.createdAt}>
                        {timeFormatted}
                    </span>
                </div>

                {/* Quoted reply banner */}
                {comment.replyTo && (
                    <button
                        type="button"
                        onClick={() => actions.jumpTo(comment.replyTo.messageId)}
                        className="comment-item__quote"
                        title={language === 'pt' ? 'Ir para a mensagem original' : 'Jump to original comment'}
                    >
                        <ReplyIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="font-semibold text-fg">@{comment.replyTo.creatorName}</span>
                        {comment.replyTo.textSnippet && (
                            <span className="comment-item__quote-text truncate">
                                "{comment.replyTo.textSnippet}"
                            </span>
                        )}
                    </button>
                )}

                {/* Text Content */}
                {comment.text && (
                    <p className="comment-item__text">{comment.text}</p>
                )}

                {/* Shared Puzzle */}
                {comment.sharedPuzzle?.rows?.length > 0 && (
                    <div className="my-2">
                        <PuzzleShareCard puzzle={comment.sharedPuzzle} />
                    </div>
                )}

                {/* Battle Invite */}
                {comment.battleInvite?.battleId && (
                    <div className="my-2">
                        <BattleInviteCard invite={comment.battleInvite} />
                    </div>
                )}

                {/* Shared Team */}
                {comment.sharedTeam && (
                    <div className="forum-team-share-card my-2">
                        <div className="forum-team-share-header">
                            <h5 className="forum-team-share-title">
                                <PokeballIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                                <span className="truncate">{comment.sharedTeam.name}</span>
                            </h5>
                            <button
                                type="button"
                                onClick={() => actions.importTeam(comment.sharedTeam)}
                                className="btn btn-primary h-7 px-2.5 text-xs font-semibold"
                            >
                                <DownloadIcon className="w-3.5 h-3.5 mr-1" />
                                {language === 'pt' ? 'Importar' : 'Import'}
                            </button>
                        </div>
                        <div className="forum-team-share-slots">
                            {Array.from({ length: 6 }).map((_, slotIdx) => {
                                const pk = comment.sharedTeam.pokemons?.[slotIdx];
                                const spriteUrl = pk ? getTeamPokemonDisplaySprite(pk) : null;
                                return (
                                    <div
                                        key={slotIdx}
                                        className="forum-team-share-slot"
                                        onMouseEnter={(e) => pk && actions.hoverSlot({
                                            messageId: comment.id,
                                            slotIndex: slotIdx,
                                            pokemon: pk,
                                            ref: e.currentTarget
                                        })}
                                        onMouseLeave={() => actions.hoverSlot(null)}
                                    >
                                        {spriteUrl ? (
                                            <img
                                                src={spriteUrl}
                                                alt={pk.name}
                                                loading="lazy"
                                                className="forum-team-share-sprite"
                                                onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                                            />
                                        ) : (
                                            <span className="forum-team-share-empty">
                                                <PokeballIcon className="w-3.5 h-3.5" />
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Actions row */}
                <div className="comment-item__actions">
                    <button
                        type="button"
                        onClick={() => actions.like(comment.id)}
                        disabled={!canLike}
                        aria-pressed={likedByMe}
                        className={`comment-item__action-btn ${likedByMe ? 'is-liked' : ''}`}
                    >
                        <HeartIcon className={`w-3.5 h-3.5 shrink-0 ${likedByMe ? 'fill-primary text-primary' : ''}`} />
                        <span>{likeCount > 0 ? likeCount : (language === 'pt' ? 'Curtir' : 'Like')}</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleReplyClick}
                        className="comment-item__action-btn"
                    >
                        <ReplyIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>{language === 'pt' ? 'Responder' : 'Reply'}</span>
                    </button>

                    {/* Replies count button (when 1+ replies exist) */}
                    {hasReplies && (
                        <button
                            type="button"
                            onClick={() => onToggleExpand(comment.id)}
                            className={`comment-item__replies-toggle ${isExpanded ? 'is-expanded' : ''}`}
                            aria-expanded={isExpanded}
                            title={isExpanded
                                ? (language === 'pt' ? 'Ocultar respostas' : 'Hide replies')
                                : (language === 'pt' ? 'Ver respostas' : 'Show replies')}
                        >
                            <MessageIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span className="font-semibold">
                                {childReplies.length} {childReplies.length === 1
                                    ? (language === 'pt' ? 'resposta' : 'reply')
                                    : (language === 'pt' ? 'respostas' : 'replies')}
                            </span>
                            {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5 shrink-0 text-muted" />
                            ) : (
                                <ChevronDownIcon className="w-3.5 h-3.5 shrink-0 text-muted" />
                            )}
                        </button>
                    )}

                    {canDelete && (
                        isConfirmingDelete ? (
                            <span className="flex items-center gap-1.5 ml-auto">
                                <button
                                    type="button"
                                    onClick={() => actions.confirmDelete(comment.id)}
                                    className="btn btn-danger h-6 px-2 text-[11px]"
                                >
                                    {language === 'pt' ? 'Excluir' : 'Delete'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => actions.askDelete(null)}
                                    className="btn btn-secondary h-6 px-2 text-[11px]"
                                >
                                    {t ? t('common.cancel') : 'Cancelar'}
                                </button>
                            </span>
                        ) : (
                            <button
                                type="button"
                                onClick={() => actions.askDelete(comment.id)}
                                className="comment-item__action-btn comment-item__action-btn--delete ml-auto"
                                title={language === 'pt' ? 'Excluir comentário' : 'Delete comment'}
                                aria-label={language === 'pt' ? 'Excluir comentário' : 'Delete comment'}
                            >
                                <TrashIcon className="w-3.5 h-3.5" />
                            </button>
                        )
                    )}
                </div>

                {/* Nested Replies (Rendered directly underneath when expanded) */}
                {hasReplies && isExpanded && (
                    <div className="comment-item__nested-replies">
                        {childReplies.map((replyComment) => (
                            <CommentItem
                                key={replyComment.id}
                                comment={replyComment}
                                topicCreatorId={topicCreatorId}
                                repliesByParentId={repliesByParentId}
                                expandedCommentIds={expandedCommentIds}
                                onToggleExpand={onToggleExpand}
                                likedByMe={actions.isLikedByMe ? actions.isLikedByMe(replyComment) : false}
                                canDelete={actions.canDelete ? actions.canDelete(replyComment) : false}
                                isConfirmingDelete={actions.isConfirmingDelete ? actions.isConfirmingDelete(replyComment.id) : false}
                                canLike={canLike}
                                language={language}
                                t={t}
                                actions={actions}
                                depth={depth + 1}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
});

export function CommentList({
    comments = [],
    topicCreatorId,
    userId,
    isAdmin,
    confirmingDeleteId,
    language = 'pt',
    t,
    actions,
}) {
    // State for tracking which comment replies are expanded
    const [expandedCommentIds, setExpandedCommentIds] = useState(() => new Set());

    // Build the hierarchical replies map:
    // Any comment where replyTo.messageId matches another comment in the list is a child reply.
    const { topLevelComments, repliesByParentId } = useMemo(() => {
        const commentIdSet = new Set(comments.map((c) => c.id));
        const repliesMap = new Map();
        const topLevel = [];

        comments.forEach((c) => {
            const parentId = c.replyTo?.messageId;
            if (parentId && commentIdSet.has(parentId)) {
                if (!repliesMap.has(parentId)) {
                    repliesMap.set(parentId, []);
                }
                repliesMap.get(parentId).push(c);
            } else {
                topLevel.push(c);
            }
        });

        return { topLevelComments: topLevel, repliesByParentId: repliesMap };
    }, [comments]);

    const handleToggleExpand = useCallback((commentId, forceState = null) => {
        setExpandedCommentIds((prev) => {
            const next = new Set(prev);
            const shouldExpand = forceState !== null ? forceState : !next.has(commentId);
            if (shouldExpand) {
                next.add(commentId);
            } else {
                next.delete(commentId);
            }
            return next;
        });
    }, []);

    // Toggle expand all / collapse all
    const allParentIds = useMemo(() => Array.from(repliesByParentId.keys()), [repliesByParentId]);
    const areAllExpanded = allParentIds.length > 0 && allParentIds.every((id) => expandedCommentIds.has(id));

    const handleToggleAll = () => {
        if (areAllExpanded) {
            setExpandedCommentIds(new Set());
        } else {
            setExpandedCommentIds(new Set(allParentIds));
        }
    };

    // Enhanced jumpTo that automatically expands any parent reply branch
    const enhancedActions = useMemo(() => {
        return {
            ...actions,
            jumpTo: (messageId) => {
                // Find if target messageId has a parent and expand it
                for (const [parentId, childList] of repliesByParentId.entries()) {
                    if (childList.some((child) => child.id === messageId)) {
                        setExpandedCommentIds((prev) => new Set([...prev, parentId]));
                    }
                }
                actions.jumpTo(messageId);
            },
            isLikedByMe: (c) => !!userId && Array.isArray(c.likedBy) && c.likedBy.includes(userId),
            canDelete: (c) => isAdmin || (!!userId && c.createdBy === userId),
            isConfirmingDelete: (id) => confirmingDeleteId === id,
        };
    }, [actions, repliesByParentId, userId, isAdmin, confirmingDeleteId]);

    if (comments.length === 0) {
        return (
            <div className="comment-list__empty">
                <PokeballIcon className="w-8 h-8 text-muted opacity-40 mb-2" />
                <p className="font-semibold text-fg">
                    {language === 'pt' ? 'Nenhuma resposta ainda' : 'No comments yet'}
                </p>
                <p className="text-xs text-muted max-w-xs mt-1">
                    {language === 'pt'
                        ? 'Seja o primeiro treinador a contribuir para esta discussão!'
                        : 'Be the first trainer to participate in this discussion!'}
                </p>
            </div>
        );
    }

    return (
        <div className="comment-list">
            {/* Thread controls header if replies exist */}
            {allParentIds.length > 0 && (
                <div className="comment-list__toolbar">
                    <button
                        type="button"
                        onClick={handleToggleAll}
                        className="comment-list__collapse-all-btn"
                    >
                        <ChevronsUpDown className="w-3.5 h-3.5 text-primary" />
                        <span>
                            {areAllExpanded
                                ? (language === 'pt' ? 'Recolher todas as respostas' : 'Collapse all replies')
                                : (language === 'pt' ? 'Expandir todas as respostas' : 'Expand all replies')}
                        </span>
                    </button>
                </div>
            )}

            {/* List of top-level comments (with nested replies inside) */}
            {topLevelComments.map((comment) => (
                <CommentItem
                    key={comment.id}
                    comment={comment}
                    topicCreatorId={topicCreatorId}
                    repliesByParentId={repliesByParentId}
                    expandedCommentIds={expandedCommentIds}
                    onToggleExpand={handleToggleExpand}
                    likedByMe={enhancedActions.isLikedByMe(comment)}
                    canDelete={enhancedActions.canDelete(comment)}
                    isConfirmingDelete={enhancedActions.isConfirmingDelete(comment.id)}
                    canLike={!!userId}
                    language={language}
                    t={t}
                    actions={enhancedActions}
                    depth={0}
                />
            ))}
        </div>
    );
}
