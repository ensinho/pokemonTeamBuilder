/** Resting view: turned a little and seen a little from above, so the volume reads without dominating. */
export const BASE_YAW = -0.3;
export const BASE_PITCH = 0.2;
/**
 * Following a look target: the body turns toward it by up to these angles
 * (radians, at full deflection) and the eyes use this share of their small
 * range, so the whole character looks rather than the eyes sliding alone.
 */
export const LOOK_YAW = 0.32;
export const LOOK_PITCH = 0.18;
export const LOOK_EYES = 0.7;
const TAU = Math.PI * 2;
export function hashString(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}
/** Stateless hash noise in [0, 1). */
export function noise(seed, n) {
    let h = (seed ^ Math.imul(n | 0, 0x9e3779b1)) >>> 0;
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
}
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const smooth = (u) => { const x = clamp(u, 0, 1); return x * x * (3 - 2 * x); };
/** Blink closure 0..1: one blink per ~4.2 s slot at a seeded offset, sometimes a double blink. */
export function blinkAt(seed, t) {
    const SLOT = 4.2, DUR = 0.19;
    const slot = Math.floor(t / SLOT);
    let closure = 0;
    for (const s of [slot - 1, slot]) {
        const start = s * SLOT + 0.5 + noise(seed, s * 2) * 2.9;
        const starts = noise(seed, s * 2 + 1) > 0.8 ? [start, start + 0.34] : [start];
        for (const b of starts) {
            const u = (t - b) / DUR;
            if (u > 0 && u < 1)
                closure = Math.max(closure, Math.sin(Math.PI * u));
        }
    }
    return closure;
}
/** Idle eye wander: short holds between quick saccades, centered more often than not. */
export function wanderAt(seed, t) {
    const SLOT = 1.9;
    const s = Math.floor(t / SLOT);
    const target = (k) => {
        if (noise(seed, 1000 + k * 3) < 0.4)
            return [0, 0];
        return [(noise(seed, 1001 + k * 3) * 2 - 1) * 0.6, (noise(seed, 1002 + k * 3) * 2 - 1) * 0.35];
    };
    const a = target(s - 1), b = target(s);
    const e = smooth((t - s * SLOT) / 0.16);
    return [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e];
}
/**
 * Pose part way from `a` to `b`, both taken at the same moment so either
 * side's motion keeps running. A change of eye shape swaps halfway, inside a
 * blink: pills close toward the swap and open after it.
 */
export function blendPoses(a, b, t) {
    const k = clamp(t, 0, 1);
    const mix = (x, y) => x + (y - x) * k;
    const pose = {
        yaw: mix(a.yaw, b.yaw), pitch: mix(a.pitch, b.pitch), roll: mix(a.roll, b.roll), lift: mix(a.lift, b.lift),
        sx: mix(a.sx, b.sx), sy: mix(a.sy, b.sy), gazeX: mix(a.gazeX, b.gazeX), gazeY: mix(a.gazeY, b.gazeY),
        blink: mix(a.blink, b.blink), squintL: mix(a.squintL, b.squintL), squintR: mix(a.squintR, b.squintR),
        eyeShape: b.eyeShape,
    };
    if (a.eyeShape !== b.eyeShape) {
        pose.eyeShape = k < 0.5 ? a.eyeShape : b.eyeShape;
        pose.blink = Math.max(pose.blink, 1 - Math.abs(2 * k - 1));
    }
    return pose;
}
export function computePose(input) {
    const pose = moodPose(input);
    const blend = input.blend;
    if (!blend || !(blend.t < 1))
        return pose;
    const from = typeof blend.from === 'string' ? { motion: blend.from } : blend.from;
    return blendPoses(computePose({ ...input, motion: from.motion, blend: from.blend }), pose, Number.isFinite(blend.t) ? blend.t : 1);
}
function moodPose({ seed, time, motion, gaze, reducedMotion, view }) {
    // Per-avatar phase offset so several avatars on a page do not move in lockstep.
    const t = reducedMotion ? 0 : time + noise(seed, 7) * 10;
    const wave = (period, phase = 0) => (reducedMotion ? 0 : Math.sin((TAU * t) / period + phase));
    const given = gaze && Number.isFinite(gaze.x) && Number.isFinite(gaze.y)
        ? [clamp(gaze.x, -1, 1), clamp(gaze.y, -1, 1)]
        : null;
    const weight = given ? (Number.isFinite(gaze?.weight) ? clamp(gaze?.weight, 0, 1) : 1) : 0;
    // While it attends to a target the body holds its aim: idle sway of the turn settles to a trace.
    const sway = 1 - 0.7 * weight;
    const pose = {
        yaw: BASE_YAW, pitch: BASE_PITCH, roll: 0, lift: 0, sx: 1, sy: 1,
        gazeX: 0, gazeY: 0, blink: 0, squintL: 0, squintR: 0, eyeShape: 'pill',
    };
    if (motion === 'happy') {
        const period = 0.92;
        const p = reducedMotion ? 0.5 : ((t % period) + period) % period / period;
        const air = 4 * p * (1 - p);
        const land = reducedMotion ? 0 : clamp(1 - Math.min(p, 1 - p) / 0.12, 0, 1);
        pose.lift = reducedMotion ? 0 : -3.2 * air;
        pose.sy = 1 - 0.09 * land + 0.03 * air * (reducedMotion ? 0 : 1);
        pose.sx = 1 + 0.07 * land - 0.015 * air * (reducedMotion ? 0 : 1);
        pose.roll = 4.5 * wave(period * 2);
        pose.yaw += 0.1 * wave(period * 2, 0.6);
        pose.eyeShape = 'happy';
    }
    else if (motion === 'thinking') {
        pose.yaw += 0.12 + 0.05 * sway * wave(7.3);
        pose.pitch += 0.08;
        pose.roll = -5 + 1.4 * wave(4.1);
        pose.lift = -0.5 * (1 - Math.cos((TAU * t) / 5.2)) * (reducedMotion ? 0 : 1);
        pose.gazeX = 0.55 + 0.3 * wave(5.6);
        pose.gazeY = -0.8;
        pose.squintL = 0.22;
        pose.squintR = 0.32 + 0.1 * wave(3.1);
        if (!reducedMotion)
            pose.blink = blinkAt(seed, t * 0.7);
    }
    else {
        pose.yaw += 0.07 * sway * wave(6.1);
        pose.pitch += 0.04 * sway * wave(4.7, 1);
        pose.roll = 1.6 * wave(5.3, 2);
        pose.lift = reducedMotion ? 0 : -0.45 * (1 - Math.cos((TAU * t) / 3.4));
        const breath = wave(3.4, -Math.PI / 2);
        pose.sy = 1 + 0.012 * breath;
        pose.sx = 1 - 0.008 * breath;
        if (!reducedMotion) {
            pose.blink = blinkAt(seed, t);
            [pose.gazeX, pose.gazeY] = wanderAt(seed, t);
        }
    }
    if (given && weight > 0) {
        // A look target wins over idle wander. The body turns to face it: the resting
        // three-quarter turn gives way (so a target on either side turns the front that
        // way) and the eyes add a modest share on top. Reduced motion keeps the body
        // still, so the eyes alone use their full (still small) range.
        const mix = (a, b) => a + (b - a) * weight;
        const share = reducedMotion ? 1 : LOOK_EYES;
        if (pose.eyeShape === 'pill') {
            pose.gazeX = mix(pose.gazeX, given[0] * share);
            pose.gazeY = mix(pose.gazeY, given[1] * share);
        }
        if (!reducedMotion) {
            // Positive yaw turns the front to the right, positive pitch tips it up.
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
