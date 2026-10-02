import React, { useState, useEffect } from 'react';
import { CloseIcon, SwordsIcon, ClipIcon, StarIcon, ReplyIcon } from '../icons';

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
    language = 'pt',
    t,
}, ref) {
    const [isAttachOpen, setIsAttachOpen] = useState(false);

    // Auto-grow textarea
    const handleTextChange = (e) => {
        onReplyTextChange(e);
        e.target.style.height = 'auto';
        e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
    };

    useEffect(() => {
        if (!replyText && ref?.current) {
            ref.current.style.height = 'auto';
        }
    }, [replyText, ref]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (replyText.trim() || attachedTeam) {
                onSubmit(e);
            }
        }
    };

    const hasContent = !!replyText.trim() || !!attachedTeam;

    return (
        <form onSubmit={onSubmit} className="comment-composer">
            {/* Replying-to Quote Banner */}
            {replyingTo && (
                <div className="comment-composer__quote-banner">
                    <ReplyIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="comment-composer__quote-text">
                        {language === 'pt' ? 'Respondendo a' : 'Replying to'} <b>@{replyingTo.creatorName}</b>
                        {replyingTo.textSnippet && (
                            <span className="text-muted ml-1 truncate max-w-xs inline-block align-bottom">
                                : "{replyingTo.textSnippet}"
                            </span>
                        )}
                    </span>
                    <button
                        type="button"
                        onClick={onCancelReply}
                        className="comment-composer__close-btn"
                        aria-label={t ? t('common.cancel') : 'Cancelar'}
                    >
                        <CloseIcon className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* Attached Team Banner */}
            {attachedTeam && (
                <div className="comment-composer__team-banner">
                    <ClipIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="truncate flex-1 font-medium">
                        {attachedTeam.name} ({attachedTeam.pokemons?.length || 0}/6)
                    </span>
                    <button
                        type="button"
                        onClick={onRemoveAttachedTeam}
                        className="comment-composer__close-btn"
                        aria-label={t ? t('common.cancel') : 'Cancelar'}
                    >
                        <CloseIcon className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* Input Box and Action Bar */}
            <div className="comment-composer__body">
                <textarea
                    ref={ref}
                    rows={2}
                    value={replyText}
                    onChange={handleTextChange}
                    onKeyDown={handleKeyDown}
                    disabled={disabled}
                    placeholder={
                        replyingTo
                            ? (language === 'pt' ? `Respondendo a @${replyingTo.creatorName}...` : `Replying to @${replyingTo.creatorName}...`)
                            : (language === 'pt' ? 'Deixe seu comentário ou contribuição...' : 'Join the discussion...')
                    }
                    className="comment-composer__textarea custom-scrollbar"
                />

                <div className="comment-composer__toolbar">
                    <div className="flex items-center gap-1.5 relative">
                        {/* Attach Dropdown Button */}
                        <button
                            type="button"
                            onClick={() => setIsAttachOpen(!isAttachOpen)}
                            className={`btn-ghost comment-composer__tool-btn ${attachedTeam ? 'is-active' : ''}`}
                            title={language === 'pt' ? 'Anexar Time ou Batalha' : 'Attach Team or Battle'}
                        >
                            <ClipIcon className="w-4 h-4 shrink-0" />
                            <span className="text-xs hidden sm:inline">
                                {language === 'pt' ? 'Anexar' : 'Attach'}
                            </span>
                        </button>

                        {/* Attach Dropdown Menu */}
                        {isAttachOpen && (
                            <div className="comment-composer__attach-menu">
                                <p className="comment-composer__menu-label">
                                    {language === 'pt' ? 'Desafiar Fórum para Batalha' : 'Invite forum to battle'}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsAttachOpen(false);
                                        onPostBattleInvite('random');
                                    }}
                                    className="comment-composer__menu-item"
                                >
                                    <SwordsIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                                    <span>{language === 'pt' ? 'Batalha com times aleatórios' : 'Random battle'}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsAttachOpen(false);
                                        onPostBattleInvite('standard');
                                    }}
                                    className="comment-composer__menu-item"
                                >
                                    <SwordsIcon className="w-3.5 h-3.5 text-muted shrink-0" />
                                    <span>{language === 'pt' ? 'Batalha com time próprio' : 'Bring own team'}</span>
                                </button>

                                <div className="border-t border-border my-1" />

                                <p className="comment-composer__menu-label">
                                    {language === 'pt' ? 'Compartilhar Time' : 'Share a Team'}
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
                                        <StarIcon className="w-3.5 h-3.5 text-amber-400 shrink-0 fill-amber-400" />
                                        <span>{language === 'pt' ? 'Time ativo no Construtor' : 'Active team in Builder'}</span>
                                    </button>
                                )}
                                {savedTeams.length === 0 && currentTeam.length === 0 ? (
                                    <p className="px-3 py-1.5 text-xs text-muted">
                                        {language === 'pt' ? 'Nenhum time salvo ainda.' : 'No saved teams yet.'}
                                    </p>
                                ) : (
                                    savedTeams.map((team) => (
                                        <button
                                            key={team.id}
                                            type="button"
                                            onClick={() => {
                                                onAttachTeam(team);
                                                setIsAttachOpen(false);
                                            }}
                                            className="comment-composer__menu-item"
                                        >
                                            <span className="truncate">{team.name}</span>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-2xs text-muted hidden md:inline">
                            {language === 'pt' ? 'Enter envia • Shift+Enter quebra linha' : 'Enter sends • Shift+Enter new line'}
                        </span>
                        <button
                            type="submit"
                            disabled={!hasContent || disabled}
                            className="btn btn-primary h-8 px-3 text-xs font-semibold rounded-lg"
                        >
                            <span>{language === 'pt' ? 'Publicar' : 'Comment'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </form>
    );
});
