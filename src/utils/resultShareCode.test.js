import { describe, expect, it } from 'vitest';
import { decodeChallengeResult, decodePuzzleResult, encodeChallengeResult, encodePuzzleResult } from './resultShareCode';
import { buildPuzzleShare } from './pokePuzzleShare';
import { buildChallengeShare } from './challengeShare';

describe('PokéPuzzle result code', () => {
    const share = buildPuzzleShare({ guesses: ['eevee', 'pichu', 'ditto'], target: 'ditto', maxAttempts: 8, won: true, puzzleNumber: 42 });

    it('round-trips a board without a single letter of the answer', () => {
        const code = encodePuzzleResult(share);
        expect(code).toMatch(/^42\.w\.8\.[cpa-]+$/);
        expect(code).not.toMatch(/ditto|eevee|pichu/);
        expect(decodePuzzleResult(code)).toEqual({ puzzleNumber: 42, won: true, maxAttempts: 8, attempts: 3, rows: share.rows });
    });

    it('marks free play as day 0 and a loss as every attempt used', () => {
        const loss = { puzzleNumber: null, won: false, maxAttempts: 2, rows: ['apa', 'pac'] };
        expect(decodePuzzleResult(encodePuzzleResult(loss))).toMatchObject({ puzzleNumber: null, won: false, attempts: 2 });
    });

    it('refuses anything that is not a board a game could produce', () => {
        for (const bad of [
            '', 'nonsense', '1.w.8', '1.w.8.ccc.x',
            '1.w.8.cpc', // a win that never solved
            '1.w.8.ccc-ccc', // solved twice
            '1.l.8.cpa', // a loss with attempts left
            '1.w.8.cpa-cc', // ragged rows
            '1.w.8.cpaz-cccc', // a letter that is not a status
            '1.w.99.ccc', // more attempts than any game allows
            '1.w.8.<script>',
        ]) expect(decodePuzzleResult(bad), bad).toBeNull();
    });
});

describe('Champion Challenge result code', () => {
    const share = buildChallengeShare({
        dayKey: '2026-10-23', difficulty: 'platinum', status: 'won',
        result: { turns: 14, remaining: 3, score: 1830 }, streak: 5, curve: [0.5, 0.2, 0.6, 1],
    });

    it('round-trips the outcome, figures and curve', () => {
        const code = encodeChallengeResult(share);
        expect(code).toMatch(/^20261023\.w\.14\.3\.1830\.5\.platinum\.[0-7]+$/);
        const result = decodeChallengeResult(code);
        expect(result).toMatchObject({ dayKey: '2026-10-23', won: true, turns: 14, remaining: 3, score: 1830, streak: 5, difficulty: 'platinum' });
        expect(result.curve.at(-1)).toBe(1);
    });

    it('refuses impossible or foreign codes', () => {
        for (const bad of [
            '', '20261023.w.14.3.1830.5.platinum',
            '20261023.w.14.0.1830.5.x.', // a win with nobody standing
            '20261023.w.14.9.1830.5.x.', // more than six
            '20261023.w.14.3.1830.5.hard.', // unknown difficulty
            '20261023.w.14.3.1830.5.x.89', // not a curve digit
            '2026AB23.w.14.3.1830.5.x.',
        ]) expect(decodeChallengeResult(bad), bad).toBeNull();
    });
});
