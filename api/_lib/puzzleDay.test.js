import { describe, expect, it } from 'vitest';
import { bucketOf, cleanSubmission, distribution } from './puzzleDay.js';

const NOW = Date.parse('2026-11-06T15:00:00Z');

describe('puzzle day', () => {
    it('accepts a real result near today', () => {
        expect(cleanSubmission({ day: '2026-11-06', rows: ['apcaa', 'ccccc'] }, NOW)).toEqual({ day: '2026-11-06', rows: ['apcaa', 'ccccc'], won: true, guesses: 2 });
        expect(cleanSubmission({ day: '2026-11-06', rows: Array(8).fill('apaaa') }, NOW).won).toBe(false);
    });
    it('refuses fakes', () => {
        expect(cleanSubmission({ day: '2026-10-01', rows: ['ccccc'] }, NOW)).toBeNull();
        expect(cleanSubmission({ day: '2026-11-06', rows: ['ccccc', 'ccccc'] }, NOW)).toBeNull();
        expect(cleanSubmission({ day: '2026-11-06', rows: ['abcde'] }, NOW)).toBeNull();
        expect(cleanSubmission({ day: '2026-11-06', rows: ['ccc', 'ccccc'] }, NOW)).toBeNull();
        expect(cleanSubmission({ day: '2026-11-06', rows: Array(9).fill('aaaaa') }, NOW)).toBeNull();
    });
    it('buckets and shares', () => {
        expect(bucketOf({ won: true, guesses: 3 })).toBe('g3');
        expect(bucketOf({ won: false, guesses: 6 })).toBe('miss');
        const d = distribution({ g3: 3, g4: 1, total: 4 });
        expect(d.total).toBe(4);
        expect(d.bars.find((b) => b.key === 'g3').share).toBe(75);
    });
});
