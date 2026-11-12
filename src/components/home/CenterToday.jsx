import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Crown, MessageCircle, Puzzle, Trophy } from 'lucide-react';
import { useFriendActivity } from '../../hooks/useFriendActivity';
import { useTranslation } from '../../hooks/useTranslation';
import { typeColors } from '../../constants/types';
import { RollingNumber } from '../RollingNumber';
import { FramedAvatar } from '../rewards/FramedAvatar';
import { AvatarSprite } from '../AvatarSprite';
import { PokeballIcon } from '../icons';
import { FriendActivityList } from '../social/FriendActivityList';
import '../../styles/friend-activity.css';

const STACK = 4;

/**
 * "Hoje no Centro" (2026-11-09): the day as a place, on Home. Three doors with
 * the day's crowd on them (the PokéPuzzle, the Champions, the Diário), the
 * friends who played today, their latest doings and the week's Torneio. All
 * from public counters and the friends' timeline (useFriendActivity), polled
 * while it is on screen — the numbers roll when they move.
 *
 * `variant="rail"` is the desktop rail's narrow card (two lines of activity);
 * `"full"` is the Community tab (five).
 */
export function CenterToday({ variant = 'full', myPuzzle = null }) {
    const { t } = useTranslation();
    const {
        events, activeToday, counts, diaryTopic, diaryTopicId, weeklyTopic, isGuest, hasFriends, isLoaded,
    } = useFriendActivity({ myPuzzle });
    const isRail = variant === 'rail';
    const lines = events.slice(0, isRail ? 2 : 5);
    const diaryCount = Number(diaryTopic?.messageCount) || 0;
    const weeklyCount = Number(weeklyTopic?.messageCount) || 0;
    const stack = activeToday.slice(0, STACK);
    const more = activeToday.length - stack.length;
    const firstName = (f) => f?.displayName || t('friends.unknownTrainer');

    // Each challenge with its own icon in its own type's colour (2026-11-12,
    // Enzo: "ícones para cada desafio e clareza visual"): the puzzle Psychic,
    // the Champions Dragon (the hero's own tone), the Diary Water. Not gold:
    // a crowd is not something the trainer earned.
    const doors = [
        { key: 'puzzle', to: '/pokepuzzle', Icon: Puzzle, n: counts.puzzle, label: t('social.center.puzzle'), tone: typeColors.psychic },
        { key: 'champions', to: '/challenge', Icon: Crown, n: counts.champions, label: t('social.center.champions'), tone: typeColors.dragon },
        { key: 'diary', to: `/feed?topic=${encodeURIComponent(diaryTopicId)}`, Icon: MessageCircle, n: diaryCount, label: t('social.center.diary'), tone: typeColors.water },
    ];

    let friendsLine = null;
    if (!isGuest) {
        if (!hasFriends) {
            friendsLine = (
                <Link to="/friends?tab=find" className="center-today__friends center-today__friends--invite">
                    <span>{t('social.center.noFriends')}</span>
                    <ChevronRight aria-hidden="true" />
                </Link>
            );
        } else if (isLoaded) {
            friendsLine = (
                <Link to="/friends?tab=activity" className="center-today__friends">
                    {stack.length > 0 && (
                        <span className="center-today__stack" aria-hidden="true">
                            {stack.map((f) => (
                                <FramedAvatar key={f.userId} uid={f.userId} stampedFrameId={f.frameId} className="center-today__face">
                                    <AvatarSprite trainerSprite={f.trainerSprite} pokemonId={f.avatarPokemonId} isShiny={f.avatarIsShiny}
                                        fallback={<PokeballIcon className="w-3 h-3 text-muted opacity-50" />} />
                                </FramedAvatar>
                            ))}
                            {more > 0 && <span className="center-today__face center-today__more">+{more}</span>}
                        </span>
                    )}
                    <span className="center-today__who">
                        {activeToday.length === 0 ? t('social.center.friendsNone')
                            : activeToday.length === 1 ? t('social.center.friendsOne', { name: firstName(activeToday[0]) })
                                : t('social.center.friendsMany', { name: firstName(activeToday[0]), n: activeToday.length - 1 })}
                    </span>
                    <ChevronRight aria-hidden="true" />
                </Link>
            );
        }
    }

    return (
        <section className={`section cozy-panel card center-today center-today--${variant}`} aria-labelledby={`center-today-${variant}`}>
            <header className="section-head">
                <h3 className="section-title" id={`center-today-${variant}`}>
                    <span className="live-dot" aria-hidden="true" /> {t('social.center.title')}
                </h3>
                {!isRail && <span className="section-meta">{t('social.center.sub')}</span>}
            </header>

            <ul className="center-today__doors">
                {doors.map((door) => {
                    const DoorIcon = door.Icon;
                    return (
                        <li key={door.key}>
                            <Link to={door.to} className={`center-today__door center-today__door--${door.key}`} style={{ '--door-tone': door.tone }}>
                                <span className="center-today__icon" aria-hidden="true"><DoorIcon /></span>
                                <RollingNumber value={door.n} className="center-today__n" />
                                <span className="center-today__label">{door.label}</span>
                                <ChevronRight className="center-today__go" aria-hidden="true" />
                            </Link>
                        </li>
                    );
                })}
            </ul>

            {friendsLine}

            {lines.length > 0 && <FriendActivityList events={lines} compact={isRail} />}

            {weeklyTopic && (
                <Link to={`/feed?topic=${encodeURIComponent(weeklyTopic.id)}`} className="center-today__weekly">
                    <Trophy aria-hidden="true" />
                    <span className="center-today__weekly-text">
                        <span className="center-today__weekly-kicker">{t('social.center.weekly')}</span>
                        <span className="center-today__weekly-theme">{t(`forum.weekly.themes.${weeklyTopic.theme}.name`)}</span>
                    </span>
                    <span className="center-today__weekly-n">{t('social.center.weeklyEntries', { n: weeklyCount })}</span>
                    <ChevronRight aria-hidden="true" />
                </Link>
            )}
        </section>
    );
}

export default CenterToday;
