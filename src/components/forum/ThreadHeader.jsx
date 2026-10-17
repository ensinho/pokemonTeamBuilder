import React from 'react';
import { ChevronLeftIcon, ShareIcon, TrashIcon } from '../icons';
import { getCategoryMeta } from '../../utils/forumTime';

/**
 * The bar above a post, one line at every width: back, where you are, and
 * the post's own actions. "Where you are" is the breadcrumb while the post's
 * big title is on screen and becomes the topic's title once it scrolls away
 * (the large-title pattern), so the bar always names the conversation without
 * repeating the heading right under it.
 */
export function ThreadHeader({
    topic,
    showTitle = false,
    onBack,
    onShare,
    onDelete,
    canDelete = false,
    language = 'pt',
    t,
}) {
    const categoryMeta = getCategoryMeta(topic.category, language);

    return (
        <header className={`thread-bar ${showTitle ? 'is-titled' : ''}`}>
            <button
                type="button"
                onClick={onBack}
                className="btn btn-ghost btn-icon btn-sm thread-bar__back"
                aria-label={t('forum.back')}
            >
                <ChevronLeftIcon className="w-4 h-4" />
            </button>

            <div className="thread-bar__context">
                <nav className="thread-bar__crumbs" aria-label="Breadcrumb" aria-hidden={showTitle}>
                    <button type="button" className="thread-bar__crumb-link" onClick={onBack} tabIndex={showTitle ? -1 : 0}>
                        {t('forum.forumCrumb')}
                    </button>
                    <span className="thread-bar__sep" aria-hidden="true">›</span>
                    <span className="thread-bar__crumb-current">{categoryMeta.label}</span>
                </nav>
                <p className="thread-bar__title" aria-hidden={!showTitle} title={topic.title}>
                    {topic.title}
                </p>
            </div>

            <div className="thread-bar__actions">
                <button
                    type="button"
                    onClick={onShare}
                    className="btn btn-ghost btn-icon btn-sm"
                    aria-label={t('forum.share')}
                    title={t('forum.share')}
                >
                    <ShareIcon className="w-4 h-4" />
                </button>
                {canDelete && (
                    <button
                        type="button"
                        onClick={onDelete}
                        className="btn btn-ghost btn-icon btn-sm thread-bar__delete"
                        aria-label={t('forum.deletePost')}
                        title={t('forum.deletePost')}
                    >
                        <TrashIcon className="w-4 h-4" />
                    </button>
                )}
            </div>
        </header>
    );
}
