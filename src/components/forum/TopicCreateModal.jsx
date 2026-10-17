import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CloseIcon, ClipIcon, StarIcon } from '../icons';
import { getCategoryMeta } from '../../utils/forumTime';
import { getTeamPokemonDisplaySprite } from '../../utils/pokemonSprites';
import { POKEBALL_PLACEHOLDER_URL } from '../../constants/theme';
import { AttachMenuPopover } from './AttachMenuPopover';
import { useModalA11y } from '../../hooks/useModalA11y';

const TITLE_MAX = 120;

/**
 * Create a post, Reddit's dialog in the app's primitives: category chips, a
 * title with its counter, optional text, an optional team, Publish.
 * `initialTeam` / `initialCategory` pre-fill it when it opens — the rail's
 * "Post on the forum" opens it with the team already attached.
 */
export function TopicCreateModal({
    isOpen,
    onClose,
    onSubmit,
    isAdmin = false,
    savedTeams = [],
    currentTeam = [],
    teamName = '',
    initialTeam = null,
    initialCategory = null,
    language = 'pt',
    t,
}) {
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('general');
    const [text, setText] = useState('');
    const [attachedTeam, setAttachedTeam] = useState(null);
    const [isAttachOpen, setIsAttachOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [titleError, setTitleError] = useState(false);
    const attachButtonRef = useRef(null);
    const titleRef = useRef(null);
    const closeAttach = useCallback(() => setIsAttachOpen(false), []);

    useEffect(() => {
        if (!isOpen) {
            setTitle('');
            setCategory('general');
            setText('');
            setAttachedTeam(null);
            setIsAttachOpen(false);
            setIsSubmitting(false);
            setTitleError(false);
        } else {
            if (initialTeam) setAttachedTeam(initialTeam);
            if (initialCategory) setCategory(initialCategory);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- seeds once per opening
    }, [isOpen]);

    // Escape, focus, the phone sheet's drag-to-dismiss and the exit animation.
    const panelRef = useModalA11y(onClose);

    if (!isOpen) return null;

    const categories = ['general', 'teams', 'strategy', ...(isAdmin ? ['announcements'] : [])];

    // Publish is never pre-disabled: an empty title is said next to the field.
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim()) {
            setTitleError(true);
            titleRef.current?.focus();
            return;
        }
        setIsSubmitting(true);
        try {
            await onSubmit({ title, category, text, attachedTeam });
            onClose();
        } catch (_) {
            setIsSubmitting(false);
        }
    };

    const teamSprites = (attachedTeam?.pokemons || []).filter(Boolean).slice(0, 6);

    return (
        <div className="modal-scrim" onClick={onClose} role="presentation">
            <div
                ref={panelRef}
                className="modal-panel topic-create-modal"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="topic-modal-title"
            >
                <div className="modal-header">
                    <h2 id="topic-modal-title" className="modal-title">{t('forum.createTitle')}</h2>
                    <button type="button" onClick={onClose} className="modal-close" aria-label={t('common.cancel')}>
                        <CloseIcon />
                    </button>
                </div>

                <form id="topic-create-form" onSubmit={handleSubmit} className="modal-body topic-create-form" noValidate>
                    <div className="field">
                        <span className="field-label" id="topic-create-category">{t('forum.createCategory')}</span>
                        <div className="topic-create-categories" role="group" aria-labelledby="topic-create-category">
                            {categories.map((id) => (
                                <button
                                    key={id}
                                    type="button"
                                    className="forum-chip"
                                    aria-pressed={category === id}
                                    onClick={() => setCategory(id)}
                                >
                                    {getCategoryMeta(id, language).label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="field">
                        <div className="topic-create-label-row">
                            <label className="field-label" htmlFor="topic-create-title">{t('forum.createTitleLabel')}</label>
                            <span className="topic-create-counter">{title.length}/{TITLE_MAX}</span>
                        </div>
                        <input
                            ref={titleRef}
                            id="topic-create-title"
                            type="text"
                            maxLength={TITLE_MAX}
                            placeholder={t('forum.createTitlePlaceholder')}
                            value={title}
                            onChange={(e) => { setTitle(e.target.value); if (titleError) setTitleError(false); }}
                            className="input-clean"
                            aria-invalid={titleError}
                            aria-describedby={titleError ? 'topic-create-title-error' : undefined}
                        />
                        {titleError && (
                            <span id="topic-create-title-error" className="field-hint topic-create-error" role="alert">
                                {t('forum.createTitleRequired')}
                            </span>
                        )}
                    </div>

                    <div className="field">
                        <label className="field-label" htmlFor="topic-create-body">{t('forum.createBodyLabel')}</label>
                        <textarea
                            id="topic-create-body"
                            rows={5}
                            placeholder={t('forum.createBodyPlaceholder')}
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            className="textarea-clean topic-create-textarea custom-scrollbar"
                        />
                    </div>

                    {attachedTeam ? (
                        <div className="topic-create-team">
                            <div className="topic-create-team__sprites">
                                {teamSprites.map((pk, i) => (
                                    <img
                                        key={pk.instanceId || `${pk.id}-${i}`}
                                        src={getTeamPokemonDisplaySprite(pk)}
                                        alt={pk.name || ''}
                                        width="32"
                                        height="32"
                                        onError={(e) => { e.currentTarget.src = POKEBALL_PLACEHOLDER_URL; }}
                                    />
                                ))}
                            </div>
                            <span className="topic-create-team__name">{attachedTeam.name}</span>
                            <button
                                type="button"
                                onClick={() => setAttachedTeam(null)}
                                className="btn btn-ghost btn-icon btn-sm"
                                aria-label={t('forum.createRemoveTeam')}
                            >
                                <CloseIcon className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ) : (
                        <div>
                            <button
                                ref={attachButtonRef}
                                type="button"
                                aria-haspopup="dialog"
                                aria-expanded={isAttachOpen}
                                onClick={() => setIsAttachOpen((open) => !open)}
                                className="btn btn-secondary btn-sm"
                            >
                                <ClipIcon className="w-3.5 h-3.5" />
                                {t('forum.createAttachTeam')}
                            </button>
                            <AttachMenuPopover
                                isOpen={isAttachOpen}
                                onClose={closeAttach}
                                anchorRef={attachButtonRef}
                                ariaLabel={t('forum.createAttachTeam')}
                            >
                                <p className="comment-composer__menu-label">{t('forum.createSavedTeams')}</p>
                                {currentTeam.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setAttachedTeam({ name: teamName || 'Active Team', pokemons: currentTeam });
                                            setIsAttachOpen(false);
                                        }}
                                        className="comment-composer__menu-item is-featured"
                                    >
                                        <StarIcon className="w-3.5 h-3.5 shrink-0" />
                                        <span>{t('forum.createActiveTeam')}</span>
                                    </button>
                                )}
                                {savedTeams.map((team) => (
                                    <button
                                        key={team.id}
                                        type="button"
                                        onClick={() => { setAttachedTeam(team); setIsAttachOpen(false); }}
                                        className="comment-composer__menu-item"
                                    >
                                        <span className="truncate">{team.name}</span>
                                    </button>
                                ))}
                                {savedTeams.length === 0 && currentTeam.length === 0 && (
                                    <p className="comment-composer__menu-empty">{t('forum.createNoTeams')}</p>
                                )}
                            </AttachMenuPopover>
                        </div>
                    )}
                </form>

                <div className="modal-footer">
                    <button type="button" onClick={onClose} className="btn btn-secondary">
                        {t('common.cancel')}
                    </button>
                    <button type="submit" form="topic-create-form" disabled={isSubmitting} className="btn btn-primary">
                        {isSubmitting ? t('forum.createPublishing') : t('forum.createPublish')}
                    </button>
                </div>
            </div>
        </div>
    );
}
