import React, { useEffect, useLayoutEffect, useRef } from 'react';

import { BrandWordmark } from '../BrandWordmark';
import { MascotIcon } from '../Mascot';
import {
    GHOST_BOX, GHOST_PATH, HEART_PATH, INTRO, INTRO_DECOR, STAR_PATH,
    coverScale, dockFrames, dockMove, ghostFrame, holeFrames, irisFrames, landFrames,
    orbitFrames, popFrames, riseFrames, shrinkFrames, slideFrames, wipeFrames, wrapScale,
} from '../../utils/brandIntro';
import '../../styles/brand-intro.css';

const GHOST_VIEW = `${GHOST_BOX.x} ${GHOST_BOX.y} ${GHOST_BOX.w} ${GHOST_BOX.h}`;
const prefersReduced = () => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

/** A sticker: the rig's star and heart, rings, crosses, a diamond, a Poké Ball. */
function Sticker({ kind }) {
    if (kind === 'star') return <svg viewBox="-40 -40 80 80"><path d={STAR_PATH} /></svg>;
    if (kind === 'heart') return <svg viewBox="-46 -32 92 70"><path d={HEART_PATH} /></svg>;
    if (kind === 'ring') return <svg viewBox="-10 -10 20 20"><circle r="7.5" className="bi-line" strokeWidth="5" /></svg>;
    if (kind === 'cross') return <svg viewBox="-10 -10 20 20"><path d="M-6 -6L6 6M6 -6L-6 6" className="bi-line" strokeWidth="5" strokeLinecap="round" /></svg>;
    if (kind === 'diamond') return <svg viewBox="-10 -10 20 20"><rect x="-5.5" y="-5.5" width="11" height="11" rx="2.5" transform="rotate(45)" className="bi-line" strokeWidth="4" /></svg>;
    return (
        <svg viewBox="-12 -12 24 24">
            <circle r="11.5" className="bi-ball__edge" />
            <path d="M-9.5 0A9.5 9.5 0 0 1 9.5 0Z" className="bi-ball__top" />
            <path d="M-9.5 0A9.5 9.5 0 0 0 9.5 0Z" className="bi-ball__bottom" />
            <rect x="-9.5" y="-1.4" width="19" height="2.8" className="bi-ball__edge" />
            <circle r="3.6" className="bi-ball__edge" />
            <circle r="2" className="bi-ball__bottom" />
        </svg>
    );
}

/**
 * The brand intro (utils/brandIntro.js, docs/modules/brand_intro.md): the
 * official wordmark painted on by a brush stroke while the night closes in
 * through the mascot's silhouette, the corner ghosts and the stickers, the
 * orbit, and the exit through the same silhouette.
 *
 * - `variant="splash"` covers the screen while the app boots; `leaving`
 *   plays the exit over the app (mounted underneath) and then `onLeft`.
 * - `variant="journey"` opens the Primeira Jornada: after landing, the name
 *   glides into `dockRef` and the scene stays as the hello screen's ground.
 *
 * Everything plays through the Web Animations API from keyframes sampled once
 * on mount — transform, opacity, clip-path and the orbit's dashes only — so a
 * busy main thread (the app's chunks parsing, the app mounting under the exit)
 * does not stutter it. With reduced motion the scene simply fades in, at rest.
 */
export function BrandIntro({ variant = 'splash', delay = 0, leaving = false, onLeft, dockRef, tagline, message, page, arrival = false, children }) {
    const rootRef = useRef(null);
    const stageRef = useRef(null);
    const plateRef = useRef(null);
    const holeRef = useRef(null);
    const scatterRef = useRef(null);
    const wordRef = useRef(null);
    const landRef = useRef(null);
    const inkRef = useRef(null);
    const orbitRef = useRef(null);
    const tagRef = useRef(null);
    const mounted = useRef(0);
    const left = useRef(false);
    const onLeftRef = useRef(onLeft);
    onLeftRef.current = onLeft;
    const journey = variant === 'journey';
    // The session's goodbye (SessionTransition): the night closes in around
    // `children` (the mascot waving) instead of the wordmark.
    const session = variant === 'session';

    /** Centres the plate and the hole on (cx, cy), at the scale that covers the frame. */
    const frameGhosts = (cx, cy) => {
        const root = rootRef.current;
        const { width, height } = root.getBoundingClientRect();
        const cover = coverScale({ width, height, cx, cy });
        const f = ghostFrame({ cx, cy, scale: cover });
        for (const el of [plateRef.current, holeRef.current]) {
            Object.assign(el.style, { left: `${f.left}px`, top: `${f.top}px`, width: `${f.width}px`, height: `${f.height}px`, transformOrigin: f.origin });
        }
        stageRef.current.style.transformOrigin = `${cx}px ${cy}px`;
        return cover;
    };

    /** The word's centre in the root's coordinates. */
    const wordCentre = () => {
        const r = rootRef.current.getBoundingClientRect();
        const w = wordRef.current.getBoundingClientRect();
        return { cx: w.left - r.left + w.width / 2, cy: w.top - r.top + w.height / 2, rect: w };
    };

    /** The journey's resting place for the name, measured fresh (after a resize too). */
    const settleDock = () => {
        const word = wordRef.current;
        const to = dockRef?.current?.getBoundingClientRect();
        if (!word || !to || to.width === 0) return null;
        word.getAnimations().forEach((a) => a.cancel());
        word.style.transform = 'none';
        const move = dockMove(word.getBoundingClientRect(), to);
        word.style.transform = `translate(${move.dx}px, ${move.dy}px) scale(${move.k})`;
        return move;
    };

    useLayoutEffect(() => {
        mounted.current = performance.now();
        const reduced = prefersReduced();
        const { cx, cy, rect } = wordCentre();
        frameGhosts(cx, cy);

        // `arrival`: the page before this one ended on the night (a session
        // leaving), so the scene starts at rest, already covering, and only
        // its exit plays.
        if (reduced || arrival) {
            holeRef.current.style.transform = 'scale(0)';
            if (journey) settleDock();
            if (!arrival) rootRef.current.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, delay, fill: 'backwards' });
            return undefined;
        }

        const at = (ms) => delay + ms;
        const play = (el, { keyframes, duration, easing = 'linear' }, start, extra = {}) => el?.animate(keyframes, { duration, easing, delay: at(start), fill: 'backwards', ...extra });

        play(holeRef.current, holeFrames(), INTRO.hole, { fill: 'both' });
        play(inkRef.current, wipeFrames(), INTRO.word, { fill: 'both' });
        play(landRef.current, landFrames(), INTRO.word);
        if (session) play(wordRef.current, riseFrames(24), 520);

        const corners = [...scatterRef.current.querySelectorAll('[data-corner]')];
        corners.forEach((el, i) => {
            const size = el.offsetWidth || 300;
            const sign = el.dataset.corner === 'a' ? -1 : 1;
            play(el.firstElementChild, slideFrames({ dx: sign * size * 0.62, dy: sign * size * 0.5, rot: sign * 22 }), INTRO.corners + i * 70);
        });
        scatterRef.current.querySelectorAll('[data-decor]').forEach((el, i) => {
            play(el, popFrames(i % 2 ? 70 : -80), INTRO.decor + Number(el.dataset.decor));
        });
        const tagDrop = Math.max(16, rect.height * 0.35);
        play(tagRef.current, riseFrames(tagDrop), INTRO.tag);

        const arcs = orbitRef.current ? [...orbitRef.current.querySelectorAll('ellipse')] : [];
        arcs.forEach((el, i) => play(el, orbitFrames(i ? 50 : 0), INTRO.orbit + i * 110, { iterations: journey ? 1 : Infinity, fill: 'both' }));

        let onResize;
        if (journey) {
            const to = dockRef?.current?.getBoundingClientRect();
            if (to && to.width > 0) {
                const move = dockMove(rect, to);
                play(wordRef.current, dockFrames(move), INTRO.dock, { fill: 'forwards' });
                tagRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, delay: at(INTRO.dock), fill: 'forwards' });
            }
            onResize = () => { settleDock(); };
            window.addEventListener('resize', onResize);
        }
        return () => { if (onResize) window.removeEventListener('resize', onResize); };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- the intro plays once, on mount
    }, []);

    useEffect(() => {
        if (!leaving || left.current) return undefined;
        left.current = true;
        const done = () => onLeftRef.current?.();
        const root = rootRef.current;
        // Asked to leave before it was ever seen: nothing to close.
        if (!root || performance.now() - mounted.current < delay) { done(); return undefined; }
        root.dataset.leaving = 'true';
        if (prefersReduced()) {
            const a = root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: 'forwards' });
            a.finished.then(done, done);
            return undefined;
        }
        const { cx, cy, rect } = wordCentre();
        const cover = frameGhosts(cx, cy);
        const fade = { duration: 140, easing: 'ease-in', fill: 'forwards' };
        scatterRef.current.animate([{ opacity: 1 }, { opacity: 0 }], fade);
        orbitRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], fade);
        if (tagRef.current) tagRef.current.animate([{ opacity: getComputedStyle(tagRef.current).opacity }, { opacity: 0 }], fade);
        const to = wrapScale({ wordWidth: rect.width || 192, wordHeight: rect.height || 96 }) / cover;
        const iris = irisFrames(to);
        plateRef.current.animate(iris.keyframes, { duration: iris.duration, easing: iris.easing, fill: 'forwards' });
        const shrink = shrinkFrames();
        const a = stageRef.current.animate(shrink.keyframes, { duration: shrink.duration, delay: INTRO.exitShrink, fill: 'forwards' });
        a.finished.then(done, done);
        return undefined;
        // eslint-disable-next-line react-hooks/exhaustive-deps -- leaving is one-way
    }, [leaving]);

    return (
        <div
            ref={rootRef}
            className={`brand-intro brand-intro--${variant}`}
            style={page ? { '--intro-page': page } : undefined}
        >
            <div className="bi-stage" ref={stageRef} aria-hidden="true">
                <div className="bi-plate" ref={plateRef}>
                    <svg viewBox={GHOST_VIEW} preserveAspectRatio="none" focusable="false"><path d={GHOST_PATH} /></svg>
                </div>
                <div className="bi-scatter" ref={scatterRef}>
                    <span className="bi-corner bi-corner--a" data-corner="a"><span className="bi-corner__in"><MascotIcon className="bi-ghost" /></span></span>
                    <span className="bi-corner bi-corner--b" data-corner="b"><span className="bi-corner__in"><MascotIcon className="bi-ghost" /></span></span>
                    {INTRO_DECOR.map((d, i) => (
                        <span
                            key={`${d.kind}-${i}`}
                            className={`bi-decor bi-tone--${d.tone}`}
                            style={{ '--x': `${d.x}%`, '--y': `${d.y}%`, '--size': `${d.size}rem`, '--i': i }}
                        >
                            <span className="bi-decor__pop" data-decor={d.delay}>
                                <span className="bi-decor__float"><Sticker kind={d.kind} /></span>
                            </span>
                        </span>
                    ))}
                </div>
                <div className="bi-hole" ref={holeRef}>
                    <svg viewBox={GHOST_VIEW} preserveAspectRatio="none" focusable="false"><path d={GHOST_PATH} /></svg>
                </div>
                <div className="bi-centre">
                    {session ? (
                        <div className="bi-word bi-word--session" ref={wordRef}>{children}</div>
                    ) : (
                    <div className="bi-word" ref={wordRef}>
                        <svg className="bi-orbit" ref={orbitRef} viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false">
                            <ellipse cx="50" cy="50" rx="47" ry="44" pathLength="100" transform="rotate(-8 50 50)" className="bi-orbit__a" />
                            <ellipse cx="50" cy="50" rx="49.5" ry="48" pathLength="100" transform="rotate(-8 50 50)" className="bi-orbit__b" />
                        </svg>
                        <div className="bi-word__land" ref={landRef}>
                            <div className="bi-word__ink" ref={inkRef}><BrandWordmark className="bi-wordmark" /></div>
                        </div>
                    </div>
                    )}
                    {tagline && <p className="bi-tag" ref={tagRef}>{tagline}</p>}
                </div>
            </div>
            {message && <p className="bi-message" aria-live="polite">{message}</p>}
        </div>
    );
}

export default BrandIntro;
