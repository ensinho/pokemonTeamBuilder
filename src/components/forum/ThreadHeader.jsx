import React, { useState } from 'react';
import {
    ChevronLeftIcon,
    ShareIcon,
    TrashIcon,
    CheckCircleIcon,
    SparklesIcon,
    PokeballIcon,
} from '../icons';
import { AvatarSprite } from '../AvatarSprite';
import { TrainerBadge } from '../TrainerBadge';
import { formatForumTime, getCategoryMeta } from '../../utils/forumTime';

export function ThreadHeader({
    topic,
    messageCount = 0,
    onBack,
    onOpenProfile,
    onDeleteTopic,
    canDeleteTopic = false,
    language = 'pt',
    showToast,
}) {
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
    const [copied, setCopied] = useState(false);

    const categoryMeta = getCategoryMeta(topic.category, language);
    const timeFormatted = formatForumTime(topic.createdAt, language);
    const isOfficial = topic.createdBy === 'system' || topic.creatorName === 'Professor Oak';

    const handleShare = () => {
        try {
            navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            if (showToast) {
                showToast(
                    language === 'pt' ? 'Link do tópico copiado!' : 'Topic link copied!',
                    'success'
                );
            }
        } catch (_) {
            if (showToast) {
                showToast(language === 'pt' ? 'Erro ao copiar link.' : 'Failed to copy link.', 'error');
            }
        }
    };

    const handleDeleteClick = () => {
        if (isConfirmingDelete) {
            onDeleteTopic(topic.id);
            setIsConfirmingDelete(false);
        } else {
            setIsConfirmingDelete(true);
        }
    };

    return (
        <header className="thread-header">
            {/* Top Navigation, Breadcrumbs & Header Actions */}
            <div className="thread-header__top-row">
                <div className="flex items-center gap-2 min-w-0">
                    <button
                        type="button"
                        onClick={onBack}
                        className="thread-header__back-btn"
                        aria-label={language === 'pt' ? 'Voltar para discussões' : 'Back to discussions'}
                    >
                        <ChevronLeftIcon className="w-4 h-4 shrink-0" />
                        <span>{language === 'pt' ? 'Voltar' : 'Back'}</span>
                    </button>

                    <nav className="thread-header__breadcrumbs hidden sm:inline-flex" aria-label="Breadcrumb">
                        <span className="thread-breadcrumb__item">{language === 'pt' ? 'Fórum' : 'Forum'}</span>
                        <span className="thread-breadcrumb__sep">›</span>
                        <span className="thread-breadcrumb__item font-medium text-fg">{categoryMeta.label}</span>
                    </nav>
                </div>

                <div className="thread-header__actions">
                    <span className={`thread-card__badge ${categoryMeta.colorClass}`}>
                        {categoryMeta.label}
                    </span>

                    <span className="thread-header__stat-pill">
                        {messageCount} {language === 'pt' ? 'mensagens' : 'messages'}
                    </span>

                    <button
                        type="button"
                        onClick={handleShare}
                        className="thread-header__action-btn"
                        title={language === 'pt' ? 'Compartilhar tópico' : 'Share topic'}
                        aria-label={language === 'pt' ? 'Compartilhar tópico' : 'Share topic'}
                    >
                        {copied ? <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-400" /> : <ShareIcon className="w-3.5 h-3.5" />}
                        <span className="hidden sm:inline">
                            {copied ? (language === 'pt' ? 'Copiado!' : 'Copied!') : (language === 'pt' ? 'Compartilhar' : 'Share')}
                        </span>
                    </button>

                    {canDeleteTopic && (
                        isConfirmingDelete ? (
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={handleDeleteClick}
                                    className="btn btn-danger h-7 px-2 text-xs"
                                >
                                    {language === 'pt' ? 'Confirmar' : 'Confirm'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsConfirmingDelete(false)}
                                    className="btn btn-secondary h-7 px-2 text-xs"
                                >
                                    {language === 'pt' ? 'Cancelar' : 'Cancel'}
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={handleDeleteClick}
                                className="thread-header__action-btn thread-header__action-btn--danger"
                                title={language === 'pt' ? 'Excluir tópico' : 'Delete topic'}
                                aria-label={language === 'pt' ? 'Excluir tópico' : 'Delete topic'}
                            >
                                <TrashIcon className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">{language === 'pt' ? 'Excluir' : 'Delete'}</span>
                            </button>
                        )
                    )}
                </div>
            </div>

            {/* Bottom Row: Compact Title & Author Meta */}
            <div className="thread-header__title-row">
                <h1 className="thread-header__title">
                    {topic.title}
                </h1>

                <div className="thread-header__author">
                    <button
                        type="button"
                        className="thread-header__avatar-btn"
                        onClick={() => onOpenProfile({
                            userId: topic.createdBy,
                            name: topic.creatorName,
                            avatar: topic.creatorAvatar,
                            isShiny: topic.creatorAvatarIsShiny,
                            trainerSprite: topic.creatorTrainerSprite,
                            selectedBadgeId: topic.creatorBadgeId || null,
                        })}
                    >
                        <AvatarSprite
                            trainerSprite={topic.creatorTrainerSprite}
                            pokemonId={topic.creatorAvatar}
                            isShiny={topic.creatorAvatarIsShiny}
                            fallback={<PokeballIcon className="w-4 h-4 text-muted opacity-60" />}
                        />
                    </button>

                    <div className="flex items-center gap-1.5 flex-wrap text-xs">
                        <button
                            type="button"
                            className="thread-header__author-name"
                            onClick={() => onOpenProfile({
                                userId: topic.createdBy,
                                name: topic.creatorName,
                                avatar: topic.creatorAvatar,
                                isShiny: topic.creatorAvatarIsShiny,
                                trainerSprite: topic.creatorTrainerSprite,
                                selectedBadgeId: topic.creatorBadgeId || null,
                            })}
                        >
                            @{topic.creatorName}
                        </button>
                        {topic.creatorBadgeId && (
                            <TrainerBadge badgeId={topic.creatorBadgeId} size="xs" />
                        )}
                        <span className="thread-header__op-tag" title="Original Poster">OP</span>
                        {isOfficial && (
                            <span className="thread-header__admin-tag">
                                <SparklesIcon className="w-2.5 h-2.5 mr-0.5 inline" />
                                {language === 'pt' ? 'Oficial' : 'Official'}
                            </span>
                        )}
                        <span className="thread-header__time">
                            · {timeFormatted}
                        </span>
                    </div>
                </div>
            </div>
        </header>
    );
}

