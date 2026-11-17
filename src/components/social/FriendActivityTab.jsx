import React, { useMemo } from 'react';
import { useFriendActivity } from '../../hooks/useFriendActivity';
import { useTranslation } from '../../hooks/useTranslation';
import { localDayKey } from '../../utils/dailyCheckin';
import { EmptyState } from '../EmptyState';
import { Loader } from '../Loader';
import { FriendActivityList } from './FriendActivityList';
import { Meadow } from './Meadow';

/** Which heading a line sits under: its own day when it has one, else its local date. */
const dayOf = (event) => event.dayKey || (event.at ? localDayKey(new Date(event.at)) : null);

/**
 * The Friends page's first tab (2026-11-09): who played today, as faces, then
 * the timeline under Today / Yesterday / Earlier. Same data as Home's "Hoje no
 * Centro" (useFriendActivity), so the two never disagree.
 */
export function FriendActivityTab({ onFind, onPlay, isLoadingFriends = false }) {
    const { t } = useTranslation();
    const { events, hasFriends, isLoaded, today, braToday } = useFriendActivity();

    const groups = useMemo(() => {
        const yesterday = localDayKey(new Date(Date.now() - 86400000));
        const buckets = { today: [], yesterday: [], earlier: [] };
        events.forEach((e) => {
            const day = dayOf(e);
            const key = day === today || day === braToday ? 'today' : day === yesterday ? 'yesterday' : 'earlier';
            buckets[key].push(e);
        });
        return [
            ['today', t('social.activity.todayHeading'), buckets.today],
            ['yesterday', t('social.activity.yesterday'), buckets.yesterday],
            ['earlier', t('social.activity.earlier'), buckets.earlier],
        ].filter(([, , list]) => list.length);
    }, [events, today, braToday, t]);

    if (!hasFriends && isLoadingFriends) return <div className="friends-loading"><Loader scene="search" /></div>;
    if (!hasFriends) {
        return (
            <EmptyState
                title={t('social.activity.noFriendsTitle')}
                message={t('social.activity.noFriendsMessage')}
                action={{ label: t('social.activity.noFriendsCta'), onClick: onFind }}
            />
        );
    }
    if (!isLoaded) return <div className="friends-loading"><Loader scene="search" /></div>;

    return (
        <div className="fa-tab">
            {/* The meadow (2026-11-17): who played today, and who is still dozing. */}
            <Meadow size="lg" max={6} />

            {groups.length === 0 ? (
                <EmptyState
                    compact
                    title={t('social.activity.emptyTitle')}
                    message={t('social.activity.emptyMessage')}
                    action={{ label: t('social.activity.emptyCta'), onClick: onPlay }}
                />
            ) : groups.map(([key, label, list]) => (
                <section key={key} className="fa-group">
                    <h2 className="friends-section-title">{label}</h2>
                    <FriendActivityList events={list} />
                </section>
            ))}
        </div>
    );
}

export default FriendActivityTab;
