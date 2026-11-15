import { describe, expect, it } from 'vitest';

import { dayKeyAt } from './challengeDay.js';
import {
    DAILY_GAMES, gameDayKey, gameResetAt, gamesDoneToday, nextGameFor, nextGameResetAt, withGameDone,
} from './gamesToday.js';

const NOW = new Date(2026, 10, 15, 15, 30).getTime();
const TOMORROW = NOW + 24 * 3600 * 1000;

describe('gamesToday', () => {
    it('keeps each game on its own day', () => {
        expect(gameDayKey('challenge', NOW)).toBe(dayKeyAt(NOW));
        expect(gameDayKey('pokepuzzle', NOW)).toBe('2026-11-15');
    });

    it('records a game for today and forgets it tomorrow', () => {
        const record = withGameDone({}, 'pokepuzzle', NOW);
        expect(gamesDoneToday(record, NOW)).toEqual({ challenge: false, pokepuzzle: true });
        expect(gamesDoneToday(record, TOMORROW)).toEqual({ challenge: false, pokepuzzle: false });
    });

    it('reads a missing or broken record as nothing played', () => {
        expect(gamesDoneToday(null, NOW)).toEqual({ challenge: false, pokepuzzle: false });
        expect(gamesDoneToday({ challenge: 42 }, NOW).challenge).toBe(false);
    });

    it('ignores an unknown game', () => {
        expect(withGameDone({ a: 1 }, 'tierList', NOW)).toEqual({ a: 1 });
    });

    it('resets the puzzle at local midnight and opens the next game at the earlier reset', () => {
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

        it('skips a game already played for the other one', () => {
            expect(nextGameFor({ preferred: 'challenge', from: 'tierList', done: { challenge: true } }))
                .toEqual({ kind: 'next', game: 'pokepuzzle' });
        });

        it('never points a screen at itself', () => {
            expect(nextGameFor({ preferred: 'pokepuzzle', from: 'pokepuzzle', done: {} }))
                .toEqual({ kind: 'next', game: 'challenge' });
        });

        it('says the day is done and offers the tier list once both are played', () => {
            const done = { challenge: true, pokepuzzle: true };
            expect(nextGameFor({ preferred: 'pokepuzzle', from: 'challenge', done })).toEqual({ kind: 'allDone', game: 'tierList' });
            expect(nextGameFor({ preferred: 'challenge', from: 'tierList', done })).toEqual({ kind: 'allDone', game: null });
        });

        it('offers the tier list when only this screen’s game is open (a practice battle)', () => {
            expect(nextGameFor({ preferred: 'pokepuzzle', from: 'challenge', done: { pokepuzzle: true } }))
                .toEqual({ kind: 'next', game: 'tierList' });
        });
    });
});
