import { describe, expect, it } from 'vitest';
import { clampIv, recommendIvs, sameIvs } from './ivAdvice';

const mv = (name, category) => ({ name, category });

describe('recommendIvs', () => {
    it('wants 6×31 for a plain physical set', () => {
        const r = recommendIvs({ moves: [mv('close-combat', 'physical'), mv('protect', 'status')] });
        expect(r.verdict).toBe('six');
        expect(r.ivs.speed).toBe(31);
        expect(r.ivs.attack).toBe(31);
    });

    it('zeroes Speed under Trick Room', () => {
        const r = recommendIvs({ moves: [mv('Trick Room', 'status'), mv('hammer-arm', 'physical')] });
        expect(r.ivs.speed).toBe(0);
        expect(r.reasons).toEqual(['trickRoom']);
        expect(r.verdict).toBe('five');
    });

    it('zeroes Attack on an all-special set', () => {
        const r = recommendIvs({ moves: [mv('shadow-ball', 'special'), mv('protect', 'status')] });
        expect(r.ivs.attack).toBe(0);
        expect(r.reasons).toContain('special');
    });

    it('does not decide Attack while a category is unknown', () => {
        const r = recommendIvs({ moves: [mv('shadow-ball', 'special'), mv('mystery', null)] });
        expect(r.ivs.attack).toBe(31);
    });

    it('ignores Attack for Transform', () => {
        expect(recommendIvs({ moves: [mv('transform', 'status')] }).ivs.attack).toBe(31);
    });

    it('stays 6×31 with no moves chosen', () => {
        expect(recommendIvs({ moves: [] }).verdict).toBe('six');
    });
});

describe('helpers', () => {
    it('clamps and compares', () => {
        expect(clampIv(40)).toBe(31);
        expect(clampIv(-2)).toBe(0);
        expect(clampIv('x')).toBe(31);
        expect(sameIvs({ hp: 31 }, { hp: '31' })).toBe(true);
    });
});
