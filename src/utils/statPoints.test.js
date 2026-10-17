import { describe, it, expect } from 'vitest';

import { convertSpread, detectEvScale, evsToStatPoints, looksLikeStatPoints, statPointSpreadToEvs, statPointsToEvs } from './statPoints';

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

describe('convertSpread', () => {
    it('round-trips a Stat Point spread that fits 510 EVs', () => {
        const evs = convertSpread({ hp: 1, spa: 32, spe: 32 }, 'sp', 'ev');
        expect(evs).toEqual({ hp: 4, spa: 252, spe: 252 });
        expect(convertSpread(evs, 'ev', 'sp')).toEqual({ hp: 1, spa: 32, spe: 32 });
    });

    it('keeps an EV spread inside the 66-point budget', () => {
        const sp = convertSpread({ hp: 252, def: 4, spa: 252 }, 'ev', 'sp'); // 32 + 1 + 32 = 65
        expect(sp).toEqual({ hp: 32, def: 1, spa: 32 });
        const over = convertSpread({ hp: 252, atk: 252, spe: 252 }, 'ev', 'sp'); // 96 → 66
        expect(Object.values(over).reduce((a, b) => a + b, 0)).toBe(66);
    });

    it('is a copy when the scales match', () => {
        const spread = { hp: 4 };
        expect(convertSpread(spread, 'ev', 'ev')).toEqual(spread);
        expect(convertSpread(spread, 'ev', 'ev')).not.toBe(spread);
    });
});

describe('evsToStatPoints / detectEvScale', () => {
    it('inverts the level-50 breakpoints', () => {
        expect([0, 3, 4, 12, 252].map(evsToStatPoints)).toEqual([0, 0, 1, 2, 32]);
    });

    it('reads the scale off the spreads, or says it cannot tell', () => {
        expect(detectEvScale([{ hp: 2, spa: 32, spe: 32 }, {}])).toBe('sp');
        expect(detectEvScale([{ hp: 2, spa: 32 }, { hp: 252, spe: 252 }])).toBe('ev');
        expect(detectEvScale([{}, { hp: 0 }])).toBe(null);
    });
});
