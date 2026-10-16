import { describe, it, expect } from 'vitest';

import { buildChallengeShare, buildShareText, readChallengeShare, sparkline } from './challengeShare';

// A stand-in for useTranslation's t: the key and its params, readable in assertions.
const t = (key, params = {}) => `${key.split('.').pop()}(${Object.values(params).join(',')})`;

describe('the challenge share text', () => {
    it('draws the curve as blocks, low to high, ending on the final value', () => {
        expect(sparkline([0, 0.5, 1])).toBe('▁▅█');
        expect(sparkline([])).toBe('');
        const long = Array.from({ length: 40 }, (_, i) => i / 39);
        const spark = sparkline(long);
        expect(spark).toHaveLength(16);
        expect(spark.endsWith('█')).toBe(true);
        expect(spark.startsWith('▁')).toBe(true);
    });

    it('tells a win with its figures, the streak and the place', () => {
        const text = buildShareText({
            t, date: '15/10', difficulty: 'Platina', status: 'won', result: { turns: 18, remaining: 3, score: 1420 },
            streak: 4, place: 2, boardLabel: 'Time do dia', curve: [0.5, 0.8], url: 'https://pokemonbuilder.app/challenge',
        });
        expect(text.split('\n')).toEqual([
            'head(15/10,Platina)',
            'won(18,3,1420)',
            'streak(4) · place(2,Time do dia)',
            '▅▇',
            'https://pokemonbuilder.app/challenge',
        ]);
    });

    it('keeps a loss short, and never names her team', () => {
        const text = buildShareText({ t, date: '15/10', difficulty: 'Platina', status: 'lost', result: { turns: 9 }, url: 'u' });
        expect(text.split('\n')).toEqual(['head(15/10,Platina)', 'lost(9)', 'u']);
        expect(text).not.toMatch(/Garchomp|Spiritomb|Roserade/);
    });

    it('builds the forum card from the result, and nothing about either team', () => {
        const share = buildChallengeShare({
            dayKey: '2026-10-15', difficulty: 'platinum', status: 'won', result: { turns: 18, remaining: 3, score: 1420, hpPct: 70 },
            streak: 4, place: 2, board: 'daily', curve: [0.5, 0.9],
        });
        expect(share).toEqual({ v: 1, dayKey: '2026-10-15', difficulty: 'platinum', won: true, turns: 18, remaining: 3, score: 1420, streak: 4, place: 2, board: 'daily', spark: '▅▇' });
        expect(readChallengeShare(share)).toMatchObject({ won: true, place: 2, spark: '▅▇' });
    });

    it('reads a forged card back clamped, and refuses what is not one', () => {
        const forged = { v: 1, dayKey: '<script>', difficulty: 'godmode', won: 'yes', turns: -5, remaining: 99, score: 1e9, streak: 'x', place: 0, board: 'secret', spark: '<b>hi</b>' };
        expect(readChallengeShare(forged)).toEqual({
            dayKey: null, difficulty: null, won: false, turns: 0, remaining: 6, score: 99999, streak: 0, place: null, board: null, spark: '',
        });
        expect(readChallengeShare(null)).toBe(null);
        expect(readChallengeShare({ v: 2 })).toBe(null);
    });
});
