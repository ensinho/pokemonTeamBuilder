import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/meadow.css';

import { useTranslation } from '../../hooks/useTranslation';
import { useFriendActivity } from '../../hooks/useFriendActivity';
import { useGamesToday } from '../../hooks/useGamesToday';
import { openTrainerCard } from '../../store/useTrainerCardStore';
import { DAILY_GAMES, GAME_NAV_KEYS } from '../../utils/gamesToday';
import { meadowSpots } from '../../utils/meadow';
import { groundAt } from '../../utils/pixelScene';
import { navHue } from '../../utils/navHue';
import { Mascot } from '../Mascot';
import { PixelScene } from '../mascot/PixelScene';
import { usePokes } from './usePokes';

/**
 * The meadow (2026-11-17, "Fantasminha de plantão"): the dusk bot's row of
 * small bots as the friends' ghosts, each in the tone and costume its trainer
 * picked (Profile → Mascote, `publicProfiles.mascot`), standing in a pixel
 * field at dusk. Awake with the day's pips once they played; dozing until
 * then — and a dozing ghost can be poked, once a day (the Pokégear tells
 * them). The trainer's own ghost stands among them. `utils/meadow.js` holds
 * the rules; everything is read from the Centre's store, no read of its own.
 */

export function Meadow({ max = 4, size = 'md', className = '', moreTo = '/friends?tab=friends' }) {
    const { t } = useTranslation();
    const { meadow, hasFriends, isGuest, isLoaded } = useFriendActivity();
    const mine = useGamesToday();
    const { isPoked, pokeFriend } = usePokes();
    const [startled, setStartled] = useState(null);
    const [openUid, setOpenUid] = useState(null);
    const [scene, setScene] = useState(null);
    const fieldRef = useRef(null);

    const minePlayed = DAILY_GAMES.filter((game) => mine[game]).length;
    const ghosts = useMemo(() => {
        const self = { uid: 'self', self: true, games: mine, played: minePlayed, awake: minePlayed > 0 };
        const friends = (meadow?.ghosts || []).slice(0, max);
        // the trainer stands in the middle of their friends
        const list = [...friends];
        list.splice(Math.floor(list.length / 2), 0, self);
        return list;
    }, [meadow, mine, minePlayed, max]);
    const more = Math.max(0, (meadow?.ghosts?.length || 0) - max);
    const spots = meadowSpots(ghosts.length);

    // A tap outside, or Escape, puts the card away.
    useEffect(() => {
        if (!openUid) return undefined;
        const onDown = (event) => { if (fieldRef.current && !fieldRef.current.contains(event.target)) setOpenUid(null); };
        const onKey = (event) => { if (event.key === 'Escape') setOpenUid(null); };
        document.addEventListener('pointerdown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('pointerdown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [openUid]);

    const poke = useCallback((ghost) => {
        if (!pokeFriend(ghost.uid, ghost.name)) return;
        setStartled(ghost.uid);
        window.setTimeout(() => setStartled((uid) => (uid === ghost.uid ? null : uid)), 900);
    }, [pokeFriend]);

    const moodOf = (ghost) => {
        if (startled === ghost.uid) return 'surpreso';
        if (!ghost.awake) return 'sonolento';
        return ghost.played >= 3 ? 'radiante' : 'feliz';
    };

    const open = ghosts.find((g) => g.uid === openUid) || null;
    const openIndex = open ? ghosts.indexOf(open) : -1;

    let note = null;
    if (isGuest) note = <p className="meadow__note">{t('meadow.guest')}</p>;
    else if (isLoaded && !hasFriends) note = <p className="meadow__note"><Link to="/friends">{t('meadow.noFriends')}</Link></p>;

    return (
        <section className={`section cozy-panel card meadow ${className}`} aria-labelledby="meadow-title">
            <header className="section-head">
                <h3 className="section-title" id="meadow-title">{t('meadow.title')}</h3>
                {hasFriends && (
                    <span className="section-meta meadow__count">
                        {t('meadow.awake', { n: (meadow?.ghosts || []).filter((g) => g.awake).length, total: meadow?.ghosts?.length || 0 })}
                    </span>
                )}
            </header>
            <div className="meadow__field" ref={fieldRef}>
                <PixelScene kind="dusk" seed={21} onGround={setScene} className="meadow__scene" />
                <ul className="meadow__ghosts">
                    {ghosts.map((ghost, i) => {
                        const name = ghost.self ? t('meadow.you') : (ghost.name || t('friends.unknownTrainer'));
                        const label = ghost.awake
                            ? t('meadow.ghostAwake', { name, n: ghost.played })
                            : t('meadow.ghostAsleep', { name });
                        return (
                            <li
                                key={ghost.uid}
                                className={`meadow__ghost meadow__ghost--${size} ${ghost.awake ? 'is-awake' : 'is-asleep'} ${ghost.self ? 'is-self' : ''}`}
                                style={{ left: `${spots[i] * 100}%`, top: `${groundAt(scene, spots[i]) * 100}%` }}
                            >
                                <button
                                    type="button"
                                    className="meadow__hit"
                                    aria-label={label}
                                    aria-expanded={openUid === ghost.uid}
                                    onClick={() => setOpenUid((uid) => (uid === ghost.uid ? null : ghost.uid))}
                                >
                                    {ghost.awake && (
                                        <span className="meadow__pips" aria-hidden="true">
                                            {DAILY_GAMES.map((game) => (
                                                <i key={game} className={ghost.games[game] ? 'is-on' : ''} style={{ '--pip': navHue(GAME_NAV_KEYS[game]) }} />
                                            ))}
                                        </span>
                                    )}
                                    {ghost.self
                                        ? <Mascot size={size} mood={moodOf(ghost)} className="meadow__bot" />
                                        : <Mascot size={size} mood={moodOf(ghost)} tone={ghost.tone || 'brand'} hat={ghost.hat || undefined} seasonal={false} className="meadow__bot" />}
                                    <span className="meadow__name">{name}</span>
                                    {!ghost.self && isPoked(ghost.uid) && !ghost.awake && <span className="meadow__poked" aria-hidden="true">!</span>}
                                </button>
                            </li>
                        );
                    })}
                </ul>
                {more > 0 && <Link to={moreTo} className="meadow__more">{t('meadow.more', { n: more })}</Link>}

                {open && (
                    <div
                        className="meadow__card"
                        role="dialog"
                        aria-label={open.self ? t('meadow.you') : (open.name || t('friends.unknownTrainer'))}
                        style={{ '--x': `${spots[openIndex] * 100}%` }}
                    >
                        <p className="meadow__card-title">
                            {open.self ? t('meadow.youDay', { n: open.played }) : open.awake
                                ? t('meadow.friendDay', { name: open.name || t('friends.unknownTrainer'), n: open.played })
                                : t('meadow.friendAsleep', { name: open.name || t('friends.unknownTrainer') })}
                        </p>
                        {open.awake && (
                            <ul className="meadow__games">
                                {DAILY_GAMES.map((game) => (
                                    <li key={game} className={open.games[game] ? 'is-on' : ''} style={{ '--pip': navHue(GAME_NAV_KEYS[game]) }}>
                                        {t(`gamesHub.short.${game}`)}
                                    </li>
                                ))}
                            </ul>
                        )}
                        {open.self && <p className="meadow__card-sub"><Link to="/profile?tab=appearance">{t('meadow.youLook')}</Link></p>}
                        {!open.self && !open.awake && (
                            <button type="button" className="btn btn-primary btn-sm" disabled={isPoked(open.uid)} onClick={() => poke(open)}>
                                {isPoked(open.uid) ? t('meadow.pokedToday') : t('meadow.poke')}
                            </button>
                        )}
                        {!open.self && open.awake && open.profile && (
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => openTrainerCard({
                                    userId: open.uid,
                                    name: open.name || t('friends.unknownTrainer'),
                                    avatar: open.profile.avatarPokemonId,
                                    isShiny: open.profile.avatarIsShiny,
                                    trainerSprite: open.profile.trainerSprite,
                                    selectedBadgeId: open.profile.selectedBadgeId || null,
                                    frameId: open.profile.frameId || null,
                                    titleId: open.profile.titleId || null,
                                })}
                            >
                                {t('meadow.card')}
                            </button>
                        )}
                    </div>
                )}
            </div>
            {note}
        </section>
    );
}

export default Meadow;
