import { describe, it, expect } from 'vitest';
import { headPath, mascotInner, mascotSvg, sanitizePose, toneColor, EYES, MOUTHS, PAWS, PROPS, HATS, FX, SPARKS, TONES, DEFAULT_POSE } from './rig.js';
import { MOODS, POSES, resolvePose } from './catalog.js';
import { TONES as BOOT_TONES } from './constants.js';

const clean = (s) => !/NaN|undefined|Infinity|\[object/.test(s);

describe('headPath', () => {
    it('is the traced outline, unchanged', () => {
        // The fit against LogoCuteGengarRounded.png. If this moves on purpose,
        // regenerate the icon (scripts/build-mascot-icon.mjs) in the same commit.
        const d = headPath();
        expect(d.startsWith('M-281.5 -249.5C')).toBe(true);
        expect(d.endsWith('Z')).toBe(true);
        expect(d.length).toBe(headPath({}).length);
        expect(d).toMatchInlineSnapshot(`"M-281.5 -249.5C-249.6 -238.3 -214.7 -228.6 -185.7 -216C-156.7 -203.4 -133.6 -188 -107.5 -174L-4.7 -282.5L14.8 -206.2C25.8 -214.8 37.5 -225.2 47.8 -232C58.1 -238.8 66.9 -242 76.5 -247L94.5 -166C122.7 -180.7 148.2 -196.7 179 -210C209.8 -223.3 245.8 -234 279.2 -246C275.5 -212.5 275.3 -178.2 268 -145.5C260.8 -112.8 246.5 -81.7 235.7 -49.8C244.9 -31.4 257.7 -22.2 263.2 5.5C268.7 33.2 280.6 78.6 268.5 116.2C256.4 153.8 235.8 202.2 190.8 231C145.8 259.8 62.6 288.2 -1.3 289C-65.2 289.8 -147 264.5 -192.7 235.8C-238.4 207.1 -262.8 154.6 -275.7 117C-288.6 79.4 -275.4 37.8 -270 10.5C-264.6 -16.7 -252.3 -27.5 -243.5 -46.5C-253.1 -77.7 -265.9 -106.2 -272.2 -140C-278.5 -173.8 -278.4 -213 -281.5 -249.5Z"`);
    });

    it('moves the ear tips and the crest when asked', () => {
        expect(headPath({ earL: 20 })).not.toBe(headPath());
        expect(headPath({ earR: -12 })).not.toBe(headPath());
        expect(headPath({ crest: 1 })).not.toBe(headPath());
    });
});

describe('mascotInner', () => {
    it('draws every part with finite numbers', () => {
        for (const eyes of Object.keys(EYES)) expect(clean(mascotInner({ eyes })), eyes).toBe(true);
        for (const mouth of Object.keys(MOUTHS)) expect(clean(mascotInner({ mouth })), mouth).toBe(true);
        for (const paws of Object.keys(PAWS)) expect(clean(mascotInner({ paws })), paws).toBe(true);
        for (const prop of Object.keys(PROPS)) expect(clean(mascotInner({ prop })), prop).toBe(true);
        for (const hat of Object.keys(HATS)) expect(clean(mascotInner({ hat })), hat).toBe(true);
        for (const sparks of Object.keys(SPARKS)) expect(clean(mascotInner({ sparks })), sparks).toBe(true);
        for (const fx of Object.keys(FX)) {
            expect(clean(mascotInner({ fx: [fx] })), `${fx} at rest`).toBe(true);
            expect(clean(mascotInner({ fx: [fx], t: 700 })), `${fx} at 700 ms`).toBe(true);
        }
    });

    it('draws every named mood and pose', () => {
        for (const mood of Object.keys(MOODS)) expect(clean(mascotInner(resolvePose({ mood }))), mood).toBe(true);
        for (const pose of Object.keys(POSES)) expect(clean(mascotInner(resolvePose({ pose }))), pose).toBe(true);
    });

    it('draws looping effects with classes at rest, and without them in a frame', () => {
        expect(mascotInner({ fx: ['zzz'] })).toContain('m-loop m-z');
        expect(mascotInner({ fx: ['zzz'], t: 300 })).not.toContain('m-loop');
        expect(mascotInner({ prop: 'bigball' })).toContain('m-wobble');
        expect(mascotInner({ fx: ['confetti'] })).not.toContain('<rect'); // never a loop
        // the loader scenes' props and eyes (mascot.css), only at rest
        expect(mascotInner({ prop: 'orb' })).toContain('m-loop m-orb-glow');
        expect(mascotInner({ prop: 'orb' })).toContain('m-loop m-orb-swirl');
        expect(mascotInner({ prop: 'book' })).toContain('m-loop m-page');
        expect(mascotInner({ prop: 'magnifier' })).toContain('m-loop m-sweep');
        expect(mascotInner({ gaze: 'read' })).toContain('m-loop m-gaze-read');
        expect(mascotInner({ gaze: 'follow' })).toContain('m-loop m-gaze-follow');
        for (const pose of [{ prop: 'orb' }, { prop: 'book' }, { prop: 'magnifier' }, { gaze: 'read' }]) {
            expect(mascotInner({ ...pose, t: 300 }), JSON.stringify(pose)).not.toContain('m-loop');
        }
    });

    it('thickens the stroke for small sizes', () => {
        expect(mascotInner({ strokeK: 2 })).toContain('stroke-width="55.5"');
    });
});

describe('sanitizePose', () => {
    it('falls back to defaults for bad numbers and unknown names', () => {
        const p = sanitizePose({ x: NaN, y: 'a', tilt: Infinity, eyes: 'nope', mouth: '<script>', hat: 'x', fx: 'zzz' });
        expect(p.x).toBe(0); expect(p.y).toBe(0); expect(p.tilt).toBe(DEFAULT_POSE.tilt);
        expect(p.eyes).toBe('happy'); expect(p.mouth).toBe('grin'); expect(p.hat).toBe('none'); expect(p.fx).toEqual([]);
        expect(sanitizePose({ gaze: 'up; x' }).gaze).toBe('none');
    });

    it('accepts per-eye shapes', () => {
        expect(sanitizePose({ eyes: { l: 'happy', r: 'excited' } }).eyes).toEqual({ l: 'happy', r: 'excited' });
        expect(sanitizePose({ eyes: { l: 'zzz' } }).eyes).toEqual({ l: 'happy', r: 'happy' });
    });

    it('escapes the sign text', () => {
        const s = mascotInner({ prop: 'sign', signText: '<b>&"' });
        expect(s).toContain('&lt;b&gt;&amp;&quot;');
        expect(s).not.toContain('<b>');
    });
});

describe('tones', () => {
    it('knows the 18 types and shiny, and nothing else', () => {
        expect(TONES).toHaveLength(18);
        expect(BOOT_TONES).toEqual(TONES); // the boot-path copy of the list
        for (const k of TONES) expect(toneColor(k)).toContain('color-mix');
        expect(toneColor('shiny')).toContain('--mascot-shiny');
        expect(toneColor('red; background:url(x)')).toBeNull();
        expect(mascotSvg({ tone: 'expression(1)' })).not.toContain('style=');
        expect(mascotSvg({ tone: 'fire' })).toContain('--m-line:color-mix');
        expect(mascotInner({ tone: 'shiny' })).toContain('--m-mouth:var(--mascot-shiny');
    });
});
