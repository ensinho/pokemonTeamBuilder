import React, { useMemo, useRef } from 'react';
import { ThreadHeader } from './ThreadHeader';
import { CommentList } from './CommentList';
import { CommentComposer } from './CommentComposer';
import { ThreadDetailSkeleton } from './ForumSkeletons';
import { PokeballIcon, HeartIcon, ReplyIcon, DownloadIcon } from '../icons';
import { BattleInviteCard } from '../BattleInviteCard';
import { PuzzleShareCard } from '../PuzzleShareCard';
import { getTeamPokemonDisplaySprite } from '../../utils/pokemonSprites';
import { POKEBALL_PLACEHOLDER_URL } from '../../constants/theme';
import { useChatAutoScroll } from '../../hooks/useChatAutoScroll';

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
    confirmingDeleteId,
    showToast,
}) {
    // The first message is the Original Post (OP), subsequent messages are comments
    const opMessage = messages.length > 0 ? messages[0] : null;
    const comments = useMemo(() => (messages.length > 1 ? messages.slice(1) : []), [messages]);

    const opLikedByMe = !!userId && Array.isArray(opMessage?.likedBy) && opMessage.likedBy.includes(userId);
    const opLikeCount = opMessage ? (opMessage.likeCount || opMessage.likedBy?.length || 0) : 0;

    const opTeam = opMessage?.sharedTeam || topic.sharedTeam || null;

    const scrollContainerRef = useRef(null);

    // Auto-scroll to latest message if the user sent it
    useChatAutoScroll(scrollContainerRef, {
        threadKey: topic?.id,
        count: messages.length,
        lastIsMine: messages[messages.length - 1]?.createdBy === userId,
    });

    if (isLoading && (!messages || messages.length === 0)) {
        return <ThreadDetailSkeleton />;
    }

    return (
        <section className="thread-detail" aria-label={`Discussão: ${topic.title}`}>
            {/* 1. Thread Header (Fixed at top) */}
            <div className="thread-detail__header-dock">
                <ThreadHeader
                    topic={topic}
                    messageCount={messages.length}
                    onBack={onBack}
                    onOpenProfile={onOpenProfile}
                    onDeleteTopic={onDeleteTopic}
                    canDeleteTopic={canDeleteTopic}
                    language={language}
                    showToast={showToast}
                />
            </div>

            {/* 2. Scrollable Messages Area */}
            <div ref={scrollContainerRef} className="thread-messages-scroll custom-scrollbar">
                {/* OP (Original Post) Container */}
                <div className="thread-op-card">
                    {/* Main Body Text */}
                    <div className="thread-op-card__body">
                        {opMessage?.text ? (
                            <p className="thread-op-card__text">{opMessage.text}</p>
                        ) : topic.lastMessageText ? (
                            <p className="thread-op-card__text">{topic.lastMessageText}</p>
                        ) : null}
                    </div>

                    {/* Attached Team in OP */}
                    {opTeam && (
                        <div className="forum-team-share-card my-4">
                            <div className="forum-team-share-header">
                                <h5 className="forum-team-share-title">
                                    <PokeballIcon className="w-4 h-4 text-primary shrink-0" />
                                    <span className="font-bold text-sm text-fg">{opTeam.name}</span>
                                </h5>
                                <button
                                    type="button"
                                    onClick={() => messageActions.importTeam(opTeam)}
                                    className="btn btn-primary h-7 px-3 text-xs font-semibold"
                                >
                                    <DownloadIcon className="w-3.5 h-3.5 mr-1" />
                                    {language === 'pt' ? 'Importar para Construtor' : 'Import to Builder'}
                                </button>
                            </div>
                            <div className="forum-team-share-slots">
                                {Array.from({ length: 6 }).map((_, slotIdx) => {
                                    const pk = opTeam.pokemons?.[slotIdx];
                                    const spriteUrl = pk ? getTeamPokemonDisplaySprite(pk) : null;
                                    return (
                                        <div
                                            key={slotIdx}
                                            className="forum-team-share-slot"
                                            onMouseEnter={(e) => pk && messageActions.hoverSlot({
                                                messageId: opMessage?.id || topic.id,
                                                slotIndex: slotIdx,
                                                pokemon: pk,
                                                ref: e.currentTarget
                                            })}
                                            onMouseLeave={() => messageActions.hoverSlot(null)}
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
                                                    <PokeballIcon className="w-4 h-4" />
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Puzzle in OP */}
                    {opMessage?.sharedPuzzle?.rows?.length > 0 && (
                        <div className="my-4">
                            <PuzzleShareCard puzzle={opMessage.sharedPuzzle} />
                        </div>
                    )}

                    {/* Battle in OP */}
                    {opMessage?.battleInvite?.battleId && (
                        <div className="my-4">
                            <BattleInviteCard invite={opMessage.battleInvite} />
                        </div>
                    )}

                    {/* OP Actions Bar */}
                    <div className="thread-op-card__actions">
                        {opMessage && (
                            <button
                                type="button"
                                onClick={() => messageActions.like(opMessage.id)}
                                disabled={!userId}
                                className={`thread-op-action-btn ${opLikedByMe ? 'is-liked' : ''}`}
                                aria-label={opLikedByMe ? 'Curtido' : 'Curtir'}
                            >
                                <HeartIcon className={`w-4 h-4 shrink-0 ${opLikedByMe ? 'fill-primary text-primary' : ''}`} />
                                <span className="font-medium">
                                    {opLikeCount > 0 ? opLikeCount : (language === 'pt' ? 'Curtir' : 'Like')}
                                </span>
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => {
                                if (opMessage) {
                                    messageActions.reply(opMessage);
                                } else {
                                    composerRef?.current?.focus();
                                }
                            }}
                            className="thread-op-action-btn"
                        >
                            <ReplyIcon className="w-4 h-4 shrink-0" />
                            <span>{language === 'pt' ? 'Responder' : 'Reply'}</span>
                        </button>
                    </div>
                </div>

                {/* Comment Section Header */}
                <div className="thread-comments-section__header">
                    <h3 className="thread-comments-section__title">
                        {language === 'pt' ? 'Comentários e Respostas' : 'Comments & Replies'}
                        <span className="thread-comments-section__count">({comments.length})</span>
                    </h3>
                </div>

                {/* Comments List (with replies counters & collapsible branches) */}
                <CommentList
                    comments={comments}
                    topicCreatorId={topic.createdBy}
                    userId={userId}
                    isAdmin={isAdmin}
                    confirmingDeleteId={confirmingDeleteId}
                    language={language}
                    t={t}
                    actions={messageActions}
                />
            </div>

            {/* 3. Fixed / Pinned Composer Dock at Bottom */}
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
