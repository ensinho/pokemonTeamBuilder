import { describe, expect, it } from 'vitest';
import { betterThanShare, dayPoints, gapAbove, leagueWeek, puzzleMedals, puzzleRecord, rankDay, rankWeek } from './puzzleStandings';

const bars = (counts) => Object.entries(counts).map(([key, count]) => ({ key, count }));

describe('puzzleStandings', () => {
    it('says how many of the day did worse than you', () => {
        // 10 players: 1 in one guess, 3 in three (you among them), 4 in five, 2 missed.
        const day = bars({ g1: 1, g3: 3, g5: 4, miss: 2 });
        expect(betterThanShare(day, 'g3')).toBe(67); // 6 of the other 9
        expect(betterThanShare(day, 'g1')).toBe(100);
        expect(betterThanShare(day, 'miss')).toBe(0);
        expect(betterThanShare(bars({ g2: 1 }), 'g2')).toBeNull();
        expect(betterThanShare(day, 'nope')).toBeNull();
    });

    it('scores a day 8 down to 1, and nothing for a miss', () => {
        expect(dayPoints({ won: true, guesses: 1 })).toBe(8);
        expect(dayPoints({ won: true, guesses: 8 })).toBe(1);
        expect(dayPoints({ won: false, guesses: 8 })).toBe(0);
        expect(dayPoints({ won: true, guesses: 0 })).toBe(0);
        expect(dayPoints(null)).toBe(0);
    });

    it('ranks a day by fewest guesses, misses last, ties sharing a place', () => {
        const ranked = rankDay([
            { uid: 'c', name: 'Cid', won: true, guesses: 3 },
            { uid: 'a', name: 'Ana', won: true, guesses: 2 },
            { uid: 'd', name: 'Dora', won: false, guesses: 8 },
            { uid: 'b', name: 'Bia', won: true, guesses: 3 },
        ]);
        expect(ranked.map((p) => p.uid)).toEqual(['a', 'b', 'c', 'd']);
        expect(ranked.map((p) => p.place)).toEqual([1, 2, 2, 4]);
    });

    it('runs the league week from Monday to today', () => {
        // 2026-11-12 is a Thursday.
        const week = leagueWeek(new Date(2026, 10, 12));
        expect(week.days).toEqual(['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12']);
        expect(week.daysLeft).toBe(3);
        expect(leagueWeek(new Date(2026, 10, 9)).days).toEqual(['2026-11-09']);
        const sunday = leagueWeek(new Date(2026, 10, 15));
        expect(sunday.days).toHaveLength(7);
        expect(sunday.daysLeft).toBe(0);
    });

    it('adds the week up and says what it takes to climb', () => {
        const table = rankWeek([
            [{ uid: 'a', name: 'Ana', won: true, guesses: 2 }, { uid: 'me', name: 'Eu', won: true, guesses: 4 }],
            [{ uid: 'a', name: 'Ana', won: false, guesses: 8 }, { uid: 'me', name: 'Eu', won: true, guesses: 3 }],
            [{ uid: 'b', name: 'Bia', won: true, guesses: 1 }],
        ]);
        expect(table.map((r) => [r.uid, r.points, r.played, r.place])).toEqual([
            ['me', 11, 2, 1],
            ['b', 8, 1, 2],
            ['a', 7, 2, 3],
        ]);
        expect(gapAbove(table, 'a')).toEqual({ name: 'Bia', points: 2 });
        expect(gapAbove(table, 'me')).toBeNull();
        expect(gapAbove(table, 'nobody')).toBeNull();
    });

    it('reads a record from saved days', () => {
        const record = puzzleRecord([
            { won: true, guesses: 1 },
            { won: true, guesses: 3, hints: 2 },
            null,
            { won: false, guesses: 8 },
            { won: true, guesses: 4 },
            { won: true, guesses: 2 },
        ]);
        expect(record).toEqual({ played: 5, wins: 4, winRate: 80, average: 2.5, streak: 2, bestStreak: 2, firstTry: 1, cleanWins: 3 });
        expect(puzzleRecord([])).toMatchObject({ played: 0, winRate: 0, average: null, streak: 0 });
    });

    it('hands out medals only when they are earned', () => {
        const medals = puzzleMedals({ firstTry: 1, cleanWins: 4, bestStreak: 7, wins: 12 });
        expect(medals.map((m) => [m.id, m.earned])).toEqual([['firstTry', true], ['clean', false], ['week', true], ['month', false]]);
        expect(puzzleMedals(null).every((m) => !m.earned)).toBe(true);
    });
});
