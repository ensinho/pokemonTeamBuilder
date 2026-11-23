import { describe, it, expect } from 'vitest';
import {
    BADGE_CASE, CARD_PRINT, FULL_DAY, LEVEL_UP, TEAM_SAVED, arcFrames, badgeSpinFrames, evolutionSwaps, landFrames, printDelays, pvpVerdict,
    seatFrames, swapKeyframes, teamBallLands, wobbleFrames,
} from './livingMoments';

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

describe('the friend battle verdict', () => {
    it('crowns your win and greys your loss, forfeits included', () => {
        expect(pvpVerdict('won', { playedHere: true })).toBe('win');
        expect(pvpVerdict('forfeitWon', { playedHere: true })).toBe('win');
        expect(pvpVerdict('lost', { playedHere: true })).toBe('loss');
        expect(pvpVerdict('forfeitLost', { playedHere: true })).toBe('loss');
    });

    it('plays nothing for a tie, a replay, or a result opened later', () => {
        expect(pvpVerdict('tie', { playedHere: true })).toBeNull();
        expect(pvpVerdict('won', { playedHere: true, replay: true })).toBeNull();
        expect(pvpVerdict('won')).toBeNull();
        expect(pvpVerdict(null, { playedHere: true })).toBeNull();
    });
});

describe('the trainer card printing', () => {
    it('lights every cell once, inside the banner\'s run', () => {
        const delays = printDelays(120, 'uid-abc');
        expect(delays).toHaveLength(120);
        expect(Math.min(...delays)).toBe(CARD_PRINT.pixels);
        expect(Math.max(...delays)).toBe(CARD_PRINT.pixels + CARD_PRINT.pixelsRun);
        expect(new Set(delays).size).toBeGreaterThan(100);
    });

    it('is the same for the same trainer and different for another', () => {
        expect(printDelays(80, 'uid-abc')).toEqual(printDelays(80, 'uid-abc'));
        expect(printDelays(80, 'uid-abc')).not.toEqual(printDelays(80, 'uid-xyz'));
    });

    it('lands the gold pixel last', () => {
        expect(CARD_PRINT.gold).toBeGreaterThan(CARD_PRINT.pixels + CARD_PRINT.pixelsRun);
        expect(CARD_PRINT.gold).toBeGreaterThan(CARD_PRINT.name + CARD_PRINT.nameRun);
        expect(CARD_PRINT.done).toBeGreaterThan(CARD_PRINT.gold);
    });
});

describe('the badge case', () => {
    it('turns twice and comes to rest in its socket', () => {
        const { keyframes } = badgeSpinFrames();
        expect(keyframes[0].transform).toContain('rotateY(0deg)');
        expect(keyframes.at(-1).transform).toBe('translateY(0rem) rotateY(720deg) scale(1)');
        expect(seatFrames().keyframes.at(-1).transform).toBe('scale(1, 1)');
        expect(seatFrames().keyframes[0].transform).toBe('scale(1.22, 0.8)');
        expect(BADGE_CASE.light).toBeGreaterThanOrEqual(BADGE_CASE.land);
    });
});

describe('the first team saved', () => {
    it('lands every ball before the lid closes and the scene ends', () => {
        expect(teamBallLands(5)).toBeLessThan(1200 + TEAM_SAVED.first);
        expect(teamBallLands(5) + TEAM_SAVED.settle).toBeLessThan(TEAM_SAVED.done);
    });

    it('arcs from the Pokémon to the box, rising on the way', () => {
        const { keyframes } = arcFrames(300, -150, 120);
        expect(keyframes[0].transform).toBe('translate(0px, 0px) rotate(0deg) scale(1)');
        expect(keyframes.at(-1).transform).toBe('translate(300px, -150px) rotate(540deg) scale(0.55)');
        const mid = keyframes[Math.floor(keyframes.length / 2)].transform;
        const y = Number(mid.match(/translate\([^,]+, (-?[\d.]+)px\)/)[1]);
        expect(y).toBeLessThan(-150 / 2);
    });
});
