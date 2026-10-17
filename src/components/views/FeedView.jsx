import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback, useDeferredValue } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { useForumStore } from '../../store/useForumStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useActiveTeamStore } from '../../store/useActiveTeamStore';
import { useFirestoreTeamsStore } from '../../store/useFirestoreTeamsStore';
import { useBattlesStore } from '../../store/useBattlesStore';
import { confirmAction } from '../../store/useConfirmStore';
import { useTranslation } from '../../hooks/useTranslation';
import { useComposerFocus } from '../../hooks/useComposerFocus';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import {
    FEED_SORTS,
    DEFAULT_FEED_SORT,
    FORUM_CATEGORY_IDS,
    filterTopics,
    rankTopics,
    trendingTopics,
    communityStats,
    isTopicLikedBy,
    isPinnedTopic,
    topicLastActivity,
} from '../../utils/forumRanking';
import { currentTopicUrl, shareLink } from '../../utils/forumShare';
import { AnchoredPopover } from '../AnchoredPopover';
import { FriendActionButton } from '../FriendActionButton';
import { UserProfileModal } from '../modals/UserProfileModal';
import {
    ThreadCard,
    ThreadDetail,
    ForumHeader,
    ForumSidebar,
    ForumExplorer,
    TopicCreateModal,
    ThreadCardSkeleton,
} from '../forum';
import { PokeballIcon } from '../icons';
import '../../styles/forum-view.css';

const profileFromData = (data) => {
    if (!data) return null;
    return {
        userId: data.userId || data.createdBy,
        name: data.name || data.creatorName,
        avatar: data.avatar || data.creatorAvatar,
        isShiny: data.isShiny ?? data.creatorAvatarIsShiny,
        trainerSprite: data.trainerSprite || data.creatorTrainerSprite,
        selectedBadgeId: data.selectedBadgeId || data.creatorBadgeId || null,
        frameId: data.frameId || data.creatorFrameId || null,
        titleId: data.titleId || data.creatorTitleId || null,
    };
};

// Where the feed was scrolled when a post was opened. Module scope, because
// the feed unmounts while a post is open; coming back lands where you left
// (Reddit does), instead of at the top of the list every time.
let savedFeedScroll = 0;

// Feed filters live in the URL next to ?topic=, so Back, refresh and a shared
// link all keep them. Defaults are left out of the URL.
const PARAM_DEFAULTS = { sort: DEFAULT_FEED_SORT, cat: 'all', q: '' };

// Hands children one object whose functions never change identity but always
// call the latest closure — memoised rows stay memoised.
function useStableActions(actions) {
    const latest = useRef(actions);
    latest.current = actions;
    const names = Object.keys(actions).join('|');
    return useMemo(
        () => Object.fromEntries(names.split('|').map((name) => [name, (...args) => latest.current[name](...args)])),
        [names],
    );
}

export function FeedView({ showToast, navigate }) {
    const { t, language } = useTranslation();

    const {
        topics,
        currentTopicId,
        messages,
        isInitialLoadingTopics,
        isInitialLoadingMessages,
        setCurrentTopicId,
        initTopicsListener,
        cleanupTopicsListener,
        createTopic,
        sendMessage,
        toggleMessageLike,
        toggleTopicLike,
        deleteMessage,
        deleteTopic,
        hasOlderMessages,
        loadOlderMessages,
    } = useForumStore(useShallow((s) => ({
        topics: s.topics, currentTopicId: s.currentTopicId, messages: s.messages,
        isInitialLoadingTopics: s.isInitialLoadingTopics, isInitialLoadingMessages: s.isInitialLoadingMessages,
        setCurrentTopicId: s.setCurrentTopicId, initTopicsListener: s.initTopicsListener,
        cleanupTopicsListener: s.cleanupTopicsListener, createTopic: s.createTopic, sendMessage: s.sendMessage,
        toggleMessageLike: s.toggleMessageLike, toggleTopicLike: s.toggleTopicLike,
        deleteMessage: s.deleteMessage, deleteTopic: s.deleteTopic,
        hasOlderMessages: s.hasOlderMessages, loadOlderMessages: s.loadOlderMessages,
    })));

    // Selectors, not whole stores: a bare useAuthStore()/useActiveTeamStore()
    // re-rendered the forum on every unrelated store tick (2026-10-14).
    const { userId, isAdmin } = useAuthStore(useShallow((s) => ({ userId: s.userId, isAdmin: s.isAdmin })));
    const savedTeams = useFirestoreTeamsStore((s) => s.savedTeams);
    const { currentTeam, teamName } = useActiveTeamStore(useShallow((s) => ({
        currentTeam: s.currentTeam, teamName: s.teamName,
    })));

    // The open topic lives in the URL (/feed?topic=<id>), not only in the
    // store: before 2026-10-14 a shared "topic link" was plain /feed, Back
    // left the forum instead of closing the thread, and arriving from Home
    // opened whatever topic the Home preview had selected. Opening pushes a
    // history entry (Back closes it); the store follows the URL.
    const [searchParams, setSearchParams] = useSearchParams();
    const routerNavigate = useNavigate();
    const topicParam = searchParams.get('topic') || null;
    const commentParam = searchParams.get('c') || null;
    const sortParam = searchParams.get('sort');
    const sortBy = FEED_SORTS.includes(sortParam) ? sortParam : DEFAULT_FEED_SORT;
    const catParam = searchParams.get('cat');
    const selectedCategory = FORUM_CATEGORY_IDS.includes(catParam) ? catParam : 'all';
    const searchQuery = searchParams.get('q') || '';
    const deferredQuery = useDeferredValue(searchQuery);
    const openedHereRef = useRef(false);
    const feedScrollRef = useRef(null);

    const setTopicInUrl = useCallback((id, { replace = false } = {}) => {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            if (id) next.set('topic', id); else next.delete('topic');
            next.delete('c');
            return next;
        }, { replace });
    }, [setSearchParams]);

    const setFeedParam = useCallback((key, value) => {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            if (!value || value === PARAM_DEFAULTS[key]) next.delete(key); else next.set(key, value);
            return next;
        }, { replace: true });
    }, [setSearchParams]);

    // Local UI state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [createPreset, setCreatePreset] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [attachedTeam, setAttachedTeam] = useState(null);
    const [replyingTo, setReplyingTo] = useState(null);
    const [selectedProfile, setSelectedProfile] = useState(null);
    const [hoveredSlot, setHoveredSlot] = useState(null);
    const popoverRef = useRef(null);

    const { composerRef, focusComposer } = useComposerFocus();

    // The URL drives the store; a different topic starts with a clean composer.
    useEffect(() => {
        if (topicParam !== (currentTopicId || null)) setCurrentTopicId(topicParam);
        setReplyingTo(null);
        setAttachedTeam(null);
        setReplyText('');
        // eslint-disable-next-line react-hooks/exhaustive-deps -- the URL drives the store, not the reverse
    }, [topicParam]);

    useEffect(() => {
        initTopicsListener();
        return () => {
            cleanupTopicsListener();
        };
    }, [initTopicsListener, cleanupTopicsListener]);

    const activeTopic = useMemo(() => {
        if (!currentTopicId) return null;
        return topics.find((tp) => tp.id === currentTopicId) || null;
    }, [topics, currentTopicId]);
    const isThreadOpen = !!activeTopic;

    useDocumentMeta({
        title: activeTopic ? activeTopic.title : 'Community Feed & Forum',
        description: activeTopic?.bodyPreview || 'Join discussions, share Pokémon teams, and discuss competitive strategies.',
        path: '/feed',
    });

    // Ranking, trending and the community figures, all from the one topics
    // stream. `now` is read here so Hot re-ranks whenever a topic moves.
    const { pinned, rows, trending, trendingIds, stats, categoryCounts, pinnedRooms } = useMemo(() => {
        const now = Date.now();
        const filtered = filterTopics(topics, { category: selectedCategory, query: deferredQuery });
        const ranked = rankTopics(filtered, sortBy, now);
        const hot = trendingTopics(topics, now);
        const counts = { all: topics.length };
        for (const tp of topics) counts[tp.category] = (counts[tp.category] || 0) + 1;
        return {
            ...ranked,
            trending: hot,
            trendingIds: new Set(hot.map((tp) => tp.id)),
            stats: communityStats(topics, now),
            categoryCounts: counts,
            // The explorer's rooms ignore the feed's filters: they are always one click away.
            pinnedRooms: topics.filter(isPinnedTopic).sort((a, b) => topicLastActivity(b) - topicLastActivity(a)),
        };
    }, [topics, selectedCategory, deferredQuery, sortBy]);

    // The explorer's discussion list: the feed's own order, minus the rooms it lists above.
    const explorerTopics = useMemo(() => rows.filter((tp) => !isPinnedTopic(tp)), [rows]);

    // The team the rail offers to share: the one being built, else the newest saved.
    const featuredTeam = useMemo(() => {
        if (currentTeam && currentTeam.length > 0) {
            return { name: teamName || 'Active Team', pokemons: currentTeam };
        }
        return savedTeams?.[0] || null;
    }, [currentTeam, teamName, savedTeams]);

    // Back to the feed lands where the user left it.
    useLayoutEffect(() => {
        if (!isThreadOpen && feedScrollRef.current) feedScrollRef.current.scrollTop = savedFeedScroll;
    }, [isThreadOpen]);

    const hrefFor = useCallback((id) => {
        const next = new URLSearchParams(searchParams);
        next.set('topic', id);
        next.delete('c');
        return `/feed?${next.toString()}`;
    }, [searchParams]);

    // ── Feed actions ───────────────────────────────────────────────────────
    const prepareOpen = () => {
        if (feedScrollRef.current) savedFeedScroll = feedScrollRef.current.scrollTop;
        openedHereRef.current = true;
        // .app-shell__content is the page scroller on some layouts.
        document.querySelector('.app-shell__content')?.scrollTo({ top: 0 });
    };

    const notifyShare = (result) => {
        if (result === 'copied') showToast?.(t('forum.linkCopied'), 'success');
        else if (result === 'failed') showToast?.(t('forum.shareFailed'), 'error');
    };

    const rowActions = useStableActions({
        beforeOpen: () => prepareOpen(),
        open: (id) => { prepareOpen(); setTopicInUrl(id); },
        like: (id) => toggleTopicLike(id),
        share: async (topic) => notifyShare(await shareLink({
            title: topic.title,
            text: (topic.bodyPreview || '').slice(0, 120),
            url: currentTopicUrl(topic.id),
        })),
        openProfile: (data) => setSelectedProfile(profileFromData(data)),
    });

    const handleBackToFeed = () => {
        // Opened from the list in this visit: the in-app back is history back,
        // so the browser's Back does not reopen the thread afterwards.
        if (openedHereRef.current) {
            openedHereRef.current = false;
            routerNavigate(-1);
        } else {
            setTopicInUrl(null, { replace: true });
        }
    };

    // A sort or category picked in the explorer. From inside a post it means
    // "show me the feed like this": the post closes, as a new history entry so
    // Back returns to it.
    const selectFeedFilter = (key, value) => {
        if (!topicParam) {
            setFeedParam(key, value);
            return;
        }
        openedHereRef.current = false;
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            if (!value || value === PARAM_DEFAULTS[key]) next.delete(key); else next.set(key, value);
            next.delete('topic');
            next.delete('c');
            return next;
        });
    };

    const openCreate = (preset = null) => {
        setCreatePreset(preset);
        setIsCreateModalOpen(true);
    };

    // The store announces the new post (with an "open" action); here we just go there.
    const handleCreateTopicSubmit = async ({ title, category, text, attachedTeam: team }) => {
        const id = await createTopic(title, category, text, team);
        if (id) {
            openedHereRef.current = true;
            setTopicInUrl(id);
        }
    };

    // ── Thread actions ─────────────────────────────────────────────────────
    // No toast on success: the new comment appears in the thread and the view
    // scrolls to it — the change already has a place on screen.
    const handleSendMessageSubmit = async (e) => {
        if (e) e.preventDefault();
        if (!replyText.trim() && !attachedTeam) return;
        const success = await sendMessage(currentTopicId, replyText, attachedTeam, replyingTo);
        if (success) {
            setReplyText('');
            setAttachedTeam(null);
            setReplyingTo(null);
        }
    };

    const handlePostBattleInvite = async (mode) => {
        const battleId = await useBattlesStore.getState().createPublicInvite({ mode });
        if (!battleId) return;
        const posted = await sendMessage(currentTopicId, replyText, null, replyingTo, {
            battleInvite: { battleId, mode },
        });
        if (posted) {
            setReplyText('');
            setReplyingTo(null);
        }
    };

    // Import team to Builder. The store's importer rebuilds each member from its
    // full record with its own instance id and reports the outcome itself; this
    // used to copy the posted members straight in, sharing whatever ids (or no
    // ids) the post carried.
    const handleImportTeam = async (sharedTeam) => {
        if (!sharedTeam || !sharedTeam.pokemons) return;
        const loaded = await useActiveTeamStore.getState().importTeam(sharedTeam);
        if (loaded) navigate('/builder');
    };

    // Jump to a comment and flash it — the landing spot of a quote, a
    // permalink, or a comment of mine that just arrived.
    const scrollToMessage = (messageId) => {
        const el = document.getElementById(`forum-msg-${messageId}`);
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.remove('is-flash');
        // Restart the highlight even if it is still running from a moment ago.
        void el.offsetWidth;
        el.classList.add('is-flash');
        setTimeout(() => el.classList.remove('is-flash'), 1600);
    };

    const handleDeleteTopic = async (topicId) => {
        const ok = await confirmAction({
            title: t('forum.deletePostTitle'),
            message: t('forum.deletePostMessage'),
            confirmText: t('forum.deleteConfirm'),
        });
        if (!ok) return;
        await deleteTopic(topicId);
        setTopicInUrl(null, { replace: true });
    };

    const messageActions = useStableActions({
        like: (messageId) => toggleMessageLike(currentTopicId, messageId),
        reply: (message) => {
            const team = message.sharedTeam;
            setReplyingTo({
                messageId: message.id,
                creatorName: message.creatorName || 'Trainer',
                textSnippet: message.text || (team ? team.name : ''),
                teamName: team?.name || null,
            });
            focusComposer();
        },
        jumpTo: scrollToMessage,
        share: async (message) => notifyShare(await shareLink({
            title: activeTopic?.title || '',
            text: (message.text || '').slice(0, 120),
            url: currentTopicUrl(currentTopicId, message.id),
        })),
        remove: async (message) => {
            const ok = await confirmAction({
                title: t('forum.deleteCommentTitle'),
                message: t('forum.deleteCommentMessage'),
                confirmText: t('forum.deleteConfirm'),
            });
            if (!ok) return;
            if (await deleteMessage(currentTopicId, message.id)) showToast?.(t('forum.commentDeleted'), 'success');
        },
        importTeam: handleImportTeam,
        openProfile: (data) => setSelectedProfile(profileFromData(data)),
        hoverSlot: setHoveredSlot,
    });

    const popoverAnchor = useMemo(() => ({ current: hoveredSlot?.ref || null }), [hoveredSlot]);

    const composerProps = {
        replyText,
        onReplyTextChange: (e) => setReplyText(e.target.value),
        onSubmit: handleSendMessageSubmit,
        replyingTo,
        onCancelReply: () => setReplyingTo(null),
        attachedTeam,
        onAttachTeam: (team) => setAttachedTeam(team),
        onRemoveAttachedTeam: () => setAttachedTeam(null),
        onPostBattleInvite: handlePostBattleInvite,
        currentTeam,
        teamName,
        savedTeams,
        disabled: !userId,
    };

    const sidebar = (
        <ForumSidebar
            stats={stats}
            trending={trending}
            currentTopicId={activeTopic?.id || null}
            hrefFor={hrefFor}
            onBeforeOpen={rowActions.beforeOpen}
            featuredTeam={featuredTeam}
            onShareTeam={(team) => openCreate({ team, category: 'teams' })}
            navigate={navigate}
            language={language}
            t={t}
        />
    );

    const renderRow = (topic, isPinned) => (
        <ThreadCard
            key={topic.id}
            topic={topic}
            href={hrefFor(topic.id)}
            liked={isTopicLikedBy(topic, userId)}
            isPinned={isPinned}
            isTrending={!isPinned && trendingIds.has(topic.id)}
            onOpen={rowActions.open}
            onBeforeOpen={rowActions.beforeOpen}
            onLike={rowActions.like}
            onShare={rowActions.share}
            onOpenProfile={rowActions.openProfile}
            language={language}
            t={t}
        />
    );

    const hasFilters = !!searchQuery || selectedCategory !== 'all';
    const isEmpty = pinned.length === 0 && rows.length === 0;

    return (
        <div className="forum-view">
            {/* Desktop: explorer | the content | rail, like an editor. Phone:
                the centre alone, the feed and a post as two screens. */}
            <div className={`forum-workspace ${activeTopic ? 'is-thread' : 'is-feed'}`}>
                <ForumExplorer
                    sortBy={sortBy}
                    selectedCategory={selectedCategory}
                    categoryCounts={categoryCounts}
                    pinned={pinnedRooms}
                    topics={explorerTopics}
                    activeTopicId={activeTopic?.id || null}
                    hrefFor={hrefFor}
                    onSelectSort={(id) => selectFeedFilter('sort', id)}
                    onSelectCategory={(id) => selectFeedFilter('cat', id)}
                    onBeforeOpen={rowActions.beforeOpen}
                    language={language}
                    t={t}
                />

                <main className="forum-center">
                    {activeTopic ? (
                        <ThreadDetail
                            topic={activeTopic}
                            messages={messages}
                            isLoading={isInitialLoadingMessages}
                            onBack={handleBackToFeed}
                            onOpenProfile={(data) => setSelectedProfile(profileFromData(data))}
                            onDeleteTopic={handleDeleteTopic}
                            canDeleteTopic={isAdmin || (!!userId && activeTopic.createdBy === userId)}
                            userId={userId}
                            isAdmin={isAdmin}
                            language={language}
                            t={t}
                            composerRef={composerRef}
                            composerProps={composerProps}
                            messageActions={messageActions}
                            hasOlder={hasOlderMessages}
                            onLoadOlder={loadOlderMessages}
                            onLikeTopic={(id, opMessage) => toggleTopicLike(id, { opMessage })}
                            onShareTopic={rowActions.share}
                            focusCommentId={commentParam}
                        />
                    ) : (
                        <div ref={feedScrollRef} className="forum-feed-scroll custom-scrollbar">
                            <ForumHeader
                                selectedCategory={selectedCategory}
                                onSelectCategory={(id) => setFeedParam('cat', id)}
                                searchQuery={searchQuery}
                                onSearchChange={(value) => setFeedParam('q', value)}
                                sortBy={sortBy}
                                onSortChange={(id) => setFeedParam('sort', id)}
                                onOpenCreateTopic={() => openCreate()}
                                stats={stats}
                                t={t}
                            />

                            <section
                                className={`forum-feed-list ${searchQuery !== deferredQuery ? 'is-stale' : ''}`}
                                aria-label={t('forum.title')}
                                aria-busy={isInitialLoadingTopics && topics.length === 0}
                            >
                                {isInitialLoadingTopics && topics.length === 0 ? (
                                    <>
                                        <ThreadCardSkeleton />
                                        <ThreadCardSkeleton />
                                        <ThreadCardSkeleton />
                                    </>
                                ) : isEmpty ? (
                                    <div className="forum-feed-empty">
                                        <PokeballIcon className="w-10 h-10 text-muted" />
                                        <h3 className="forum-feed-empty__title">{t('forum.emptyTitle')}</h3>
                                        <p className="forum-feed-empty__text">
                                            {searchQuery
                                                ? t('forum.emptySearch', { query: searchQuery })
                                                : t('forum.emptyCategory')}
                                        </p>
                                        <div className="forum-feed-empty__actions">
                                            {hasFilters && (
                                                <button
                                                    type="button"
                                                    className="btn btn-secondary btn-sm"
                                                    onClick={() => {
                                                        setSearchParams((prev) => {
                                                            const next = new URLSearchParams(prev);
                                                            next.delete('q');
                                                            next.delete('cat');
                                                            return next;
                                                        }, { replace: true });
                                                    }}
                                                >
                                                    {t('forum.clearFilters')}
                                                </button>
                                            )}
                                            <button type="button" onClick={() => openCreate()} className="btn btn-primary btn-sm">
                                                {t('forum.createPost')}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {pinned.map((topic) => renderRow(topic, true))}
                                        {rows.map((topic) => renderRow(topic, false))}
                                    </>
                                )}
                            </section>
                        </div>
                    )}
                </main>

                <div className="forum-rail-scroll custom-scrollbar">{sidebar}</div>
            </div>

            <TopicCreateModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSubmit={handleCreateTopicSubmit}
                isAdmin={isAdmin}
                savedTeams={savedTeams}
                currentTeam={currentTeam}
                teamName={teamName}
                initialTeam={createPreset?.team || null}
                initialCategory={createPreset?.category || null}
                language={language}
                t={t}
            />

            {/* Hover details for a Pokémon in a shared team */}
            <AnchoredPopover
                isOpen={!!hoveredSlot}
                anchorRef={popoverAnchor}
                popoverRef={popoverRef}
                className="bg-surface border border-border rounded-lg shadow-xl p-3 text-xs w-48 space-y-1.5 elevation-3"
                arrowStyle={{
                    backgroundColor: 'var(--color-surface)',
                    borderLeft: '1px solid var(--color-border)',
                    borderTop: '1px solid var(--color-border)',
                }}
            >
                {hoveredSlot && (
                    <div>
                        <h4 className="font-bold text-fg capitalize mb-1">{hoveredSlot.pokemon.name}</h4>
                        {hoveredSlot.pokemon.customization?.ability && (
                            <p>
                                <span className="text-muted">{t('builder.ability')}:</span>{' '}
                                <span className="font-semibold text-fg capitalize">
                                    {hoveredSlot.pokemon.customization.ability.replace(/-/g, ' ')}
                                </span>
                            </p>
                        )}
                        {hoveredSlot.pokemon.customization?.item && (
                            <p>
                                <span className="text-muted">{t('builder.item')}:</span>{' '}
                                <span className="font-semibold text-fg capitalize">
                                    {hoveredSlot.pokemon.customization.item.replace(/-/g, ' ')}
                                </span>
                            </p>
                        )}
                        {hoveredSlot.pokemon.customization?.nature && (
                            <p>
                                <span className="text-muted">{t('builder.nature')}:</span>{' '}
                                <span className="font-semibold text-fg capitalize">
                                    {hoveredSlot.pokemon.customization.nature}
                                </span>
                            </p>
                        )}
                        {hoveredSlot.pokemon.customization?.moves?.length > 0 && (
                            <div className="mt-1 border-t border-border pt-1">
                                <span className="text-muted font-bold block mb-0.5">{t('builder.moves')}:</span>
                                <ul className="list-disc pl-3 space-y-0.5">
                                    {hoveredSlot.pokemon.customization.moves.filter(Boolean).map((m) => (
                                        <li key={m} className="capitalize text-fg">
                                            {m.replace(/-/g, ' ')}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </AnchoredPopover>

            <UserProfileModal
                isOpen={!!selectedProfile}
                profile={selectedProfile}
                onClose={() => setSelectedProfile(null)}
                messages={messages}
                handleImportTeam={handleImportTeam}
                language={language}
                friendAction={
                    selectedProfile && (
                        <FriendActionButton targetUserId={selectedProfile.userId} className="w-full justify-center" />
                    )
                }
            />
        </div>
    );
}
