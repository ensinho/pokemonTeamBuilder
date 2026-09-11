import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useForumStore } from '../../store/useForumStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useActiveTeamStore } from '../../store/useActiveTeamStore';
import { useFirestoreTeamsStore } from '../../store/useFirestoreTeamsStore';
import { useReferenceStore } from '../../store/useReferenceStore';
import { useTranslation } from '../../hooks/useTranslation';
import { useComposerFocus } from '../../hooks/useComposerFocus';
import { useChatAutoScroll } from '../../hooks/useChatAutoScroll';
import { BattleInviteCard } from '../BattleInviteCard';
import { PuzzleShareCard } from '../PuzzleShareCard';
import { useBattlesStore } from '../../store/useBattlesStore';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { getTeamPokemonDisplaySprite } from '../../utils/pokemonSprites';
import { getStaticPokemonDetail } from '../../services/pokemonDataCache';
import { AnchoredPopover } from '../AnchoredPopover';
import { AvatarSprite } from '../AvatarSprite';
import { FriendActionButton } from '../FriendActionButton';
import { UserProfileModal } from '../modals/UserProfileModal';
import { TeamsTopicNotice } from '../TeamsTopicNotice';
import { TrainerBadge } from '../TrainerBadge';
import {
    MessageIcon,
    PlusIcon,
    PokeballIcon,
    SwordsIcon,
    DiceIcon,
    CloseIcon,
    GlobeIcon,
    StarIcon,
    ClipIcon,
    HeartIcon,
    TrashIcon,
    ReplyIcon
} from '../icons';
import { POKEBALL_PLACEHOLDER_URL } from '../../constants/theme';
import '../../styles/forum-view.css';
import { ChevronLeft, Download } from 'lucide-react';

// Helper to format relative time
const formatRelativeTime = (isoString, language = 'en') => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);

    if (diffSec < 60) {
        return language === 'pt' ? 'agora há pouco' : 'just now';
    }
    if (diffMin < 60) {
        return language === 'pt' ? `há ${diffMin} min` : `${diffMin}m ago`;
    }
    if (diffHr < 24) {
        return language === 'pt' ? `há ${diffHr} h` : `${diffHr}h ago`;
    }
    if (diffDays === 1) {
        return language === 'pt' ? 'ontem' : 'yesterday';
    }
    return language === 'pt' ? `há ${diffDays} dias` : `${diffDays}d ago`;
};

export function FeedView({ showToast, navigate }) {
    const { t, language } = useTranslation();
    useDocumentMeta({
        title: 'Community Feed',
        description: 'See what the community is building and sharing on Pokémon Team Builder.',
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
        deleteMessage
    } = useForumStore();

    const { userId, isAdmin } = useAuthStore();
    const { savedTeams } = useFirestoreTeamsStore();
    const { currentTeam, teamName, setCurrentTeam, setTeamName, setEditingTeamId } = useActiveTeamStore();

    // Local States
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [topicSearch, setTopicSearch] = useState('');
    const [isCreatingTopic, setIsCreatingTopic] = useState(false);
    // Which of the two panes a phone is showing. Below 640px the sidebar and the
    // thread are separate screens rather than two bands of one screen: the old
    // layout pinned a 175px navigation block above the conversation, of which
    // 85px was a topic list showing two rows with no sign that it scrolled.
    // Ignored from 640px up, where both panes are visible at once.
    const [mobilePane, setMobilePane] = useState('thread');
    const [newTopicTitle, setNewTopicTitle] = useState('');
    const [newTopicCategory, setNewTopicCategory] = useState('general');
    const [newTopicText, setNewTopicText] = useState('');

    const [replyText, setReplyText] = useState('');
    const [attachedTeam, setAttachedTeam] = useState(null);
    const [isAttachDropdownOpen, setIsAttachDropdownOpen] = useState(false);
    const [selectedProfile, setSelectedProfile] = useState(null);
    const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);
    const [replyingTo, setReplyingTo] = useState(null);

    // Hover Popover for shared pokemon details
    const [hoveredSlot, setHoveredSlot] = useState(null);
    const popoverRef = useRef(null);

    const messageListRef = useRef(null);
    const { composerRef: replyInputRef, focusComposer } = useComposerFocus();

    // Initialize listeners
    useEffect(() => {
        initTopicsListener();
        return () => {
            cleanupTopicsListener();
        };
    }, [initTopicsListener, cleanupTopicsListener]);

    // Automatically set default selected topic to 'general' on first load
    useEffect(() => {
        if (!currentTopicId && topics.length > 0) {
            const hasGeneral = topics.some(t => t.id === 'general');
            if (hasGeneral) {
                setCurrentTopicId('general');
            } else if (topics[0]) {
                setCurrentTopicId(topics[0].id);
            }
        }
    }, [topics, currentTopicId, setCurrentTopicId]);

    // Newest message first, on every topic: see useChatAutoScroll for why the
    // opening jump is instant and re-asserted while sprites load.
    useChatAutoScroll(messageListRef, {
        threadKey: currentTopicId,
        count: messages.length,
        lastIsMine: messages[messages.length - 1]?.createdBy === userId,
        // On a phone the thread pane is `display: none` while the topic list is
        // up, which resets its scrollTop; coming back has to re-pin or the
        // thread reappears at the top.
        pinKey: mobilePane,
    });

    // Drop a pending reply/attachment when the user switches topics.
    useEffect(() => {
        setReplyingTo(null);
        setConfirmingDeleteId(null);
    }, [currentTopicId]);

    // Filter topics by category
    const filteredTopics = useMemo(() => {
        let result = topics;
        if (selectedCategory !== 'all') {
            result = result.filter(t => t.category === selectedCategory);
        }
        if (topicSearch.trim()) {
            const query = topicSearch.toLowerCase();
            result = result.filter(t => t.title.toLowerCase().includes(query));
        }
        return result;
    }, [topics, selectedCategory, topicSearch]);

    const activeTopic = useMemo(() => {
        return topics.find(t => t.id === currentTopicId) || null;
    }, [topics, currentTopicId]);

    // Pick a stable random team from savedTeams as "Arsenal Showcase"
    const featuredArsenalTeam = useMemo(() => {
        if (!savedTeams || savedTeams.length === 0) return null;
        const dateSeed = new Date().getDate();
        const index = dateSeed % savedTeams.length;
        return savedTeams[index];
    }, [savedTeams]);

    // Format category badge text
    const getCategoryLabel = (cat) => {
        const labels = {
            general: language === 'pt' ? 'Conversa' : 'General',
            teams: language === 'pt' ? 'Times' : 'Teams',
            strategy: language === 'pt' ? 'Estratégia' : 'Strategy',
            announcements: language === 'pt' ? 'Anúncio' : 'Announcement'
        };
        return labels[cat] || cat;
    };

    // Handle topic creation submit
    const handleCreateTopicSubmit = async (e) => {
        e.preventDefault();
        if (!newTopicTitle.trim()) {
            showToast(language === 'pt' ? "O título do tópico não pode ser vazio." : "Topic title cannot be empty.", "warning");
            return;
        }

        const id = await createTopic(newTopicTitle, newTopicCategory, newTopicText, attachedTeam);
        if (id) {
            setNewTopicTitle('');
            setNewTopicText('');
            setAttachedTeam(null);
            setIsCreatingTopic(false);
            setCurrentTopicId(id);
        }
    };

    // Post an open challenge into this thread. The battle is created first so
    // the message can point at it; if that fails there is nothing to announce.
    const handlePostBattleInvite = async (mode) => {
        setIsAttachDropdownOpen(false);
        const battleId = await useBattlesStore.getState().createPublicInvite({ mode });
        if (!battleId) return;
        const posted = await sendMessage(currentTopicId, replyText, null, replyingTo, { battleInvite: { battleId, mode } });
        if (posted) {
            setReplyText('');
            setReplyingTo(null);
        }
    };

    // Handle send message reply submit
    const handleSendMessageSubmit = async (e) => {
        e.preventDefault();
        if (!replyText.trim() && !attachedTeam) return;

        const success = await sendMessage(currentTopicId, replyText, attachedTeam, replyingTo);
        if (success) {
            setReplyText('');
            setAttachedTeam(null);
            setReplyingTo(null);
        }
    };

    // The composer opens one line tall and grows with the text up to the cap the
    // stylesheet sets (`max-height` on .forum-chat-textarea), then scrolls. A
    // <textarea> has no intrinsic way to do this: left alone it claims its
    // two-row default height, which is what put the + and send buttons a line
    // below the text they belong to.
    const resizeComposer = (el) => {
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight}px`;
    };

    const handleReplyTextChange = (e) => {
        setReplyText(e.target.value);
        resizeComposer(e.target);
    };

    // Sending empties the field, so the height has to come back with it.
    useEffect(() => {
        if (!replyText) resizeComposer(replyInputRef.current);
    }, [replyText, replyInputRef]);

    // Begin replying to a specific message: capture a compact snapshot for the
    // quote and focus the composer.
    const handleStartReply = (message) => {
        const team = message.sharedTeam;
        const teamSprites = team?.pokemons
            ? team.pokemons.filter(Boolean).map((pk) => getTeamPokemonDisplaySprite(pk)).filter(Boolean)
            : null;
        setReplyingTo({
            messageId: message.id,
            creatorName: message.creatorName || 'Trainer',
            textSnippet: message.text || (team ? team.name : ''),
            teamName: team?.name || null,
            teamSprites,
        });
        focusComposer();
    };

    // Scroll the thread to the original message a reply quotes, and flash it.
    const scrollToMessage = (messageId) => {
        const el = document.getElementById(`forum-msg-${messageId}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('forum-message-item--flash');
            setTimeout(() => el.classList.remove('forum-message-item--flash'), 1200);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessageSubmit(e);
        }
    };

    // Handle Import Team from forum post
    const handleImportTeam = async (sharedTeam) => {
        if (!sharedTeam || !sharedTeam.pokemons) return;

        let pokemonIndex = useReferenceStore.getState().pokemonIndex || [];
        if (!pokemonIndex || pokemonIndex.length === 0) {
            try {
                pokemonIndex = await useReferenceStore.getState().fetchPokemonIndex();
            } catch (err) {
                console.error("Failed to fetch pokemon index on import:", err);
                pokemonIndex = [];
            }
        }
        const indexById = new Map((pokemonIndex || []).map((p) => [p.id, p]));

        const enrichedPokemons = await Promise.all(sharedTeam.pokemons.map(async (p) => {
            if (!p) return p;
            let indexEntry = indexById.get(p.id);
            if (!indexEntry && p.id) {
                try {
                    indexEntry = await getStaticPokemonDetail(p.id);
                } catch (_) { /* ignore */ }
            }
            const types = (Array.isArray(p.types) && p.types.length > 0)
                ? p.types
                : ((Array.isArray(indexEntry?.types) && indexEntry.types.length > 0) ? indexEntry.types : ['normal']);

            return {
                ...(indexEntry || {}),
                ...p,
                types,
            };
        }));

        setCurrentTeam(enrichedPokemons);
        setTeamName(sharedTeam.name || 'Imported Team');
        setEditingTeamId(null); // Clear editing to prevent saving over another team

        showToast(
            language === 'pt'
                ? `Time "${sharedTeam.name}" importado com sucesso para o Construtor!`
                : `Team "${sharedTeam.name}" imported to Construtor!`,
            "success"
        );
        navigate('/builder');
    };

    // Confirm + delete a forum message (admin or author).
    const handleConfirmDeleteMessage = async (messageId) => {
        const ok = await deleteMessage(currentTopicId, messageId);
        if (ok) {
            showToast(language === 'pt' ? 'Mensagem excluída.' : 'Message deleted.', 'success');
        }
        setConfirmingDeleteId(null);
    };

    // Single popover anchor reference
    const popoverAnchor = useMemo(() => {
        return { current: hoveredSlot?.ref || null };
    }, [hoveredSlot]);

    return (
        <div className={`forum-view is-pane-${mobilePane}`}>
            {/* Left Sidebar: Topic List — its own screen on a phone */}
            <aside className="forum-sidebar">
                <div className="forum-sidebar__header">
                    <div className="forum-sidebar__title-row">
                        <span className="forum-sidebar__title">
                            {language === 'pt' ? 'Tópicos populares' : 'Top topics'}
                        </span>
                        <button
                            onClick={() => { setIsCreatingTopic(true); setMobilePane('thread'); }}
                            className="forum-new-btn"
                        >
                            <PlusIcon className="w-3.5 h-3.5" />
                            {language === 'pt' ? 'Novo' : 'New'}
                        </button>
                    </div>

                    <input
                        type="text"
                        placeholder={language === 'pt' ? 'Buscar tópico...' : 'Find a topic...'}
                        value={topicSearch}
                        onChange={(e) => setTopicSearch(e.target.value)}
                        className="forum-sidebar-search"
                    />

                    <div className="forum-categories">
                        <button
                            onClick={() => { setSelectedCategory('all'); setIsCreatingTopic(false); }}
                            className={`forum-category-btn ${selectedCategory === 'all' ? 'is-active' : ''}`}
                        >
                            {t('common.all')}
                        </button>
                        <button
                            onClick={() => { setSelectedCategory('general'); setIsCreatingTopic(false); }}
                            className={`forum-category-btn ${selectedCategory === 'general' ? 'is-active' : ''}`}
                        >
                            {getCategoryLabel('general')}
                        </button>
                        <button
                            onClick={() => { setSelectedCategory('teams'); setIsCreatingTopic(false); }}
                            className={`forum-category-btn ${selectedCategory === 'teams' ? 'is-active' : ''}`}
                        >
                            {getCategoryLabel('teams')}
                        </button>
                        <button
                            onClick={() => { setSelectedCategory('strategy'); setIsCreatingTopic(false); }}
                            className={`forum-category-btn ${selectedCategory === 'strategy' ? 'is-active' : ''}`}
                        >
                            {getCategoryLabel('strategy')}
                        </button>
                    </div>
                </div>

                <div className="forum-topics-list custom-scrollbar">
                    {isInitialLoadingTopics ? (
                        <p className="forum-state">{t('common.loading')}</p>
                    ) : filteredTopics.length === 0 ? (
                        <p className="forum-state">
                            {language === 'pt' ? 'Nenhum tópico encontrado' : 'No topics found'}
                        </p>
                    ) : (
                        filteredTopics.map((topic) => (
                            <button
                                key={topic.id}
                                onClick={() => {
                                    setCurrentTopicId(topic.id);
                                    setIsCreatingTopic(false);
                                    setMobilePane('thread');
                                }}
                                className={`forum-topic-card ${currentTopicId === topic.id && !isCreatingTopic ? 'is-active' : ''}`}
                            >
                                <span className="forum-topic-card__main">
                                    <span className={`forum-category-dot forum-category-dot--${topic.category}`} title={getCategoryLabel(topic.category)}></span>
                                    <span className="forum-topic-card__title" title={topic.title}>
                                        {topic.title}
                                    </span>
                                </span>
                                <span className="forum-topic-card__count">
                                    <MessageIcon className="w-3 h-3" />
                                    {topic.messageCount || 0}
                                </span>
                            </button>
                        ))
                    )}

                    <TeamsTopicNotice language={language} />
                </div>
            </aside>

            {/* Right Panel: Content View */}
            <main className="forum-main">
                {isCreatingTopic ? (
                    /* Topic Creation Form */
                    <div className="forum-new-topic-card">
                        <div className="forum-new-topic-head">
                            <h3 className="forum-new-topic-title">
                                {language === 'pt' ? 'Criar tópico público' : 'Create a public topic'}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsCreatingTopic(false)}
                                className="forum-new-topic-close"
                                aria-label={t('common.cancel')}
                            >
                                <CloseIcon className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateTopicSubmit} className="forum-new-topic-form">
                            <div className="forum-field">
                                <label className="forum-field__label">
                                    {language === 'pt' ? 'Título do tópico' : 'Topic title'}
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder={language === 'pt' ? 'Qual o assunto principal?' : "What's the main topic?"}
                                    value={newTopicTitle}
                                    onChange={(e) => setNewTopicTitle(e.target.value)}
                                    className="input-clean"
                                />
                            </div>

                            <div className="forum-field">
                                <label className="forum-field__label">
                                    {language === 'pt' ? 'Categoria' : 'Category'}
                                </label>
                                <select
                                    value={newTopicCategory}
                                    onChange={(e) => setNewTopicCategory(e.target.value)}
                                >
                                    <option value="general">{getCategoryLabel('general')}</option>
                                    <option value="teams">{getCategoryLabel('teams')}</option>
                                    <option value="strategy">{getCategoryLabel('strategy')}</option>
                                    {isAdmin && (
                                        <option value="announcements">{getCategoryLabel('announcements')}</option>
                                    )}
                                </select>
                            </div>

                            <div className="forum-field">
                                <label className="forum-field__label">
                                    {language === 'pt' ? 'Mensagem inicial' : 'First message'}
                                </label>
                                <textarea
                                    required
                                    rows={5}
                                    placeholder={language === 'pt' ? 'Escreva os detalhes...' : 'Explain the details...'}
                                    value={newTopicText}
                                    onChange={(e) => setNewTopicText(e.target.value)}
                                    className="forum-editor-textarea"
                                />
                            </div>

                            {/* Attach Team Preview inside Creator */}
                            {attachedTeam && (
                                <div className="forum-attached-team-preview">
                                    <ClipIcon className="w-3.5 h-3.5 shrink-0" />
                                    <span>{attachedTeam.name} ({attachedTeam.pokemons.length}/6)</span>
                                    <button type="button" onClick={() => setAttachedTeam(null)} aria-label={t('common.cancel')}>
                                        <CloseIcon className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}
                        </form>

                        <div className="forum-editor-actions">
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setIsAttachDropdownOpen(!isAttachDropdownOpen)}
                                    className="btn btn-secondary h-8 text-xs"
                                >
                                    <ClipIcon className="w-3.5 h-3.5 shrink-0" />
                                    {language === 'pt' ? 'Anexar time' : 'Attach team'}
                                </button>
                                {isAttachDropdownOpen && (
                                    <div className="forum-attach-menu">
                                        <p className="forum-attach-menu__label">
                                            {language === 'pt' ? 'Seus times salvos' : 'Your saved teams'}
                                        </p>
                                        {currentTeam.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setAttachedTeam({ name: teamName || 'Active Team', pokemons: currentTeam });
                                                    setIsAttachDropdownOpen(false);
                                                }}
                                                className="forum-attach-menu__item forum-attach-menu__item--accent"
                                            >
                                                <StarIcon className="w-3.5 h-3.5 text-accent shrink-0" isFavorite={true} />
                                                <span>{language === 'pt' ? 'Time ativo no Construtor' : 'Active team in Builder'}</span>
                                            </button>
                                        )}
                                        {savedTeams.map(team => (
                                            <button
                                                type="button"
                                                key={team.id}
                                                onClick={() => {
                                                    setAttachedTeam(team);
                                                    setIsAttachDropdownOpen(false);
                                                }}
                                                className="forum-attach-menu__item"
                                            >
                                                <span>{team.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="forum-editor-actions__group">
                                <button
                                    type="button"
                                    onClick={() => setIsCreatingTopic(false)}
                                    className="btn btn-secondary h-8 text-xs"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCreateTopicSubmit}
                                    className="btn btn-primary h-8 text-xs"
                                >
                                    {language === 'pt' ? 'Publicar tópico' : 'Publish topic'}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : activeTopic ? (
                    /* Chat Thread Screen */
                    <div className="forum-thread">
                        <div className="forum-main__header">
                            <button
                                type="button"
                                className="forum-main__back"
                                onClick={() => setMobilePane('topics')}
                                aria-label={language === 'pt' ? 'Voltar aos tópicos' : 'Back to topics'}
                            >
                                <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
                            </button>
                            <div className="forum-main__copy">
                                <h3 className="forum-main__title">{activeTopic.title}</h3>
                                <div className="forum-main__meta">
                                    <span className={`forum-topic-badge forum-topic-badge--${activeTopic.category}`}>
                                        {getCategoryLabel(activeTopic.category)}
                                    </span>
                                    <span>{language === 'pt' ? 'Criado por' : 'Created by'} @{activeTopic.creatorName}</span>
                                    <span>{formatRelativeTime(activeTopic.createdAt, language)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Messages Thread list */}
                        <div ref={messageListRef} className="forum-message-list custom-scrollbar">
                            {isInitialLoadingMessages ? (
                                <p className="forum-state">{t('common.loading')}</p>
                            ) : messages.length === 0 ? (
                                <p className="forum-state">
                                    {language === 'pt' ? 'Nenhuma mensagem escrita neste tópico.' : 'No messages posted in this topic.'}
                                </p>
                            ) : (
                                messages.map((message) => {
                                    const isMsgAdmin = message.createdBy === 'system' || message.userEmail === 'enzopo625@gmail.com' || (message.creatorName === 'Professor Oak');
                                    const likeCount = message.likeCount || message.likedBy?.length || 0;
                                    const likedByMe = !!userId && Array.isArray(message.likedBy) && message.likedBy.includes(userId);
                                    const canDeleteMessage = isAdmin || (!!userId && message.createdBy === userId);

                                    return (
                                        <div key={message.id} id={`forum-msg-${message.id}`} className="forum-message-item">
                                            <div
                                                className="forum-message-avatar"
                                                onClick={() => setSelectedProfile({
                                                    userId: message.createdBy,
                                                    name: message.creatorName,
                                                    avatar: message.creatorAvatar,
                                                    isShiny: message.creatorAvatarIsShiny,
                                                    trainerSprite: message.creatorTrainerSprite,
                                                    selectedBadgeId: message.creatorBadgeId || null,
                                                })}
                                            >
                                                <AvatarSprite
                                                    trainerSprite={message.creatorTrainerSprite}
                                                    pokemonId={message.creatorAvatar}
                                                    isShiny={message.creatorAvatarIsShiny}
                                                    fallback={<PokeballIcon className="w-5 h-5 text-muted opacity-50" />}
                                                />
                                            </div>

                                            <div className="forum-message-bubble">
                                                <div className="forum-message-header">
                                                    <div className="forum-message-identity">
                                                        <span
                                                            className="forum-message-author"
                                                            onClick={() => setSelectedProfile({
                                                                userId: message.createdBy,
                                                                name: message.creatorName,
                                                                avatar: message.creatorAvatar,
                                                                isShiny: message.creatorAvatarIsShiny,
                                                                trainerSprite: message.creatorTrainerSprite,
                                                                selectedBadgeId: message.creatorBadgeId || null,
                                                            })}
                                                        >
                                                            <span className="truncate">@{message.creatorName}</span>
                                                            {message.creatorBadgeId && <TrainerBadge badgeId={message.creatorBadgeId} size="xs" />}
                                                        </span>
                                                        {isMsgAdmin && (
                                                            <span className="forum-message-author-badge">
                                                                {message.creatorName === 'Professor Oak' ? 'System' : 'Admin'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="forum-message-time">
                                                        {formatRelativeTime(message.createdAt, language)}
                                                    </span>
                                                </div>

                                                {/* Quoted reply reference */}
                                                {message.replyTo && (
                                                    <button
                                                        type="button"
                                                        onClick={() => scrollToMessage(message.replyTo.messageId)}
                                                        className="forum-message-quote"
                                                        title={language === 'pt' ? 'Ir para a mensagem original' : 'Jump to original message'}
                                                    >
                                                        <ReplyIcon className="w-3 h-3 shrink-0" />
                                                        <span className="forum-message-quote__author">@{message.replyTo.creatorName}</span>
                                                        {message.replyTo.teamSprites?.length > 0 && (
                                                            <span className="forum-message-quote__team">
                                                                {message.replyTo.teamSprites.map((url, i) => (
                                                                    <img
                                                                        key={i}
                                                                        src={url}
                                                                        alt=""
                                                                        aria-hidden="true"
                                                                        className="forum-message-quote__sprite"
                                                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                                    />
                                                                ))}
                                                            </span>
                                                        )}
                                                        <span className="forum-message-quote__text">
                                                            {message.replyTo.textSnippet || (language === 'pt' ? 'mensagem' : 'message')}
                                                        </span>
                                                    </button>
                                                )}

                                                {message.text && (
                                                    <p className="forum-message-text">{message.text}</p>
                                                )}

                                                {message.sharedPuzzle?.rows?.length > 0 && (
                                                    <PuzzleShareCard puzzle={message.sharedPuzzle} />
                                                )}

                                                {message.battleInvite?.battleId && (
                                                    <BattleInviteCard invite={message.battleInvite} />
                                                )}

                                                {/* Render Shared Team snippet inside post */}
                                                {message.sharedTeam && (
                                                    <div className="forum-team-share-card">
                                                        <div className="forum-team-share-header">
                                                            <h5 className="forum-team-share-title">
                                                                <PokeballIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                                                                <span className="truncate">{message.sharedTeam.name}</span>
                                                            </h5>
                                                            <div className="forum-team-share-action">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleImportTeam(message.sharedTeam)}
                                                                    className="btn btn-primary h-7 px-2.5 text-xs font-semibold"
                                                                >
                                                                    <Download />
                                                                    {language === 'pt' ? 'Importar' : 'Import'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div className="forum-team-share-slots">
                                                            {Array.from({ length: 6 }).map((_, slotIdx) => {
                                                                const pk = message.sharedTeam.pokemons?.[slotIdx];
                                                                const spriteUrl = pk ? getTeamPokemonDisplaySprite(pk) : null;

                                                                return (
                                                                    <div
                                                                        key={slotIdx}
                                                                        className="forum-team-share-slot"
                                                                        onMouseEnter={(e) => pk && setHoveredSlot({
                                                                            messageId: message.id,
                                                                            slotIndex: slotIdx,
                                                                            pokemon: pk,
                                                                            ref: e.currentTarget
                                                                        })}
                                                                        onMouseLeave={() => setHoveredSlot(null)}
                                                                    >
                                                                        {spriteUrl ? (
                                                                            <img
                                                                                src={spriteUrl}
                                                                                alt={pk.name}
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

                                                {/* Message actions. Like and Reply lead; Delete is pushed to
                                                    the far end of the row by the stylesheet, because a
                                                    destructive control one thumb-width from Reply is a
                                                    mis-tap waiting to happen. */}
                                                <div className="forum-msg-actions">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleMessageLike(currentTopicId, message.id)}
                                                        disabled={!userId}
                                                        aria-pressed={likedByMe}
                                                        title={likedByMe ? (language === 'pt' ? 'Você curtiu' : 'You liked this') : (language === 'pt' ? 'Curtir' : 'Like')}
                                                        className={`forum-msg-action ${likedByMe ? 'is-liked' : ''}`}
                                                    >
                                                        <HeartIcon className="w-3.5 h-3.5 shrink-0" />
                                                        {likeCount > 0 && <span>{likeCount}</span>}
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleStartReply(message)}
                                                        title={language === 'pt' ? 'Responder' : 'Reply'}
                                                        className="forum-msg-action"
                                                    >
                                                        <ReplyIcon className="w-3.5 h-3.5 shrink-0" />
                                                        <span>{language === 'pt' ? 'Responder' : 'Reply'}</span>
                                                    </button>

                                                    {canDeleteMessage && (
                                                        confirmingDeleteId === message.id ? (
                                                            <span className="forum-msg-actions__confirm">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleConfirmDeleteMessage(message.id)}
                                                                    className="forum-msg-action is-danger"
                                                                >
                                                                    {language === 'pt' ? 'Excluir' : 'Delete'}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setConfirmingDeleteId(null)}
                                                                    className="forum-msg-action"
                                                                >
                                                                    {t('common.cancel')}
                                                                </button>
                                                            </span>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() => setConfirmingDeleteId(message.id)}
                                                                title={language === 'pt' ? 'Excluir mensagem' : 'Delete message'}
                                                                aria-label={language === 'pt' ? 'Excluir mensagem' : 'Delete message'}
                                                                className="forum-msg-action forum-msg-action--icon forum-msg-actions__end"
                                                            >
                                                                <TrashIcon className="w-3.5 h-3.5" />
                                                            </button>
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Editor reply input at bottom */}
                        <form onSubmit={handleSendMessageSubmit} className="forum-editor">
                            {replyingTo && (
                                <div className="forum-replying-banner">
                                    <ReplyIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                                    <span className="forum-replying-banner__label">
                                        {language === 'pt' ? 'Respondendo a' : 'Replying to'} <b>@{replyingTo.creatorName}</b>
                                        {replyingTo.textSnippet && <span className="forum-replying-banner__snippet">: {replyingTo.textSnippet}</span>}
                                    </span>
                                    {replyingTo.teamSprites?.length > 0 && (
                                        <span className="forum-replying-banner__team">
                                            {replyingTo.teamSprites.map((url, i) => (
                                                <img
                                                    key={i}
                                                    src={url}
                                                    alt=""
                                                    aria-hidden="true"
                                                    className="forum-message-quote__sprite"
                                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                />
                                            ))}
                                        </span>
                                    )}
                                    <button type="button" onClick={() => setReplyingTo(null)} aria-label={t('common.cancel')}>
                                        <CloseIcon className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}

                            {attachedTeam && (
                                <div className="forum-attached-team-preview">
                                    <ClipIcon className="w-3.5 h-3.5 shrink-0" />
                                    <span>{attachedTeam.name} ({attachedTeam.pokemons.length}/6)</span>
                                    <button type="button" onClick={() => setAttachedTeam(null)} aria-label={t('common.cancel')}>
                                        <CloseIcon className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}

                            <div className="forum-chat-input-wrapper">
                                <div className="relative shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => setIsAttachDropdownOpen(!isAttachDropdownOpen)}
                                        className="forum-chat-attach-btn"
                                        title={language === 'pt' ? 'Anexar Time' : 'Attach Team'}
                                    >
                                        <PlusIcon className="w-4 h-4" />
                                    </button>
                                    {isAttachDropdownOpen && (
                                        <div className="forum-attach-menu">
                                            <p className="forum-attach-menu__label">
                                                {t('forum.inviteSectionLabel')}
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => handlePostBattleInvite('random')}
                                                className="forum-attach-menu__item"
                                            >
                                                <SwordsIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                                                <span>{t('forum.inviteRandomOption')}</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handlePostBattleInvite('standard')}
                                                className="forum-attach-menu__item"
                                            >
                                                <SwordsIcon className="w-3.5 h-3.5 text-muted shrink-0" />
                                                <span>{t('forum.inviteTeamOption')}</span>
                                            </button>

                                            <p className="forum-attach-menu__label">
                                                {language === 'pt' ? 'Seus times salvos' : 'Your saved teams'}
                                            </p>
                                            {currentTeam.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setAttachedTeam({ name: teamName || 'Active Team', pokemons: currentTeam });
                                                        setIsAttachDropdownOpen(false);
                                                    }}
                                                    className="forum-attach-menu__item forum-attach-menu__item--accent"
                                                >
                                                    <StarIcon className="w-3.5 h-3.5 text-accent shrink-0" isFavorite={true} />
                                                    <span>{language === 'pt' ? 'Time ativo no Construtor' : 'Active team in Builder'}</span>
                                                </button>
                                            )}
                                            {savedTeams.map(team => (
                                                <button
                                                    type="button"
                                                    key={team.id}
                                                    onClick={() => {
                                                        setAttachedTeam(team);
                                                        setIsAttachDropdownOpen(false);
                                                    }}
                                                    className="forum-attach-menu__item"
                                                >
                                                    <span>{team.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <textarea
                                    ref={replyInputRef}
                                    rows={1}
                                    value={replyText}
                                    onChange={handleReplyTextChange}
                                    onKeyDown={handleKeyDown}
                                    placeholder={replyingTo
                                        ? (language === 'pt' ? `Respondendo a @${replyingTo.creatorName}...` : `Replying to @${replyingTo.creatorName}...`)
                                        : (language === 'pt' ? "Envie uma resposta pública..." : "Send a public reply...")}
                                    className="forum-chat-input-field forum-chat-textarea custom-scrollbar"
                                />

                                <button
                                    type="submit"
                                    disabled={!replyText.trim() && !attachedTeam}
                                    className="forum-chat-send-btn"
                                    title={language === 'pt' ? 'Enviar' : 'Send'}
                                >
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                                    </svg>
                                </button>
                            </div>
                        </form>
                    </div>
                ) : (
                    /* Fallback Empty Panel */
                    <div className="forum-state forum-state--fill">
                        <MessageIcon className="w-10 h-10 opacity-30" />
                        <h4 className="forum-state__title">
                            {language === 'pt' ? 'Nenhum tópico ativo' : 'No active topic'}
                        </h4>
                        <p className="forum-state__text">
                            {language === 'pt' ? 'Selecione um tópico na lista para começar a conversar, ou crie um novo.' : 'Pick a topic from the list to start chatting, or create a new one.'}
                        </p>
                    </div>
                )}
            </main>

            {/* Right Sidebar: Active Team & Info */}
            <aside className="forum-right-sidebar">
                {featuredArsenalTeam ? (
                    <div className="forum-right-card">
                        <div className="forum-right-card__header">
                            <SwordsIcon className="w-4 h-4 text-primary shrink-0" />
                            <span className="forum-right-card__title">
                                {language === 'pt' ? 'Time do Arsenal' : 'From Your Arsenal'}
                            </span>
                        </div>
                        <p className="forum-right-card__desc">
                            {featuredArsenalTeam.name}
                        </p>
                        <div className="forum-right-team-slots">
                            {Array.from({ length: 6 }).map((_, idx) => {
                                const pk = featuredArsenalTeam.pokemons?.[idx];
                                const spriteUrl = pk ? getTeamPokemonDisplaySprite(pk) : null;
                                return (
                                    <div key={idx} className="forum-right-team-slot">
                                        {spriteUrl ? (
                                            <img
                                                src={spriteUrl}
                                                alt={pk ? pk.name : ''}
                                                className="forum-right-team-sprite"
                                                title={pk ? pk.name : ''}
                                                onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                                            />
                                        ) : (
                                            <PokeballIcon className="w-3.5 h-3.5 text-muted opacity-25 shrink-0" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <button
                            type="button"
                            onClick={() => handleImportTeam(featuredArsenalTeam)}
                            className="btn btn-secondary w-full h-8 text-xs"
                        >
                            {language === 'pt' ? 'Abrir no Construtor' : 'Load in Builder'}
                        </button>
                    </div>
                ) : (
                    <div className="forum-right-card">
                        <p className="forum-right-card__text">
                            {language === 'pt' ? 'Nenhum time no arsenal ainda.' : 'No teams in your arsenal yet.'}
                        </p>
                        <button
                            type="button"
                            onClick={() => navigate('/builder')}
                            className="btn btn-primary w-full h-8 text-xs"
                        >
                            {language === 'pt' ? 'Criar time' : 'Build a team'}
                        </button>
                    </div>
                )}

                <div className="forum-right-card">
                    <div className="forum-right-card__header">
                        <StarIcon className="w-4 h-4 text-accent shrink-0" isFavorite={true} />
                        <span className="forum-right-card__title">
                            {language === 'pt' ? 'Dica de Partilha' : 'Sharing Tip'}
                        </span>
                    </div>
                    <p className="forum-right-card__text">
                        {language === 'pt'
                            ? 'Compartilhe seus times salvos anexando-os diretamente às suas respostas no fórum.'
                            : 'Share your saved teams with others by attaching them directly to your responses in the forum.'}
                    </p>
                </div>
            </aside>

            {/* Hover details popover */}
            <AnchoredPopover
                isOpen={!!hoveredSlot}
                anchorRef={popoverAnchor}
                popoverRef={popoverRef}
                className="bg-surface border border-border rounded-lg shadow-xl p-3 text-xs w-48 space-y-1.5 elevation-3"
                arrowStyle={{ backgroundColor: 'var(--color-surface)', borderLeft: '1px solid var(--color-border)', borderTop: '1px solid var(--color-border)' }}
            >
                {hoveredSlot && (
                    <div>
                        <h4 className="font-bold text-fg capitalize mb-1">{hoveredSlot.pokemon.name}</h4>
                        {hoveredSlot.pokemon.customization?.ability && (
                            <p><span className="text-muted">{t('builder.ability')}:</span> <span className="font-semibold text-fg capitalize">{hoveredSlot.pokemon.customization.ability.replace(/-/g, ' ')}</span></p>
                        )}
                        {hoveredSlot.pokemon.customization?.item && (
                            <p><span className="text-muted">{t('builder.item')}:</span> <span className="font-semibold text-fg capitalize">{hoveredSlot.pokemon.customization.item.replace(/-/g, ' ')}</span></p>
                        )}
                        {hoveredSlot.pokemon.customization?.nature && (
                            <p><span className="text-muted">{t('builder.nature')}:</span> <span className="font-semibold text-fg capitalize">{hoveredSlot.pokemon.customization.nature}</span></p>
                        )}
                        {hoveredSlot.pokemon.customization?.moves?.length > 0 && (
                            <div className="mt-1 border-t border-border pt-1">
                                <span className="text-muted font-bold block mb-0.5">{t('builder.moves')}:</span>
                                <ul className="list-disc pl-3 space-y-0.5">
                                    {hoveredSlot.pokemon.customization.moves.filter(Boolean).map(m => (
                                        <li key={m} className="capitalize text-fg">{m.replace(/-/g, ' ')}</li>
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
                friendAction={selectedProfile && (
                    <FriendActionButton targetUserId={selectedProfile.userId} className="w-full justify-center" />
                )}
            />
        </div>
    );
}
