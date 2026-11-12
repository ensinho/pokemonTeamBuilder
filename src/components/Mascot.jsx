import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import '../styles/mascot.css';
import { useMascotStore } from '../store/useMascotStore';
import { useAuthStore } from '../store/useAuthStore';
import { useTranslation } from '../hooks/useTranslation';
import { derivePersona } from '../utils/trainerProfile';
import { ICON_INNER, ICON_INNER_SMALL } from '../utils/mascot/icon';
import { MASCOT_SIZES, VIEWS } from '../utils/mascot/constants';
import { costumeHat } from '../utils/mascot/assistant';
import { useMascotBot, useMascotEngine } from './mascot/useMascotEngine';

/**
 * The app's mascot — the ghost of the icon, drawn live (2026-11-06; before,
 * the raster icon). It is the voice of tips and of the bigger moments, and it
 * answers the trainer: looks at the pointer, hops on a tap. The drawing loads
 * in its own chunk (`mascot/engine.js`); until it lands this renders the icon
 * at rest from `utils/mascot/icon.js`, so first paint never waits for it.
 *
 * Decorative unless `label` is given: whatever it "says" is the text beside
 * it. See docs/modules/mascot.md for the rules (one per screen, quiet in the
 * middle of a flow, gold only when earned).
 *
 * - `size` xs 24 · sm 36 · md 48 · lg 64 · xl 120 · hero 176 px, or `fill`.
 * - `mood` / `pose`: names from `utils/mascot/catalog.js`; `hat`, `extra` add to them.
 * - `loop`: breathe | float — CSS, transform/opacity only. A prop's own loop (the
 *   capture ball, the Shadow Ball, a page, the lens) comes with its pose, at rest.
 * - `play` (+ `playKey` to replay): a sequence once; `cheer` = a hop (the old API).
 * - `interactive`: looks at the pointer, answers taps. `stage`: also plays the
 *   app's reactions (`useMascotStore.react`). `playground`: petting, a long
 *   press, dragging and dozing off — the Profile and the 404.
 * - `coverable`: covers its eyes while a password field has focus.
 * - What he wears: the caller's `hat`, else the season's (on its dates), else
 *   the trainer's costume (Profile → Mascote) — from 48 px up, where a hat reads.
 * - `bot`: the 3D body (2026-11-11, `utils/mascot/bot/`, the open-bot-avatar
 *   engine): alive while on screen, looks at the pointer with its whole body.
 *   A playground is a bot unless the trainer chose the line (Profile →
 *   Mascote → Formato); anything else is the line unless it asks.
 */
const toneOf = (prefs, profile) => {
    if (prefs.tone === 'brand') return null;
    if (prefs.tone === 'persona') return derivePersona(profile)?.tone || null;
    if (prefs.tone === 'shiny') return prefs.shinyFound ? 'shiny' : null;
    return prefs.tone;
};

const COVER_POSE = {
    cover: { paws: 'cover', mouth: 'smile', blush: 'strong' },
    peek: { paws: 'peek', mouth: 'grin', eyes: { l: 'happy', r: 'open' }, blush: 'strong' },
};

export function Mascot({
    size = 'md', mood, pose, hat, extra, tone: toneProp, framing, loop, play, playKey, cheer = false,
    interactive = false, stage = false, playground = false, coverable = false, seasonal, label, className = '', idleMs, bot,
}) {
    const engine = useMascotEngine();
    const { t } = useTranslation();
    const prefs = useMascotStore((s) => s.prefs);
    const isBot = bot ?? (playground && prefs.form !== 'line');
    const botMod = useMascotBot(isBot);
    const cover = useMascotStore((s) => (coverable ? s.cover : null));
    const trainerProfile = useAuthStore((s) => s.trainerProfile);
    const svgRef = useRef(null);
    const wrapRef = useRef(null);
    const stageRef = useRef(null);
    const id = useId();
    const [bubble, setBubble] = useState(null);

    const px = MASCOT_SIZES[size] ?? (size === 'fill' ? 240 : 48);
    const view = VIEWS[framing] || (playground ? VIEWS.wide : px <= 64 ? VIEWS.head : VIEWS.body);
    const tone = toneProp ?? toneOf(prefs, trainerProfile);
    const live = interactive || stage || playground || isBot;
    const motionRef = useRef({ mood, pose });
    motionRef.current = { mood, pose };
    const extraKey = extra ? JSON.stringify(extra) : '';

    const base = useMemo(() => {
        if (!engine) return null;
        const dressed = (seasonal ?? px >= 48) && !hat;
        const season = dressed ? engine.seasonalHat(new Date()) : null;
        const costume = dressed && !season ? costumeHat(prefs.costume, derivePersona(trainerProfile)?.id) : null;
        const pose0 = engine.buildPose({ px, mood, pose, hat: hat || season || costume || undefined, extra: { ...(extra || {}), ...(cover ? COVER_POSE[cover] : {}) } });
        return tone ? { ...pose0, tone } : pose0;
        // extraKey stands in for `extra` (callers pass literals)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [engine, px, mood, pose, hat, extraKey, cover, tone, seasonal, prefs.costume, trainerProfile]);
    const baseRef = useRef(base);
    baseRef.current = base;

    // the still drawing; a stage at rest redraws itself (it may be asleep)
    useLayoutEffect(() => {
        const svg = svgRef.current;
        if (!svg) return;
        if (!engine || !base) { svg.innerHTML = px <= 28 ? ICON_INNER_SMALL : ICON_INNER; return; }
        // the trainer changed something in his room (a mood, a colour): that wakes him
        if (stageRef.current) { stageRef.current.poke(); stageRef.current.renderStill(); }
        else svg.innerHTML = engine.mascotInner(base);
    }, [engine, base, px]);

    // interactive: one controller while mounted
    useEffect(() => {
        if (!engine || !live || !svgRef.current || !wrapRef.current) return undefined;
        let bubbleTimer = 0;
        const Stage = botMod ? botMod.BotStage : engine.MascotStage;
        const ctl = new Stage({
            wrapper: wrapRef.current, svg: svgRef.current, view, playground,
            getMotion: botMod ? () => botMod.botMotion(motionRef.current.mood, motionRef.current.pose) : undefined,
            idleMs: idleMs ?? (engine.isNight() ? 12000 : 25000),
            getBase: () => baseRef.current || {},
            onShiny: () => useMascotStore.getState().foundShiny(),
            onBubble: playground ? (key) => { setBubble(key); clearTimeout(bubbleTimer); bubbleTimer = setTimeout(() => setBubble(null), 1700); } : undefined,
        });
        stageRef.current = ctl;
        ctl.renderStill();
        return () => { clearTimeout(bubbleTimer); ctl.destroy(); stageRef.current = null; };
    }, [engine, botMod, live, playground, view, idleMs]);

    // the app's reactions go to the one mascot holding the stage
    useEffect(() => {
        if (!stage) return undefined;
        const store = useMascotStore.getState();
        store.claimStage(id);
        let last = store.reaction?.id ?? 0;
        const unsub = useMascotStore.subscribe((s) => {
            if (!s.reaction || s.reaction.id === last) return;
            last = s.reaction.id;
            if (s.stage === id) stageRef.current?.react(s.reaction.name);
        });
        return () => { unsub(); useMascotStore.getState().releaseStage(id); };
    }, [stage, id]);

    // one-shots the caller asks for (a celebration is the app's, so it honours the switch)
    const playName = play || (cheer ? 'hop' : null);
    useEffect(() => {
        if (!engine || !playName || !prefs.reactions || !svgRef.current) return undefined;
        if (stageRef.current) { stageRef.current.react(playName); return undefined; }
        return engine.playSequence(svgRef.current, () => baseRef.current || {}, playName, { loops: 2 });
    }, [engine, playName, playKey, prefs.reactions]);

    // eyes covered: the paws rise into place
    useEffect(() => {
        if (!engine || !coverable || cover !== 'cover' || !svgRef.current || stageRef.current) return undefined;
        return engine.playSequence(svgRef.current, () => baseRef.current || {}, 'cover');
    }, [engine, coverable, cover]);

    // the bot breathes and sways on its own (the engine): the CSS loops are the line's
    const loopClass = loop && prefs.reactions && !isBot ? ` is-${loop}` : '';
    const sizeClass = size === 'fill' ? 'mascot--fill' : `mascot--${MASCOT_SIZES[size] ? size : 'md'}`;
    // a playground is focusable, so it is never hidden from assistive tech
    const name = label || (playground ? t('mascot.label') : null);
    const a11y = name ? { role: 'img', 'aria-label': name } : { 'aria-hidden': 'true' };

    return (
        <span
            ref={wrapRef}
            className={`mascot ${sizeClass}${loopClass}${live ? ' is-interactive' : ''}${playground ? ' is-playground' : ''}${botMod ? ' mascot--bot' : ''} ${className}`}
            {...a11y}
            tabIndex={playground ? 0 : undefined}
        >
            <svg ref={svgRef} className="mascot__svg" viewBox={view} xmlns="http://www.w3.org/2000/svg" focusable="false" aria-hidden="true" />
            {playground && (
                <span className={`mascot__bubble${bubble ? ' is-on' : ''}`} aria-hidden="true">{bubble ? t(`mascot.bubble.${bubble}`) : ''}</span>
            )}
        </span>
    );
}

/** The mascot saying something: the mascot, then a speech bubble. */
export function MascotTip({ children, size = 'md', cheer = false, mood, pose, play, playKey, className = '' }) {
    return (
        <div className={`mascot-tip mascot-tip--${size} ${className}`}>
            <Mascot size={size} cheer={cheer} mood={mood} pose={pose} play={play} playKey={playKey} interactive stage />
            <div className="mascot-tip__bubble">{children}</div>
        </div>
    );
}

// One drawing per (mood, size, tone): a thread can show the same face fifty times.
const faceCache = new Map();

/**
 * A face as a sticker: one mood, still, no controller, no store — for places
 * where the face repeats (a reaction under every post, a row in a list). The
 * markup is drawn once per mood and size and reused. `tone` is a type name
 * (the reaction's own colour) or nothing for the brand's violet.
 */
export function MascotFace({ mood, size = 'xs', tone, className = '' }) {
    const engine = useMascotEngine();
    const ref = useRef(null);
    const px = MASCOT_SIZES[size] ?? 24;
    useLayoutEffect(() => {
        if (!ref.current) return;
        if (!engine) { ref.current.innerHTML = px <= 28 ? ICON_INNER_SMALL : ICON_INNER; return; }
        const key = `${mood}|${px}|${tone || ''}`;
        if (!faceCache.has(key)) {
            const pose = engine.buildPose({ px, mood });
            faceCache.set(key, engine.mascotInner(tone ? { ...pose, tone } : pose));
        }
        ref.current.innerHTML = faceCache.get(key);
    }, [engine, mood, px, tone]);
    return (
        <span className={`mascot mascot--${MASCOT_SIZES[size] ? size : 'xs'} mascot-face ${className}`} aria-hidden="true">
            <svg ref={ref} className="mascot__svg" viewBox={VIEWS.head} xmlns="http://www.w3.org/2000/svg" focusable="false" />
        </span>
    );
}

/**
 * The icon at rest without the engine — for the boot splash, where nothing
 * may wait on a chunk. CSS gives it the entrance (mascot.css `.mascot-icon`).
 */
export function MascotIcon({ className = '' }) {
    const ref = useRef(null);
    useLayoutEffect(() => { if (ref.current) ref.current.innerHTML = ICON_INNER; }, []);
    return (
        <span className={`mascot mascot-icon ${className}`} aria-hidden="true">
            <svg ref={ref} className="mascot__svg" viewBox={VIEWS.head} xmlns="http://www.w3.org/2000/svg" focusable="false" />
        </span>
    );
}

export default Mascot;
