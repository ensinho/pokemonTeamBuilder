import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { ClockIcon, TrophyIcon, MessageIcon, SwordsIcon } from '../icons';
import { formatForumTime } from '../../utils/forumTime';
import { topicReplies, topicLastActivity } from '../../utils/forumRanking';
import { isDiaryTopic } from '../../utils/forumDiary';
import { isWeeklyTopic } from '../../utils/forumWeekly';

// A room that moved in the last hour has someone in it right now.
const LIVE_MS = 60 * 60 * 1000;

const roomIcon = (topic) => {
    if (isDiaryTopic(topic)) return ClockIcon;
    if (isWeeklyTopic(topic)) return TrophyIcon;
    if (topic.category === 'teams') return SwordsIcon;
    return MessageIcon;
};

/**
 * The Centro's rooms (2026-11-09): the Professor's pinned topics — today's
 * Diário, the week's Torneio, the two chat rooms — as one row of doors above
 * the feed, instead of four feed rows that each repeated "@Professor Oak ·
 * Fixado" and pushed the community's own posts below the first screen.
 *
 * A door is the room's name, what is in it today (the part of the title after
 * " · ": the date, the week's theme), and how alive it is. Phones scroll the
 * row sideways; desktops lay the doors out in a grid.
 */
export const ForumRooms = memo(function ForumRooms({ rooms = [], hrefFor, onBeforeOpen, language = 'pt', t }) {
    if (rooms.length === 0) return null;
    const now = Date.now();

    return (
        <nav className="forum-rooms" aria-label={t('forum.roomsTitle')}>
            <ul className="forum-rooms__list">
                {rooms.map((room) => {
                    const Icon = roomIcon(room);
                    const [name, ...rest] = String(room.title || '').split(' · ');
                    const detail = rest.join(' · ');
                    const replies = topicReplies(room);
                    const last = topicLastActivity(room);
                    const isLive = last > 0 && now - last < LIVE_MS;
                    return (
                        <li key={room.id} className="forum-rooms__item">
                            <Link
                                to={hrefFor(room.id)}
                                onClick={() => onBeforeOpen?.(room.id)}
                                className="forum-room"
                            >
                                <span className="forum-room__icon" aria-hidden="true"><Icon /></span>
                                <span className="forum-room__body">
                                    <span className="forum-room__name">{name}</span>
                                    <span className="forum-room__meta">
                                        {/* What is in it today: the date or theme, else the last line said there. */}
                                        {detail || (room.lastMessageText || '').trim() || t('forum.roomMessages', { count: replies })}
                                    </span>
                                </span>
                                <span className="forum-room__side">
                                    {isLive && <span className="live-dot" role="img" aria-label={t('forum.roomLive')} />}
                                    <span className="forum-room__count" aria-label={t('forum.roomMessages', { count: replies })}>
                                        <MessageIcon aria-hidden="true" />
                                        {replies}
                                    </span>
                                    {last > 0 && (
                                        <time className="forum-room__time" dateTime={new Date(last).toISOString()}>
                                            {formatForumTime(new Date(last).toISOString(), language)}
                                        </time>
                                    )}
                                </span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
});
