import { useLayoutEffect, useRef } from 'react';

import { FLARE_VARIANTS } from '../../../../utils/battleFlare';

/*
 * The anime flare — the battles' one vocabulary for an impact, in the style of
 * hand-drawn anime effects (Enzo's reference, 2026-10-20): a thin X glint that
 * snaps open, a four-point star and overlapping rings blooming out of it, a
 * diagonal blade, short rays and a stray dot, then gone in well under a
 * second. Neon line art: a white core over a wider stroke of the moment's
 * colour, so it glows without a filter (nothing here is blurred per frame).
 *
 * Drawn and timed for this app — the shapes are ours, only the style is
 * borrowed. Animated with the Web Animations API, transform and opacity only,
 * so it costs the route's stylesheet nothing; under reduced motion it is not
 * drawn at all (the moment still has its text and sound).
 *
 *   hit   a move connects                       glint, star, ring, rays
 *   crit  super effective, a critical hit       + second ring, blade, dot
 *   mega  Mega Evolution                        two passes, the second turned 45°
 *   win   the battle won                        two passes, large
 */

const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

/** Each part: its keyframes, when it starts and how long it lasts (fractions of the variant's duration). */
const PARTS = {
    glint: {
        at: 0, span: 0.72,
        frames: [
            { opacity: 0, transform: 'scale(0.2) rotate(-14deg)' },
            { opacity: 1, transform: 'scale(1) rotate(0deg)', offset: 0.25 },
            { opacity: 1, transform: 'scale(1.08) rotate(3deg)', offset: 0.55 },
            { opacity: 0, transform: 'scale(1.3) rotate(6deg)' },
        ],
    },
    star: {
        at: 0.12, span: 0.6,
        frames: [
            { opacity: 0, transform: 'scale(0) rotate(-24deg)' },
            { opacity: 1, transform: 'scale(1.1) rotate(0deg)', offset: 0.35 },
            { opacity: 0.9, transform: 'scale(0.85) rotate(8deg)', offset: 0.6 },
            { opacity: 0, transform: 'scale(0.4) rotate(22deg)' },
        ],
    },
    ring: {
        at: 0.08, span: 0.8,
        frames: [
            { opacity: 0, transform: 'scale(0.25)' },
            { opacity: 1, transform: 'scale(0.8)', offset: 0.3 },
            { opacity: 0, transform: 'scale(1.45)' },
        ],
    },
    ring2: {
        at: 0.2, span: 0.7,
        frames: [
            { opacity: 0, transform: 'scale(0.2)' },
            { opacity: 1, transform: 'scale(0.9)', offset: 0.35 },
            { opacity: 0, transform: 'scale(1.6)' },
        ],
    },
    blade: {
        at: 0.1, span: 0.7,
        frames: [
            { opacity: 0, transform: 'scale(0.1) rotate(-28deg)' },
            { opacity: 1, transform: 'scale(1.05) rotate(0deg)', offset: 0.3 },
            { opacity: 1, transform: 'scale(1) rotate(3deg)', offset: 0.6 },
            { opacity: 0, transform: 'scale(1.15) rotate(9deg)' },
        ],
    },
    rays: {
        at: 0.05, span: 0.6,
        frames: [
            { opacity: 0, transform: 'scale(0.5) rotate(0deg)' },
            { opacity: 1, transform: 'scale(1) rotate(10deg)', offset: 0.3 },
            { opacity: 0, transform: 'scale(1.5) rotate(26deg)' },
        ],
    },
    dot: {
        at: 0.25, span: 0.7,
        frames: [
            { opacity: 0, transform: 'translate(0px, 0px) scale(0.5)' },
            { opacity: 1, transform: 'translate(-4px, 4px) scale(1)', offset: 0.3 },
            { opacity: 0, transform: 'translate(-14px, 14px) scale(0.6)' },
        ],
    },
};


// Static styles on the parts: scale and turn about their own centre.
const PART_STYLE = { transformBox: 'fill-box', transformOrigin: 'center' };

// Colours go in `style`, not in attributes: a presentation attribute can't
// read a custom property (`--flare-core`, set by the stylesheet that uses this).
const CORE = 'var(--flare-core)';
const line = (color) => ({ stroke: color, fill: 'none' });
// A filled shape's core: the same shape, shrunk about its own centre.
const coreFill = { stroke: 'none', fill: CORE, transform: 'scale(0.82)', transformBox: 'fill-box', transformOrigin: 'center' };

/** A shape twice: a wide soft stroke (and fill) in `color`, a thin white core over it. */
function Neon({ color, children, fill = false }) {
    return (
        <>
            <g style={fill ? { stroke: color, fill: color } : line(color)} strokeWidth={6} opacity={0.42} strokeLinecap="round" strokeLinejoin="round">{children}</g>
            <g style={fill ? coreFill : line(CORE)} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">{children}</g>
        </>
    );
}

const SHAPES = {
    glint: (a) => (
        <Neon color={a}>
            <line x1={-30} y1={-22} x2={30} y2={22} />
            <line x1={-24} y1={26} x2={24} y2={-26} />
        </Neon>
    ),
    star: (a, b) => (
        <Neon color={b} fill>
            <path d="M0 -34 Q3 -3 34 0 Q3 3 0 34 Q-3 3 -34 0 Q-3 -3 0 -34Z" />
        </Neon>
    ),
    ring: (a) => <Neon color={a}><circle r={26} /></Neon>,
    ring2: (a, b) => <Neon color={b}><circle cx={7} cy={-5} r={16} /></Neon>,
    blade: (a) => (
        <Neon color={a} fill>
            <path d="M-40 34 L20 -26 L38 -40 L28 -20 Z" />
        </Neon>
    ),
    rays: (a, b) => (
        <Neon color={b}>
            {[0, 60, 120, 180, 240, 300].map((deg) => (
                <line key={deg} x1={0} y1={-32} x2={0} y2={-44} transform={`rotate(${deg + 15})`} />
            ))}
        </Neon>
    ),
    dot: (a) => <Neon color={a} fill><circle cx={-26} cy={26} r={3.4} /></Neon>,
};

/**
 * @param {object} props
 * @param {'hit'|'crit'|'mega'|'win'} props.variant
 * @param {string} props.colorA   the main colour (a move's type)
 * @param {string} props.colorB   the accent
 * @param {string} [props.className]  positions and sizes the drawing (its CSS)
 * @param {object} [props.style]
 * @param {number} [props.delay]   ms before it starts (hidden until then)
 * @param {boolean} [props.reducedMotion]
 */
export function DsFlare({ variant = 'hit', colorA, colorB, className = '', style, delay = 0, reducedMotion = false }) {
    const ref = useRef(null);
    const spec = FLARE_VARIANTS[variant] || FLARE_VARIANTS.hit;

    useLayoutEffect(() => {
        const root = ref.current;
        if (!root || reducedMotion || typeof root.animate !== 'function') return undefined;
        const animations = [...root.querySelectorAll('[data-flare]')].map((el) => {
            const part = PARTS[el.dataset.flare];
            const pass = Number(el.dataset.pass || 0);
            // `both`: every part's first keyframe is its hidden state, so the
            // backwards fill keeps it out of sight until it starts.
            return el.animate(part.frames, {
                duration: part.span * spec.duration,
                delay: delay + (pass * 0.42 + part.at) * spec.duration,
                easing: EASE,
                fill: 'both',
            });
        });
        return () => animations.forEach((animation) => animation.cancel());
    }, [spec, delay, reducedMotion]);

    if (reducedMotion) return null;
    const passes = Array.from({ length: spec.passes }, (_, pass) => pass);
    return (
        <svg
            ref={ref}
            className={`ds-flare-art ${className}`.trim()}
            viewBox="-50 -50 100 100"
            style={style}
            aria-hidden="true"
            focusable="false"
        >
            {passes.map((pass) => (
                // The second pass turns and swaps the colours: a second bloom, not a repeat.
                <g key={pass} transform={pass ? 'rotate(45)' : undefined}>
                    {spec.parts.map((name) => (
                        <g key={name} data-flare={name} data-pass={pass} style={PART_STYLE} opacity={0}>
                            {pass ? SHAPES[name](colorB, colorA) : SHAPES[name](colorA, colorB)}
                        </g>
                    ))}
                </g>
            ))}
        </svg>
    );
}
