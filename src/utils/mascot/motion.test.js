import { describe, it, expect } from 'vitest';
import { SEQ, evalSeq, keyFrame, merge, E, kf } from './motion.js';
import { mascotInner } from './rig.js';

const finite = (pose) => Object.entries(pose).every(([k, v]) => typeof v !== 'number' || Number.isFinite(v) || k === 't');

describe('springs', () => {
    it('start at 0 and settle on 1, overshooting like the CSS tokens', () => {
        for (const name of ['pop', 'glide']) {
            expect(E[name](0)).toBe(0);
            expect(E[name](1)).toBe(1);
            const peak = Math.max(...Array.from({ length: 101 }, (_, i) => E[name](i / 100)));
            expect(peak).toBeGreaterThan(1);
        }
        // --ease-pop overshoots ~23%, --ease-glide ~3.8%
        const peakPop = Math.max(...Array.from({ length: 401 }, (_, i) => E.pop(i / 400)));
        expect(peakPop).toBeGreaterThan(1.15);
        expect(peakPop).toBeLessThan(1.3);
    });

    it('kf interpolates and holds the ends', () => {
        expect(kf(-5, [[0, 1], [100, 3]])).toBe(1);
        expect(kf(50, [[0, 1], [100, 3, 'lin']])).toBe(2);
        expect(kf(500, [[0, 1], [100, 3]])).toBe(3);
    });
});

describe('sequences', () => {
    it('produce finite poses that draw cleanly at every step', () => {
        for (const [name, s] of Object.entries(SEQ)) {
            for (let t = 0; t <= s.dur; t += Math.max(10, Math.round(s.dur / 40))) {
                const pose = merge({}, evalSeq(name, t));
                expect(finite(pose), `${name} @ ${t}`).toBe(true);
                expect(mascotInner(pose), `${name} @ ${t}`).not.toMatch(/NaN|undefined/);
            }
        }
    });

    it('end one-shots at rest: no squash, no offset', () => {
        for (const [name, s] of Object.entries(SEQ)) {
            if (s.kind === 'loop') continue;
            const end = merge({}, evalSeq(name, s.dur));
            expect(end.sx, `${name} sx`).toBeCloseTo(1, 2);
            expect(end.sy, `${name} sy`).toBeCloseTo(1, 2);
            expect(end.y, `${name} y`).toBeCloseTo(0, 0);
            expect(end.opacity, `${name} opacity`).toBeCloseTo(1, 2);
        }
    });

    it('keep the frequent answers under 600 ms and every response short', () => {
        for (const [name, s] of Object.entries(SEQ)) if (s.kind === 'response') expect(s.dur, name).toBeLessThanOrEqual(1100);
        for (const name of ['blink', 'hop', 'cover', 'ear']) expect(SEQ[name].dur).toBeLessThanOrEqual(600);
    });

    it('has a key frame for reduced motion', () => {
        for (const name of Object.keys(SEQ)) expect(finite(merge({}, keyFrame(name))), name).toBe(true);
    });
});

describe('merge', () => {
    it('adds offsets, multiplies scales, overrides shapes, stacks effects', () => {
        const p = merge({ x: 10, sy: 1, eyes: 'happy', fx: ['zzz'] }, { x: 5, sy: 0.5, eyes: 'x', fx: ['hearts'] }, { tiltSet: 3 });
        expect(p.x).toBe(15); expect(p.sy).toBe(0.5); expect(p.eyes).toBe('x');
        expect(p.fx).toEqual(['zzz', 'hearts']); expect(p.tilt).toBe(3);
    });
});
