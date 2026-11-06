/**
 * The mascot's motion (2026-11-06): every sequence is a pure function of time,
 * `pose(t) → partial pose`, so the same code drives the component, the
 * GIF/video export and the tests (`motion.test.js` checks each one ends at
 * rest and never produces NaN).
 *
 * Layers compose like a Pokémon's status: one main state at a time (asleep,
 * covering its eyes) and volatile effects on top (a blink, a hop, hearts).
 * `merge(base, ...layers)`: the base is a pose, every later layer adds to it —
 * offsets add, scales multiply, shapes override, effects stack; `tiltSet` is
 * absolute.
 *
 * Curves: `E.pop` and `E.glide` are the design system's springs (index.css
 * `--ease-pop` ζ 0.42 / `--ease-glide` ζ 0.72), simulated with the same
 * constants, so a mascot settles exactly like a toggle or a favourite does.
 */
import { DEFAULT_POSE } from './rig.js';

/* ---------- curves ---------- */
function springFn(z, settle) {
    const w = 4 / (z * settle), k = w * w, c = 2 * z * w, dt = 1 / 1000, h = [];
    let x = 0, v = 0, t = 0, last = 0;
    while (t < 3) {
        v += (-k * (x - 1) - c * v) * dt; x += v * dt; t += dt; h.push(x);
        if (Math.abs(x - 1) > 0.004 || Math.abs(v) > 0.05) last = t;
    }
    const n = Math.ceil(last * 1000);
    return (p) => (p >= 1 ? 1 : p <= 0 ? 0 : h[Math.min(h.length - 1, Math.round(p * n))]);
}
export const E = {
    lin: (t) => t,
    inOut: (t) => 0.5 - 0.5 * Math.cos(Math.PI * t),
    out: (t) => 1 - (1 - t) ** 3,
    in: (t) => t ** 3,
    pop: springFn(0.42, 0.5),
    glide: springFn(0.72, 0.36),
};

/** Keyframes `[[ms, value, ease?], …]`; the ease shapes the segment arriving at that key. */
export function kf(t, keys) {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i += 1) {
        if (t <= keys[i][0]) {
            const [t0, v0] = keys[i - 1], [t1, v1, e] = keys[i];
            if (typeof v1 !== 'number') return t - t0 < t1 - t0 ? v0 : v1;
            const p = (t - t0) / (t1 - t0);
            return v0 + (v1 - v0) * (E[e] || E.inOut)(p);
        }
    }
    return keys[keys.length - 1][1];
}
export const step = (t, keys) => { let v = keys[0][1]; for (const [k, val] of keys) if (t >= k) v = val; return v; };
export const osc = (t, period, amp, phase = 0) => Math.sin((t / period) * Math.PI * 2 + phase) * amp;
/** Squash that keeps the volume: sx = 1 / √sy. */
export const vol = (sy) => ({ sy, sx: 1 / Math.sqrt(sy) });

/* ---------- composition ---------- */
const ADD = new Set(['x', 'y', 'rot', 'tilt', 'faceX', 'faceY', 'earL', 'earR', 'crest', 'pawA', 'pawX', 'pawY', 'propA', 'propY', 'propX']);
const MUL = new Set(['sx', 'sy', 'eyeSY', 'sparkS', 'sparkO', 'opacity', 'blushO', 'scale']);
export function merge(base, ...layers) {
    const out = { ...DEFAULT_POSE, ...(base || {}) };
    out.fx = [...(out.fx || [])];
    out.fxHead = [...(out.fxHead || [])];
    for (const L of layers) {
        if (!L) continue;
        for (const [k, v] of Object.entries(L)) {
            if (k === 'tiltSet') out.tilt = v;
            else if (ADD.has(k)) out[k] = (out[k] || 0) + v;
            else if (MUL.has(k)) out[k] = (out[k] ?? 1) * v;
            else if (k === 'fx' || k === 'fxHead') out[k] = out[k].concat(v);
            else out[k] = v;
        }
    }
    return out;
}

/* ---------- sequences ---------- */
/**
 * `kind`: 'response' ≤ 600 ms answers an act (click, save, error);
 * 'moment' is the peak of a flow (one per screen); 'loop' repeats.
 */
export const SEQ = {
    idle: { dur: 3200, kind: 'loop', pose: (t) => ({ ...vol(1 + osc(t, 3200, 0.018, -Math.PI / 2)), y: osc(t, 3200, 5), sparkS: 1 + osc(t, 3200, 0.035, 0.9) }) },
    blink: { dur: 220, kind: 'response', pose: (t) => ({ eyeSY: kf(t, [[0, 1], [70, 0.12, 'in'], [110, 0.12], [220, 1, 'out']]) }) },
    float: { dur: 2400, kind: 'loop', pose: (t) => ({ y: osc(t, 2400, 14) - 8, rot: osc(t, 2400, 1.6, 0.6), tilt: osc(t, 4800, 2) }) },
    ear: { dur: 460, kind: 'response', pose: (t) => ({ earR: kf(t, [[0, 0], [90, -16, 'out'], [190, 7], [280, -5], [460, 0, 'out']]) }) },
    sparks: { dur: 640, kind: 'response', pose: (t) => ({ sparkS: kf(t, [[0, 1], [110, 0.55, 'in'], [330, 1.28, 'out'], [640, 1, 'pop']]), sparks: step(t, [[0, 'default'], [120, 'triple'], [520, 'default']]) }) },
    hop: {
        dur: 560, kind: 'response', pose: (t) => ({
            ...vol(kf(t, [[0, 1], [80, 0.86, 'out'], [210, 1.07, 'out'], [360, 0.96, 'inOut'], [560, 1, 'pop']])),
            y: kf(t, [[0, 0], [80, 0], [230, -54, 'out'], [380, 0, 'in'], [560, 0]]), sparkS: kf(t, [[0, 1], [230, 1.2, 'out'], [560, 1, 'pop']]),
        }),
    },
    jump: {
        dur: 1000, kind: 'moment', pose: (t) => ({
            ...vol(kf(t, [[0, 1], [140, 0.82, 'out'], [180, 0.82], [300, 1.12, 'out'], [480, 1.02], [620, 1.06, 'in'], [700, 0.84, 'out'], [1000, 1, 'pop']])),
            y: kf(t, [[0, 0], [180, 0], [440, -150, 'out'], [520, -150], [700, 0, 'in'], [1000, 0]]),
            eyes: step(t, [[0, 'happy'], [180, 'excited'], [700, 'happy']]), mouth: step(t, [[0, 'grin'], [180, 'big'], [760, 'grin']]),
            earL: kf(t, [[0, 0], [300, -10, 'out'], [700, 8, 'in'], [1000, 0, 'pop']]), earR: kf(t, [[0, 0], [300, -10, 'out'], [700, 8, 'in'], [1000, 0, 'pop']]),
            sparkS: kf(t, [[0, 1], [180, 0.7], [440, 1.25, 'out'], [1000, 1, 'pop']]), fx: t > 640 && t < 900 ? ['motion'] : [],
        }),
    },
    celebrate: {
        dur: 1800, kind: 'moment', pose: (t) => ({
            ...vol(kf(t, [[0, 1], [120, 0.84, 'out'], [260, 1.1, 'out'], [520, 1.03], [640, 0.88, 'in'], [900, 1, 'pop'], [1800, 1]])),
            y: kf(t, [[0, 0], [120, 0], [380, -120, 'out'], [460, -120], [640, 0, 'in'], [1800, 0]]),
            paws: 'up', pawA: kf(t, [[0, 40], [380, -30, 'out'], [640, 10, 'in'], [900, 0, 'pop'], [1800, 0]]) + (t > 900 ? osc(t, 600, 10) * (1 - (t - 900) / 900) : 0),
            eyes: step(t, [[0, 'excited'], [900, 'happy']]), mouth: 'big', sparks: 'triple', sparkS: kf(t, [[0, 0.6], [380, 1.3, 'out'], [900, 1, 'pop'], [1800, 1]]),
            fx: [['confetti']], t,
        }),
    },
    oops: {
        dur: 1100, kind: 'response', pose: (t) => ({
            rot: t < 620 ? Math.sin(t / 45) * 7 * (1 - t / 620) : 0, x: t < 620 ? Math.sin(t / 45) * 10 * (1 - t / 620) : 0,
            eyes: step(t, [[0, 'wide'], [120, 'x'], [700, 'moon']]), mouth: step(t, [[0, 'o'], [120, 'wavy']]),
            earL: kf(t, [[0, 0], [160, 18, 'out'], [1100, 14]]), earR: kf(t, [[0, 0], [160, 18, 'out'], [1100, 14]]),
            sparks: 'none', fxHead: [['sweat', Math.min(1, t / 200)]], ...vol(kf(t, [[0, 1], [90, 0.9, 'out'], [300, 1, 'pop'], [1100, 1]])),
        }),
    },
    think: { dur: 2400, kind: 'loop', pose: (t) => ({ paws: 'chin', eyes: 'calm', mouth: 'flat', tilt: -12 + osc(t, 2400, 4), faceX: -10 + osc(t, 2400, 6), fx: ['dots'], t, sparks: 'small' }) },
    sleep: { dur: 2600, kind: 'loop', pose: (t) => ({ eyes: 'sleepy', mouth: t % 2600 < 1300 ? 'smallO' : 'tiny', sparks: 'none', ...vol(1 + osc(t, 2600, 0.03, -Math.PI / 2)), tiltSet: 22 + osc(t, 2600, 2.5), earL: 10, earR: 10, fx: ['zzz'], t, y: 26 }) },
    wake: {
        dur: 900, kind: 'response', pose: (t) => ({
            eyes: step(t, [[0, 'sleepy'], [80, 'wide'], [620, 'open'], [780, 'happy']]), mouth: step(t, [[0, 'smallO'], [80, 'o'], [620, 'grin']]),
            y: kf(t, [[0, 26], [80, 26], [200, -90, 'out'], [420, 0, 'in'], [900, 0]]), ...vol(kf(t, [[0, 1], [80, 0.86], [200, 1.12, 'out'], [420, 0.9, 'in'], [900, 1, 'pop']])),
            tiltSet: kf(t, [[0, 22], [200, 0, 'out'], [900, 8, 'glide']]), earL: kf(t, [[0, 10], [200, -18, 'out'], [900, 0, 'pop']]), earR: kf(t, [[0, 10], [200, -18, 'out'], [900, 0, 'pop']]),
            crest: kf(t, [[0, 0], [200, 1.2, 'out'], [900, 0, 'pop']]), sparks: step(t, [[0, 'none'], [180, 'triple'], [700, 'default']]), sparkS: kf(t, [[0, 0.4], [300, 1.3, 'out'], [900, 1, 'pop']]),
            fx: t > 160 && t < 700 ? ['exclaim'] : [],
        }),
    },
    vanish: {
        dur: 2000, kind: 'moment', pose: (t) => ({
            ...vol(kf(t, [[0, 1], [140, 0.84, 'out'], [420, 1.5, 'in'], [1300, 1.5], [1500, 0.9, 'out'], [1800, 1, 'pop'], [2000, 1]])),
            y: kf(t, [[0, 0], [140, 0], [420, -90, 'in'], [1300, -40], [1500, 0, 'out'], [2000, 0]]),
            opacity: kf(t, [[0, 1], [160, 1], [420, 0, 'in'], [1300, 0], [1500, 1, 'out'], [2000, 1]]),
            eyes: step(t, [[0, 'happy'], [120, 'calm'], [1400, 'happy']]), paws: t < 420 ? 'wave' : 'none', pawA: osc(t, 300, 16),
        }),
    },
    evolve: {
        dur: 3000, kind: 'moment', pose: (t) => {
            // the games' evolution: the white silhouette pulses faster and faster, then the reveal
            const flips = [0, 420, 760, 1040, 1260, 1430, 1560, 1660, 1740, 1800, 1850];
            let on = 0;
            for (let i = 0; i < flips.length; i += 1) if (t >= flips[i]) on = i % 2 === 0 ? 1 : 0;
            if (t >= 1850 && t < 2150) on = 1;
            const sil = t < 2150 ? on : kf(t, [[2150, 1], [2450, 0, 'out']]);
            const done = t > 2150;
            return {
                silhouette: sil, ...vol(kf(t, [[0, 1], [1850, 1.06, 'in'], [2150, 1.1], [2300, 0.9, 'out'], [2600, 1, 'pop'], [3000, 1]])),
                y: kf(t, [[0, 0], [1850, -16, 'in'], [2300, 0, 'out'], [3000, 0]]),
                eyes: done ? 'starGold' : 'calm', mouth: done ? 'big' : 'smile', sparks: done ? 'triple' : 'default',
                fx: done ? ['shine', ['sparkles', true]] : [], t, ...(done ? { hat: 'crown' } : {}),
            };
        },
    },
    capture: {
        dur: 2800, kind: 'loop', pose: (t) => {
            // three wobbles with pauses, the rhythm of a throw; then the click
            const w = (a, b) => (t > a && t < b ? Math.sin(((t - a) / (b - a)) * Math.PI * 2) * 16 : 0);
            const ball = w(200, 600) + w(1000, 1400) + w(1800, 2200);
            const caught = t > 2300;
            return { prop: 'bigball', propA: ball, paws: 'edge', pawY: -150, pawX: ball * 1.4, y: 30, eyes: caught ? 'happy' : 'open', mouth: caught ? 'big' : 'smallO', tilt: ball * 0.25, faceX: ball * 0.4, sparks: caught ? 'triple' : 'none', fx: caught ? [['sparkles', true]] : [], t };
        },
    },
    wave: { dur: 1400, kind: 'loop', pose: (t) => ({ paws: 'wave', pawA: osc(t, 700, 16), tilt: 2 + osc(t, 1400, 2) }) },
    pet: { dur: 1800, kind: 'moment', pose: (t) => ({ eyes: 'calm', mouth: 'cat', blush: 'strong', tilt: osc(t, 900, 7), ...vol(1 - Math.abs(osc(t, 900, 0.04))), fx: ['hearts'], t, earL: 6 + osc(t, 900, 6), earR: 6 - osc(t, 900, 6) }) },
    charge: {
        dur: 1600, kind: 'moment', pose: (t) => {
            const c = Math.min(1, t / 1000), fire = t > 1100;
            return {
                paws: 'charge', prop: 'orb', propS: fire ? kf(t, [[1100, 1.5], [1300, 0.6, 'in']]) : 0.2 + c * 1.3, propG: 0.5 + 0.5 * Math.sin(t / 60),
                propY: fire ? kf(t, [[1100, 0], [1300, -300, 'in']]) : 0, propX: fire ? kf(t, [[1100, 0], [1300, 420, 'in']]) : 0,
                eyes: 'determined', mouth: 'grit', crest: fire ? kf(t, [[1100, 1], [1600, 0, 'pop']]) : c,
                x: fire ? kf(t, [[1100, 0], [1250, -24, 'out'], [1600, 0, 'pop']]) : Math.sin(t / 30) * 2 * c, sparks: 'triple', sparkS: 1 + 0.2 * c,
                ...(t > 1300 ? { prop: 'none' } : {}),
            };
        },
    },
    spin: { dur: 900, kind: 'response', pose: (t) => ({ rot: kf(t, [[0, 0], [120, -12, 'out'], [620, 372, 'inOut'], [900, 360, 'pop']]), ...vol(kf(t, [[0, 1], [120, 0.86, 'out'], [380, 1.08], [620, 0.92], [900, 1, 'pop']])), y: kf(t, [[0, 0], [120, 0], [380, -80, 'out'], [620, 0, 'in'], [900, 0]]), eyes: t < 700 ? 'excited' : 'happy', mouth: 'big', sparks: 'triple' }) },
    cover: { dur: 520, kind: 'response', pose: (t) => ({ paws: 'cover', pawY: kf(t, [[0, 260], [520, 0, 'glide']]), pawO: kf(t, [[0, 0], [160, 1]]), mouth: 'smile', blush: 'strong' }) },
    angry: { dur: 800, kind: 'loop', pose: (t) => ({ eyes: 'angry', mouth: 'grit', crest: 1.2, earL: -18, earR: -18, rot: Math.sin(t / 25) * 1.5, fx: ['steam'], t, fxHead: ['anger'], sparks: 'none' }) },
    shiny: { dur: 1400, kind: 'moment', pose: (t) => ({ tone: 'shiny', fx: [['sparkles', true]], t, ...vol(kf(t, [[0, 1], [100, 0.9, 'out'], [400, 1, 'pop'], [1400, 1]])), eyes: t < 900 ? 'starGold' : 'happy', mouth: 'big', sparks: 'triple' }) },
    nod: { dur: 700, kind: 'response', pose: (t) => ({ tilt: kf(t, [[0, 0], [160, 10, 'out'], [320, -4], [480, 6], [700, 0, 'out']]), y: kf(t, [[0, 0], [160, 8, 'out'], [320, -2], [700, 0]]) }) },
    shake: { dur: 700, kind: 'response', pose: (t) => ({ rot: Math.sin(t / 40) * 6 * Math.max(0, 1 - t / 700), x: Math.sin(t / 40) * 12 * Math.max(0, 1 - t / 700), eyes: 'flat', mouth: 'flat' }) },
    typing: { dur: 400, kind: 'loop', pose: (t) => ({ pawA: osc(t, 400, 9) }) },
};

/** A sequence's partial pose at `t` ms (loops wrap, one-shots hold their last frame). */
export function evalSeq(name, t) {
    const s = SEQ[name];
    if (!s) return {};
    const tt = s.kind === 'loop' ? ((t % s.dur) + s.dur) % s.dur : Math.min(Math.max(0, t), s.dur);
    return s.pose(tt);
}

/** The frame that stands for a sequence when motion is reduced. */
export function keyFrame(name) {
    const s = SEQ[name];
    if (!s) return {};
    const at = { celebrate: 1400, evolve: 2700, capture: 2500, vanish: 0, charge: 900, oops: 900, wake: 880, jump: 1000 }[name];
    return s.pose(at ?? Math.round(s.dur * 0.5));
}
