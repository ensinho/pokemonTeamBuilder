import { describe, it, expect } from 'vitest';

import { RANK_LIMIT, boardOf, emptyRanks, forgetPlayer, nextRanks, placeOf, publicRanks, rankProfileOf } from './ranking.js';

const finish = (doc, uid, { won = true, score = 1200, turns = 20, teamSource = 'daily', at = '2026-10-15T15:00:00Z', profile = null } = {}) => nextRanks(doc, {
    dayKey: '2026-10-15', teamSource, uid, name: uid.toUpperCase(), status: won ? 'won' : 'lost', result: { score: won ? score : 0, turns, remaining: 2 }, at, profile,
});

describe('the daily ranking', () => {
    it('puts the Time do dia and own teams on separate boards', () => {
        expect(boardOf('daily')).toBe('daily');
        expect(boardOf('saved')).toBe('free');
        let ranks = finish(null, 'ana');
        ranks = finish(ranks, 'bia', { teamSource: 'saved' });
        expect(ranks.boards.daily.map((e) => e.uid)).toEqual(['ana']);
        expect(ranks.boards.free.map((e) => e.uid)).toEqual(['bia']);
    });

    it('ranks by score, then the quicker win, then who finished first', () => {
        let ranks = emptyRanks('2026-10-15');
        ranks = finish(ranks, 'slow', { score: 1300, turns: 30 });
        ranks = finish(ranks, 'fast', { score: 1300, turns: 12 });
        ranks = finish(ranks, 'best', { score: 1500, turns: 40 });
        ranks = finish(ranks, 'late', { score: 1300, turns: 12, at: '2026-10-15T20:00:00Z' });
        expect(ranks.boards.daily.map((e) => e.uid)).toEqual(['best', 'fast', 'late', 'slow']);
        expect(placeOf(ranks, 'daily', 'fast')).toBe(2);
        expect(placeOf(ranks, 'daily', 'nobody')).toBe(null);
    });

    it('counts every official finish, but only wins take a place', () => {
        let ranks = finish(null, 'won');
        ranks = finish(ranks, 'lost', { won: false });
        expect(ranks.played.daily).toBe(2);
        expect(ranks.wins.daily).toBe(1);
        expect(placeOf(ranks, 'daily', 'lost')).toBe(null);
    });

    it('never enters a player twice, and keeps only the top', () => {
        let ranks = finish(null, 'ana', { score: 1100 });
        ranks = finish(ranks, 'ana', { score: 1600 });
        expect(ranks.boards.daily.filter((e) => e.uid === 'ana')).toHaveLength(1);
        for (let i = 0; i < RANK_LIMIT + 5; i += 1) ranks = finish(ranks, `p${i}`, { score: 1000 + i });
        expect(ranks.boards.daily).toHaveLength(RANK_LIMIT);
        expect(ranks.boards.daily[0]).toMatchObject({ uid: 'ana', score: 1100 }); // her first score stands
        expect(ranks.boards.daily.some((e) => e.uid === 'p0')).toBe(false); // the lowest fell off
    });

    it("shows the screen the top and the caller's place, without a guest's uid", () => {
        let ranks = finish(null, 'ana', { score: 1500 });
        ranks = finish(ranks, 'me', { score: 1200 });
        const shown = publicRanks(ranks, 'me', 1);
        expect(shown.boards.daily).toEqual([{ name: 'ANA', score: 1500, turns: 20, remaining: 2, at: '2026-10-15T15:00:00Z', profile: null, uid: null, me: false }]);
        expect(shown.mine).toEqual({ daily: 2, free: null });
        expect(JSON.stringify(shown)).not.toMatch(/"ana"/);
        expect(publicRanks(null, 'me')).toBe(null);
    });

    it('takes a deleted account off the boards and keeps the day totals', () => {
        let ranks = finish(null, 'ana', { score: 1500 });
        ranks = finish(ranks, 'bia', { score: 1300, teamSource: 'saved' });
        ranks = finish(ranks, 'ana2', { score: 1200 });
        expect(ranks.players.sort()).toEqual(['ana', 'ana2', 'bia']);
        const forgotten = forgetPlayer(ranks, 'ana');
        expect(forgotten.boards.daily.map((e) => e.uid)).toEqual(['ana2']);
        expect(forgotten.players.sort()).toEqual(['ana2', 'bia']);
        expect(forgotten.played).toEqual(ranks.played);
        expect(forgotten.wins).toEqual(ranks.wins);
    });

    it('stamps the public face of a win, shaped, with the uid its public profile already shows', () => {
        const ranks = finish(null, 'ana', {
            profile: { displayName: 'Ana', avatarPokemonId: 94, avatarIsShiny: true, trainerSprite: null, frameId: 'frame-ghost', titleId: 'x'.repeat(200), trainerLevel: 7, battleRecord: { wins: 3 } },
        });
        const [row] = publicRanks(ranks, null).boards.daily;
        expect(row.profile).toEqual({ avatarPokemonId: 94, avatarIsShiny: true, trainerSprite: null, frameId: 'frame-ghost', titleId: null, level: 7 });
        expect(row.uid).toBe('ana');
        expect(JSON.stringify(row)).not.toMatch(/battleRecord/);
        expect(rankProfileOf(null)).toBe(null);
        expect(rankProfileOf({ avatarPokemonId: -1, trainerLevel: 'nine' })).toMatchObject({ avatarPokemonId: null, level: null });
    });
});

describe('Sua liga (2026-11-06)', () => {
    it('returns the circle with real places', async () => {
        const { friendBoards } = await import('./ranking.js');
        let ranks = finish(null, 'ana', { score: 1500 });
        ranks = finish(ranks, 'x', { score: 1400 });
        ranks = finish(ranks, 'me', { score: 1200 });
        const f = friendBoards(ranks, 'me', ['ana']);
        expect(f.daily.map((r) => [r.name, r.place, r.me])).toEqual([['ANA', 1, false], ['ME', 3, true]]);
    });

    it('names the friends a finish passed', async () => {
        const { passedFriends } = await import('./ranking.js');
        let before = finish(null, 'ana', { score: 1500 });
        before = finish(before, 'bia', { score: 1300 });
        const after = finish(before, 'me', { score: 1400 });
        expect(passedFriends(before, after, 'daily', 'me', ['ana', 'bia'])).toEqual(['bia']);
        expect(passedFriends(before, before, 'daily', 'me', ['bia'])).toEqual([]);
    });
});
