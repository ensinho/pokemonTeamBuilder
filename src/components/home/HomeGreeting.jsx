import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { typeColors } from '../../constants/types';
import { getPokemonFrontSpriteUrl } from '../../utils/pokemonSprites';
import { Sprite } from '../Sprite';
import { Mascot } from '../Mascot';
import { FramedAvatar } from '../rewards/FramedAvatar';
import { MascotNote } from './MascotNote';

/**
 * The Home's first line (2026-11-09, the "Hey, Alex." of the references —
 * .claude/skills/app-screens): a hello by the hour with the trainer's name,
 * said by the mascot in the trainer's own circle, with the partner riding on
 * it as a badge (a silhouette until one is chosen — "Quem é esse Pokémon?";
 * a tap opens the picker either way).
 *
 * Under the hello he speaks (2026-11-12, the hearth pass): his note of the
 * day when he has one (`note`, homeNote()), the persona's question otherwise
 * — always in his speech bubble, the same device the Primeira Jornada and
 * every `<MascotTip>` use, its tail pointing at him. One voice, and it is
 * visibly his.
 *
 * The streak is NOT here any more: the week strip (CheckinWeek) opens with
 * the run — flame, count, heat — and stands right under this line on a phone
 * and beside it on a desktop, so a pill repeated the same figure a thumb
 * away. A guest's way into an account still sits on the right on a phone.
 */
export function HomeGreeting({
    name,
    period,
    personaId,
    uid,
    partner,
    note = null,
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
            {/* The mascot in the trainer's circle (2026-11-12, Enzo: "usar o
                mascote dentro do círculo para ser mais chamativo"): alive, his
                face the day's note's, still wearing the trainer's frame. The
                partner rides on the circle as a badge — a tap changes it. */}
            <span className="home-greet__badge-host">
                <FramedAvatar uid={uid} className="home-greet__avatar home-greet__avatar--mascot">
                    <span className="home-greet__face home-greet__face--mascot">
                        <Mascot bot size="fill" framing="head" mood={note?.mood || 'feliz'} seasonal={false} interactive stage className="home-greet__mascot" />
                    </span>
                </FramedAvatar>
                <button
                    type="button"
                    className={`home-greet__partner ${partner.hasPartner ? '' : 'is-unchosen'}`}
                    style={partner.hasPartner ? { '--avatar-tone': typeColors[partner.type] } : undefined}
                    onClick={onOpenPartner}
                    aria-label={t(partner.hasPartner ? 'cozyHome.changePartner' : 'cozyHome.choosePartner')}
                    title={t(partner.hasPartner ? 'cozyHome.changePartner' : 'cozyHome.choosePartner')}
                >
                    <Sprite src={getPokemonFrontSpriteUrl(partner.id, { shiny: partner.shiny })} className="home-greet__partner-sprite" eager />
                </button>
            </span>

            <div className="home-greet__text">
                <h1 className="home-greet__hello">{hello}</h1>
                <div className="home-greet__says">
                    {note
                        ? <MascotNote note={note} onOpenStreak={onOpenStreak} face={false} />
                        : <p className="mascot-note">{ask}</p>}
                </div>
            </div>

            {isAnonymous && (
                <button type="button" className="btn btn-secondary btn-sm home-greet__signin" onClick={onSignIn}>
                    {t('homeToday.signIn')}
                </button>
            )}
        </header>
    );
}

export default HomeGreeting;
