import React from 'react';
import { Flame } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { typeColors } from '../../constants/types';
import { getPokemonFrontSpriteUrl } from '../../utils/pokemonSprites';
import { Sprite } from '../Sprite';
import { FramedAvatar } from '../rewards/FramedAvatar';

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
 */
export function HomeGreeting({
    name,
    period,
    personaId,
    uid,
    partner,
    streakCount = 0,
    isAnonymous = false,
    onOpenPartner,
    onOpenStreak,
    onSignIn,
}) {
    const { t } = useTranslation();
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
                <p className="home-greet__ask">{ask}</p>
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
                    <Flame aria-hidden="true" />
                    <span>{streakCount}</span>
                </button>
            )}
        </header>
    );
}

export default HomeGreeting;
