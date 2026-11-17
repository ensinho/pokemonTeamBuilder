import { describe, expect, it } from 'vitest';

import { dayKeyAt } from './challengeDay.js';
import {
    DAILY_GAMES, GAME_NAV_KEYS, dayTally, gameDayKey, gameNoteToday, gameOfNavKey, gameResetAt, gamesDoneToday,
    localDayNumber, mergeGameRecords, nextGameFor, nextGameResetAt, withGameDone,
} from './gamesToday.js';

const NOW = new Date(2026, 10, 15, 15, 30).getTime();
const TOMORROW = NOW + 24 * 3600 * 1000;
const NONE = { challenge: false, pokepuzzle: false, quiz: false, tierList: false };

describe('gamesToday', () => {
    it('counts four games a day, the Champion first', () => {
        expect(DAILY_GAMES).toEqual(['challenge', 'pokepuzzle', 'quiz', 'tierList']);
        expect(Object.keys(GAME_NAV_KEYS).sort()).toEqual([...DAILY_GAMES].sort());
    });

    it('maps the shell’s page keys to the games', () => {
        expect(gameOfNavKey('generationQuiz')).toBe('quiz');
        expect(gameOfNavKey('tierList')).toBe('tierList');
        expect(gameOfNavKey('community')).toBeNull();
    });

    it('keeps each game on its own day', () => {
        expect(gameDayKey('challenge', NOW)).toBe(dayKeyAt(NOW));
        expect(gameDayKey('pokepuzzle', NOW)).toBe('2026-11-15');
        expect(gameDayKey('quiz', NOW)).toBe('2026-11-15');
        expect(gameDayKey('tierList', NOW)).toBe('2026-11-15');
    });

    it('numbers the trainer’s own days one apart, whatever the hour', () => {
        const morning = new Date(2026, 10, 15, 0, 5).getTime();
        const night = new Date(2026, 10, 15, 23, 55).getTime();
        expect(localDayNumber(morning)).toBe(localDayNumber(night));
        expect(localDayNumber(TOMORROW)).toBe(localDayNumber(NOW) + 1);
    });

    it('records a game for today and forgets it tomorrow', () => {
        const record = withGameDone({}, 'pokepuzzle', NOW);
        expect(gamesDoneToday(record, NOW)).toEqual({ ...NONE, pokepuzzle: true });
        expect(gamesDoneToday(record, TOMORROW)).toEqual(NONE);
    });

    it('reads a missing or broken record as nothing played', () => {
        expect(gamesDoneToday(null, NOW)).toEqual(NONE);
        expect(gamesDoneToday({ challenge: 42 }, NOW).challenge).toBe(false);
    });

    it('still reads a record written when the day had two games', () => {
        const old = { challenge: dayKeyAt(NOW), pokepuzzle: '2026-11-15' };
        expect(gamesDoneToday(old, NOW)).toEqual({ ...NONE, challenge: true, pokepuzzle: true });
    });

    it('ignores an unknown game', () => {
        expect(withGameDone({ a: 1 }, 'battles', NOW)).toEqual({ a: 1 });
    });

    it('keeps a note for today only, and only short figures', () => {
        const record = withGameDone({}, 'quiz', NOW, { found: 9, total: 10, text: 'x'.repeat(200), nested: { a: 1 } });
        expect(gameNoteToday(record, 'quiz', NOW)).toEqual({ found: 9, total: 10, day: '2026-11-15' });
        expect(gameNoteToday(record, 'quiz', TOMORROW)).toBeNull();
        expect(gameNoteToday(record, 'tierList', NOW)).toBeNull();
        expect(gameNoteToday(null, 'quiz', NOW)).toBeNull();
    });

    it('keeps the other games’ notes when one is added', () => {
        const first = withGameDone({}, 'quiz', NOW, { found: 3, total: 10 });
        const second = withGameDone(first, 'tierList', NOW, { theme: 'starters' });
        expect(gameNoteToday(second, 'quiz', NOW).found).toBe(3);
        expect(gameNoteToday(second, 'tierList', NOW).theme).toBe('starters');
    });

    it('tallies the day', () => {
        expect(dayTally({})).toEqual({ played: 0, total: 4, complete: false });
        expect(dayTally({ challenge: true, quiz: true })).toEqual({ played: 2, total: 4, complete: false });
        expect(dayTally({ challenge: true, pokepuzzle: true, quiz: true, tierList: true }).complete).toBe(true);
    });

    it('resets the puzzle at local midnight and opens the next game at the earliest reset', () => {
        expect(gameResetAt('pokepuzzle', NOW)).toBe(new Date(2026, 10, 16).getTime());
        const soonest = nextGameResetAt(NOW);
        expect(soonest).toBe(Math.min(...DAILY_GAMES.map((g) => gameResetAt(g, NOW))));
        expect(soonest).toBeGreaterThan(NOW);
    });

    describe('nextGameFor', () => {
        it('sends to the preferred game while it is open', () => {
            expect(nextGameFor({ preferred: 'challenge', from: 'pokepuzzle', done: { pokepuzzle: true } }))
                .toEqual({ kind: 'next', game: 'challenge' });
        });

        it('skips a game already played for the next one of the day', () => {
            expect(nextGameFor({ preferred: 'challenge', from: 'tierList', done: { challenge: true } }))
                .toEqual({ kind: 'next', game: 'pokepuzzle' });
            expect(nextGameFor({ preferred: 'challenge', from: 'pokepuzzle', done: { challenge: true, pokepuzzle: true } }))
                .toEqual({ kind: 'next', game: 'quiz' });
        });

        it('never points a screen at itself', () => {
            expect(nextGameFor({ preferred: 'pokepuzzle', from: 'pokepuzzle', done: {} }))
                .toEqual({ kind: 'next', game: 'challenge' });
        });

        it('walks all four before saying the day is done', () => {
            const done = { challenge: true, pokepuzzle: true, quiz: true };
            expect(nextGameFor({ preferred: 'challenge', from: 'quiz', done })).toEqual({ kind: 'next', game: 'tierList' });
            expect(nextGameFor({ preferred: 'challenge', from: 'tierList', done: { ...done, tierList: true } }))
                .toEqual({ kind: 'allDone', game: null });
        });

        it('says nothing when the only open game is this screen’s own', () => {
            const done = { pokepuzzle: true, quiz: true, tierList: true };
            expect(nextGameFor({ preferred: 'pokepuzzle', from: 'challenge', done })).toBeNull();
        });
    });
});

describe('mergeGameRecords (this device + the account)', () => {
    const quizHere = withGameDone(null, 'quiz', NOW, { found: 9, total: 10 });
    const tierThere = withGameDone(withGameDone(null, 'tierList', NOW, { theme: 'starters' }), 'pokepuzzle', NOW);

    it('a game played today in either copy is played', () => {
        const merged = mergeGameRecords(quizHere, tierThere, NOW);
        expect(gamesDoneToday(merged, NOW)).toEqual({ challenge: false, pokepuzzle: true, quiz: true, tierList: true });
        expect(gameNoteToday(merged, 'quiz', NOW)).toMatchObject({ found: 9, total: 10 });
        expect(gameNoteToday(merged, 'tierList', NOW)).toMatchObject({ theme: 'starters' });
    });

    it('keeps only today: yesterday never comes back', () => {
        const merged = mergeGameRecords(quizHere, null, TOMORROW);
        expect(gamesDoneToday(merged, TOMORROW)).toEqual(NONE);
        expect(merged).toEqual({});
    });

    it('takes this device’s note first, and survives junk from the account', () => {
        const remote = { quiz: gameDayKey('quiz', NOW), notes: { quiz: { found: 2, total: 10, day: gameDayKey('quiz', NOW) } }, challenge: 42, tierList: { x: 1 } };
        const merged = mergeGameRecords(quizHere, remote, NOW);
        expect(gameNoteToday(merged, 'quiz', NOW)).toMatchObject({ found: 9 });
        expect(gamesDoneToday(merged, NOW)).toEqual({ ...NONE, quiz: true });
        expect(mergeGameRecords('nope', 7, NOW)).toEqual({});
    });
});
