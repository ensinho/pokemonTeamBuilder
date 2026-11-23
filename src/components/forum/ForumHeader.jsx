import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { SearchIcon, CloseIcon, PlusIcon, MenuIcon, ClockIcon, MessageIcon } from '../icons';
import { FORUM_SORTS, FORUM_CATEGORIES } from './forumNav';
import { formatForumTime } from '../../utils/forumTime';
import { MascotCompanion } from '../MascotCompanion';
import { AnchoredPopover } from '../AnchoredPopover';

const CORE_DESKTOP_CATEGORIES = new Set(['diary', 'general', 'teams', 'strategy', 'feedback']);

const categoryIconFor = (id) => FORUM_CATEGORIES.find((c) => c.id === id)?.icon || MessageIcon;

/**
 * The top of the feed.
 * - Desktop: single search + single primary `+ Criar post` in the top row,
 *   followed by a unified navigation strip with quiet Sort pills, Category
 *   filter pills (Todos + counts), and a lightweight `Atividade recente`
 *   popover listing the 5 latest active topics.
 * - Phone: ☰ drawer + search + Criar, followed by Recentes | Em alta | Top
 *   tabs and a removable chosen-category chip when filtered.
 */
export function ForumHeader({
    selectedCategory,
    onSelectCategory,
    categoryCounts = {},
    latest = [],
    hrefFor,
    onBeforeOpen,
    searchQuery,
    onSearchChange,
    sortBy,
    onSortChange,
    onOpenCreateTopic,
    onOpenMenu,
    isMenuOpen = false,
    stats,
    language = 'pt',
    t,
}) {
    const [isRecentOpen, setIsRecentOpen] = useState(false);
    const recentBtnRef = useRef(null);
    const recentPopoverRef = useRef(null);

    useEffect(() => {
        if (!isRecentOpen) return undefined;
        const onPointerDown = (event) => {
            if (recentBtnRef.current?.contains(event.target) || recentPopoverRef.current?.contains(event.target)) return;
            setIsRecentOpen(false);
        };
        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                setIsRecentOpen(false);
                recentBtnRef.current?.focus();
            }
        };
        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [isRecentOpen]);

    const category = selectedCategory !== 'all'
        ? FORUM_CATEGORIES.find((c) => c.id === selectedCategory)
        : null;
    const CategoryIcon = category?.icon;

    const desktopCategories = FORUM_CATEGORIES.filter(({ id }) => {
        if (id === 'all') return true;
        return CORE_DESKTOP_CATEGORIES.has(id)
            || selectedCategory === id
            || (categoryCounts?.[id] || 0) > 0;
    });

    const recentTopics = (latest || []).slice(0, 5);

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

                {/* The Centro's host (2026-11-11): alive beside the search, he
                    celebrates the trainer's post and nods at a like or a comment. */}
                <MascotCompanion listen rest="feliz" size="sm" className="forum-host" />

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

                {recentTopics.length > 0 && hrefFor && (
                    <>
                        <button
                            ref={recentBtnRef}
                            type="button"
                            className={`btn btn-ghost btn-sm forum-recent-btn ${isRecentOpen ? 'is-open' : ''}`}
                            aria-haspopup="dialog"
                            aria-expanded={isRecentOpen}
                            onClick={() => setIsRecentOpen((open) => !open)}
                        >
                            <ClockIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                            <span>{t('markedUi.forum.recentActivity')}</span>
                        </button>

                        <AnchoredPopover
                            isOpen={isRecentOpen}
                            anchorRef={recentBtnRef}
                            popoverRef={recentPopoverRef}
                            placement="bottom"
                            offset={8}
                            role="dialog"
                            ariaLabel={t('markedUi.forum.recentActivityTitle')}
                            className="forum-recent-popover"
                        >
                            <p className="forum-recent-popover__head">{t('markedUi.forum.recentActivityTitle')}</p>
                            <ul className="forum-recent-popover__list">
                                {recentTopics.map((tp) => {
                                    const Icon = categoryIconFor(tp.category);
                                    return (
                                        <li key={tp.id}>
                                            <Link
                                                to={hrefFor(tp.id)}
                                                className="forum-recent-popover__item"
                                                onClick={() => {
                                                    setIsRecentOpen(false);
                                                    onBeforeOpen?.(tp.id);
                                                }}
                                            >
                                                <Icon className="forum-recent-popover__icon" aria-hidden="true" />
                                                <span className="forum-recent-popover__title">{tp.title}</span>
                                                <span className="forum-recent-popover__when">
                                                    {formatForumTime(tp.lastActivityAt || tp.createdAt, language)}
                                                </span>
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </AnchoredPopover>
                    </>
                )}

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

            {/* Desktop unified navigation strip: Sort pills + Category filter pills + Recent activity popover. */}
            <div className="forum-feed-head__bar">
                <div className="segmented segmented--quiet segmented--sm forum-feed-head__sort" role="group" aria-label={t('forum.sortLabel')}>
                    {FORUM_SORTS.map(({ id, key }) => (
                        <button
                            key={id}
                            type="button"
                            className="segmented__item"
                            aria-pressed={sortBy === id}
                            onClick={() => onSortChange(id)}
                        >
                            {t(key)}
                        </button>
                    ))}
                </div>

                <div className="forum-feed-head__cats" role="group" aria-label={t('forum.categoriesLabel')}>
                    {desktopCategories.map(({ id, key, icon }) => {
                        const Icon = icon;
                        const count = categoryCounts?.[id] ?? 0;
                        const active = selectedCategory === id;
                        const label = id === 'all' ? t('markedUi.forum.allCategories') : t(key);
                        return (
                            <button
                                key={id}
                                type="button"
                                className="forum-chip"
                                aria-pressed={active}
                                onClick={() => onSelectCategory(id)}
                            >
                                <Icon className="forum-chip__icon" aria-hidden="true" />
                                <span>{label}</span>
                                {(id === 'all' || count > 0) && (
                                    <span className="forum-chip__count">{count}</span>
                                )}
                            </button>
                        );
                    })}
                </div>
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
