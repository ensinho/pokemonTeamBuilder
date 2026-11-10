import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDownIcon, MessageIcon } from '../icons';
import { formatForumTime } from '../../utils/forumTime';
import { topicReplies } from '../../utils/forumRanking';
import { FORUM_SORTS, FORUM_CATEGORIES, roomIcon } from './forumNav';

const categoryIcon = (id) => FORUM_CATEGORIES.find((c) => c.id === id)?.icon || MessageIcon;

// A section that folds, the way the Reddit app's side menu does: a long map
// stays a short one for whoever only uses two parts of it. Native <details>,
// so it works with a keyboard and needs no state.
function Section({ title, children }) {
    return (
        <details className="forum-explorer__section" open>
            <summary className="forum-explorer__heading">
                <span>{title}</span>
                <ChevronDownIcon className="forum-explorer__chevron" />
            </summary>
            {children}
        </details>
    );
}

/**
 * The forum's map — the left column on a desktop, the drawer behind ☰ on a
 * phone (`ForumDrawer`), the Reddit app's side menu in our material: which
 * feed, the pinned rooms, where the talk is right now, the trainer's own
 * topics, and the categories. The same five sections in the same order whether the
 * feed or a post is open (2026-11-10): a map that changed shape between the
 * two had to be re-read each time.
 *
 * The feed is ordered by when a post was made; "Atividade recente" is the
 * other clock — the same topics by when they last moved — so an old thread
 * that woke up is one tap away without re-sorting the feed.
 */
export const ForumExplorer = memo(function ForumExplorer({
    variant = 'column',
    sortBy,
    selectedCategory,
    categoryCounts,
    rooms = [],
    ownTopics = [],
    latest = [],
    activeTopicId = null,
    hrefFor,
    onSelectSort,
    onSelectCategory,
    onBeforeOpen,
    onNavigate,
    language = 'pt',
    t,
}) {
    const inThread = !!activeTopicId;

    // A topic is one line here: its category's icon, the title, and the clock
    // the section is about (when it was posted, or when it last moved).
    const topicLink = (tp, when) => {
        const Icon = categoryIcon(tp.category);
        return (
            <Link
                key={tp.id}
                to={hrefFor(tp.id)}
                // Hopping between posts must not stack history (docs/modules/forum.md, Traps).
                replace={inThread}
                onClick={() => { onBeforeOpen?.(tp.id); onNavigate?.(); }}
                className="forum-explorer__item"
                aria-current={tp.id === activeTopicId ? 'page' : undefined}
                title={tp.title}
            >
                <Icon className="forum-explorer__icon" />
                <span className="forum-explorer__label">{tp.title}</span>
                <span className="forum-explorer__count forum-explorer__count--when">{formatForumTime(when(tp), language)}</span>
            </Link>
        );
    };

    return (
        <nav className={`forum-explorer forum-explorer--${variant} custom-scrollbar`} aria-label={t('forum.menuTitle')}>
            <section className="forum-explorer__section">
                <h3 className="forum-explorer__heading">{t('forum.sortLabel')}</h3>
                {FORUM_SORTS.map(({ id, key, icon }) => {
                    const Icon = icon;
                    // In a post, the feed's filters read as "go to the feed like this".
                    const current = !inThread && sortBy === id;
                    return (
                        <button
                            key={id}
                            type="button"
                            className="forum-explorer__item"
                            aria-current={current ? 'true' : undefined}
                            onClick={() => { onSelectSort(id); onNavigate?.(); }}
                        >
                            <Icon className="forum-explorer__icon" />
                            <span className="forum-explorer__label">{t(key)}</span>
                        </button>
                    );
                })}
            </section>

            {rooms.length > 0 && (
                <Section title={t('forum.pinnedRooms')}>
                    {rooms.map((room) => {
                        const Icon = room.icon || roomIcon(room);
                        const [name] = String(room.title || '').split(' · ');
                        return (
                            <Link
                                key={room.id}
                                to={room.href || hrefFor(room.id)}
                                replace={inThread && !room.virtual}
                                onClick={() => { if (!room.virtual) onBeforeOpen?.(room.id); onNavigate?.(); }}
                                className="forum-explorer__item"
                                aria-current={room.id === activeTopicId ? 'page' : undefined}
                            >
                                <Icon className="forum-explorer__icon" />
                                <span className="forum-explorer__label">{name}</span>
                                <span className="forum-explorer__count">{room.virtual ? room.count : topicReplies(room)}</span>
                            </Link>
                        );
                    })}
                </Section>
            )}

            {latest.length > 0 && (
                <Section title={t('forum.recentActivity')}>
                    {latest.map((tp) => topicLink(tp, (x) => x.lastActivityAt || x.createdAt))}
                </Section>
            )}

            {ownTopics.length > 0 && (
                <Section title={t('forum.yourTopics')}>
                    {ownTopics.map((tp) => topicLink(tp, (x) => x.createdAt || x.lastActivityAt))}
                </Section>
            )}

            <Section title={t('forum.categoriesLabel')}>
                {FORUM_CATEGORIES.map(({ id, key, icon }) => {
                    const Icon = icon;
                    const current = !inThread && selectedCategory === id;
                    // An empty category is a dead end: listed only once it has a post (or is the one chosen).
                    if (id !== 'all' && !current && !(categoryCounts?.[id] > 0)) return null;
                    return (
                        <button
                            key={id}
                            type="button"
                            className="forum-explorer__item"
                            aria-current={current ? 'true' : undefined}
                            onClick={() => { onSelectCategory(id); onNavigate?.(); }}
                        >
                            <Icon className="forum-explorer__icon" />
                            <span className="forum-explorer__label">{t(key)}</span>
                            <span className="forum-explorer__count">{categoryCounts?.[id] ?? 0}</span>
                        </button>
                    );
                })}
            </Section>
        </nav>
    );
});
