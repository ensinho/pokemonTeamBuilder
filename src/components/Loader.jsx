import React, { useEffect, useState } from 'react';
import { PokeballIcon } from './icons';
import { Mascot } from './Mascot';
import { LOADER_SCENES } from '../utils/mascot/constants';
import { PATIENCE_STEPS } from '../utils/mascot/assistant';
import { useTranslation } from '../hooks/useTranslation';

/**
 * The loading state. A wait with a region to itself (`md`, `lg`) is a scene of
 * the mascot (2026-11-06), chosen by what is being waited for: it peeks over a
 * rocking Poké Ball, charges a Shadow Ball before a battle, reads the Pokédex,
 * thinks, searches with a lens. A control or a row (`xs`, `sm`) keeps the Poké
 * Ball alone, rocking the way it does after a throw (interactions.css) — the
 * small ones repeat and sit beside content, where a character would be noise.
 *
 * - `size`: 'xs' | 'sm' | 'md' (default) | 'lg'.
 * - `scene` (md, lg): 'capture' (default) | 'battle' | 'pokedex' | 'think' |
 *   'search' (utils/mascot/constants.js), or 'ball' to keep the Poké Ball —
 *   inside a game screen (the DS exception) or where a character would be out
 *   of place (an account being deleted).
 * - `label`: shown under it; without one the status is announced to screen
 *   readers only ("Loading…").
 * - `block`: centre it in a padded block, for a view with nothing else yet.
 *
 * A scene fades in after a beat, so a wait shorter than that shows nothing.
 * One that runs on gets company (2026-11-10, `PATIENCE_STEPS`): after 4 s a
 * line says what the mascot is doing ("Segurando a bola…"); after 10 s — where
 * attention drifts — he yawns and the line admits the wait is long. The
 * caller's label stays: it says *what* is loading, the line says *how it goes*.
 */
export function Loader({ size = 'md', label, block = false, scene, className = '' }) {
    const { t } = useTranslation();
    const text = label || t('common.loading');
    const isScene = (size === 'md' || size === 'lg') && scene !== 'ball';
    const sceneName = LOADER_SCENES[scene] ? scene : 'capture';
    const look = isScene ? LOADER_SCENES[sceneName] : null;
    const patience = usePatience(isScene);
    const handoff = useHandoff(Boolean(look));
    const classes = ['loader', size !== 'md' && `loader--${size}`, look && 'loader--scene', handoff && 'is-handoff', className]
        .filter(Boolean).join(' ');

    const loader = (
        <span className={classes} role="status">
            {look
                ? <Mascot size="xl" framing="body" mood={patience === 2 ? 'bocejo' : look.mood} pose={look.pose} className="loader__mascot" />
                : <PokeballIcon className="loader__ball" />}
            {label
                ? <span className="loader__label">{text}</span>
                : <span className="sr-only">{text}</span>}
            {patience > 0 && (
                <span className="loader__aside">{t(patience === 2 ? 'mascot.wait.long' : `mascot.wait.${sceneName}`)}</span>
            )}
        </span>
    );

    return block ? <div className="loader-block">{loader}</div> : loader;
}

/** 0 at first, 1 once the wait is clearly a wait, 2 when it is long (utils/mascot/assistant.js). */
function usePatience(on) {
    const [stage, setStage] = useState(0);
    useEffect(() => {
        if (!on) return undefined;
        const timers = PATIENCE_STEPS.map((ms, i) => setTimeout(() => setStage(i + 1), ms));
        return () => timers.forEach(clearTimeout);
    }, [on]);
    return on ? stage : 0;
}

// One wait often hands over to the next: the route's chunk, then the view's
// data. A scene that mounts while another is already on screen (or just left
// it) shows at once, so the trainer sees one wait instead of a blank beat
// between two. BEAT is the fade-in delay of `.loader--scene` (interactions.css).
const BEAT = 200;
let active = 0;
let shownFrom = null; // when the scenes on screen became visible
let lastSeen = -Infinity; // when the last visible scene left
const clock = () => performance.now();

function useHandoff(on) {
    const [now] = useState(() => on && ((active > 0 && shownFrom != null && clock() >= shownFrom) || clock() - lastSeen < BEAT));
    useEffect(() => {
        if (!on) return undefined;
        active += 1;
        if (shownFrom == null) shownFrom = clock() + (now ? 0 : BEAT);
        return () => {
            active -= 1;
            if (active > 0) return;
            if (clock() >= shownFrom) lastSeen = clock();
            shownFrom = null;
        };
    }, [on, now]);
    return now;
}
