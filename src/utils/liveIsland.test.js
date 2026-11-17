import { describe, it, expect } from 'vitest';
import { pickLive } from './liveIsland';

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

    it('stays away once put away, until it changes', () => {
        const first = pickLive({ quiz, path: '/' });
        expect(pickLive({ quiz, path: '/', dismissed: { quiz: first.sig } })).toBe(null);
        expect(pickLive({ quiz: { ...quiz, found: 8 }, path: '/', dismissed: { quiz: first.sig } }).kind).toBe('quiz');
    });
});
