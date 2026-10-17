import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { Pin } from 'lucide-react';
import {
    PokeballIcon,
    SwordsIcon,
    StarIcon,
    MessageIcon,
    FlameIcon,
    SparklesIcon,
    TrophyIcon,
    HeartIcon,
} from '../icons';
import { formatForumTime } from '../../utils/forumTime';
import { topicLikes, topicReplies } from '../../utils/forumRanking';

const SORTS = [
    { id: 'hot', key: 'forum.sortHot', icon: FlameIcon },
    { id: 'new', key: 'forum.sortNew', icon: SparklesIcon },
    { id: 'top', key: 'forum.sortTop', icon: TrophyIcon },
];

const CATEGORIES = [
    { id: 'all', key: 'forum.catAll', icon: PokeballIcon },
    { id: 'general', key: 'forum.catGeneral', icon: MessageIcon },
    { id: 'teams', key: 'forum.catTeams', icon: SwordsIcon },
    { id: 'strategy', key: 'forum.catStrategy', icon: FlameIcon },
    { id: 'announcements', key: 'forum.catAnnouncements', icon: StarIcon },
];

/**
 * The forum's left column on a desktop, an editor's explorer: how the feed
 * is sorted, which category it shows, the pinned rooms, and — while a post
 * is open — the other discussions, so moving between threads never needs a
 * trip back to the feed. Transparent, like a code editor's side bar; the
 * centre pane is the one surface.
 */
export const ForumExplorer = memo(function ForumExplorer({
    sortBy,
    selectedCategory,
    categoryCounts,
    pinned = [],
    topics = [],
    activeTopicId = null,
    hrefFor,
    onSelectSort,
    onSelectCategory,
    onBeforeOpen,
    language = 'pt',
    t,
}) {
    const inThread = !!activeTopicId;

    return (
        <nav className="forum-explorer custom-scrollbar" aria-label={t('forum.title')}>
            <section className="forum-explorer__section">
                <h3 className="forum-explorer__heading">{t('forum.sortLabel')}</h3>
                {SORTS.map(({ id, key, icon }) => {
                    const Icon = icon;
                    // In a post, the feed's filters read as "go to the feed like this".
                    const current = !inThread && sortBy === id;
                    return (
                        <button
                            key={id}
                            type="button"
                            className="forum-explorer__item"
                            aria-current={current ? 'true' : undefined}
                            onClick={() => onSelectSort(id)}
                        >
                            <Icon className="forum-explorer__icon" />
                            <span className="forum-explorer__label">{t(key)}</span>
                        </button>
                    );
                })}
            </section>

            <section className="forum-explorer__section">
                <h3 className="forum-explorer__heading">{t('forum.categoriesLabel')}</h3>
                {CATEGORIES.map(({ id, key, icon }) => {
                    const Icon = icon;
                    const current = !inThread && selectedCategory === id;
                    return (
                        <button
                            key={id}
                            type="button"
                            className="forum-explorer__item"
                            aria-current={current ? 'true' : undefined}
                            onClick={() => onSelectCategory(id)}
                        >
                            <Icon className="forum-explorer__icon" />
                            <span className="forum-explorer__label">{t(key)}</span>
                            <span className="forum-explorer__count">{categoryCounts?.[id] ?? 0}</span>
                        </button>
                    );
                })}
            </section>

            {pinned.length > 0 && (
                <section className="forum-explorer__section">
                    <h3 className="forum-explorer__heading">{t('forum.pinnedRooms')}</h3>
                    {pinned.map((tp) => (
                        <Link
                            key={tp.id}
                            to={hrefFor(tp.id)}
                            replace={inThread}
                            onClick={() => onBeforeOpen(tp.id)}
                            className="forum-explorer__item"
                            aria-current={tp.id === activeTopicId ? 'page' : undefined}
                        >
                            <Pin className="forum-explorer__icon" aria-hidden="true" />
                            <span className="forum-explorer__label">{tp.title}</span>
                            <span className="forum-explorer__count">{topicReplies(tp)}</span>
                        </Link>
                    ))}
                </section>
            )}

            {inThread && topics.length > 0 && (
                <section className="forum-explorer__section">
                    <h3 className="forum-explorer__heading">{t('forum.discussions')}</h3>
                    {topics.map((tp) => (
                        <Link
                            key={tp.id}
                            to={hrefFor(tp.id)}
                            replace
                            onClick={() => onBeforeOpen(tp.id)}
                            className="forum-explorer__topic"
                            aria-current={tp.id === activeTopicId ? 'page' : undefined}
                        >
                            <span className="forum-explorer__topic-title">{tp.title}</span>
                            <span className="forum-explorer__topic-meta">
                                <HeartIcon className="w-3 h-3" /><span>{topicLikes(tp)}</span>
                                <MessageIcon className="w-3 h-3" /><span>{topicReplies(tp)}</span>
                                <span aria-hidden="true">·</span>
                                {formatForumTime(tp.lastActivityAt || tp.createdAt, language)}
                            </span>
                        </Link>
                    ))}
                </section>
            )}
        </nav>
    );
});
