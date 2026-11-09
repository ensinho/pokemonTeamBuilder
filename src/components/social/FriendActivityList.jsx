import React, { memo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Crown, Flame, MessageCircle, Puzzle, UserPlus } from 'lucide-react';
import { FramedAvatar } from '../rewards/FramedAvatar';
import { AvatarSprite } from '../AvatarSprite';
import { PokeballIcon } from '../icons';
import { openTrainerCard } from '../../store/useTrainerCardStore';
import { useTranslation } from '../../hooks/useTranslation';
import { formatForumTime } from '../../utils/forumTime';
import { trainerSpriteUrl } from '../../utils/challengeView';
import blueBattleUrl from '../../assets/challenge/blue-battle.png';
import '../../styles/friend-activity.css';

/**
 * The friends' timeline (2026-11-09): one line per thing a friend did, worded
 * from `utils/friendActivity.js` events. Each line goes where the thing
 * happened — the board, the puzzle, the Diário — or opens the friend's card.
 * A line that arrives after the first paint slides in once; everything else
 * stays still (motion answers a change, never decorates).
 */

const CHAMPION_ART = { cynthia: trainerSpriteUrl('cynthia-gen4'), blue: blueBattleUrl };
const KIND_ICON = { champion: Crown, puzzle: Puzzle, post: MessageCircle, topic: MessageCircle, streak: Flame, friend: UserPlus };

const cardOf = (event) => {
    const p = event.profile || {};
    return {
        userId: event.uid,
        name: event.name || 'Trainer',
        avatar: p.avatarPokemonId,
        isShiny: p.avatarIsShiny,
        trainerSprite: p.trainerSprite,
        selectedBadgeId: p.selectedBadgeId || null,
        frameId: p.frameId || null,
        titleId: p.titleId || null,
    };
};

const hrefOf = (event) => {
    switch (event.kind) {
        case 'champion': return `/challenge?champion=${event.champion}`;
        case 'puzzle': return '/pokepuzzle';
        case 'post':
        case 'topic': return `/feed?topic=${encodeURIComponent(event.topicId)}`;
        default: return null;
    }
};

function lineOf(event, t) {
    const name = event.name || t('friends.unknownTrainer');
    const champion = t(`social.activity.champion_${event.champion || 'cynthia'}`);
    switch (event.kind) {
        case 'champion': return {
            text: t('social.activity.champion', { name, champion, n: event.turns }),
            meta: t(`social.activity.place_${event.board}`, { n: event.place }),
        };
        case 'puzzle': return {
            text: event.won
                ? t('social.activity.puzzleWon', { name, n: event.guesses })
                : t('social.activity.puzzleLost', { name }),
            meta: event.vsMe ? t(`social.activity.vs_${event.vsMe}`) : null,
        };
        case 'post': return {
            text: event.attachment
                ? t(`social.activity.post_${event.attachment}`, { name })
                : t('social.activity.post', { name, text: event.text }),
            meta: null,
        };
        case 'topic': return { text: t('social.activity.topic', { name, title: event.title }), meta: null };
        case 'streak': return { text: t('social.activity.streak', { name, n: event.count }), meta: null };
        case 'friend': return { text: t('social.activity.friend', { name }), meta: null };
        default: return { text: name, meta: null };
    }
}

/** The small picture at the end of a line: the champion beaten, the colour grid. */
function Trail({ event }) {
    if (event.kind === 'champion') {
        return (
            <span className="fa-trail fa-trail--champion" aria-hidden="true">
                <img src={CHAMPION_ART[event.champion] || CHAMPION_ART.cynthia} alt="" width={40} height={40} decoding="async" loading="lazy" />
            </span>
        );
    }
    if (event.kind === 'puzzle' && event.rows?.length) {
        return (
            <span className="fa-trail fa-grid" aria-hidden="true">
                {event.rows.map((row, i) => (
                    <span key={i} className="fa-grid__row">
                        {row.split('').slice(0, 8).map((c, j) => <i key={j} className={`is-${c}`} />)}
                    </span>
                ))}
            </span>
        );
    }
    if (event.kind === 'streak') {
        return <span className="fa-trail fa-trail--streak" aria-hidden="true"><Flame />{event.count}</span>;
    }
    return null;
}

export const FriendActivityRow = memo(function FriendActivityRow({ event, isNew, compact }) {
    const { t, language } = useTranslation();
    const { text, meta } = lineOf(event, t);
    const Icon = KIND_ICON[event.kind] || MessageCircle;
    const href = hrefOf(event);
    const when = event.kind === 'streak' ? t('social.activity.today') : formatForumTime(event.at, language);
    const p = event.profile || {};

    const body = (
        <>
            <span className="fa-row__who">
                <FramedAvatar uid={event.uid} stampedFrameId={p.frameId} className="fa-row__avatar">
                    <AvatarSprite
                        trainerSprite={p.trainerSprite}
                        pokemonId={p.avatarPokemonId}
                        isShiny={p.avatarIsShiny}
                        fallback={<PokeballIcon className="w-4 h-4 text-muted opacity-50" />}
                    />
                </FramedAvatar>
                <span className={`fa-row__kind fa-row__kind--${event.kind}`} aria-hidden="true"><Icon /></span>
            </span>
            <span className="fa-row__body">
                <span className="fa-row__text">{text}</span>
                <span className="fa-row__meta">
                    {meta && <span className={`fa-row__tag ${event.vsMe ? `is-${event.vsMe}` : ''}`}>{meta}</span>}
                    <span>{when}</span>
                </span>
            </span>
            {!compact && <Trail event={event} />}
        </>
    );

    return (
        <li className={`fa-row ${isNew ? 'is-new' : ''}`}>
            {href
                ? <Link to={href} className="fa-row__hit">{body}</Link>
                : <button type="button" className="fa-row__hit" onClick={() => openTrainerCard(cardOf(event))}>{body}</button>}
        </li>
    );
});

/**
 * The list. `compact` drops the trailing pictures (Home's rail). Lines seen
 * at the first paint never animate; later arrivals do, once.
 */
export function FriendActivityList({ events, compact = false, className = '' }) {
    const seen = useRef(null);
    if (seen.current === null && events.length) seen.current = new Set(events.map((e) => e.id));
    useEffect(() => {
        if (seen.current) events.forEach((e) => seen.current.add(e.id));
    }, [events]);

    return (
        <ul className={`fa-list ${compact ? 'fa-list--compact' : ''} ${className}`.trim()} aria-live="polite">
            {events.map((event) => (
                <FriendActivityRow key={event.id} event={event} compact={compact} isNew={Boolean(seen.current) && !seen.current.has(event.id)} />
            ))}
        </ul>
    );
}

export default FriendActivityList;
