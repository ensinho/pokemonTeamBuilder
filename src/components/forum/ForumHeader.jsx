import React, { useEffect, useRef, useState } from 'react';
import {
    PokeballIcon,
    SwordsIcon,
    StarIcon,
    MessageIcon,
    FlameIcon,
    SearchIcon,
    CloseIcon,
    PlusIcon,
    SparklesIcon,
    TrophyIcon,
} from '../icons';

// Same ids, same order as FORUM_CATEGORY_IDS (utils/forumRanking).
const FORUM_CATEGORIES = [
    { id: 'all', key: 'forum.catAll', icon: PokeballIcon },
    { id: 'general', key: 'forum.catGeneral', icon: MessageIcon },
    { id: 'teams', key: 'forum.catTeams', icon: SwordsIcon },
    { id: 'strategy', key: 'forum.catStrategy', icon: FlameIcon },
    { id: 'announcements', key: 'forum.catAnnouncements', icon: StarIcon },
];

const SORTS = [
    { id: 'hot', key: 'forum.sortHot', icon: FlameIcon },
    { id: 'new', key: 'forum.sortNew', icon: SparklesIcon },
    { id: 'top', key: 'forum.sortTop', icon: TrophyIcon },
];

/**
 * The top of the feed in two lines:
 *   name (+ figures on a phone) · search · Create post
 *   Hot / New / Top | category chips — one row that scrolls on a phone
 * On a phone the search is one tap away and takes over the first line.
 */
export function ForumHeader({
    selectedCategory,
    onSelectCategory,
    searchQuery,
    onSearchChange,
    sortBy,
    onSortChange,
    onOpenCreateTopic,
    stats,
    t,
}) {
    const [isSearchOpen, setIsSearchOpen] = useState(() => !!searchQuery);
    const inputRef = useRef(null);
    const openedByTapRef = useRef(false);

    useEffect(() => {
        if (isSearchOpen && openedByTapRef.current) {
            openedByTapRef.current = false;
            inputRef.current?.focus();
        }
    }, [isSearchOpen]);

    const closeSearch = () => {
        onSearchChange('');
        setIsSearchOpen(false);
    };

    return (
        <header className="forum-feed-head">
            <div className={`forum-feed-head__top ${isSearchOpen ? 'is-searching' : ''}`}>
                <div className="forum-feed-head__id">
                    <h2 className="forum-feed-head__title">{t('forum.title')}</h2>
                    {stats && (
                        <p className="forum-feed-head__stats">
                            <span>{t('forum.statTopics', { count: stats.topics })}</span>
                            {/* On a phone the line keeps to one row beside Create: the trainer count goes. */}
                            <span className="forum-feed-head__stat-wide" aria-hidden="true">·</span>
                            <span className="forum-feed-head__stat-wide">{t('forum.statTrainers', { count: stats.trainers })}</span>
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
                        ref={inputRef}
                        type="search"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Escape') closeSearch(); }}
                        placeholder={t('forum.searchPlaceholder')}
                        aria-label={t('forum.searchPlaceholder')}
                        className="forum-search__input"
                        enterKeyHint="search"
                    />
                    {(searchQuery || isSearchOpen) && (
                        <button
                            type="button"
                            onClick={closeSearch}
                            className="forum-search__clear"
                            aria-label={t('forum.clearSearch')}
                        >
                            <CloseIcon className="w-3.5 h-3.5" />
                        </button>
                    )}
                </label>

                {!isSearchOpen && (
                    <button
                        type="button"
                        className="btn btn-ghost btn-icon btn-sm forum-feed-head__search-toggle"
                        aria-label={t('forum.openSearch')}
                        onClick={() => { openedByTapRef.current = true; setIsSearchOpen(true); }}
                    >
                        <SearchIcon className="w-4 h-4" />
                    </button>
                )}

                <button type="button" onClick={onOpenCreateTopic} className="btn btn-primary btn-sm forum-feed-head__create">
                    <PlusIcon className="w-3.5 h-3.5 shrink-0" />
                    <span className="forum-feed-head__create-long">{t('forum.createPost')}</span>
                    <span className="forum-feed-head__create-short">{t('forum.createShort')}</span>
                </button>
            </div>

            <div className="forum-feed-head__filters">
                <div className="segmented segmented--sm forum-feed-head__sort" role="group" aria-label={t('forum.sortLabel')}>
                    {SORTS.map(({ id, key, icon }) => {
                        const Icon = icon;
                        return (
                            <button
                                key={id}
                                type="button"
                                className="segmented__item"
                                aria-pressed={sortBy === id}
                                onClick={() => onSortChange(id)}
                            >
                                <Icon />
                                <span>{t(key)}</span>
                            </button>
                        );
                    })}
                </div>

                <span className="forum-feed-head__divider" aria-hidden="true" />

                <div className="forum-chips" role="group" aria-label={t('forum.categoriesLabel')}>
                    {FORUM_CATEGORIES.map(({ id, key, icon }) => {
                        const Icon = icon;
                        return (
                            <button
                                key={id}
                                type="button"
                                onClick={() => onSelectCategory(id)}
                                aria-pressed={selectedCategory === id}
                                className="forum-chip"
                            >
                                <Icon className="w-3.5 h-3.5 shrink-0" />
                                <span>{t(key)}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </header>
    );
}
