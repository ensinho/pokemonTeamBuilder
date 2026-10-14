import { describe, it, expect } from 'vitest';

import { looksLikeStatPoints, statPointSpreadToEvs, statPointsToEvs } from './statPoints';

describe('statPointsToEvs', () => {
    it('maps the level-50 breakpoints', () => {
        expect(statPointsToEvs(0)).toBe(0);
        expect(statPointsToEvs(1)).toBe(4);
        expect(statPointsToEvs(2)).toBe(12);
        expect(statPointsToEvs(32)).toBe(252);
    });

    it('clamps junk instead of producing an illegal spread', () => {
        expect(statPointsToEvs(40)).toBe(252);
        expect(statPointsToEvs(-3)).toBe(0);
        expect(statPointsToEvs('x')).toBe(0);
    });

});

describe('statPointSpreadToEvs', () => {
    it('converts a spread that fits as-is', () => {
        expect(statPointSpreadToEvs({ hp: 2, spa: 32, spe: 31 })).toEqual({ hp: 12, spa: 252, spe: 244 });
    });

    it('trims a full 66-point spread back inside 510, from the smallest stat', () => {
        const evs = statPointSpreadToEvs({ hp: 32, def: 2, spd: 32 }); // 252+12+252 = 516
        expect(Object.values(evs).reduce((a, b) => a + b, 0)).toBe(510);
        expect(evs).toEqual({ hp: 252, def: 6, spd: 252 });
    });

    it('spreads the cut over several small stats when one is not enough', () => {
        const evs = statPointSpreadToEvs({ hp: 30, atk: 1, def: 1, spe: 32 }); // 236+4+4+252 = 496
        expect(evs).toEqual({ hp: 236, atk: 4, def: 4, spe: 252 });
        const tight = statPointSpreadToEvs({ hp: 31, atk: 1, def: 2, spe: 32 }); // 244+4+12+252 = 512
        expect(Object.values(tight).reduce((a, b) => a + b, 0)).toBe(510);
    });
});

describe('looksLikeStatPoints', () => {
    it('tells a Champions spread from an EV one', () => {
        expect(looksLikeStatPoints({ hp: 2, spa: 32, spe: 32 })).toBe(true);
        expect(looksLikeStatPoints({ hp: 4, spa: 252, spe: 252 })).toBe(false);
        expect(looksLikeStatPoints({ hp: 32, atk: 32, spe: 32 })).toBe(false); // 96 > 66
        expect(looksLikeStatPoints({})).toBe(false);
    });
});
