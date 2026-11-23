import { describe, it, expect } from 'vitest';
import { FULL_DAY, LEVEL_UP, evolutionSwaps, landFrames, swapKeyframes, wobbleFrames } from './livingMoments';

describe('the evolution screen (level up)', () => {
    it('swaps faster and faster, inside the evolution and before the flash', () => {
        const swaps = evolutionSwaps();
        expect(swaps[0]).toBe(LEVEL_UP.swapsFrom);
        expect(swaps.at(-1)).toBeLessThan(LEVEL_UP.swapsTo);
        expect(swaps.at(-1)).toBeLessThan(LEVEL_UP.flash);
        const gaps = swaps.slice(1).map((t, i) => t - swaps[i]);
        gaps.slice(1).forEach((gap, i) => expect(gap).toBeLessThanOrEqual(gaps[i]));
        expect(Math.min(...gaps)).toBeGreaterThanOrEqual(41);
        expect(swaps.length).toBeGreaterThan(8);
    });

    it('shows the old numeral first and the new one for good from the landing', () => {
        const fresh = swapKeyframes({ newNumeral: true });
        const old = swapKeyframes({ newNumeral: false });
        expect(fresh[0].opacity).toBe(0);
        expect(old[0].opacity).toBe(1);
        expect(fresh.at(-1).opacity).toBe(1);
        expect(old.at(-1).opacity).toBe(0);
        fresh.slice(1).forEach((k, i) => expect(k.offset).toBeGreaterThanOrEqual(fresh[i].offset));
        // the two numerals are never shown together
        fresh.forEach((k, i) => expect(k.opacity + old[i].opacity).toBe(1));
    });

    it('lands from 150% back to its size', () => {
        const { keyframes } = landFrames();
        expect(keyframes[0].transform).toBe('scale(1.5)');
        expect(keyframes.at(-1).transform).toBe('scale(1)');
    });

    it('keeps its beats in order', () => {
        const order = [LEVEL_UP.fill, LEVEL_UP.dim, LEVEL_UP.swapsFrom, LEVEL_UP.flash, LEVEL_UP.land, LEVEL_UP.words, LEVEL_UP.done];
        order.slice(1).forEach((t, i) => expect(t).toBeGreaterThan(order[i]));
    });
});

describe('the fourth capture (full day)', () => {
    it('wobbles three times and rests between them', () => {
        const { keyframes, duration } = wobbleFrames();
        const at = (ms) => keyframes.reduce((best, k) => (Math.abs(k.offset * duration - ms) < Math.abs(best.offset * duration - ms) ? k : best));
        expect(at(0).transform).toBe('rotate(0deg)');
        expect(at(FULL_DAY.wobbles[0] + FULL_DAY.wobble / 4).transform).not.toBe('rotate(0deg)');
        expect(at((FULL_DAY.wobbles[0] + FULL_DAY.wobble + FULL_DAY.wobbles[1]) / 2).transform).toBe('rotate(0deg)');
        expect(keyframes.at(-1).transform).toBe('rotate(0deg)');
    });

    it('clicks after the last wobble and hands over after the words', () => {
        expect(FULL_DAY.click).toBeGreaterThan(FULL_DAY.wobbles[2] + FULL_DAY.wobble);
        expect(FULL_DAY.gold + 3 * FULL_DAY.goldEach).toBeLessThan(FULL_DAY.words + 200);
        expect(FULL_DAY.handover).toBeGreaterThan(FULL_DAY.words);
    });
});
