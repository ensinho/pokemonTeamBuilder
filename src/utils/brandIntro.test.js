import { describe, it, expect } from 'vitest';
import {
    GHOST_BOX, GHOST_CENTER, GHOST_INNER_RADIUS, GHOST_PATH, HEART_PATH, INTRO, STAR_PATH, INTRO_DECOR, INTRO_FULL_MS, INTRO_LEGIBLE_MS,
    coverScale, dockFrames, dockMove, ghostFrame, holeFrames, inBack, irisFrames, landFrames, orbitFrames,
    popFrames, sample, settleMs, shrinkFrames, slideFrames, spring, wipeFrames, wrapScale,
} from './brandIntro';
import { HEART, STAR, headPath } from './mascot/rig';

/** Points along an M/L/C/Z path (the rig only writes those). */
function outlinePoints(d, perSegment = 24) {
    const tokens = d.match(/[MLCZ]|-?\d*\.?\d+/g);
    const pts = [];
    let i = 0;
    let cur = [0, 0];
    let cmd = null;
    const num = () => Number(tokens[i++]);
    while (i < tokens.length) {
        if (/[MLCZ]/.test(tokens[i])) cmd = tokens[i++];
        if (cmd === 'Z') continue;
        if (cmd === 'M' || cmd === 'L') {
            const next = [num(), num()];
            if (cmd === 'L') for (let s = 1; s <= perSegment; s += 1) pts.push([cur[0] + ((next[0] - cur[0]) * s) / perSegment, cur[1] + ((next[1] - cur[1]) * s) / perSegment]);
            cur = next;
            pts.push(cur);
        } else if (cmd === 'C') {
            const [c1, c2, end] = [[num(), num()], [num(), num()], [num(), num()]];
            for (let s = 1; s <= perSegment; s += 1) {
                const t = s / perSegment, u = 1 - t;
                pts.push([
                    u * u * u * cur[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * end[0],
                    u * u * u * cur[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * end[1],
                ]);
            }
            cur = end;
        }
    }
    return pts;
}

describe('the ghost the iris is cut from', () => {
    it('is the mascot\'s own outline, not a copy that drifted', () => {
        expect(GHOST_PATH).toBe(headPath());
        expect(STAR_PATH).toBe(STAR);
        expect(HEART_PATH).toBe(HEART);
    });

    it('keeps its inner circle inside the outline, so a covering ghost really covers', () => {
        const pts = outlinePoints(GHOST_PATH);
        const nearest = Math.min(...pts.map(([x, y]) => Math.hypot(x - GHOST_CENTER.x, y - GHOST_CENTER.y)));
        expect(nearest).toBeGreaterThanOrEqual(GHOST_INNER_RADIUS);
        expect(nearest - GHOST_INNER_RADIUS).toBeLessThan(12); // and is not needlessly small
    });

    it('draws inside its box', () => {
        for (const [x, y] of outlinePoints(GHOST_PATH)) {
            expect(x).toBeGreaterThanOrEqual(GHOST_BOX.x);
            expect(x).toBeLessThanOrEqual(GHOST_BOX.x + GHOST_BOX.w);
            expect(y).toBeGreaterThanOrEqual(GHOST_BOX.y);
            expect(y).toBeLessThanOrEqual(GHOST_BOX.y + GHOST_BOX.h);
        }
    });
});

describe('springs', () => {
    it('starts at rest, overshoots, and settles at 1', () => {
        expect(spring(0, 2.4, 0.42)).toBe(0);
        const peak = Math.max(...Array.from({ length: 200 }, (_, i) => spring(i * 5, 2.4, 0.42)));
        expect(peak).toBeGreaterThan(1.1);
        expect(spring(settleMs(2.4, 0.42), 2.4, 0.42)).toBeCloseTo(1, 2);
    });

    it('a stiffer, more damped spring settles sooner', () => {
        expect(settleMs(3, 0.6)).toBeLessThan(settleMs(2, 0.4));
    });
});

describe('sampled keyframes', () => {
    it('runs offsets from 0 to 1 in order', () => {
        const { keyframes } = sample(500, (t) => ({ opacity: t / 500 }));
        expect(keyframes[0].offset).toBe(0);
        expect(keyframes.at(-1).offset).toBe(1);
        keyframes.slice(1).forEach((k, i) => expect(k.offset).toBeGreaterThan(keyframes[i].offset));
        expect(keyframes.length).toBe(31);
    });

    it('every piece ends exactly at rest', () => {
        expect(landFrames().keyframes.at(-1).transform).toBe('rotate(0deg) scale(1, 1)');
        expect(popFrames().keyframes.at(-1).transform).toBe('rotate(0deg) scale(1)');
        expect(slideFrames({ dx: -200, dy: -120 }).keyframes.at(-1).transform).toBe('translate(0px, 0px) rotate(0deg)');
        expect(holeFrames().keyframes.at(-1).transform).toBe('scale(0)');
        expect(holeFrames().keyframes[0].transform).toBe('scale(1)');
        expect(shrinkFrames().keyframes.at(-1).transform).toBe('scale(0)');
        const dock = dockFrames({ dx: 10, dy: -300, k: 0.4 }).keyframes.at(-1).transform;
        expect(dock).toBe('translate(10px, -300px) scale(0.4)');
    });

    it('the land stretches while rising and squashes as it turns (squash and stretch)', () => {
        const scales = landFrames().keyframes.map((k) => k.transform.match(/scale\(([\d.]+), ([\d.]+)\)/).slice(1).map(Number));
        expect(scales.some(([sx, sy]) => sy > sx + 0.02)).toBe(true);
        expect(scales.some(([sx, sy]) => sx > sy + 0.01)).toBe(true);
    });

    it('the exit winds up before it shrinks (anticipation)', () => {
        expect(inBack(0.15)).toBeLessThan(0);
        const first = shrinkFrames().keyframes.slice(0, 8).map((k) => Number(k.transform.match(/scale\(([\d.]+)\)/)[1]));
        expect(Math.max(...first)).toBeGreaterThan(1);
    });

    it('the brush wipe starts hidden and ends with the whole word painted', () => {
        const { keyframes, duration } = wipeFrames();
        expect(duration).toBe(INTRO.wipe);
        expect(keyframes[0].clipPath).toContain('0% -40%');
        expect(keyframes.at(-1).clipPath).toContain('100% 140%');
    });

    it('the orbit hides its dash while it is shorter than its caps, and rests between cycles', () => {
        const { keyframes, duration } = orbitFrames(0);
        expect(duration).toBe(INTRO.orbitEvery);
        expect(keyframes[0].opacity).toBe(0);
        expect(keyframes.at(-1).opacity).toBe(0);
        expect(keyframes.some((k) => k.opacity === 1)).toBe(true);
        const rest = keyframes.filter((k) => k.offset * duration > INTRO.orbitRun + 20);
        expect(rest.every((k) => k.opacity === 0)).toBe(true);
    });

    it('the iris closes onto the given scale', () => {
        expect(irisFrames(0.25).keyframes.at(-1).transform).toBe('scale(0.25)');
    });
});

describe('geometry', () => {
    it('covers the frame from any point inside it', () => {
        for (const [cx, cy] of [[195, 400], [10, 10], [380, 830]]) {
            const s = coverScale({ width: 390, height: 844, cx, cy });
            const far = Math.max(Math.hypot(cx, cy), Math.hypot(390 - cx, cy), Math.hypot(cx, 844 - cy), Math.hypot(390 - cx, 844 - cy));
            expect(GHOST_INNER_RADIUS * s).toBeGreaterThanOrEqual(far);
        }
    });

    it('wraps a wide wordmark by its width and a tall block by its height', () => {
        expect(wrapScale({ wordWidth: 560, wordHeight: 134 })).toBeCloseTo((560 * 1.1) / GHOST_BOX.w, 5);
        expect(wrapScale({ wordWidth: 100, wordHeight: 300 })).toBeCloseTo((300 * 2.2) / GHOST_BOX.h, 5);
    });

    it('places the ghost so its centre lands on the point', () => {
        const f = ghostFrame({ cx: 500, cy: 300, scale: 2 });
        const [ox, oy] = f.origin.split(' ').map(parseFloat);
        expect(f.left + ox).toBeCloseTo(500, 5);
        expect(f.top + oy).toBeCloseTo(300, 5);
        expect(f.width).toBe(GHOST_BOX.w * 2);
    });

    it('docks a word into a smaller box above it', () => {
        const m = dockMove({ left: 100, top: 400, width: 400, height: 96 }, { left: 220, top: 20, width: 160, height: 38 });
        expect(m.k).toBeCloseTo(0.4, 5);
        expect(m.dx).toBeCloseTo(0, 5);
        expect(m.dy).toBeCloseTo(39 - 448, 5);
    });
});

describe('timing', () => {
    it('the name is legible before every piece has landed, and both fit the splash\'s budget', () => {
        expect(INTRO_LEGIBLE_MS).toBeLessThan(INTRO_FULL_MS);
        // the wipe eases out like a cubic: by INTRO_LEGIBLE_MS it has painted almost all of the word
        const painted = 1 - (1 - (INTRO_LEGIBLE_MS - INTRO.word) / INTRO.wipe) ** 3;
        expect(painted).toBeGreaterThan(0.9);
        expect(INTRO_FULL_MS).toBeLessThanOrEqual(1200);
        expect(INTRO.exitShrink).toBeLessThan(INTRO.exitIris);
        expect(INTRO.exitIris).toBeLessThan(INTRO.exit);
    });

    it('every sticker sits inside the frame', () => {
        for (const d of INTRO_DECOR) {
            expect(d.x).toBeGreaterThan(0); expect(d.x).toBeLessThan(100);
            expect(d.y).toBeGreaterThan(0); expect(d.y).toBeLessThan(100);
        }
    });
});
