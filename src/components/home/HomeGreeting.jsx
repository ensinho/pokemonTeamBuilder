import React, { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { typeColors } from '../../constants/types';
import { getPokemonFrontSpriteUrl } from '../../utils/pokemonSprites';
import { Sprite } from '../Sprite';
import { FramedAvatar } from '../rewards/FramedAvatar';
import { RollingNumber } from '../RollingNumber';
import { CHECKED_IN_EVENT } from '../../utils/dailyCheckin';
import { MascotNote } from './MascotNote';

/**
 * The Home's first line (2026-11-09, the "Hey, Alex." of the references —
 * .claude/skills/app-screens): the partner as the trainer's face, a hello by
 * the hour with their name, and the question their persona came with. It
 * replaces the chip strip and the section tabs — the partner chip became the
 * avatar, the streak chip the gold pill on the right (earned, so gold), and a
 * guest gets the way into an account there instead.
 *
 * The partner is a silhouette until one is chosen ("Quem é esse Pokémon?",
 * the app's device for not-chosen-yet); a tap opens the picker either way.
 *
 * Its second line (2026-11-12) is the mascot's note of the day when he has
 * one (`note`, homeNote()), the persona's question otherwise — one voice,
 * never a question above a band that answers it the other way.
 */
export function HomeGreeting({
    name,
    period,
    personaId,
    uid,
    partner,
    streakCount = 0,
    note = null,
    isAnonymous = false,
    onOpenPartner,
    onOpenStreak,
    onSignIn,
}) {
    const { t } = useTranslation();
    // The flame answers the trainer's own check-in (CHECKED_IN_EVENT), once —
    // never a streak that merely arrives from another device.
    const [flare, setFlare] = useState(0);
    useEffect(() => {
        const onCheckIn = () => setFlare((n) => n + 1);
        window.addEventListener(CHECKED_IN_EVENT, onCheckIn);
        return () => window.removeEventListener(CHECKED_IN_EVENT, onCheckIn);
    }, []);
    const hello = name
        ? t(`homeToday.hello.${period}`, { name })
        : t(`homeToday.helloAnon.${period}`);
    const ask = t(`homeToday.ask.${personaId || 'default'}`);

    return (
        <header className="home-greet">
            <FramedAvatar
                as="button"
                type="button"
                uid={uid}
                className={`home-greet__avatar ${partner.hasPartner ? '' : 'is-unchosen'}`}
                style={partner.hasPartner ? { '--avatar-tone': typeColors[partner.type] } : undefined}
                onClick={onOpenPartner}
                aria-label={t(partner.hasPartner ? 'cozyHome.changePartner' : 'cozyHome.choosePartner')}
                title={t(partner.hasPartner ? 'cozyHome.changePartner' : 'cozyHome.choosePartner')}
            >
                {/* The face clips the sprite; the avatar itself stays unclipped
                    so a reward frame drawn around it is never cut. */}
                <span className="home-greet__face">
                    <Sprite src={getPokemonFrontSpriteUrl(partner.id, { shiny: partner.shiny })} className="home-greet__sprite" eager />
                </span>
            </FramedAvatar>

            <div className="home-greet__text">
                <h1 className="home-greet__hello">{hello}</h1>
                {note
                    ? <MascotNote note={note} onOpenStreak={onOpenStreak} />
                    : <p className="home-greet__ask">{ask}</p>}
            </div>

            {isAnonymous ? (
                <button type="button" className="btn btn-secondary btn-sm home-greet__signin" onClick={onSignIn}>
                    {t('homeToday.signIn')}
                </button>
            ) : (
                <button
                    type="button"
                    className={`home-greet__streak ${streakCount > 0 ? 'is-lit' : ''}`}
                    onClick={onOpenStreak}
                    aria-label={streakCount === 1 ? t('cozyHome.streakChipOne') : t('cozyHome.streakChip', { n: streakCount })}
                >
                    {/* Keyed by the flare, so each check-in plays it once. */}
                    <Flame key={flare} aria-hidden="true" className={`home-greet__flame ${flare ? 'is-flaring' : ''}`} />
                    <RollingNumber value={streakCount} />
                </button>
            )}
        </header>
    );
}

export default HomeGreeting;
