import React, { memo } from 'react';
import { AvatarSprite } from '../AvatarSprite';
import { TrainerBadge } from '../TrainerBadge';
import { PokeballIcon, MessageIcon, HeartIcon, ClockIcon, SparklesIcon } from '../icons';
import { formatForumTime, getCategoryMeta } from '../../utils/forumTime';
import { POKEBALL_PLACEHOLDER_URL } from '../../constants/theme';
import { getTeamPokemonDisplaySprite } from '../../utils/pokemonSprites';

export const ThreadCard = memo(function ThreadCard({
    topic,
    isActive = false,
    onSelect,
    onOpenProfile,
    language = 'pt',
}) {
    const isOfficial = topic.createdBy === 'system' || topic.creatorName === 'Professor Oak';
    const categoryMeta = getCategoryMeta(topic.category, language);
    const replyCount = topic.messageCount > 0 ? topic.messageCount - 1 : 0;
    const likesCount = topic.likeCount || topic.likedBy?.length || 0;
    const timeFormatted = formatForumTime(topic.lastActivityAt || topic.createdAt, language);

    const handleProfileClick = (e) => {
        e.stopPropagation();
        if (onOpenProfile) {
            onOpenProfile({
                userId: topic.createdBy,
                name: topic.creatorName,
                avatar: topic.creatorAvatar,
                isShiny: topic.creatorAvatarIsShiny,
                trainerSprite: topic.creatorTrainerSprite,
                selectedBadgeId: topic.creatorBadgeId || null,
            });
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect(topic.id);
        }
    };

    // If topic has shared team preview
    const teamSlots = topic.sharedTeam?.pokemons || null;

    return (
        <article
            className={`thread-card ${isActive ? 'is-active' : ''}`}
            onClick={() => onSelect(topic.id)}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            role="button"
            aria-label={`${topic.title} por ${topic.creatorName}`}
        >
            {/* Left Column: Avatar / Themed Badge */}
            <div className="thread-card__avatar-col">
                <button
                    type="button"
                    className="thread-card__avatar-btn"
                    onClick={handleProfileClick}
                    title={`@${topic.creatorName}`}
                    aria-label={`Perfil de @${topic.creatorName}`}
                >
                    <AvatarSprite
                        trainerSprite={topic.creatorTrainerSprite}
                        pokemonId={topic.creatorAvatar}
                        isShiny={topic.creatorAvatarIsShiny}
                        fallback={<PokeballIcon className="w-6 h-6 text-muted opacity-60" />}
                    />
                </button>
            </div>

            {/* Central Content */}
            <div className="thread-card__content">
                {/* Header Row: Category Badge + Status + Relative Time */}
                <div className="thread-card__header-row">
                    <span className={`thread-card__badge ${categoryMeta.colorClass}`}>
                        {categoryMeta.label}
                    </span>

                    {isOfficial && (
                        <span className="thread-card__badge thread-card__badge--official">
                            <SparklesIcon className="w-3 h-3 inline-block mr-0.5" />
                            {language === 'pt' ? 'Oficial' : 'Official'}
                        </span>
                    )}

                    <span className="thread-card__time" title={topic.lastActivityAt || topic.createdAt}>
                        <ClockIcon className="w-3 h-3 shrink-0" />
                        {timeFormatted}
                    </span>
                </div>

                {/* Title */}
                <h3 className="thread-card__title">
                    {topic.title}
                </h3>

                {/* Excerpt / Preview snippet */}
                {topic.lastMessageText && (
                    <p className="thread-card__snippet">
                        {topic.lastMessageText}
                    </p>
                )}

                {/* Team Mini-Slots Preview if thread contains a team */}
                {Array.isArray(teamSlots) && teamSlots.length > 0 && (
                    <div className="thread-card__team-preview" aria-label="Prévia dos Pokémon do time">
                        {teamSlots.slice(0, 6).map((pk, idx) => {
                            const spriteUrl = pk ? getTeamPokemonDisplaySprite(pk) : null;
                            return (
                                <div key={idx} className="thread-card__team-slot" title={pk?.name}>
                                    {spriteUrl ? (
                                        <img
                                            src={spriteUrl}
                                            alt={pk.name}
                                            className="thread-card__team-sprite"
                                            loading="lazy"
                                            onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                                        />
                                    ) : (
                                        <PokeballIcon className="w-3 h-3 text-muted opacity-40" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Footer Metadata: Author + Replies + Upvotes */}
                <div className="thread-card__footer">
                    <div className="thread-card__author-info">
                        <span className="text-muted text-xs">
                            {language === 'pt' ? 'Iniciado por' : 'Started by'}
                        </span>
                        <button
                            type="button"
                            className="thread-card__author-link"
                            onClick={handleProfileClick}
                        >
                            @{topic.creatorName}
                        </button>
                        {topic.creatorBadgeId && (
                            <TrainerBadge badgeId={topic.creatorBadgeId} size="xs" />
                        )}
                    </div>

                    <div className="thread-card__metrics">
                        <span className="thread-card__metric" title={`${replyCount} ${language === 'pt' ? 'respostas' : 'replies'}`}>
                            <MessageIcon className="w-3.5 h-3.5 text-muted" />
                            <span>{replyCount}</span>
                        </span>

                        {likesCount > 0 && (
                            <span className="thread-card__metric" title={`${likesCount} ${language === 'pt' ? 'curtidas' : 'likes'}`}>
                                <HeartIcon className="w-3.5 h-3.5 text-rose-400" />
                                <span>{likesCount}</span>
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </article>
    );
});
