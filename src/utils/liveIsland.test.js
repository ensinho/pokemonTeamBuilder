import { describe, it, expect } from 'vitest';
import { dayMood, gameOfPath, isGamesPath, pickLive } from './liveIsland';

const battle = { id: 'b1', name: 'Bia', count: 1 };
const quiz = { found: 7, total: 10, list: 'Johto' };
const puzzle = { attempts: 3, max: 8, n: 412 };

describe('pickLive', () => {
    it('shows nothing when nothing is live', () => {
        expect(pickLive({ path: '/' })).toBe(null);
    });

    it('puts the friend waiting first', () => {
        expect(pickLive({ battle, quiz, puzzle, path: '/pokedex' }).kind).toBe('battle');
        expect(pickLive({ quiz, puzzle, path: '/pokedex' }).kind).toBe('quiz');
        expect(pickLive({ puzzle, receipt: { news: 3 }, path: '/pokedex' }).kind).toBe('puzzle');
    });

    it('never shows a thing on its own page, and steps aside for the coach and the console', () => {
        expect(pickLive({ quiz, path: '/quiz' })).toBe(null);
        expect(pickLive({ battle, quiz, path: '/battles' }).kind).toBe('quiz');
        expect(pickLive({ receipt: { news: 1 }, path: '/' })).toBe(null);
        expect(pickLive({ battle, coach: true, path: '/pokedex' })).toBe(null);
        expect(pickLive({ battle, path: '/challenge' })).toBe(null);
        expect(pickLive({ quiz, path: '/battles/b1' })).toBe(null);
    });

    it('keeps a started game only while it is half-way', () => {
        expect(pickLive({ quiz: { found: 0, total: 10 }, path: '/' })).toBe(null);
        expect(pickLive({ quiz: { found: 10, total: 10 }, path: '/' })).toBe(null);
        expect(pickLive({ puzzle: { attempts: 8, max: 8 }, path: '/' })).toBe(null);
    });

    it('is always there inside the games, holding the day (Enzo, 2026-11-17)', () => {
        const day = { played: 2, total: 4 };
        for (const path of ['/games', '/quiz', '/pokepuzzle', '/tier-list']) {
            expect(pickLive({ day, quiz, path }), path).toMatchObject({ kind: 'day', played: 2, total: 4 });
        }
        // a friend waiting still comes first
        expect(pickLive({ day, battle, path: '/quiz' }).kind).toBe('battle');
        // the receipt rides along in the day's card
        expect(pickLive({ day, receipt: { news: 1 }, path: '/games' }).receipt).toBe(true);
        // not in the Champion's console, not beside the coach, not outside the games
        expect(pickLive({ day, path: '/challenge' })).toBe(null);
        expect(pickLive({ day, coach: true, path: '/games' })).toBe(null);
        expect(pickLive({ day, path: '/pokedex' })).toBe(null);
        // put away, it comes back when the day moves
        const first = pickLive({ day, path: '/games' });
        expect(pickLive({ day, path: '/games', dismissed: { day: first.sig } })).toBe(null);
        expect(pickLive({ day: { played: 3, total: 4 }, path: '/games', dismissed: { day: first.sig } }).kind).toBe('day');
    });

    it('reads the day for his face and the page for its game', () => {
        expect(dayMood({ played: 0, total: 4 })).toBe('determinado');
        expect(dayMood({ played: 2, total: 4 })).toBe('feliz');
        expect(dayMood({ played: 4, total: 4 })).toBe('orgulhoso');
        expect(gameOfPath('/tier-list')).toBe('tierList');
        expect(gameOfPath('/games')).toBe(null);
        expect(isGamesPath('/quiz')).toBe(true);
        expect(isGamesPath('/quizzes')).toBe(false);
    });

    it('stays away once put away, until it changes', () => {
        const first = pickLive({ quiz, path: '/' });
        expect(pickLive({ quiz, path: '/', dismissed: { quiz: first.sig } })).toBe(null);
        expect(pickLive({ quiz: { ...quiz, found: 8 }, path: '/', dismissed: { quiz: first.sig } }).kind).toBe('quiz');
    });
});
