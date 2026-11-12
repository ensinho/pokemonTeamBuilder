import React, { useState, useEffect, useRef } from 'react';
import { MascotCompanion } from '../MascotCompanion';
import { RATINGS } from '../../utils/teamRating';
import { getPokemonFrontSpriteUrl } from '../../utils/pokemonSprites';
import { activeMention, insertMention, mentionSuggestions } from '../../utils/forumMentions';
import { SendHorizontal } from 'lucide-react';
import { CloseIcon, SwordsIcon, ClipIcon, StarIcon, ReplyIcon } from '../icons';
import { AttachMenuPopover } from './AttachMenuPopover';

/**
 * The docked composer: one row — attach, the field, post — that grows only
 * while you type (it was two rows and ~230px on a phone before 2026-10-17).
 * Reply and attached-team banners sit above the row when present.
 */
export const CommentComposer = React.forwardRef(function CommentComposer({
    replyText,
    onReplyTextChange,
    onSubmit,
    replyingTo,
    onCancelReply,
    attachedTeam,
    onAttachTeam,
    onRemoveAttachedTeam,
    onPostBattleInvite,
    currentTeam = [],
    teamName = '',
    savedTeams = [],
    disabled = false,
    isSending = false,
    language = 'pt',
    mentionCandidates = [],
    // "Avalie meu time" (2026-11-06): offered under a shared team only.
    ratingEnabled = false,
    rating = null,
    onRating,
    t,
}, ref) {
    const [isAttachOpen, setIsAttachOpen] = useState(false);
    // @mentions (2026-11-06): the partial before the caret, and who matches it.
    const [mention, setMention] = useState(null);
    const suggestions = mention ? mentionSuggestions(mentionCandidates, mention.query) : [];
    const pickMention = (name) => {
        const field = ref?.current;
        if (!mention) return;
        const next = insertMention(replyText, mention, name);
        onReplyTextChange({ target: { value: next.text } });
        setMention(null);
        requestAnimationFrame(() => {
            if (!field) return;
            field.focus();
            field.setSelectionRange(next.caret, next.caret);
        });
    };
    const attachButtonRef = useRef(null);
    const closeAttach = React.useCallback(() => setIsAttachOpen(false), []);

    // Auto-grow the field up to ~7 lines, then it scrolls.
    const handleTextChange = (e) => {
        onReplyTextChange(e);
        setMention(activeMention(e.target.value, e.target.selectionStart ?? e.target.value.length));
        e.target.style.height = 'auto';
        e.target.style.height = `${Math.min(e.target.scrollHeight, 168)}px`;
    };

    useEffect(() => {
        if (!replyText && ref?.current) {
            ref.current.style.height = '';
        }
    }, [replyText, ref]);

    // Enter sends only where there is a physical keyboard; on a phone the
    // Return key is the only way to start a new line, so it must not send
    // (the send button is right there). Ctrl/⌘+Enter sends everywhere.
    const handleKeyDown = (e) => {
        if (suggestions.length && (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey))) {
            e.preventDefault();
            pickMention(suggestions[0]);
            return;
        }
        if (e.key === 'Escape' && mention) {
            setMention(null);
            return;
        }
        if (e.key !== 'Enter' || e.nativeEvent?.isComposing) return;
        const finePointer = typeof window !== 'undefined' && window.matchMedia?.('(pointer: fine)').matches;
        if ((e.metaKey || e.ctrlKey) || (finePointer && !e.shiftKey)) {
            e.preventDefault();
            if (!isSending && (replyText.trim() || attachedTeam)) {
                onSubmit(e);
            }
        }
    };

    const hasContent = !!replyText.trim() || !!attachedTeam || !!rating;

    return (
        <form onSubmit={onSubmit} className="comment-composer">
            {ratingEnabled && (
                <div className="rating-chips" role="group" aria-label={t('forum.rating.label')}>
                    <span className="rating-chips__label">{t('forum.rating.label')}</span>
                    {RATINGS.map((r) => (
                        <button
                            key={r.id}
                            type="button"
                            className="rating-chip"
                            aria-pressed={rating === r.id}
                            aria-label={t(`forum.rating.${r.id}`)}
                            title={t(`forum.rating.${r.id}`)}
                            onClick={() => onRating?.(rating === r.id ? null : r.id)}
                        >
                            <img src={getPokemonFrontSpriteUrl(r.art)} alt="" width={28} height={28} loading="lazy" decoding="async" />
                            <span>{t(`forum.rating.${r.id}`)}</span>
                        </button>
                    ))}
                </div>
            )}
            {replyingTo && (
                <div className="comment-composer__banner">
                    <ReplyIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="comment-composer__banner-text">
                        {t('forum.replyingTo')} <b>@{replyingTo.creatorName}</b>
                        {replyingTo.textSnippet && (
                            <span className="comment-composer__banner-snippet"> “{replyingTo.textSnippet}”</span>
                        )}
                    </span>
                    <button
                        type="button"
                        onClick={onCancelReply}
                        className="comment-composer__banner-close"
                        aria-label={t('common.cancel')}
                    >
                        <CloseIcon className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {attachedTeam && (
                <div className="comment-composer__banner">
                    <ClipIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="comment-composer__banner-text">
                        {attachedTeam.name} ({attachedTeam.pokemons?.length || 0}/6)
                    </span>
                    <button
                        type="button"
                        onClick={onRemoveAttachedTeam}
                        className="comment-composer__banner-close"
                        aria-label={t('common.cancel')}
                    >
                        <CloseIcon className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            <div className="comment-composer__row">
                {/* In a thread he sits where the trainer writes: a nod for the comment just sent. */}
                <MascotCompanion listen rest="curioso" size="sm" className="comment-composer__host" />
                <button
                    ref={attachButtonRef}
                    type="button"
                    aria-haspopup="dialog"
                    aria-expanded={isAttachOpen}
                    onClick={() => setIsAttachOpen((open) => !open)}
                    className={`btn btn-ghost btn-icon comment-composer__attach ${attachedTeam ? 'is-active' : ''}`}
                    aria-label={t('forum.attach')}
                    title={t('forum.attach')}
                >
                    <ClipIcon className="w-4 h-4" />
                </button>

                <AttachMenuPopover
                    isOpen={isAttachOpen}
                    onClose={closeAttach}
                    anchorRef={attachButtonRef}
                    ariaLabel={t('forum.attach')}
                >
                    <p className="comment-composer__menu-label">
                        {language === 'pt' ? 'Desafiar o fórum para batalha' : 'Invite the forum to battle'}
                    </p>
                    <button
                        type="button"
                        onClick={() => { setIsAttachOpen(false); onPostBattleInvite('random'); }}
                        className="comment-composer__menu-item"
                    >
                        <SwordsIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>{language === 'pt' ? 'Batalha com times aleatórios' : 'Random battle'}</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => { setIsAttachOpen(false); onPostBattleInvite('standard'); }}
                        className="comment-composer__menu-item"
                    >
                        <SwordsIcon className="w-3.5 h-3.5 text-muted shrink-0" />
                        <span>{language === 'pt' ? 'Batalha com time próprio' : 'Bring own team'}</span>
                    </button>

                    <div className="comment-composer__menu-sep" />

                    <p className="comment-composer__menu-label">
                        {language === 'pt' ? 'Compartilhar time' : 'Share a team'}
                    </p>
                    {currentTeam.length > 0 && (
                        <button
                            type="button"
                            onClick={() => {
                                onAttachTeam({ name: teamName || 'Active Team', pokemons: currentTeam });
                                setIsAttachOpen(false);
                            }}
                            className="comment-composer__menu-item is-featured"
                        >
                            <StarIcon className="w-3.5 h-3.5 shrink-0" />
                            <span>{language === 'pt' ? 'Time ativo no Construtor' : 'Active team in Builder'}</span>
                        </button>
                    )}
                    {savedTeams.length === 0 && currentTeam.length === 0 ? (
                        <p className="comment-composer__menu-empty">
                            {language === 'pt' ? 'Nenhum time salvo ainda.' : 'No saved teams yet.'}
                        </p>
                    ) : (
                        savedTeams.map((team) => (
                            <button
                                key={team.id}
                                type="button"
                                onClick={() => { onAttachTeam(team); setIsAttachOpen(false); }}
                                className="comment-composer__menu-item"
                            >
                                <span className="truncate">{team.name}</span>
                            </button>
                        ))
                    )}
                </AttachMenuPopover>

                {suggestions.length > 0 && (
                    <div className="mention-suggest" role="listbox" aria-label={t('forum.mentionLabel')}>
                        {suggestions.map((name) => (
                            <button
                                key={name}
                                type="button"
                                role="option"
                                aria-selected={false}
                                className="mention-suggest__item"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => pickMention(name)}
                            >
                                @{name}
                            </button>
                        ))}
                    </div>
                )}
                <textarea
                    ref={ref}
                    rows={1}
                    value={replyText}
                    onChange={handleTextChange}
                    onKeyDown={handleKeyDown}
                    disabled={disabled}
                    aria-label={t('forum.composerPlaceholder')}
                    placeholder={replyingTo
                        ? t('forum.replyingPlaceholder', { name: replyingTo.creatorName })
                        : t('forum.composerPlaceholder')}
                    className="comment-composer__field custom-scrollbar"
                />

                <button
                    type="submit"
                    disabled={!hasContent || disabled || isSending}
                    aria-busy={isSending || undefined}
                    className="btn btn-primary comment-composer__send"
                    aria-label={t('forum.send')}
                >
                    <SendHorizontal className="w-4 h-4" aria-hidden="true" />
                    <span className="comment-composer__send-label">{t('forum.send')}</span>
                </button>
            </div>
        </form>
    );
});
