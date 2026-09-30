import React, { useState, useEffect } from 'react';
import { CloseIcon, ClipIcon, StarIcon } from '../icons';
import { getCategoryMeta } from '../../utils/forumTime';

export function TopicCreateModal({
    isOpen,
    onClose,
    onSubmit,
    isAdmin = false,
    savedTeams = [],
    currentTeam = [],
    teamName = '',
    language = 'pt',
    t,
}) {
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('general');
    const [text, setText] = useState('');
    const [attachedTeam, setAttachedTeam] = useState(null);
    const [isAttachOpen, setIsAttachOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setTitle('');
            setCategory('general');
            setText('');
            setAttachedTeam(null);
            setIsAttachOpen(false);
            setIsSubmitting(false);
        }
    }, [isOpen]);

    // Handle Escape key
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim()) return;

        setIsSubmitting(true);
        try {
            await onSubmit({ title, category, text, attachedTeam });
            onClose();
        } catch (_) {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="modal-scrim" onClick={onClose} role="presentation">
            <div
                className="modal-panel topic-create-modal"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="topic-modal-title"
            >
                {/* Header */}
                <div className="topic-create-modal__header">
                    <h3 id="topic-modal-title" className="topic-create-modal__title">
                        {language === 'pt' ? 'Iniciar Nova Discussão' : 'Start a New Discussion'}
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn-ghost p-1.5 rounded-full"
                        aria-label={t ? t('common.cancel') : 'Fechar'}
                    >
                        <CloseIcon className="w-5 h-5 text-muted" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="topic-create-modal__form">
                    {/* Category Select */}
                    <div className="forum-field">
                        <label className="forum-field__label">
                            {language === 'pt' ? 'Categoria da Discussão' : 'Discussion Category'}
                        </label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="topic-create-select"
                        >
                            <option value="general">{getCategoryMeta('general', language).label}</option>
                            <option value="teams">{getCategoryMeta('teams', language).label}</option>
                            <option value="strategy">{getCategoryMeta('strategy', language).label}</option>
                            {isAdmin && (
                                <option value="announcements">{getCategoryMeta('announcements', language).label}</option>
                            )}
                        </select>
                    </div>

                    {/* Title Input */}
                    <div className="forum-field">
                        <label className="forum-field__label">
                            {language === 'pt' ? 'Título do Tópico' : 'Topic Title'}
                        </label>
                        <input
                            type="text"
                            required
                            placeholder={language === 'pt' ? 'Ex: Qual a melhor sinergia para Dragapult no meta atual?' : "What's on your mind?"}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="input-clean"
                        />
                    </div>

                    {/* Message Body */}
                    <div className="forum-field">
                        <label className="forum-field__label">
                            {language === 'pt' ? 'Mensagem Inicial / Detalhes' : 'First Message / Details'}
                        </label>
                        <textarea
                            required
                            rows={5}
                            placeholder={language === 'pt' ? 'Descreva o contexto, dúvidas ou estratégias para os outros treinadores...' : 'Explain the details...'}
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            className="topic-create-textarea custom-scrollbar"
                        />
                    </div>

                    {/* Attached Team Banner */}
                    {attachedTeam && (
                        <div className="comment-composer__team-banner mb-3">
                            <ClipIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span className="truncate flex-1 font-medium text-xs">
                                {attachedTeam.name} ({attachedTeam.pokemons?.length || 0}/6)
                            </span>
                            <button
                                type="button"
                                onClick={() => setAttachedTeam(null)}
                                className="comment-composer__close-btn"
                                aria-label="Remover time anexado"
                            >
                                <CloseIcon className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}

                    {/* Actions Row */}
                    <div className="topic-create-modal__actions">
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setIsAttachOpen(!isAttachOpen)}
                                className="btn btn-secondary h-8 text-xs font-semibold"
                            >
                                <ClipIcon className="w-3.5 h-3.5 mr-1" />
                                {language === 'pt' ? 'Anexar Time' : 'Attach Team'}
                            </button>

                            {isAttachOpen && (
                                <div className="comment-composer__attach-menu bottom-full mb-1">
                                    <p className="comment-composer__menu-label">
                                        {language === 'pt' ? 'Seus times salvos' : 'Your saved teams'}
                                    </p>
                                    {currentTeam.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setAttachedTeam({ name: teamName || 'Active Team', pokemons: currentTeam });
                                                setIsAttachOpen(false);
                                            }}
                                            className="comment-composer__menu-item is-featured"
                                        >
                                            <StarIcon className="w-3.5 h-3.5 text-amber-400 shrink-0 fill-amber-400" />
                                            <span>{language === 'pt' ? 'Time ativo no Construtor' : 'Active team in Builder'}</span>
                                        </button>
                                    )}
                                    {savedTeams.map((team) => (
                                        <button
                                            key={team.id}
                                            type="button"
                                            onClick={() => {
                                                setAttachedTeam(team);
                                                setIsAttachOpen(false);
                                            }}
                                            className="comment-composer__menu-item"
                                        >
                                            <span className="truncate">{team.name}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="btn btn-secondary h-8 px-3 text-xs font-semibold"
                            >
                                {t ? t('common.cancel') : 'Cancelar'}
                            </button>
                            <button
                                type="submit"
                                disabled={!title.trim() || isSubmitting}
                                className="btn btn-primary h-8 px-4 text-xs font-semibold"
                            >
                                {isSubmitting
                                    ? (language === 'pt' ? 'Publicando...' : 'Publishing...')
                                    : (language === 'pt' ? 'Publicar Tópico' : 'Publish Topic')}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
