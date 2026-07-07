import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useForumStore } from '../../store/useForumStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useActiveTeamStore } from '../../store/useActiveTeamStore';
import { useFirestoreTeamsStore } from '../../store/useFirestoreTeamsStore';
import { useTranslation } from '../../hooks/useTranslation';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { getTeamPokemonDisplaySprite } from '../../utils/pokemonSprites';
import { AnchoredPopover } from '../AnchoredPopover';
import { UserProfileModal } from '../modals/UserProfileModal';
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
import { Download } from 'lucide-react';

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

export function FeedView({ colors, showToast, navigate }) {
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

    const { userId, userEmail, isAdmin, greetingPokemonId, greetingPokemonIsShiny } = useAuthStore();
    const { savedTeams } = useFirestoreTeamsStore();
    const { currentTeam, teamName, setCurrentTeam, setTeamName, setEditingTeamId } = useActiveTeamStore();

    // Local States
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [topicSearch, setTopicSearch] = useState('');
    const [isCreatingTopic, setIsCreatingTopic] = useState(false);
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
    const messageListEndRef = useRef(null);
    const replyInputRef = useRef(null);
    const prevTopicIdRef = useRef(currentTopicId);
    const prevMessagesLengthRef = useRef(messages.length);

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

    // Auto-scroll messages container to bottom conditionally (WITHOUT scrolling the screen)
    useEffect(() => {
        const container = messageListRef.current;
        if (container && messages.length > 0) {
            const isTopicChange = prevTopicIdRef.current !== currentTopicId;
            const hasNewMessage = messages.length > prevMessagesLengthRef.current;
            const isInitialLoad = prevMessagesLengthRef.current === 0;

            const lastMessage = messages[messages.length - 1];
            const sentByMe = lastMessage && lastMessage.createdBy === userId;

            const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120;

            if (isTopicChange || isInitialLoad || sentByMe || (hasNewMessage && isAtBottom)) {
                container.scrollTo({
                    top: container.scrollHeight,
                    behavior: 'smooth'
                });
            }
        }
        prevTopicIdRef.current = currentTopicId;
        prevMessagesLengthRef.current = messages.length;
    }, [messages, currentTopicId, userId]);

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

    // Begin replying to a specific message: capture a compact snapshot for the
    // quote and focus the composer.
    const handleStartReply = (message) => {
        setReplyingTo({
            messageId: message.id,
            creatorName: message.creatorName || 'Trainer',
            textSnippet: message.text || (message.sharedTeam ? `📋 ${message.sharedTeam.name}` : ''),
        });
        replyInputRef.current?.focus();
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
    const handleImportTeam = (sharedTeam) => {
        if (!sharedTeam || !sharedTeam.pokemons) return;

        setCurrentTeam(sharedTeam.pokemons);
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
        <div className="forum-view">
            {/* Left Sidebar: Topic List */}
            <aside className="forum-sidebar">
                <div className="forum-sidebar__header">
                    <div className="forum-sidebar__title-row">
                        <span className="forum-sidebar__title">
                            {language === 'pt' ? 'Tópicos populares' : 'Top topics'}
                        </span>
                        <button
                            onClick={() => setIsCreatingTopic(true)}
                            className="btn-github-new"
                        >
                            <PlusIcon className="w-3.5 h-3.5" />
                            {language === 'pt' ? 'Novo' : 'New'}
                        </button>
                    </div>

                    <div className="forum-sidebar__search-wrap">
                        <input
                            type="text"
                            placeholder={language === 'pt' ? 'Buscar tópico...' : 'Find a topic...'}
                            value={topicSearch}
                            onChange={(e) => setTopicSearch(e.target.value)}
                            className="forum-sidebar-search"
                        />
                    </div>

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
                        <div className="text-center py-6 text-muted text-sm">{t('common.loading')}</div>
                    ) : filteredTopics.length === 0 ? (
                        <div className="text-center py-6 text-muted text-sm">
                            {language === 'pt' ? 'Nenhum tópico encontrado' : 'No topics found'}
                        </div>
                    ) : (
                        filteredTopics.map((topic) => (
                            <button
                                key={topic.id}
                                onClick={() => { setCurrentTopicId(topic.id); setIsCreatingTopic(false); }}
                                className={`forum-topic-card ${currentTopicId === topic.id && !isCreatingTopic ? 'is-active' : ''}`}
                            >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <span className={`forum-category-dot forum-category-dot--${topic.category}`} title={getCategoryLabel(topic.category)}></span>
                                    <span className="forum-topic-card__title font-semibold text-xs truncate" title={topic.title}>
                                        {topic.title}
                                    </span>
                                </div>
                                <span className="text-[10px] text-muted flex items-center gap-0.5 shrink-0 ml-1">
                                    <MessageIcon className="w-3 h-3" />
                                    {topic.messageCount || 0}
                                </span>
                            </button>
                        ))
                    )}
                </div>
            </aside>

            {/* Right Panel: Content View */}
            <main className="forum-main">
                {isCreatingTopic ? (
                    /* Topic Creation Form */
                    <div className="forum-new-topic-card p-6 flex flex-col h-full justify-between overflow-y-auto">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between border-b border-border pb-3">
                                <h3 className="forum-new-topic-title text-xl font-bold text-fg">
                                    {language === 'pt' ? 'Criar Novo Tópico Público' : 'Create New Public Topic'}
                                </h3>
                                <button
                                    onClick={() => setIsCreatingTopic(false)}
                                    className="text-muted hover:text-fg p-1 rounded-lg hover:bg-surface-raised transition-colors"
                                >
                                    <CloseIcon className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleCreateTopicSubmit} className="forum-new-topic-form space-y-4">
                                <div className="grid gap-2">
                                    <label className="text-xs font-semibold text-muted uppercase tracking-wider">
                                        {language === 'pt' ? 'Título do Tópico' : 'Topic Title'}
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder={language === 'pt' ? "Qual o assunto principal?" : "What's the main topic?"}
                                        value={newTopicTitle}
                                        onChange={(e) => setNewTopicTitle(e.target.value)}
                                        className="input-clean font-semibold"
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <label className="text-xs font-semibold text-muted uppercase tracking-wider">
                                        {language === 'pt' ? 'Categoria' : 'Category'}
                                    </label>
                                    <select
                                        value={newTopicCategory}
                                        onChange={(e) => setNewTopicCategory(e.target.value)}
                                        className="home-active-team-select w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-fg"
                                    >
                                        <option value="general">{getCategoryLabel('general')}</option>
                                        <option value="teams">{getCategoryLabel('teams')}</option>
                                        <option value="strategy">{getCategoryLabel('strategy')}</option>
                                        {isAdmin && (
                                            <option value="announcements">{getCategoryLabel('announcements')}</option>
                                        )}
                                    </select>
                                </div>

                                <div className="grid gap-2">
                                    <label className="text-xs font-semibold text-muted uppercase tracking-wider">
                                        {language === 'pt' ? 'Mensagem Inicial' : 'First Message'}
                                    </label>
                                    <textarea
                                        required
                                        rows={5}
                                        placeholder={language === 'pt' ? "Escreva os detalhes..." : "Explain the details..."}
                                        value={newTopicText}
                                        onChange={(e) => setNewTopicText(e.target.value)}
                                        className="forum-editor-textarea h-32"
                                    />
                                </div>

                                {/* Attach Team Preview inside Creator */}
                                {attachedTeam && (
                                    <div className="forum-attached-team-preview flex items-center">
                                        <ClipIcon className="w-3.5 h-3.5 text-success shrink-0" />
                                        <span className="truncate">{attachedTeam.name} (Slots: {attachedTeam.pokemons.length}/6)</span>
                                        <button type="button" onClick={() => setAttachedTeam(null)}>
                                            <CloseIcon className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )}
                            </form>
                        </div>

                        <div className="forum-editor-actions pt-4 border-t border-border mt-6">
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setIsAttachDropdownOpen(!isAttachDropdownOpen)}
                                    className="btn btn-secondary text-xs flex items-center gap-1"
                                >
                                    <ClipIcon className="w-3.5 h-3.5 shrink-0" />
                                    {language === 'pt' ? 'Anexar Time' : 'Attach Team'}
                                </button>
                                {isAttachDropdownOpen && (
                                    <div className="absolute left-0 bottom-full mb-2 z-50 w-64 bg-surface border border-border rounded-lg shadow-xl p-2 max-h-48 overflow-y-auto">
                                        <p className="text-xs text-muted font-bold px-2 py-1 uppercase tracking-wider border-b border-border mb-1">
                                            {language === 'pt' ? 'Seus Times Salvos' : 'Your Saved Teams'}
                                        </p>
                                        {currentTeam.length > 0 && (
                                            <button
                                                onClick={() => {
                                                    setAttachedTeam({ name: teamName || 'Active Team', pokemons: currentTeam });
                                                    setIsAttachDropdownOpen(false);
                                                }}
                                                className="w-full text-left text-xs px-2 py-1.5 hover:bg-surface-raised rounded text-primary font-bold truncate flex items-center gap-1.5"
                                            >
                                                <StarIcon className="w-3.5 h-3.5 text-accent shrink-0" isFavorite={true} />
                                                {language === 'pt' ? 'Time Ativo Construtor' : 'Active Team in Builder'}
                                            </button>
                                        )}
                                        {savedTeams.map(team => (
                                            <button
                                                key={team.id}
                                                onClick={() => {
                                                    setAttachedTeam(team);
                                                    setIsAttachDropdownOpen(false);
                                                }}
                                                className="w-full text-left text-xs px-2 py-1.5 hover:bg-surface-raised rounded text-fg truncate block"
                                            >
                                                {team.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsCreatingTopic(false)}
                                    className="btn btn-secondary font-semibold"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCreateTopicSubmit}
                                    className="btn btn-primary font-semibold px-6"
                                >
                                    {language === 'pt' ? 'Publicar Tópico' : 'Publish Topic'}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : activeTopic ? (
                    /* Chat Thread Screen */
                    <div className="flex flex-col h-full overflow-hidden">
                        <div className="forum-main__header">
                            <div>
                                <h3 className="forum-main__title">{activeTopic.title}</h3>
                                <div className="forum-main__meta">
                                    <span className={`forum-topic-card__badge forum-topic-card__badge--${activeTopic.category}`}>
                                        {getCategoryLabel(activeTopic.category)}
                                    </span>
                                    <span>•</span>
                                    <span>{language === 'pt' ? 'Criado por' : 'Created by'} @{activeTopic.creatorName}</span>
                                    <span>•</span>
                                    <span>{formatRelativeTime(activeTopic.createdAt, language)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Messages Thread list */}
                        <div ref={messageListRef} className="forum-message-list custom-scrollbar">
                            {isInitialLoadingMessages ? (
                                <div className="text-center py-6 text-muted text-sm">{t('common.loading')}</div>
                            ) : messages.length === 0 ? (
                                <div className="text-center py-6 text-muted text-sm">
                                    {language === 'pt' ? 'Nenhuma mensagem escrita neste tópico.' : 'No messages posted in this topic.'}
                                </div>
                            ) : (
                                messages.map((message) => {
                                    const isMsgAdmin = message.createdBy === 'system' || message.userEmail === 'enzopo625@gmail.com' || (message.creatorName === 'Professor Oak');
                                    const likeCount = message.likeCount || message.likedBy?.length || 0;
                                    const likedByMe = !!userId && Array.isArray(message.likedBy) && message.likedBy.includes(userId);
                                    const canDeleteMessage = isAdmin || (!!userId && message.createdBy === userId);

                                    return (
                                        <div key={message.id} id={`forum-msg-${message.id}`} className="forum-message-item">
                                            <div className="forum-message-avatar-wrap">
                                                <div
                                                    className="forum-message-avatar cursor-pointer"
                                                    onClick={() => setSelectedProfile({
                                                        userId: message.createdBy,
                                                        name: message.creatorName,
                                                        avatar: message.creatorAvatar,
                                                        isShiny: message.creatorAvatarIsShiny
                                                    })}
                                                >
                                                    {message.creatorAvatar ? (
                                                        <img
                                                            src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${message.creatorAvatarIsShiny ? 'shiny/' : ''}${message.creatorAvatar}.png`}
                                                            alt=""
                                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                        />
                                                    ) : (
                                                        <PokeballIcon className="w-5 h-5 text-muted opacity-50" />
                                                    )}
                                                </div>
                                            </div>

                                            <div className="forum-message-bubble">
                                                <div className="forum-message-header">
                                                    <div>
                                                        <span
                                                            className="forum-message-author cursor-pointer hover:underline"
                                                            onClick={() => setSelectedProfile({
                                                                userId: message.createdBy,
                                                                name: message.creatorName,
                                                                avatar: message.creatorAvatar,
                                                                isShiny: message.creatorAvatarIsShiny
                                                            })}
                                                        >
                                                            @{message.creatorName}
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
                                                        <span className="forum-message-quote__text">
                                                            {message.replyTo.textSnippet || (language === 'pt' ? 'mensagem' : 'message')}
                                                        </span>
                                                    </button>
                                                )}

                                                {message.text && (
                                                    <p className="forum-message-text">{message.text}</p>
                                                )}

                                                {/* Render Shared Team snippet inside post */}
                                                {message.sharedTeam && (
                                                    <div className="forum-team-share-card">
                                                        <div className="forum-team-share-header">
                                                            <h5 className="forum-team-share-title flex items-center gap-1">
                                                                <PokeballIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                                                                {message.sharedTeam.name}
                                                            </h5>
                                                            <button
                                                                onClick={() => handleImportTeam(message.sharedTeam)}
                                                                className="btn btn-primary py-1 px-2.5 h-7 text-xs font-bold flex items-center gap-1"
                                                            >
                                                                <Download />
                                                                {language === 'pt' ? 'Importar Time' : 'Import Team'}
                                                            </button>
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
                                                                            <span className="forum-team-share-empty text-xs">
                                                                                <PokeballIcon className="w-3.5 h-3.5" />
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Message actions: like + (author/admin) delete */}
                                                <div className="flex items-center gap-2 mt-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleMessageLike(currentTopicId, message.id)}
                                                        disabled={!userId}
                                                        aria-pressed={likedByMe}
                                                        title={likedByMe ? (language === 'pt' ? 'Você curtiu' : 'You liked this') : (language === 'pt' ? 'Curtir' : 'Like')}
                                                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${likedByMe ? 'border-primary bg-primary text-white' : 'border-border bg-surface-raised text-muted hover:text-fg'}`}
                                                    >
                                                        <HeartIcon className="w-3.5 h-3.5 shrink-0" />
                                                        {likeCount > 0 && <span>{likeCount}</span>}
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleStartReply(message)}
                                                        title={language === 'pt' ? 'Responder' : 'Reply'}
                                                        className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-raised px-2 py-0.5 text-[11px] font-semibold text-muted transition-colors hover:text-fg"
                                                    >
                                                        <ReplyIcon className="w-3.5 h-3.5 shrink-0" />
                                                        <span>{language === 'pt' ? 'Responder' : 'Reply'}</span>
                                                    </button>

                                                    {canDeleteMessage && (
                                                        confirmingDeleteId === message.id ? (
                                                            <span className="inline-flex items-center gap-1 text-[11px]">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleConfirmDeleteMessage(message.id)}
                                                                    className="rounded-full border border-red-500/50 bg-red-500/10 px-2 py-0.5 font-semibold text-red-500 transition-colors hover:bg-red-500/20"
                                                                >
                                                                    {language === 'pt' ? 'Excluir' : 'Delete'}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setConfirmingDeleteId(null)}
                                                                    className="rounded-full border border-border bg-surface-raised px-2 py-0.5 text-muted transition-colors hover:text-fg"
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
                                                                className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border bg-surface-raised text-muted transition-colors hover:text-red-500"
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
                            <div ref={messageListEndRef} />
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
                                    <button type="button" onClick={() => setReplyingTo(null)} aria-label={t('common.cancel')}>
                                        <CloseIcon className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}

                            {attachedTeam && (
                                <div className="forum-attached-team-preview flex items-center mb-2">
                                    <ClipIcon className="w-3.5 h-3.5 text-success shrink-0" />
                                    <span className="truncate">{attachedTeam.name} (Slots: {attachedTeam.pokemons.length}/6)</span>
                                    <button type="button" onClick={() => setAttachedTeam(null)}>
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
                                        <div className="absolute left-0 bottom-full mb-2 z-50 w-64 bg-surface border border-border rounded-lg shadow-xl p-2 max-h-48 overflow-y-auto">
                                            <p className="text-xs text-muted font-bold px-2 py-1 uppercase tracking-wider border-b border-border mb-1">
                                                {language === 'pt' ? 'Seus Times Salvos' : 'Your Saved Teams'}
                                            </p>
                                            {currentTeam.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setAttachedTeam({ name: teamName || 'Active Team', pokemons: currentTeam });
                                                        setIsAttachDropdownOpen(false);
                                                    }}
                                                    className="w-full text-left text-xs px-2 py-1.5 hover:bg-surface-raised rounded text-primary font-bold truncate flex items-center gap-1.5"
                                                >
                                                    <StarIcon className="w-3.5 h-3.5 text-accent shrink-0" isFavorite={true} />
                                                    {language === 'pt' ? 'Time Ativo Construtor' : 'Active Team in Builder'}
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
                                                    className="w-full text-left text-xs px-2 py-1.5 hover:bg-surface-raised rounded text-fg truncate block"
                                                >
                                                    {team.name}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <textarea
                                    ref={replyInputRef}
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
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
                    <div className="flex flex-col items-center justify-center h-full text-center p-6 text-muted">
                        <MessageIcon className="w-12 h-12 opacity-30 mb-2" />
                        <h4 className="font-bold text-sm text-fg">
                            {language === 'pt' ? 'Nenhum tópico ativo' : 'No active topic'}
                        </h4>
                        <p className="text-xs max-w-xs mt-1">
                            {language === 'pt' ? 'Selecione um tópico na barra lateral para começar a conversar ou crie um novo!' : 'Select a topic in the sidebar to start chatting or create a new one!'}
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
                        <p className="forum-right-card__desc truncate">
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
                            onClick={() => handleImportTeam(featuredArsenalTeam)}
                            className="btn btn-secondary w-full py-1 text-xs font-bold mt-2"
                        >
                            {language === 'pt' ? 'Editar no Construtor' : 'Load in Builder'}
                        </button>
                    </div>
                ) : (
                    <div className="forum-right-card p-4 text-center">
                        <p className="text-xs text-muted font-bold">
                            {language === 'pt' ? 'Nenhum time no arsenal' : 'No teams in arsenal'}
                        </p>
                        <button
                            onClick={() => navigate('/builder')}
                            className="btn btn-primary w-full py-1.5 text-xs font-bold mt-2"
                        >
                            {language === 'pt' ? 'Criar Time' : 'Build Team'}
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
                    <p className="text-[11px] text-muted leading-relaxed mt-1.5">
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
            />
        </div>
    );
}
