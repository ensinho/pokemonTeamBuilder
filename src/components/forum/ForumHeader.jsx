import React from 'react';
import { SearchIcon, CloseIcon, PlusIcon, MenuIcon } from '../icons';
import { FORUM_SORTS, FORUM_CATEGORIES } from './forumNav';

/**
 * The top of the feed. On a phone it is the Reddit app's two lines
 * (2026-11-10, Enzo: "não fica claro o que fazer ou onde achar"):
 *   ☰ · the search field · Criar
 *   Recentes | Em alta | Top — every tab says its name
 * and, only while a category is chosen, one chip that names it and clears it.
 * The categories themselves live behind ☰ (`ForumDrawer`), with the pinned
 * rooms and the trainer's own topics; before, three unlabeled icons and a
 * sideways row of eight chips stood between the trainer and the first post.
 * On a desktop the explorer column carries all of that, so the header is the
 * name's figures, the search and Create.
 */
export function ForumHeader({
    selectedCategory,
    onSelectCategory,
    searchQuery,
    onSearchChange,
    sortBy,
    onSortChange,
    onOpenCreateTopic,
    onOpenMenu,
    isMenuOpen = false,
    stats,
    t,
}) {
    const category = selectedCategory !== 'all'
        ? FORUM_CATEGORIES.find((c) => c.id === selectedCategory)
        : null;
    const CategoryIcon = category?.icon;

    return (
        <header className="forum-feed-head">
            <div className="forum-feed-head__top">
                <button
                    type="button"
                    className="btn btn-ghost btn-icon forum-feed-head__menu touch-target"
                    aria-label={t('forum.openMenu')}
                    aria-haspopup="dialog"
                    aria-expanded={isMenuOpen}
                    onClick={onOpenMenu}
                >
                    <MenuIcon className="w-5 h-5" />
                </button>

                <div className="forum-feed-head__id">
                    <h2 className="forum-feed-head__title">{t('forum.title')}</h2>
                    {stats && (
                        <p className="forum-feed-head__stats">
                            <span>{t('forum.statTopics', { count: stats.topics })}</span>
                            <span aria-hidden="true">·</span>
                            <span>{t('forum.statTrainers', { count: stats.trainers })}</span>
                            {stats.activeToday > 0 && (
                                <>
                                    <span aria-hidden="true">·</span>
                                    <span className="forum-feed-head__live">{t('forum.statToday', { count: stats.activeToday })}</span>
                                </>
                            )}
                        </p>
                    )}
                </div>

                <label className="forum-search">
                    <SearchIcon className="forum-search__icon" />
                    <input
                        type="search"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Escape') onSearchChange(''); }}
                        placeholder={t('forum.searchPlaceholder')}
                        aria-label={t('forum.searchPlaceholder')}
                        className="forum-search__input"
                        enterKeyHint="search"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => onSearchChange('')}
                            className="forum-search__clear"
                            aria-label={t('forum.clearSearch')}
                        >
                            <CloseIcon className="w-3.5 h-3.5" />
                        </button>
                    )}
                </label>

                <button type="button" onClick={onOpenCreateTopic} className="btn btn-primary btn-sm forum-feed-head__create">
                    <PlusIcon className="w-3.5 h-3.5 shrink-0" />
                    <span className="forum-feed-head__create-long">{t('forum.createPost')}</span>
                    <span className="forum-feed-head__create-short">{t('forum.createShort')}</span>
                </button>
            </div>

            <div className="tabs forum-feed-head__tabs" role="tablist" aria-label={t('forum.sortLabel')}>
                {FORUM_SORTS.map(({ id, key }) => (
                    <button
                        key={id}
                        type="button"
                        role="tab"
                        className="tabs__item"
                        aria-selected={sortBy === id}
                        onClick={() => onSortChange(id)}
                    >
                        {t(key)}
                    </button>
                ))}
            </div>

            {category && (
                <p className="forum-feed-head__scope">
                    <span className="forum-feed-head__scope-label">{t('forum.showingCategory')}</span>
                    <button
                        type="button"
                        className="forum-chip"
                        aria-pressed="true"
                        aria-label={`${t(category.key)} · ${t('forum.clearCategory')}`}
                        onClick={() => onSelectCategory('all')}
                    >
                        <CategoryIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>{t(category.key)}</span>
                        <CloseIcon className="w-3 h-3 shrink-0" />
                    </button>
                </p>
            )}
        </header>
    );
}
