import { describe, expect, it } from 'vitest';
import { caseLeaders, chooseGame, mergeBadgeCases, nextLeader, normalizeBadgeCase, toggleBadge } from './badgeCase';

const game = {
    key: 'red-blue',
    leaders: [
        ...Array.from({ length: 8 }, (_, i) => ({ order: i + 1, name: `L${i + 1}`, badge: `B${i + 1}` })),
        { order: 9, name: 'Lorelei' },
    ],
};

describe('badge case', () => {
    it('cleans what it is given', () => {
        expect(normalizeBadgeCase({ game: 'red-blue', earned: { 'red-blue': [3, 1, 1, 99, 'x'], 'BAD KEY': [1] }, updatedAt: 5 }))
            .toEqual({ game: 'red-blue', earned: { 'red-blue': [1, 3] }, updatedAt: 5 });
        expect(normalizeBadgeCase(null)).toEqual({ game: null, earned: {}, updatedAt: null });
    });

    it('holds the eight gym leaders, not the Elite Four', () => {
        expect(caseLeaders(game).map((l) => l.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    });

    it('toggles a badge and points at the next leader', () => {
        let c = toggleBadge(null, 'red-blue', 1, 10);
        c = toggleBadge(c, 'red-blue', 2, 11);
        expect(c.earned['red-blue']).toEqual([1, 2]);
        expect(nextLeader(caseLeaders(game), c.earned['red-blue']).order).toBe(3);
        c = toggleBadge(c, 'red-blue', 2, 12);
        expect(c.earned['red-blue']).toEqual([1]);
        expect(c.updatedAt).toBe(12);
        expect(nextLeader(caseLeaders(game), [1, 2, 3, 4, 5, 6, 7, 8])).toBeNull();
    });

    it('lets the copy touched last win', () => {
        const older = toggleBadge(null, 'red-blue', 1, 10);
        const newer = chooseGame(null, 'x-y', 20);
        expect(mergeBadgeCases(older, newer).game).toBe('x-y');
        expect(mergeBadgeCases(newer, older).game).toBe('x-y');
    });
});

describe('caseGame', () => {
    const games = [{ key: 'red-blue' }, { key: 'scarlet-violet' }, { key: 'x-y' }];
    it('is the trainer\'s pick, then the default, then the first listed', async () => {
        const { caseGame } = await import('./badgeCase');
        expect(caseGame(games, { game: 'x-y' }).key).toBe('x-y');
        expect(caseGame(games, { game: 'unknown' }).key).toBe('scarlet-violet');
        expect(caseGame(games, null).key).toBe('scarlet-violet');
        expect(caseGame([{ key: 'gold-silver' }], null).key).toBe('gold-silver');
    });
    it('is null while nothing has loaded', async () => {
        const { caseGame } = await import('./badgeCase');
        expect(caseGame([], { game: 'x-y' })).toBeNull();
    });
});
