import { memo, useLayoutEffect, useRef } from 'react';

import { typeColors } from '../../../../constants/types';
import { useSpriteFeet } from '../../../../hooks/useSpriteFeet';
import { useTranslation } from '../../../../hooks/useTranslation';
import { getDsSprite, spriteFeet } from '../../../../utils/battleSprites';
import { FLARE_VARIANTS, flareOf } from '../../../../utils/battleFlare';
import { hpTone } from '../../../../utils/battleState';
import { trainerSpriteUrl } from '../../../../utils/challengeView';
import { DsFlare } from './DsFlare';
import { DsTextBox } from './DsTextBox';

const CHAMPION_SPRITE = trainerSpriteUrl('cynthia-gen4');

/*
 * The stage, in DS pixels (256 × 192). Each side has one centre line — its
 * platform's middle — and everything on that side hangs from it: the sprite is
 * drawn 1:1 (96 × 96) with its feet row (sprite-feet.json) on the line, the
 * move effects aim at its body. The HP boxes mirror each other: same size, same
 * rows, flush against opposite edges. Mirrored in champion-challenge-ds.css.
 */
const STAGE = {
    foe: { x: 190, ground: 89, body: 64 },
    mine: { x: 66, ground: 151, body: 112 },
    // The field's middle, between the two: where a won battle's flare blooms.
    centre: { x: 128, body: 84 },
};

const MEGA_RE = /-Mega(?:-[XYZ])?$/;

function BallRow({ slots, mine }) {
    const six = Array.from({ length: 6 }, (_, i) => slots[i] || null);
    return (
        <div className={`ds-balls ${mine ? 'is-mine' : 'is-foe'}`} aria-hidden="true">
            {six.map((slot, i) => (
                // Fixed six positions; the ball in a slot changes, the slot never moves.
                <span key={i} className={`ds-ball ${!slot ? 'is-empty' : slot.fainted ? 'is-fainted' : ''}`} />
            ))}
        </div>
    );
}

/** One side's HP box; both sides share the same rows, so the two boxes mirror. */
/**
 * A data box as Black & White draws it: a slim dark bar against the screen's
 * edge, cut on a slant toward the field — the name, the gender and the level,
 * then the HP bar in its frame behind the HP mark. Yours adds the figures
 * under the bar; hers never shows them (the player sees a percentage, as in
 * the games). The team's balls are not in the box: they stand on their own
 * before the send-outs, and the teams live in the menu and the rails.
 */
function HpBox({ mon, mine }) {
    const { t } = useTranslation();
    if (!mon) return null;
    const pct = mon.fainted ? 0 : Math.max(0, Math.min(100, mon.hp?.pct ?? 100));
    // Mega Evolved, the box keeps the Pokémon's name and adds the mark, as the games do.
    const mega = MEGA_RE.test(mon.species);
    return (
        <div className={`ds-hpbox ${mine ? 'is-mine' : 'is-foe'}`}>
            <div className="ds-hpbox__row">
                <span className="ds-hpbox__name">{mega ? mon.species.replace(MEGA_RE, '') : mon.species}</span>
                {mega && <span className="ds-hpbox__status is-mega">{t('challenge.command.mega')}</span>}
                {mon.gender && <span className={`ds-hpbox__gender is-${mon.gender === 'F' ? 'f' : 'm'}`}>{mon.gender === 'F' ? '♀' : '♂'}</span>}
                {mon.status && <span className={`ds-hpbox__status is-${mon.status}`}>{String(mon.status).toUpperCase()}</span>}
                <span className="ds-hpbox__level"><small>{t('challenge.battle.lv')}</small>{mon.level}</span>
            </div>
            <div className="ds-hpbox__bar">
                <span className="ds-hpbox__label">{t('challenge.battle.hp')}</span>
                <span className="ds-hpbox__track">
                    <span className={`ds-hpbox__fill is-${hpTone(pct)}`} style={{ '--hp': pct / 100 }} />
                </span>
            </div>
            {mine && mon.hp?.max && (
                <span className="ds-hpbox__numbers">{Math.max(0, Math.round(mon.hp.current))}/{mon.hp.max}</span>
            )}
        </div>
    );
}

/**
 * One move's effect, in the attacker's type colour: a physical hit bursts on
 * the target, a special one flies across, a status move sparkles on whoever it
 * touches. Keyed by the moment, so each move plays once. Transform/opacity only.
 */
/**
 * Each type's signature at the target: how its particles move (pattern) and
 * what they look like (shape). Status moves sparkle on whoever they touch.
 */
const FX_BY_TYPE = {
    fire: ['rise', 'flame'],
    water: ['rise', 'bubble'],
    ghost: ['rise', 'wisp'],
    poison: ['rise', 'bubble'],
    grass: ['rise', 'leaf'],
    rock: ['fall', 'rock'],
    ice: ['fall', 'shard'],
    electric: ['fall', 'bolt'],
    psychic: ['ring', 'ring'],
    dragon: ['ring', 'ring'],
    fairy: ['ring', 'sparkle'],
    dark: ['slash', 'line'],
    steel: ['slash', 'line'],
    flying: ['slash', 'line'],
    ground: ['quake', 'rock'],
    bug: ['swarm', 'dot'],
    fighting: ['burst', 'star'],
    normal: ['burst', 'star'],
};

/** The field shakes for the heavy physical hits (BW's camera does). */
const SHAKERS = new Set(['ground', 'rock', 'fighting']);

function MoveFx({ event, meta }) {
    if (!event || event.type !== 'move' || event.still || event.miss) return null;
    const attacker = event.side === 'p1' ? 'mine' : 'foe';
    const self = event.targetSide === event.side;
    const target = self ? attacker : (attacker === 'mine' ? 'foe' : 'mine');
    const kind = meta?.category === 'Physical' ? 'physical' : meta?.category === 'Special' ? 'special' : 'status';
    const style = {
        '--fx-color': typeColors[meta?.type] || 'var(--ds-ink-soft)',
        '--fx-from-x': STAGE[attacker].x,
        '--fx-from-y': STAGE[attacker].body,
        '--fx-to-x': STAGE[target].x,
        '--fx-to-y': STAGE[target].body,
    };
    const [pattern, shape] = kind === 'status' ? ['sparkle', 'sparkle'] : (FX_BY_TYPE[meta?.type] || ['burst', 'star']);
    return (
        <div className={`ds-fx is-${kind} is-${pattern} is-shape-${shape}`} style={style} aria-hidden="true">
            {kind === 'special' && <span className="ds-fx__orb" />}
            {pattern === 'burst' && <span className="ds-fx__burst" />}
            {Array.from({ length: 8 }, (_, i) => (
                // Eight fixed particles per moment; the moment's key remounts them.
                <span key={i} className="ds-fx__p" style={{ '--i': i }} />
            ))}
        </div>
    );
}

// Mega Evolution: the Pokémon is a white silhouette that swells and pulses,
// then comes back as its new forme (the sprite swaps under the white).
const MEGA_FRAMES = [
    { filter: 'brightness(0) invert(1)', transform: 'scale(0.94)' },
    { filter: 'brightness(0) invert(1)', transform: 'scale(1.12)', offset: 0.35 },
    { filter: 'brightness(0) invert(1)', transform: 'scale(1)', offset: 0.55 },
    { filter: 'brightness(0) invert(1)', transform: 'scale(1.06)', offset: 0.7 },
    { filter: 'none', transform: 'scale(1)' },
];

function Combatant({ mon, side, current, feetTable, reducedMotion }) {
    const bodyRef = useRef(null);
    const mine = side === 'mine';
    const sideId = mine ? 'p1' : 'p2';
    const megaAt = current?.type === 'mega' && current.side === sideId ? current.lineIndex : null;
    useLayoutEffect(() => {
        const body = bodyRef.current;
        if (megaAt === null || reducedMotion || typeof body?.animate !== 'function') return undefined;
        const animation = body.animate(MEGA_FRAMES, { duration: 1500, easing: 'ease-in-out' });
        return () => animation.cancel();
    }, [megaAt, reducedMotion]);

    if (!mon) return null;
    const sprite = getDsSprite(mon.species, { back: mine, shiny: mon.shiny });
    const attacking = current?.type === 'move' && current.side === sideId && !current.still;
    const hit = current?.type === 'hp' && current.side === sideId && !current.heal;
    const classes = [
        'ds-mon', `is-${side}`,
        mon.fainted ? 'is-fainted' : '',
        attacking ? 'is-attacking' : '',
        hit ? 'is-hit' : '',
    ].join(' ');
    // Three layers, one animation each, so ending one never restarts another:
    // the box enters/faints, the body lunges, the image bobs/blinks.
    return (
        <div className={classes} style={{ '--feet': spriteFeet(feetTable, sprite.url, { back: mine }) }}>
            <div className="ds-mon__body" ref={bodyRef}>
                {sprite.url && <img src={sprite.url} alt={mon.species} width={96} height={96} decoding="async" draggable="false" />}
            </div>
        </div>
    );
}

/** The moment's anime flare (`flareOf`), drawn on its spot of the stage. */
function SceneFlare({ current, moveMeta, foeName }) {
    const flare = flareOf(current, { moveMeta, foeName, typeColors });
    if (!flare) return null;
    const spot = STAGE[flare.at];
    return (
        <DsFlare
            variant={flare.variant}
            colorA={flare.colorA}
            colorB={flare.colorB}
            className="ds-flare"
            style={{ '--x': spot.x, '--y': spot.body, '--s': FLARE_VARIANTS[flare.variant].size }}
        />
    );
}

/**
 * The battle, DPPt style (top screen): sky, the teal ground, two platforms,
 * Gen 4 sprites (front for the opponent's side, back for yours), HP boxes and
 * the text box. The trainer standing on the far platform before the send-out
 * is Cynthia, or `foeSprite` (a friend's trainer). Everything is laid out in DS pixels (`--px`).
 *
 * The scene is the battle *as of the moment playing*: `field` is read from the
 * log up to the current event (`useBattlePlayback`), so an HP bar drains when
 * its hit plays and a sprite faints with its line of text.
 */
export const DsBattleScene = memo(function DsBattleScene({
    field, current, text, speaker, foeBalls, myBalls, switchKeys, moveMeta, championName, onAdvance, showArrow, reducedMotion,
    messageMode = 'band', foeSprite = null, foeName = championName,
}) {
    const feetTable = useSpriteFeet();
    const foe = field?.theirs?.active || null;
    const mine = field?.mine?.active || null;
    const flash = current?.type === 'effect' && (current.kind === 'supereffective' || current.kind === 'crit');
    const weather = field?.weather || null;
    const moveMetaNow = current?.type === 'move' && !current.still && !current.miss ? moveMeta(current.move) : null;
    const shake = moveMetaNow?.category === 'Physical' && SHAKERS.has(moveMetaNow.type) && !reducedMotion;

    return (
        <div className={`ds-battle ${weather ? `is-weather-${String(weather).toLowerCase()}` : ''} ${shake ? 'is-shake' : ''}`}>
            <div className="ds-battle__sky" aria-hidden="true" />
            <div className="ds-battle__ground" aria-hidden="true" />
            <div className="ds-platform is-foe" aria-hidden="true" />
            <div className="ds-platform is-mine" aria-hidden="true" />

            <img
                className={`ds-trainer ${foe ? 'is-gone' : ''}`}
                src={foeSprite || CHAMPION_SPRITE}
                alt={championName}
                width={80}
                height={80}
                decoding="async"
                draggable="false"
            />

            {/* A new key per switch-in remounts the sprite, which replays its entrance. */}
            <Combatant key={`foe-${switchKeys.p2}`} mon={foe} side="foe" current={current} feetTable={feetTable} reducedMotion={reducedMotion} />
            <Combatant key={`mine-${switchKeys.p1}`} mon={mine} side="mine" current={current} feetTable={feetTable} reducedMotion={reducedMotion} />

            <MoveFx key={`fx-${current?.lineIndex ?? 'none'}`} event={current} meta={current?.type === 'move' ? moveMeta(current.move) : null} />
            {/* Keyed by the moment, so each one draws its own (and none under reduced motion). */}
            {!reducedMotion && <SceneFlare key={`flare-${current?.lineIndex ?? 'none'}`} current={current} moveMeta={moveMeta} foeName={foeName} />}

            <HpBox mon={foe} mine={false} />
            <HpBox mon={mine} mine />
            {/* Before the send-outs, the two rows of balls stand on their own, as in the games. */}
            {!foe && <BallRow slots={foeBalls} mine={false} />}
            {!mine && <BallRow slots={myBalls} mine />}

            {flash && !reducedMotion && <div key={`flash-${current.lineIndex}`} className="ds-flash" aria-hidden="true" />}

            {/* On a phone the message is a band across this screen; on a desktop the HUD strip carries it. */}
            {messageMode === 'band' && (
                <DsTextBox text={text} speaker={speaker} showArrow={showArrow} onAdvance={onAdvance} reducedMotion={reducedMotion} msPerChar={14} variant="band" />
            )}
        </div>
    );
});
