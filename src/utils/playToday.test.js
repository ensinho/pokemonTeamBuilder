import { describe, expect, it } from 'vitest';
import { PLAY_TODAY_GAMES, countdownLabel, crowdLine, puzzleNumberOn } from './playToday';

describe('playToday', () => {
    it('leads with the Champion, then the PokéPuzzle (Enzo)', () => {
        expect(PLAY_TODAY_GAMES.slice(0, 2)).toEqual(['challenge', 'pokepuzzle']);
    });

    it('counts down in hours and padded minutes, never below zero', () => {
        const now = Date.UTC(2026, 10, 15, 12, 53);
        expect(countdownLabel(now, now + (11 * 60 + 7) * 60000)).toBe('11h07');
        expect(countdownLabel(now, now + 45 * 60000 + 59000)).toBe('0h45');
        expect(countdownLabel(now, now - 1000)).toBe('0h00');
    });

    it('numbers the puzzle as the game does', () => {
        expect(puzzleNumberOn('2026-6-16')).toBe(1);
        expect(puzzleNumberOn('2026-06-17')).toBe(2);
    });

    it('invites instead of saying nobody played', () => {
        expect(crowdLine(null)).toBeNull();
        expect(crowdLine(0)).toEqual({ key: 'beFirst', n: 0 });
        expect(crowdLine(1)).toEqual({ key: 'playedOne', n: 1 });
        expect(crowdLine(342)).toEqual({ key: 'played', n: 342 });
    });
});
