import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useForumStore } from '../../store/useForumStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useActiveTeamStore } from '../../store/useActiveTeamStore';
import { useFirestoreTeamsStore } from '../../store/useFirestoreTeamsStore';
import { useReferenceStore } from '../../store/useReferenceStore';
import { useBattlesStore } from '../../store/useBattlesStore';
import { useTranslation } from '../../hooks/useTranslation';
import { useComposerFocus } from '../../hooks/useComposerFocus';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { getStaticPokemonDetail } from '../../services/pokemonDataCache';
import { AnchoredPopover } from '../AnchoredPopover';
import { FriendActionButton } from '../FriendActionButton';
import { UserProfileModal } from '../modals/UserProfileModal';
import {
    ThreadCard,
    ThreadDetail,
    ForumHeader,
    ForumSidebar,
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
    };
};

export function FeedView({ showToast, navigate }) {
    const { t, language } = useTranslation();
    useDocumentMeta({
        title: 'Community Feed & Forum',
        description: 'Join discussions, share Pokémon teams, and discuss competitive strategies.',
        path: '/feed',
    });

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
        deleteMessage,
        deleteTopic,
    } = useForumStore();

    const { userId, isAdmin } = useAuthStore();
    const { savedTeams } = useFirestoreTeamsStore();
    const { currentTeam, teamName, setCurrentTeam, setTeamName, setEditingTeamId } = useActiveTeamStore();

    // Local UI States
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('recent');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Composer & Reply States
    const [replyText, setReplyText] = useState('');
    const [attachedTeam, setAttachedTeam] = useState(null);
    const [replyingTo, setReplyingTo] = useState(null);
    const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);

    // Profile & Popover states
    const [selectedProfile, setSelectedProfile] = useState(null);
    const [hoveredSlot, setHoveredSlot] = useState(null);
    const popoverRef = useRef(null);

    const { composerRef, focusComposer } = useComposerFocus();

    // Initialize forum topics listener
    useEffect(() => {
        initTopicsListener();
        return () => {
            cleanupTopicsListener();
        };
    }, [initTopicsListener, cleanupTopicsListener]);

    // Active Topic selection
    const activeTopic = useMemo(() => {
        if (!currentTopicId) return null;
        return topics.find((t) => t.id === currentTopicId) || null;
    }, [topics, currentTopicId]);

    // Filter & Sort Topics for central feed
    const filteredTopics = useMemo(() => {
        let result = topics;

        // Filter by category
        if (selectedCategory !== 'all') {
            result = result.filter((t) => t.category === selectedCategory);
        }

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(
                (t) =>
                    (t.title && t.title.toLowerCase().includes(query)) ||
                    (t.creatorName && t.creatorName.toLowerCase().includes(query)) ||
                    (t.lastMessageText && t.lastMessageText.toLowerCase().includes(query))
            );
        }

        // Sorting
        return [...result].sort((a, b) => {
            if (sortBy === 'popular') {
                const popA = (a.likeCount || a.likedBy?.length || 0) + (a.messageCount || 0);
                const popB = (b.likeCount || b.likedBy?.length || 0) + (b.messageCount || 0);
                return popB - popA;
            }
            if (sortBy === 'comments') {
                return (b.messageCount || 0) - (a.messageCount || 0);
            }
            // Default 'recent': newest activity / creation first
            const dateA = new Date(a.lastActivityAt || a.createdAt || 0).getTime();
            const dateB = new Date(b.lastActivityAt || b.createdAt || 0).getTime();
            return dateB - dateA;
        });
    }, [topics, selectedCategory, searchQuery, sortBy]);

    // Featured team for the right sidebar showcase
    const featuredArsenalTeam = useMemo(() => {
        if (currentTeam && currentTeam.length > 0) {
            return { name: teamName || 'Active Team', pokemons: currentTeam };
        }
        if (savedTeams && savedTeams.length > 0) {
            return savedTeams[0];
        }
        return null;
    }, [currentTeam, teamName, savedTeams]);

    // Navigation handlers
    const handleSelectTopic = (topicId) => {
        setCurrentTopicId(topicId);
        setReplyingTo(null);
        setAttachedTeam(null);
        setReplyText('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleBackToFeed = () => {
        setCurrentTopicId(null);
        setReplyingTo(null);
        setAttachedTeam(null);
        setReplyText('');
    };

    // Topic creation handler
    const handleCreateTopicSubmit = async ({ title, category, text, attachedTeam }) => {
        const id = await createTopic(title, category, text, attachedTeam);
        if (id) {
            setCurrentTopicId(id);
            if (showToast) {
                showToast(
                    language === 'pt' ? 'Tópico criado com sucesso!' : 'Topic published successfully!',
                    'success'
                );
            }
        }
    };

    // Send comment handler
    const handleSendMessageSubmit = async (e) => {
        if (e) e.preventDefault();
        if (!replyText.trim() && !attachedTeam) return;

        const success = await sendMessage(currentTopicId, replyText, attachedTeam, replyingTo);
        if (success) {
            setReplyText('');
            setAttachedTeam(null);
            setReplyingTo(null);
            if (showToast) {
                showToast(language === 'pt' ? 'Resposta publicada!' : 'Comment posted!', 'success');
            }
        }
    };

    // Post battle challenge into thread
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

    // Replying / quoting a message
    const handleStartReply = (message) => {
        const team = message.sharedTeam;
        setReplyingTo({
            messageId: message.id,
            creatorName: message.creatorName || 'Trainer',
            textSnippet: message.text || (team ? team.name : ''),
            teamName: team?.name || null,
        });
        focusComposer();
    };

    // Jump to quoted comment and flash it
    const scrollToMessage = (messageId) => {
        const el = document.getElementById(`forum-msg-${messageId}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('forum-message-item--flash');
            setTimeout(() => el.classList.remove('forum-message-item--flash'), 1200);
        }
    };

    // Import team to Builder
    const handleImportTeam = async (sharedTeam) => {
        if (!sharedTeam || !sharedTeam.pokemons) return;

        let pokemonIndex = useReferenceStore.getState().pokemonIndex || [];
        if (!pokemonIndex || pokemonIndex.length === 0) {
            try {
                pokemonIndex = await useReferenceStore.getState().fetchPokemonIndex();
            } catch (err) {
                console.error('Failed to fetch pokemon index on import:', err);
                pokemonIndex = [];
            }
        }
        const indexById = new Map((pokemonIndex || []).map((p) => [p.id, p]));

        const enrichedPokemons = await Promise.all(
            sharedTeam.pokemons.map(async (p) => {
                if (!p) return p;
                let indexEntry = indexById.get(p.id);
                if (!indexEntry && p.id) {
                    try {
                        indexEntry = await getStaticPokemonDetail(p.id);
                    } catch (_) {
                        /* ignore */
                    }
                }
                const types =
                    Array.isArray(p.types) && p.types.length > 0
                        ? p.types
                        : Array.isArray(indexEntry?.types) && indexEntry.types.length > 0
                        ? indexEntry.types
                        : ['normal'];

                return {
                    ...(indexEntry || {}),
                    ...p,
                    types,
                };
            })
        );

        setCurrentTeam(enrichedPokemons);
        setTeamName(sharedTeam.name || 'Imported Team');
        setEditingTeamId(null);

        if (showToast) {
            showToast(
                language === 'pt'
                    ? `Time "${sharedTeam.name}" importado com sucesso para o Construtor!`
                    : `Team "${sharedTeam.name}" imported to Builder!`,
                'success'
            );
        }
        navigate('/builder');
    };

    // Delete comment
    const handleConfirmDeleteMessage = async (messageId) => {
        const ok = await deleteMessage(currentTopicId, messageId);
        if (ok && showToast) {
            showToast(language === 'pt' ? 'Mensagem excluída.' : 'Message deleted.', 'success');
        }
        setConfirmingDeleteId(null);
    };

    // Delete topic
    const handleDeleteTopic = async (topicId) => {
        await deleteTopic(topicId);
        setCurrentTopicId(null);
    };

    // Single popover anchor reference
    const popoverAnchor = useMemo(() => {
        return { current: hoveredSlot?.ref || null };
    }, [hoveredSlot]);

    // Stable actions object for children
    const latestActions = useRef(null);
    latestActions.current = {
        like: (messageId) => toggleMessageLike(currentTopicId, messageId),
        reply: handleStartReply,
        jumpTo: scrollToMessage,
        askDelete: setConfirmingDeleteId,
        confirmDelete: handleConfirmDeleteMessage,
        importTeam: handleImportTeam,
        openProfile: (data) => setSelectedProfile(profileFromData(data)),
        hoverSlot: setHoveredSlot,
    };

    const messageActions = useMemo(
        () =>
            Object.fromEntries(
                [
                    'like',
                    'reply',
                    'jumpTo',
                    'askDelete',
                    'confirmDelete',
                    'importTeam',
                    'openProfile',
                    'hoverSlot',
                ].map((name) => [name, (...args) => latestActions.current[name](...args)])
            ),
        []
    );

    // Composer props bundle
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

    return (
        <div className="forum-view">
            {activeTopic ? (
                /* Thread Detail View (Drill-Down Inline) */
                <div className="forum-hub-layout forum-hub-layout--detail">
                    <main className="forum-main-col forum-main-col--detail">
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
                            confirmingDeleteId={confirmingDeleteId}
                            showToast={showToast}
                        />
                    </main>

                    {/* Desktop Right Sidebar in Detail View */}
                    <div className="hidden lg:block h-full overflow-y-auto custom-scrollbar">
                        <ForumSidebar
                            featuredTeam={featuredArsenalTeam}
                            onImportTeam={handleImportTeam}
                            totalTopics={topics.length}
                            language={language}
                            navigate={navigate}
                        />
                    </div>
                </div>
            ) : (
                /* Central Feed (Reddit / TCG Pocket Style Threads List) */
                <div className="forum-feed-scroll custom-scrollbar">
                    <div className="forum-hub-layout">
                        <main className="forum-main-col">
                            <ForumHeader
                                selectedCategory={selectedCategory}
                                onSelectCategory={setSelectedCategory}
                                searchQuery={searchQuery}
                                onSearchChange={setSearchQuery}
                                sortBy={sortBy}
                                onSortChange={setSortBy}
                                onOpenCreateTopic={() => setIsCreateModalOpen(true)}
                                totalTopics={filteredTopics.length}
                                language={language}
                            />

                            <section className="forum-thread-feed" aria-label="Lista de discussões do fórum">
                                {isInitialLoadingTopics ? (
                                    <>
                                        <ThreadCardSkeleton />
                                        <ThreadCardSkeleton />
                                        <ThreadCardSkeleton />
                                    </>
                                ) : filteredTopics.length === 0 ? (
                                    <div className="comment-list__empty py-12">
                                        <PokeballIcon className="w-12 h-12 text-muted opacity-30 mb-3" />
                                        <h3 className="font-bold text-base text-fg">
                                            {language === 'pt' ? 'Nenhum tópico encontrado' : 'No topics found'}
                                        </h3>
                                        <p className="text-xs text-muted max-w-sm mt-1.5 mb-4">
                                            {searchQuery
                                                ? (language === 'pt'
                                                    ? 'Nenhum resultado corresponde à sua busca. Tente outras palavras-chave ou limpe os filtros.'
                                                    : 'No results matched your search. Try different keywords.')
                                                : (language === 'pt'
                                                    ? 'Ainda não há discussões nesta categoria. Inicie a primeira agora mesmo!'
                                                    : 'No discussions in this category yet. Be the first to start one!')}
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => setIsCreateModalOpen(true)}
                                            className="btn btn-primary h-8 px-4 text-xs font-semibold"
                                        >
                                            {language === 'pt' ? 'Criar Novo Tópico' : 'Start New Topic'}
                                        </button>
                                    </div>
                                ) : (
                                    filteredTopics.map((topic) => (
                                        <ThreadCard
                                            key={topic.id}
                                            topic={topic}
                                            isActive={currentTopicId === topic.id}
                                            onSelect={handleSelectTopic}
                                            onOpenProfile={(data) => setSelectedProfile(profileFromData(data))}
                                            language={language}
                                        />
                                    ))
                                )}
                            </section>
                        </main>

                        {/* Desktop Right Sidebar */}
                        <ForumSidebar
                            featuredTeam={featuredArsenalTeam}
                            onImportTeam={handleImportTeam}
                            totalTopics={topics.length}
                            language={language}
                            navigate={navigate}
                        />
                    </div>
                </div>
            )}

            {/* Create Topic Modal */}
            <TopicCreateModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSubmit={handleCreateTopicSubmit}
                isAdmin={isAdmin}
                savedTeams={savedTeams}
                currentTeam={currentTeam}
                teamName={teamName}
                language={language}
                t={t}
            />

            {/* Hover details popover for Pokémon in shared teams */}
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

            {/* User Profile Modal */}
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
