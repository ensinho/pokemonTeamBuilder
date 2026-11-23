import React, { useEffect, useRef } from 'react';

import { useTranslation } from '../../../../hooks/useTranslation';
import { getDsSprite, handleBattleSpriteError } from '../../../../utils/battleSprites';
import { CHAMPION_MOMENTS } from '../../../../utils/championMoments';
import '../../../../styles/champion-moments.css';

/**
 * The Champion Challenge's way in and way out, drawn inside the screen
 * (utils/championMoments.js). Each one is a layer over whatever the screen
 * shows — the room, the last frame of the battle — mounted there by the view
 * through a portal, so the field the battle ended on is what closes to black.
 * Pure CSS animations in the DS's own unit and palette; a tap skips any of
 * them, and the view never mounts them under reduced motion.
 */

/** Where the Hall's gold twinkles, in DS px (256 × 192). */
const STARS = [[24, 18], [70, 92], [118, 30], [170, 84], [214, 22], [236, 110]];

/** Calls `onDone` once, after `ms`, or at once on a tap or a key. */
function useHandover(ms, onDone) {
    const done = useRef(false);
    const finish = useRef(() => {});
    finish.current = () => { if (!done.current) { done.current = true; onDone?.(); } };
    useEffect(() => {
        const timer = window.setTimeout(() => finish.current(), ms);
        const onKey = () => finish.current();
        window.addEventListener('keydown', onKey);
        return () => { window.clearTimeout(timer); window.removeEventListener('keydown', onKey); };
    }, [ms]);
    return () => finish.current();
}

/** The screen lights like a CRT, then the room opens through an iris on the trainer. */
export function DsPowerOn({ origin, onDone }) {
    const skip = useHandover(CHAMPION_MOMENTS.powerOn, onDone);
    return (
        <div
            className="ds-power-on"
            style={{ '--iris-x': origin.x, '--iris-y': origin.y }}
            onPointerDown={skip}
            aria-hidden="true"
        />
    );
}

/** The picture folds to a line, the line to a dot. */
export function DsPowerOff({ onDone }) {
    useHandover(CHAMPION_MOMENTS.powerOff, onDone);
    return <div className="ds-power-off" aria-hidden="true" />;
}

/** An official win: the team walks into the Hall of Fame, then the plaque. */
export function DsHallOfFame({ team, date, onDone }) {
    const { t } = useTranslation();
    const skip = useHandover(CHAMPION_MOMENTS.hall, onDone);
    return (
        <div className="ds-hall" role="img" aria-label={t('challenge.hall.label', { date })} onPointerDown={skip}>
            <span className="ds-hall__beam is-a" />
            <span className="ds-hall__beam is-b" />
            <span className="ds-hall__beam is-c" />
            <ol className="ds-hall__team">
                {team.map((species, i) => (
                    <li key={`${species}-${i}`} className="ds-hall__slot" style={{ '--i': i }}>
                        <span className="ds-hall__pad" />
                        <img
                            className="ds-hall__mon"
                            src={getDsSprite(species).url}
                            alt=""
                            width={80}
                            height={80}
                            draggable={false}
                            onError={(e) => handleBattleSpriteError(e, species)}
                        />
                        <span className="ds-hall__pop" />
                    </li>
                ))}
            </ol>
            {STARS.map(([sx, sy], i) => <span key={i} className="ds-hall__star" style={{ '--i': i, '--sx': sx, '--sy': sy }} />)}
            <p className="ds-hall__plaque">{t('challenge.hall.title')}{date ? ` · ${date}` : ''}</p>
            <span className="ds-hall__flash" />
        </div>
    );
}

/** An official loss: the field closes to black around the trainer, one line. */
export function DsBlackout({ championName, onDone }) {
    const { t } = useTranslation();
    const skip = useHandover(CHAMPION_MOMENTS.blackout, onDone);
    const line = t('challenge.blackout.line', { name: championName });
    return (
        <div className="ds-blackout" onPointerDown={skip}>
            <p className="ds-blackout__line" style={{ '--chars': line.length }}>{line}</p>
        </div>
    );
}
