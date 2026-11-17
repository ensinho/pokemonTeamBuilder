import { describe, it, expect } from 'vitest';
import { buildReceiptShare, cleanReceiptShare, readReceiptShare } from './gameShare';

describe("the day's receipt on the forum (2026-11-17)", () => {
    it('carries which games were played and their figures, nothing else', () => {
        const share = buildReceiptShare({
            day: '2026-11-17',
            done: { challenge: true, pokepuzzle: true, quiz: true, tierList: false },
            challenge: { won: true, turns: 14 },
            puzzle: { solved: true, attempts: 4 },
            quiz: { found: 9, total: 9 },
            tier: 'ghosts',
            full: 3,
        });
        expect(share).toEqual({
            v: 1, day: '2026-11-17', games: ['challenge', 'pokepuzzle', 'quiz'],
            challenge: { won: true, turns: 14 }, puzzle: { solved: true, attempts: 4 }, quiz: { found: 9, total: 9 }, tier: null, full: 3,
        });
        expect(readReceiptShare(share)).toEqual(share);
    });

    it('refuses a forged one and clamps what it can', () => {
        expect(cleanReceiptShare({ v: 1, day: 'x', games: ['quiz'] })).toBe(null);
        expect(cleanReceiptShare({ v: 1, day: '2026-11-17', games: [] })).toBe(null);
        const odd = cleanReceiptShare({ v: 1, day: '2026-11-17', games: ['quiz', 'hack'], quiz: { found: 99, total: 9 }, tier: '<b>', full: -2, extra: 'x' });
        expect(odd).toEqual({ v: 1, day: '2026-11-17', games: ['quiz'], challenge: null, puzzle: null, quiz: null, tier: null, full: 0 });
        expect(buildReceiptShare({ day: '2026-11-17', done: {} })).toBe(null);
    });
});
