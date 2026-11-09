import React, { useMemo } from 'react';
import { useFriendActivity } from '../../hooks/useFriendActivity';
import { useTranslation } from '../../hooks/useTranslation';
import { openTrainerCard } from '../../store/useTrainerCardStore';
import { localDayKey } from '../../utils/dailyCheckin';
import { FramedAvatar } from '../rewards/FramedAvatar';
import { AvatarSprite } from '../AvatarSprite';
import { EmptyState } from '../EmptyState';
import { Loader } from '../Loader';
import { PokeballIcon } from '../icons';
import { FriendActivityList } from './FriendActivityList';

/** Which heading a line sits under: its own day when it has one, else its local date. */
const dayOf = (event) => event.dayKey || (event.at ? localDayKey(new Date(event.at)) : null);

/**
 * The Friends page's first tab (2026-11-09): who played today, as faces, then
 * the timeline under Today / Yesterday / Earlier. Same data as Home's "Hoje no
 * Centro" (useFriendActivity), so the two never disagree.
 */
export function FriendActivityTab({ onFind, onPlay, isLoadingFriends = false }) {
    const { t } = useTranslation();
    const { events, activeToday, hasFriends, isLoaded, today, braToday } = useFriendActivity();

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
            {activeToday.length > 0 && (
                <section className="fa-today" aria-label={t('social.activity.activeToday')}>
                    <h2 className="friends-section-title">{t('social.activity.activeToday')}</h2>
                    <ul className="fa-today__faces">
                        {activeToday.map((f) => (
                            <li key={f.userId}>
                                <button
                                    type="button"
                                    className="fa-today__face"
                                    onClick={() => openTrainerCard({
                                        userId: f.userId,
                                        name: f.displayName || t('friends.unknownTrainer'),
                                        avatar: f.avatarPokemonId,
                                        isShiny: f.avatarIsShiny,
                                        trainerSprite: f.trainerSprite,
                                        selectedBadgeId: f.selectedBadgeId || null,
                                        frameId: f.frameId || null,
                                        titleId: f.titleId || null,
                                    })}
                                >
                                    <FramedAvatar uid={f.userId} stampedFrameId={f.frameId} className="fa-today__avatar">
                                        <AvatarSprite trainerSprite={f.trainerSprite} pokemonId={f.avatarPokemonId} isShiny={f.avatarIsShiny}
                                            fallback={<PokeballIcon className="w-5 h-5 text-muted opacity-50" />} />
                                    </FramedAvatar>
                                    <span className="fa-today__name">{f.displayName || t('friends.unknownTrainer')}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

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
