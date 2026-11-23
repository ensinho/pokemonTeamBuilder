/**
 * The brand intro (2026-11-22, Enzo: "Ta tudo fenomenal"): the wordmark painted
 * on by a brush stroke, the night closing in around it through the mascot's own
 * silhouette, the corner ghosts and the stickers arriving, one orbit while the
 * app loads, and the exit through the same silhouette into the app. It opens
 * the boot splash and the Primeira Jornada's hello screen
 * (docs/modules/brand_intro.md).
 *
 * Studied from a reference loop frame by frame (60 fps, 2.43 s) and rebuilt in
 * the brand's material: springs instead of fixed curves, squash and stretch,
 * nothing starting together, an orbit as the only motion at rest.
 *
 * Pure on purpose. Every piece is a function of time, sampled here into Web
 * Animations keyframes: the browser plays them on the compositor while the
 * app's chunks parse, so no JavaScript runs per frame and the motion stays
 * smooth on a busy main thread. Only transform, opacity, clip-path and the
 * orbit's dashes are animated.
 */

/** The mascot's outline (utils/mascot/rig.js `headPath()`; a test keeps them equal). */
export const GHOST_PATH = 'M-281.5 -249.5C-249.6 -238.3 -214.7 -228.6 -185.7 -216C-156.7 -203.4 -133.6 -188 -107.5 -174L-4.7 -282.5L14.8 -206.2C25.8 -214.8 37.5 -225.2 47.8 -232C58.1 -238.8 66.9 -242 76.5 -247L94.5 -166C122.7 -180.7 148.2 -196.7 179 -210C209.8 -223.3 245.8 -234 279.2 -246C275.5 -212.5 275.3 -178.2 268 -145.5C260.8 -112.8 246.5 -81.7 235.7 -49.8C244.9 -31.4 257.7 -22.2 263.2 5.5C268.7 33.2 280.6 78.6 268.5 116.2C256.4 153.8 235.8 202.2 190.8 231C145.8 259.8 62.6 288.2 -1.3 289C-65.2 289.8 -147 264.5 -192.7 235.8C-238.4 207.1 -262.8 154.6 -275.7 117C-288.6 79.4 -275.4 37.8 -270 10.5C-264.6 -16.7 -252.3 -27.5 -243.5 -46.5C-253.1 -77.7 -265.9 -106.2 -272.2 -140C-278.5 -173.8 -278.4 -213 -281.5 -249.5Z';

/** The rig's sparkle and heart (utils/mascot/rig.js `STAR`, `HEART`; tested), for the stickers. */
export const STAR_PATH = 'M0 -40C6 -10 10 -6 40 0C10 6 6 10 0 40C-6 10 -10 6 -40 0C-10 -6 -6 -10 0 -40Z';
export const HEART_PATH = 'M0 34C-44 8-40-28-17-29C-7-29 0-22 0-13C0-22 7-29 17-29C40-28 44 8 0 34Z';

/** The outline's box in rig units, and the point the iris closes on. */
export const GHOST_BOX = Object.freeze({ x: -283, y: -284, w: 564, h: 576 });
export const GHOST_CENTER = Object.freeze({ x: 0, y: 20 });
/** The largest circle around GHOST_CENTER that stays inside the outline (rig units; tested). */
export const GHOST_INNER_RADIUS = 205;

/** When each piece starts and how long it runs, in ms from the intro's start. */
export const INTRO = Object.freeze({
    word: 40,          // the brush stroke starts painting the wordmark
    wipe: 560,
    hole: 110,         // the night closes in from the edges
    holeRun: 760,
    corners: 150,      // the two corner ghosts slide in
    decor: 280,        // the stickers pop, each on its own delay
    tag: 700,          // the tagline lands last
    orbit: 820,        // the orbit: draws on, goes round, erases
    orbitRun: 1150,
    orbitEvery: 2300,
    dock: 1450,        // the journey: the name moves up into its place
    rise: 1600,        // the journey: the mascot rises behind it
    exit: 440,         // the exit, all of it
    exitIris: 270,     // the ground closes onto the name
    exitShrink: 190,   // then everything shrinks into a point
});

/** The name is readable: the brush has painted 94% of it. A seen splash stays at least this long. */
export const INTRO_LEGIBLE_MS = 450;
/** Every piece has landed. The first intro on a device plays to here. */
export const INTRO_FULL_MS = 1150;

/** The stickers, in % of the frame (x, y), rem (size), the tone and their delay after INTRO.decor. */
export const INTRO_DECOR = Object.freeze([
    { kind: 'star', x: 83, y: 14, size: 2.25, tone: 'white', delay: 0 },
    { kind: 'ring', x: 70, y: 9, size: 0.875, tone: 'live', delay: 70 },
    { kind: 'ball', x: 91, y: 33, size: 1.375, tone: 'ball', delay: 130 },
    { kind: 'cross', x: 87, y: 62, size: 1, tone: 'white', delay: 60 },
    { kind: 'heart', x: 17, y: 79, size: 1.75, tone: 'live', delay: 30 },
    { kind: 'star', x: 8, y: 60, size: 1.5, tone: 'live', delay: 100 },
    { kind: 'ring', x: 30, y: 92, size: 0.75, tone: 'volt', delay: 160 },
    { kind: 'diamond', x: 12, y: 31, size: 0.75, tone: 'white', delay: 120 },
    { kind: 'cross', x: 34, y: 14, size: 0.625, tone: 'volt', delay: 210 },
]);

/* ---------------------------------------------------------------- motion */

export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const round = (n, d = 4) => {
    const r = Math.round(n * 10 ** d) / 10 ** d;
    return Object.is(r, -0) ? 0 : r;
};
const inCubic = (x) => x * x * x;
const outCubic = (x) => 1 - (1 - x) ** 3;
/** Ease-in with a wind-up: it grows a little before it shrinks (anticipation). */
export const inBack = (x) => { const c = 1.9; return (c + 1) * x * x * x - c * x * x; };

/**
 * A damped spring from 0 to 1 at `u` ms.
 * @param {number} u time in ms
 * @param {number} f natural frequency in Hz
 * @param {number} z damping ratio (< 1 overshoots)
 */
export function spring(u, f, z) {
    if (u <= 0) return 0;
    const t = u / 1000;
    const w = 2 * Math.PI * f;
    const wd = w * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t));
}

/** The spring's velocity in 1/s (central difference). */
export function springVelocity(u, f, z) {
    const h = 4;
    return ((spring(u + h, f, z) - spring(u - h, f, z)) / (2 * h)) * 1000;
}

/** The spring inside a sampled piece: exactly at rest on its last frame. */
const at = (t, duration, { f, z }) => (t >= duration ? 1 : spring(t, f, z));
const velocityAt = (t, duration, { f, z }) => (t >= duration ? 0 : springVelocity(t, f, z));

/** How long until the spring stays within `tol` of 1 (ms, rounded up to 10). */
export function settleMs(f, z, tol = 0.003) {
    let last = 0;
    for (let u = 0; u <= 4000; u += 4) {
        if (Math.abs(1 - spring(u, f, z)) > tol) last = u;
    }
    return Math.ceil((last + 4) / 10) * 10;
}

/**
 * Samples `pose(t)` into keyframes with offsets, ~60 per second, so the browser
 * plays the curve as drawn (linear between samples).
 * @returns {{ keyframes: object[], duration: number }}
 */
export function sample(duration, pose, fps = 60) {
    const n = Math.max(2, Math.ceil((duration / 1000) * fps));
    const keyframes = [];
    for (let i = 0; i <= n; i += 1) {
        keyframes.push({ ...pose((duration * i) / n), offset: round(i / n) });
    }
    return { keyframes, duration };
}

/* ------------------------------------------------------------- the pieces */

const LAND = { f: 2.4, z: 0.42 };
/** The wordmark lands: it grows into place from 82%, stretching as it rises and squashing as the spring turns. */
export function landFrames() {
    const duration = settleMs(LAND.f, LAND.z);
    return sample(duration, (t) => {
        const s = at(t, duration, LAND);
        const v = clamp(velocityAt(t, duration, LAND) / 12, -1, 1);
        const k = 0.82 + 0.18 * s;
        return { transform: `rotate(${round((1 - s) * -6, 3)}deg) scale(${round(k * (1 - 0.06 * v))}, ${round(k * (1 + 0.1 * v))})` };
    });
}

/** The brush stroke: a slanted edge sweeps left to right and the wordmark is painted behind it. */
export function wipeFrames() {
    const edge = (lead) => `polygon(-20% -40%, ${round(lead + 8, 2)}% -40%, ${round(lead - 8, 2)}% 140%, -20% 140%)`;
    return {
        keyframes: [{ clipPath: edge(-8) }, { clipPath: edge(108) }],
        duration: INTRO.wipe,
        easing: 'cubic-bezier(0.33, 1, 0.68, 1)',
    };
}

const POP = { f: 3, z: 0.4 };
/** A sticker pops: from nothing past its size and back, turning as it goes. */
export function popFrames(spin = -80) {
    const duration = settleMs(POP.f, POP.z);
    return sample(duration, (t) => {
        const s = at(t, duration, POP);
        return { transform: `rotate(${round(spin * (1 - at(t, duration, { f: 2.2, z: 0.5 })), 2)}deg) scale(${round(Math.max(s, 0))})` };
    });
}

const SLIDE = { f: 1.9, z: 0.62 };
/** A corner ghost slides in from outside the frame, turning into its tilt. */
export function slideFrames({ dx, dy, rot = 24 }) {
    const duration = settleMs(SLIDE.f, SLIDE.z);
    return sample(duration, (t) => {
        const r = 1 - at(t, duration, SLIDE);
        return { transform: `translate(${round(dx * r, 2)}px, ${round(dy * r, 2)}px) rotate(${round(rot * r, 2)}deg)` };
    });
}

/** The hole the night closes through: the page-coloured ghost shrinks from covering everything to nothing. */
export function holeFrames() {
    return sample(INTRO.holeRun, (t) => ({ transform: `scale(${round((1 - t / INTRO.holeRun) ** 2.1)})` }));
}

const RISE = { f: 2.6, z: 0.55 };
/** Rises from `dy` px below into place: the tagline. */
export function riseFrames(dy) {
    const duration = settleMs(RISE.f, RISE.z);
    return sample(duration, (t) => {
        const s = at(t, duration, RISE);
        return { transform: `translateY(${round(dy * (1 - s), 2)}px) scale(${round(0.7 + 0.3 * s)})`, opacity: round(clamp01(s * 1.4)) };
    });
}

const CLIMB = { f: 2, z: 0.5 };
/** The journey's mascot climbs up from `dy` px below, leaning as it comes. */
export function climbFrames(dy) {
    const duration = settleMs(CLIMB.f, CLIMB.z);
    return sample(duration, (t) => {
        const r = 1 - at(t, duration, CLIMB);
        return { transform: `translateY(${round(dy * r, 2)}px) rotate(${round(10 * r, 2)}deg)` };
    });
}

const DOCK = { f: 1.8, z: 0.78 };
/** The journey: the name glides from the middle into its place at the top. */
export function dockFrames({ dx, dy, k }) {
    const duration = settleMs(DOCK.f, DOCK.z);
    return sample(duration, (t) => {
        const s = at(t, duration, DOCK);
        return { transform: `translate(${round(dx * s, 2)}px, ${round(dy * s, 2)}px) scale(${round(1 + (k - 1) * s)})` };
    });
}

/**
 * The orbit, one cycle of `INTRO.orbitEvery` ms: an arc draws on, goes round
 * and erases, then rests. Drawn on a path with `pathLength="100"`; the dash is
 * hidden while it is shorter than its own round caps.
 * @param {number} start where on the ellipse it starts, 0–100
 */
export function orbitFrames(start = 0) {
    const sweep = 83; // of 100: 300° round the ellipse
    return sample(INTRO.orbitEvery, (t) => {
        const p = clamp01(t / INTRO.orbitRun);
        const head = sweep * outCubic(p);
        const tail = sweep * inCubic(p);
        const len = Math.max(0, head - tail);
        return {
            strokeDasharray: `${round(len, 3)} 200`,
            strokeDashoffset: round(-(start + tail), 3),
            opacity: len > 0.6 && p < 1 ? 1 : 0,
        };
    }, 50);
}

/** The exit's first beat: the ground closes onto the name (a scale of the covering plate). */
export function irisFrames(to) {
    return {
        keyframes: [{ transform: 'scale(1)' }, { transform: `scale(${round(to)})` }],
        duration: INTRO.exitIris,
        easing: 'cubic-bezier(0.65, 0, 0.35, 1)',
    };
}

/** The exit's second beat: everything winds up, then shrinks into a point. */
export function shrinkFrames() {
    const duration = INTRO.exit - INTRO.exitShrink;
    return sample(duration, (t) => ({ transform: `scale(${round(Math.max(0, 1 - inBack(t / duration)))})` }));
}

/* ------------------------------------------------------------ the geometry */

/**
 * The scale at which the ghost, centred on (cx, cy), covers a width × height
 * frame: its inner circle reaches the farthest corner.
 */
export function coverScale({ width, height, cx, cy }) {
    const far = Math.max(
        Math.hypot(cx, cy),
        Math.hypot(width - cx, cy),
        Math.hypot(cx, height - cy),
        Math.hypot(width - cx, height - cy),
    );
    return (far / GHOST_INNER_RADIUS) * 1.04;
}

/** The scale at which the ghost wraps a word of this size (the exit's first beat ends here). */
export function wrapScale({ wordWidth, wordHeight }) {
    return Math.max((wordWidth * 1.1) / GHOST_BOX.w, (wordHeight * 2.2) / GHOST_BOX.h);
}

/**
 * Where the plate and the hole sit: a GHOST_BOX scaled by `scale`, placed so
 * GHOST_CENTER lands on (cx, cy). Returned as CSS px for left/top/size and the
 * transform origin.
 */
export function ghostFrame({ cx, cy, scale }) {
    const ox = (GHOST_CENTER.x - GHOST_BOX.x) * scale;
    const oy = (GHOST_CENTER.y - GHOST_BOX.y) * scale;
    return {
        left: round(cx - ox, 2),
        top: round(cy - oy, 2),
        width: round(GHOST_BOX.w * scale, 2),
        height: round(GHOST_BOX.h * scale, 2),
        origin: `${round(ox, 2)}px ${round(oy, 2)}px`,
    };
}

/**
 * The journey's dock: how far the word moves and how much it shrinks to sit
 * in `to` (both DOMRect-like, viewport px).
 */
export function dockMove(from, to) {
    const k = from.width > 0 ? to.width / from.width : 1;
    return {
        dx: round(to.left + to.width / 2 - (from.left + from.width / 2), 2),
        dy: round(to.top + to.height / 2 - (from.top + from.height / 2), 2),
        k: round(k),
    };
}
