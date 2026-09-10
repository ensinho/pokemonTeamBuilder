import { describe, it, expect } from 'vitest';
import { buildPuzzleShare, puzzleShareToEmoji, puzzleShareScore, STATUS_BY_CODE } from './pokePuzzleShare';

const game = (over = {}) => ({
    guesses: ['pichuu', 'raichu'],
    target: 'raichu',
    maxAttempts: 8,
    won: true,
    mode: 'daily',
    puzzleNumber: 42,
    ...over,
});

describe('buildPuzzleShare', () => {
    it('never carries the answer or the guesses', () => {
        const share = buildPuzzleShare(game());
        const serialized = JSON.stringify(share).toLowerCase();
        expect(serialized).not.toContain('raichu');
        expect(serialized).not.toContain('pichuu');
        // and nothing that could be reassembled into letters
        expect(Object.keys(share)).toEqual(
            expect.not.arrayContaining(['target', 'answer', 'guesses', 'name']),
        );
    });

    it('emits one row per guess, each as long as the answer', () => {
        const share = buildPuzzleShare(game());
        expect(share.rows).toHaveLength(2);
        expect(share.rows.every((row) => row.length === 6)).toBe(true);
        expect(share.wordLength).toBe(6);
    });

    it('marks a winning final row as all correct', () => {
        const share = buildPuzzleShare(game());
        expect(share.rows[share.rows.length - 1]).toBe('cccccc');
    });

    it('uses only known status codes', () => {
        const share = buildPuzzleShare(game());
        for (const row of share.rows) {
            for (const code of row.split('')) expect(STATUS_BY_CODE[code]).toBeDefined();
        }
    });

    it('counts attempts from the rows, not from the array length', () => {
        const share = buildPuzzleShare(game({ guesses: ['raichu', '', null] }));
        expect(share.attempts).toBe(1);
    });

    it('drops a guess that is not the answer length, which would render ragged', () => {
        const share = buildPuzzleShare(game({ guesses: ['pikachu', 'raichu'] }));
        expect(share.rows).toEqual(['cccccc']);
    });

    it('returns null when there is nothing to show', () => {
        expect(buildPuzzleShare({ guesses: [], target: 'raichu' })).toBeNull();
        expect(buildPuzzleShare()).toBeNull();
    });

    it('normalizes the mode and keeps the puzzle number when known', () => {
        expect(buildPuzzleShare(game({ mode: 'whatever' })).mode).toBe('daily');
        expect(buildPuzzleShare(game({ mode: 'free' })).mode).toBe('free');
        expect(buildPuzzleShare(game({ puzzleNumber: null })).puzzleNumber).toBeNull();
        expect(buildPuzzleShare(game({ puzzleNumber: 7 })).puzzleNumber).toBe(7);
    });

    it('handles a duplicate letter the way the board does', () => {
        // target has one 'a'; the guess has two, so only one may be yellow.
        const share = buildPuzzleShare({ guesses: ['aa'], target: 'ab', won: false });
        expect(share.rows[0]).toBe('ca');
    });
});

describe('rendering helpers', () => {
    it('builds the familiar emoji grid', () => {
        const share = buildPuzzleShare({ guesses: ['ab'], target: 'ab', won: true, maxAttempts: 8 });
        expect(puzzleShareToEmoji(share)).toBe('🟩🟩');
    });

    it('writes the score, with X for a loss', () => {
        expect(puzzleShareScore(buildPuzzleShare(game()))).toBe('2/8');
        expect(puzzleShareScore(buildPuzzleShare(game({ won: false })))).toBe('X/8');
        expect(puzzleShareScore(null)).toBe('');
    });

    it('counts the drawn rows when a payload carries no attempts field', () => {
        // What the reader counts is the board, so the score follows the board
        // rather than rendering "undefined/8" for a payload written elsewhere.
        expect(puzzleShareScore({ won: true, maxAttempts: 8, rows: ['cccccc'] })).toBe('1/8');
        expect(puzzleShareScore({ won: false, maxAttempts: 8, rows: ['aaaaaa'] })).toBe('X/8');
        expect(puzzleShareScore({ won: true, rows: ['cccccc', 'cccccc'] })).toBe('2/2');
    });

    it('is empty rather than throwing on junk', () => {
        expect(puzzleShareToEmoji(null)).toBe('');
        expect(puzzleShareToEmoji({ rows: [] })).toBe('');
    });
});
