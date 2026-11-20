/**
 * Bot state machine, motion math and orbiting celebration/working ribbons.
 *
 * Ports the state/effects layer from upstream open-bot-avatar (`motion.ts`,
 * `effects.ts`, `animator.ts`, `mood.ts`) without modifying the read-only
 * vendored engine (`src/vendor/open-bot-avatar/*`).
 *
 * Supported states: `idle`, `thinking`, `working`, `done`.
 * Strictly excludes `blocked` and `waiting` (no `dots` or `bang` morphs).
 */
import {
    BASE_YAW,
    BASE_PITCH,
    LOOK_YAW,
    LOOK_PITCH,
    LOOK_EYES,
    blinkAt,
    wanderAt,
    noise,
} from '../../../vendor/open-bot-avatar/motion.js';
import { REST, followGaze, followStep } from '../../../vendor/open-bot-avatar/follow.js';
import { moodProgress } from '../../../vendor/open-bot-avatar/mood.js';

export const BOT_STATES = ['idle', 'thinking', 'working', 'done'];
export const BOT_MOODS = ['neutral', 'happy'];

/** Duration of the active ribbon celebration sweep inside each done cycle (s). */
export const DONE_TURN_S = 3.87;
/** Total period between repeated celebration bursts in `done` state (s). */
export const DONE_CYCLE_S = 6.2;

const DONE_SWEEPS = 9;
const CELEBRATION_END_S = 3.79;

const WORK_CYCLE_S = 5.4;
const WORK_TURN_S = 2.4;

const HOOPS = 3;
const LANES = 3;
const HOOP_TILT = 0.386;
const HOOP_ROLL = 0.157;
const LADDER = 38;
const ARC = [2.2, 3.4];
const BRUSH = 1.7 * 1.98;
const SAMPLES = 20;
const RIM_BINS = 72;

const TAU = Math.PI * 2;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const smooth = (u) => {
    const x = clamp(u, 0, 1);
    return x * x * (3 - 2 * x);
};
const near = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const f2 = (n) => {
    const r = Math.round(n * 100) / 100;
    return (Object.is(r, -0) ? 0 : r).toString();
};

export function isBotState(v) {
    return typeof v === 'string' && BOT_STATES.includes(v);
}

export function resolveBotLook({ state, mood, motion } = {}) {
    const resolvedState = isBotState(state)
        ? state
        : motion === 'thinking'
            ? 'thinking'
            : 'idle';
    const resolvedMood = mood === 'happy' || motion === 'happy' ? 'happy' : 'neutral';
    return { state: resolvedState, mood: resolvedMood };
}

/** Smooth S-curve celebration sweep: 0 -> DONE_SWEEPS * 2π over CELEBRATION_END_S. */
function celebration(since) {
    const u = clamp(since / CELEBRATION_END_S, 0, 1);
    const e = u < 0.5 ? 4 * u * u * u : 1 - ((-2 * u + 2) ** 3) / 2;
    return e * DONE_SWEEPS * TAU;
}

/** Focused downward eye darts while working. */
function dartAt(seed, t) {
    const SLOT = 0.68;
    const s = Math.floor(t / SLOT);
    const target = (k) => [
        (noise(seed, 2001 + k * 3) * 2 - 1) * 0.55,
        0.35 + noise(seed, 2002 + k * 3) * 0.3,
    ];
    const a = target(s - 1);
    const b = target(s);
    const e = smooth((t - s * SLOT) / 0.11);
    return [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e];
}

/** Periodic single-hoop critically damped spring sweep while working. */
function workTurn(seed, t) {
    const jitter = 0.85 + noise(seed, 37) * 0.3;
    const period = WORK_CYCLE_S * jitter;
    const cycle = Math.floor(t / period);
    const since = t - cycle * period;
    if (since >= WORK_TURN_S) return { ribbons: 0, sweep: 0 };
    const k = 6.5;
    const s = clamp(since / WORK_TURN_S, 0, 1);
    const norm = 1 - (1 + k) * Math.exp(-k);
    const spring = (1 - (1 + k * s) * Math.exp(-k * s)) / norm;
    const way = cycle % 2 ? -1 : 1;
    const ribbons = clamp(since / 0.14, 0, 1) * clamp((WORK_TURN_S - since) / 0.45, 0, 1);
    return { ribbons, sweep: way * spring * TAU * 2 };
}

function applyRest(pose, { seed, t, sway, wave, reducedMotion, scale = 1 }) {
    pose.yaw += 0.07 * scale * sway * wave(6.1);
    pose.pitch += 0.04 * scale * sway * wave(4.7, 1);
    pose.roll = 1.6 * scale * wave(5.3, 2);
    pose.lift = reducedMotion ? 0 : -0.45 * scale * (1 - Math.cos((TAU * t) / 3.4));
    const breath = wave(3.4, -Math.PI / 2);
    pose.sy = 1 + 0.012 * scale * breath;
    pose.sx = 1 - 0.008 * scale * breath;
    if (!reducedMotion) {
        pose.blink = blinkAt(seed, t);
        [pose.gazeX, pose.gazeY] = wanderAt(seed, t);
    }
}

/**
 * Blend two bot poses smoothly. Keeps `sweep` and `cage` pinned to whichever
 * side has active ribbons so ribbons never unwind while fading in or out.
 */
export function blendBotPoses(a, b, t) {
    const k = clamp(t, 0, 1);
    const mix = (x, y) => x + (y - x) * k;
    let sweep = 0;
    let cage = 0;
    if (a.ribbons > 0 && b.ribbons > 0) {
        sweep = mix(a.sweep, b.sweep);
        cage = mix(a.cage, b.cage);
    } else if (b.ribbons > 0) {
        sweep = b.sweep;
        cage = b.cage;
    } else if (a.ribbons > 0) {
        sweep = a.sweep;
        cage = a.cage;
    }
    const pose = {
        yaw: mix(a.yaw, b.yaw),
        pitch: mix(a.pitch, b.pitch),
        roll: mix(a.roll, b.roll),
        lift: mix(a.lift, b.lift),
        sx: mix(a.sx, b.sx),
        sy: mix(a.sy, b.sy),
        gazeX: mix(a.gazeX, b.gazeX),
        gazeY: mix(a.gazeY, b.gazeY),
        blink: mix(a.blink, b.blink),
        squintL: mix(a.squintL, b.squintL),
        squintR: mix(a.squintR, b.squintR),
        eyeShape: b.eyeShape,
        ribbons: mix(a.ribbons, b.ribbons),
        cage,
        sweep,
    };
    if (a.eyeShape !== b.eyeShape) {
        pose.eyeShape = k < 0.5 ? a.eyeShape : b.eyeShape;
        pose.blink = Math.max(pose.blink, 1 - Math.abs(2 * k - 1));
    }
    return pose;
}

function singleBotPose({ seed, time = 0, state, mood, motion, stateAge, gaze, reducedMotion = false, view }) {
    const look = resolveBotLook({ state, mood, motion });
    const t = reducedMotion ? 0 : time + noise(seed, 7) * 10;
    const wave = (period, phase = 0) => (reducedMotion ? 0 : Math.sin((TAU * t) / period + phase));
    const given = gaze && Number.isFinite(gaze.x) && Number.isFinite(gaze.y)
        ? [clamp(gaze.x, -1, 1), clamp(gaze.y, -1, 1)]
        : null;
    const weight = given ? (Number.isFinite(gaze?.weight) ? clamp(gaze.weight, 0, 1) : 1) : 0;
    const sway = 1 - 0.7 * weight;

    const pose = {
        yaw: BASE_YAW,
        pitch: BASE_PITCH,
        roll: 0,
        lift: 0,
        sx: 1,
        sy: 1,
        gazeX: 0,
        gazeY: 0,
        blink: 0,
        squintL: 0,
        squintR: 0,
        eyeShape: 'pill',
        ribbons: 0,
        cage: 0,
        sweep: 0,
    };

    if (look.state === 'done') {
        applyRest(pose, { seed, t, sway, wave, reducedMotion, scale: 1.25 });
        if (look.mood === 'happy') pose.eyeShape = 'happy';
        if (!reducedMotion) {
            const age = Number.isFinite(stateAge) && stateAge >= 0 ? stateAge : Math.max(0, time);
            const jitter = 0.85 + noise(seed, 41) * 0.3;
            const period = DONE_CYCLE_S * jitter;
            const cycle = Math.floor(age / period);
            const since = age - cycle * period;
            if (since < DONE_TURN_S) {
                const swell = Math.sin((Math.PI * since) / DONE_TURN_S);
                const way = cycle % 2 ? -1 : 1;
                const c = celebration(since);
                const sweep = c * way;
                pose.yaw += near(sweep / 3);
                pose.lift -= 2.2 * swell;
                pose.sy += 0.04 * swell;
                pose.ribbons = clamp(since / 0.1, 0, 1) * clamp((DONE_TURN_S - since) / 0.5, 0, 1);
                pose.cage = 1;
                pose.sweep = way * Math.max(0, c);
            }
        }
    } else if (look.state === 'working') {
        pose.yaw += 0.08 * sway * wave(2.4);
        pose.pitch += 0.05 + 0.03 * sway * wave(1.4, 0.5);
        pose.roll = 2.2 * wave(1.4);
        pose.lift = reducedMotion ? 0 : -0.45 * (1 - Math.cos((TAU * t) / 0.7));
        const bob = wave(0.7, -Math.PI / 2);
        pose.sy = 1 + 0.018 * bob;
        pose.sx = 1 - 0.012 * bob;
        pose.squintL = 0.15;
        pose.squintR = 0.15;
        if (!reducedMotion) {
            pose.blink = blinkAt(seed, t * 1.15);
            [pose.gazeX, pose.gazeY] = dartAt(seed, t);
            const age = Number.isFinite(stateAge) && stateAge >= 0 ? stateAge : Math.max(0, time);
            const wt = workTurn(seed, age);
            pose.ribbons = wt.ribbons;
            pose.cage = 0;
            pose.sweep = wt.sweep;
        }
    } else if (look.state === 'thinking') {
        pose.yaw += 0.12 + 0.05 * sway * wave(7.3);
        pose.pitch += 0.08;
        pose.roll = -5 + 1.4 * wave(4.1);
        pose.lift = -0.5 * (1 - Math.cos((TAU * t) / 5.2)) * (reducedMotion ? 0 : 1);
        pose.gazeX = 0.55 + 0.3 * wave(5.6);
        pose.gazeY = -0.8;
        pose.squintL = 0.22;
        pose.squintR = 0.32 + 0.1 * wave(3.1);
        if (!reducedMotion) pose.blink = blinkAt(seed, t * 0.7);
    } else if (look.mood === 'happy') {
        const period = 0.92;
        const p = reducedMotion ? 0.5 : (((t % period) + period) % period) / period;
        const air = 4 * p * (1 - p);
        const land = reducedMotion ? 0 : clamp(1 - Math.min(p, 1 - p) / 0.12, 0, 1);
        pose.lift = reducedMotion ? 0 : -3.2 * air;
        pose.sy = 1 - 0.09 * land + 0.03 * air * (reducedMotion ? 0 : 1);
        pose.sx = 1 + 0.07 * land - 0.015 * air * (reducedMotion ? 0 : 1);
        pose.roll = 4.5 * wave(period * 2);
        pose.yaw += 0.1 * wave(period * 2, 0.6);
        pose.eyeShape = 'happy';
    } else {
        applyRest(pose, { seed, t, sway, wave, reducedMotion, scale: 1 });
    }

    if (given && weight > 0) {
        const mix = (a, b) => a + (b - a) * weight;
        const share = reducedMotion ? 1 : LOOK_EYES;
        if (pose.eyeShape === 'pill') {
            pose.gazeX = mix(pose.gazeX, given[0] * share);
            pose.gazeY = mix(pose.gazeY, given[1] * share);
        }
        if (!reducedMotion) {
            pose.yaw += weight * (given[0] * LOOK_YAW - BASE_YAW);
            pose.pitch += weight * (-given[1] * LOOK_PITCH - BASE_PITCH / 2);
        }
    }

    if (view && Number.isFinite(view.yaw) && Number.isFinite(view.pitch)) {
        pose.yaw += view.yaw;
        pose.pitch += view.pitch;
    }

    return pose;
}

export function computeBotPose(input) {
    const pose = singleBotPose(input);
    const blend = input.blend;
    if (!blend || !(blend.t < 1)) return pose;
    const from = typeof blend.from === 'string' ? { motion: blend.from } : blend.from;
    const fromPose = computeBotPose({
        ...input,
        state: from.state,
        mood: from.mood,
        motion: from.motion,
        stateAge: from.age ?? input.stateAge,
        blend: from.blend,
    });
    return blendBotPoses(fromPose, pose, Number.isFinite(blend.t) ? blend.t : 1);
}

/** Freeze an active state/mood blend chain, pruning negligible tail links. */
function settleState(shown, share = 1, depth = 0) {
    const b = shown.blend;
    if (!b) return { state: shown.state, mood: shown.mood, age: shown.age };
    const rest = share * (1 - b.t);
    if (rest < 0.02 || depth >= 3) {
        return { state: shown.state, mood: shown.mood, age: shown.age };
    }
    return {
        state: shown.state,
        mood: shown.mood,
        age: shown.age,
        blend: {
            from: typeof b.from === 'string' ? b.from : settleState(b.from, rest, depth + 1),
            t: b.t,
        },
    };
}

/**
 * Per-bot live animator: eases pointer gaze (`followStep`), blends transitions
 * between `{ state, mood }`, and tracks `stateAge` so `done` starts its 3.87s
 * celebration burst immediately on mount or `stateKey` increment.
 */
export function createBotAnimator() {
    let follow = REST;
    let last = null;
    let shown = null;

    return {
        step({ now, state, mood, motion, target, hold = false, reducedMotion = false, stateKey } = {}) {
            const dt = last === null ? 0 : (now - last) / 1000;
            last = now;
            let moving = false;
            if (!hold) {
                ({ state: follow, moving } = followStep(follow, target, dt, reducedMotion));
            }
            const next = resolveBotLook({ state, mood, motion });
            const keyChanged = shown !== null && stateKey !== shown.stateKey && (next.state === 'done' || next.state === 'working');

            if (shown && (next.state !== shown.state || next.mood !== shown.mood || keyChanged)) {
                const currentAge = Math.max(0, (now - shown.began) / 1000);
                const current = {
                    state: shown.state,
                    mood: shown.mood,
                    age: currentAge,
                    blend: shown.blend && { from: shown.blend.from, t: moodProgress(now - shown.since) },
                };
                const restartClock = next.state !== shown.state || keyChanged;
                shown = {
                    state: next.state,
                    mood: next.mood,
                    blend: reducedMotion ? undefined : { from: settleState(current), t: 0 },
                    since: now,
                    began: restartClock ? now : shown.began,
                    stateKey,
                };
            }

            if (!shown) {
                shown = {
                    state: next.state,
                    mood: next.mood,
                    blend: undefined,
                    since: now,
                    began: now,
                    stateKey,
                };
            }

            const t = reducedMotion ? 1 : moodProgress(now - shown.since);
            let motionBlend;
            if (shown.blend && t < 1) {
                motionBlend = { from: shown.blend.from, t };
            } else {
                shown.blend = undefined;
            }

            const stateAge = Math.max(0, (now - shown.began) / 1000);
            return {
                gaze: followGaze(follow),
                motionBlend,
                stateAge,
                moving: moving || motionBlend !== undefined,
            };
        },
        reset() {
            follow = REST;
            last = null;
            shown = null;
        },
    };
}

/* ---------- Orbiting ribbon geometry ---------- */

/** Radial distance from `(cx, cy)` to the outermost polygon edge at RIM_BINS angles. */
export function rimOf(outlines, cx, cy) {
    const bins = new Float64Array(RIM_BINS);
    if (!Array.isArray(outlines) || !outlines.length) return bins;
    let sum = 0;
    let count = 0;

    for (let b = 0; b < RIM_BINS; b++) {
        const theta = (b * TAU) / RIM_BINS;
        const dx = Math.cos(theta);
        const dy = Math.sin(theta);
        let best = 0;
        for (const poly of outlines) {
            if (!poly || poly.length < 2) continue;
            for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
                const ax = poly[j][0];
                const ay = poly[j][1];
                const bx = poly[i][0];
                const by = poly[i][1];
                const ex = bx - ax;
                const ey = by - ay;
                const denom = dx * ey - dy * ex;
                if (Math.abs(denom) < 1e-9) continue;
                const fx = ax - cx;
                const fy = ay - cy;
                const u = (fx * ey - fy * ex) / denom;
                const v = (fx * dy - fy * dx) / denom;
                if (u >= 0 && v >= -1e-6 && v <= 1 + 1e-6 && u > best) {
                    best = u;
                }
            }
        }
        bins[b] = best;
        if (best > 0) {
            sum += best;
            count += 1;
        }
    }

    const fallback = count > 0 ? sum / count : 36;
    for (let b = 0; b < RIM_BINS; b++) {
        if (!(bins[b] > 0)) bins[b] = fallback;
    }
    return bins;
}

/** Precompute padded radial rims for `working` (tighter) and `done` (celebration cage). */
export function ribbonRims(polys, bounds) {
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cy = (bounds.minY + bounds.maxY) / 2;
    const base = rimOf(polys, cx, cy);
    const work = new Float64Array(base.length);
    const cage = new Float64Array(base.length);
    for (let i = 0; i < base.length; i++) {
        work[i] = base[i] + 4.5;
        cage[i] = base[i] + 6.5;
    }
    return { work, cage };
}

function rimAt(rim, angle, fallback) {
    if (!rim || !rim.length) return fallback;
    const norm = ((angle % TAU) + TAU) % TAU;
    const pos = (norm / TAU) * rim.length;
    const i0 = Math.floor(pos) % rim.length;
    const i1 = (i0 + 1) % rim.length;
    const frac = pos - Math.floor(pos);
    return rim[i0] + (rim[i1] - rim[i0]) * frac;
}

/** Build a filled, tapered SVG ribbon path with rounded caps from a 2D polyline. */
function strokeRibbonPath(pts) {
    if (pts.length < 2) return '';
    const left = [];
    const right = [];
    let lastTx = 1;
    let lastTy = 0;

    for (let i = 0; i < pts.length; i++) {
        const prev = pts[Math.max(0, i - 1)];
        const next = pts[Math.min(pts.length - 1, i + 1)];
        const dx = next.x - prev.x;
        const dy = next.y - prev.y;
        const len = Math.hypot(dx, dy);
        let tx = lastTx;
        let ty = lastTy;
        if (len > 1e-6) {
            tx = dx / len;
            ty = dy / len;
            lastTx = tx;
            lastTy = ty;
        }
        const nx = -ty;
        const ny = tx;
        const w = pts[i].w;
        left.push([pts[i].x + nx * w, pts[i].y + ny * w]);
        right.push([pts[i].x - nx * w, pts[i].y - ny * w]);
    }

    const first = pts[0];
    const last = pts[pts.length - 1];
    // Start and end tangent for smooth rounded caps
    const d0x = pts[1].x - first.x;
    const d0y = pts[1].y - first.y;
    const l0 = Math.hypot(d0x, d0y) || 1;
    const sTx = d0x / l0;
    const sTy = d0y / l0;

    const d1x = last.x - pts[pts.length - 2].x;
    const d1y = last.y - pts[pts.length - 2].y;
    const l1 = Math.hypot(d1x, d1y) || 1;
    const eTx = d1x / l1;
    const eTy = d1y / l1;

    let d = `M${f2(left[0][0])} ${f2(left[0][1])}`;
    for (let i = 1; i < left.length; i++) {
        d += `L${f2(left[i][0])} ${f2(left[i][1])}`;
    }
    // Rounded cap at end
    d += `Q${f2(last.x + eTx * last.w)} ${f2(last.y + eTy * last.w)} ${f2(right[right.length - 1][0])} ${f2(right[right.length - 1][1])}`;
    for (let i = right.length - 2; i >= 0; i--) {
        d += `L${f2(right[i][0])} ${f2(right[i][1])}`;
    }
    // Rounded cap at start
    d += `Q${f2(first.x - sTx * first.w)} ${f2(first.y - sTy * first.w)} ${f2(left[0][0])} ${f2(left[0][1])}Z`;
    return d;
}

/**
 * Compute front/back orbiting ribbon SVG paths around `bounds`.
 * Returns `{ d, front, ribbon, hoop, lane }[]`.
 */
export function ribbonPieces(bounds, presence, seed, time, sweep, cage, rim) {
    if (!Number.isFinite(presence) || presence <= 0.001) return [];
    const p = clamp(presence, 0, 1);
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cy = (bounds.minY + bounds.maxY) / 2;
    const baseR = Math.max((bounds.maxX - bounds.minX) / 2, (bounds.maxY - bounds.minY) / 2) + 5.5;
    const activeHoops = cage >= 0.5 ? HOOPS : 1;
    const out = [];

    for (let hoop = 0; hoop < activeHoops; hoop++) {
        const tilt = hoop === 0 ? HOOP_TILT : HOOP_TILT + 0.52;
        const roll = HOOP_ROLL + (hoop * TAU) / HOOPS;
        const cosT = Math.cos(tilt);
        const sinT = Math.sin(tilt);
        const cosR = Math.cos(roll);
        const sinR = Math.sin(roll);
        const dir = hoop % 2 ? -1 : 1;

        for (let lane = 0; lane < LANES; lane++) {
            const ribbon = hoop * LANES + lane;
            const arcSpan = (ARC[0] + noise(seed, 200 + ribbon) * (ARC[1] - ARC[0])) * p;
            if (arcSpan <= 0.05) continue;
            const phase0 = noise(seed, 300 + ribbon) * TAU + (lane * TAU) / LANES;
            const speedMul = 0.85 + noise(seed, 400 + ribbon) * 0.3;
            const a0 = phase0 + sweep * speedMul * dir + time * (0.55 + lane * 0.14) * dir;
            const laneOffset = (lane - 1) * (BRUSH * 0.9);
            const halfW = BRUSH * (0.42 - lane * 0.05) * (0.65 + 0.35 * p);

            // One constant radius per hoop (celebration cage stays perfectly round & smooth).
            const hoopR = rim && rim.length
                ? (cage >= 0.5 ? Math.max(...rim) : rimAt(rim, roll, baseR))
                : baseR;
            const rad = hoopR + laneOffset;
            const steps = 32;

            // Sample 3D ring points and split cleanly where z crosses 0 (back vs front).
            const samples = [];
            for (let i = 0; i <= steps; i++) {
                const u = i / steps;
                const theta = a0 + u * arcSpan;
                const x0 = Math.cos(theta);
                const z0 = Math.sin(theta);
                const y1 = -z0 * sinT;
                const z1 = z0 * cosT;
                const x2 = x0 * cosR - y1 * sinR;
                const y2 = x0 * sinR + y1 * cosR;
                const persp = 1 + (z1 * 4.5) / LADDER;
                const taper = Math.max(0.18, Math.sin(Math.PI * u) ** 0.45);
                samples.push({
                    x: cx + x2 * rad * persp,
                    y: cy + y2 * rad * persp,
                    z: z1,
                    w: halfW * taper * persp,
                });
            }

            // Partition into contiguous front (z >= 0) and back (z < 0) segments.
            let seg = [samples[0]];
            let front = samples[0].z >= 0;

            const flush = () => {
                if (seg.length >= 2) {
                    const d = strokeRibbonPath(seg);
                    if (d) out.push({ d, front, ribbon, hoop, lane });
                }
            };

            for (let i = 1; i < samples.length; i++) {
                const prev = samples[i - 1];
                const curr = samples[i];
                const currFront = curr.z >= 0;
                if (currFront === front) {
                    seg.push(curr);
                } else {
                    const dz = curr.z - prev.z;
                    const frac = Math.abs(dz) > 1e-9 ? clamp(-prev.z / dz, 0, 1) : 0.5;
                    const mid = {
                        x: prev.x + (curr.x - prev.x) * frac,
                        y: prev.y + (curr.y - prev.y) * frac,
                        z: 0,
                        w: prev.w + (curr.w - prev.w) * frac,
                    };
                    seg.push(mid);
                    flush();
                    front = currFront;
                    seg = [mid, curr];
                }
            }
            flush();
        }
    }

    return out;
}
