import { describe, expect, it } from 'vitest';
import {
    buildFriendActivity,
    centerCounts,
    championEvents,
    compareGuesses,
    friendEvents,
    friendsActiveToday,
    postEvents,
    puzzleEvents,
    topicEvents,
} from './friendActivity';

const NOW = Date.parse('2026-11-09T18:00:00Z');
const ana = { userId: 'ana', displayName: 'Ana', avatarPokemonId: 25 };
const bia = { userId: 'bia', displayName: 'Bia', streak: { count: 30, lastVisit: '2026-11-09' } };
const friendIds = new Set(['ana', 'bia']);

const ranks = {
    dayKey: '2026-11-09',
    boards: {
        daily: [
            { uid: 'zed', name: 'Zed', turns: 9, at: '2026-11-09T12:10:00Z' },
            { uid: 'ana', name: 'Ana (old)', turns: 12, at: '2026-11-09T15:00:00Z' },
        ],
        free: [{ uid: 'bia', name: 'Bia', turns: 20, at: '2026-11-09T13:00:00Z' }],
    },
    played: { daily: 40, free: 12 },
    wins: { daily: 10, free: 3 },
};

describe('championEvents', () => {
    it('keeps friends only, with their place on each board', () => {
        const events = championEvents(ranks, 'cynthia', friendIds);
        expect(events.map((e) => [e.uid, e.board, e.place, e.turns])).toEqual([
            ['ana', 'daily', 2, 12],
            ['bia', 'free', 1, 20],
        ]);
    });
    it('is empty without boards or friends', () => {
        expect(championEvents(null, 'cynthia', friendIds)).toEqual([]);
        expect(championEvents(ranks, 'cynthia', new Set())).toEqual([]);
    });
});

describe('puzzleEvents', () => {
    it('carries the grid and guess count, never letters', () => {
        const [e] = puzzleEvents([{ uid: 'ana', rows: ['ppa', 'ccc'], won: true, guesses: 2, at: 'x' }], '2026-11-09');
        expect(e).toMatchObject({ kind: 'puzzle', won: true, guesses: 2, rows: ['ppa', 'ccc'], dayKey: '2026-11-09' });
    });
});

describe('postEvents', () => {
    it('words what the post carried and clips long text', () => {
        const long = 'a'.repeat(200);
        const events = postEvents([
            { id: 'm1', createdBy: 'ana', text: long, sharedPuzzle: { rows: ['c'] }, createdAt: 'x' },
            { id: 'm2', createdBy: 'zed', text: 'hi' },
        ], 'diary-2026-11-09', friendIds, '2026-11-09');
        expect(events).toHaveLength(1);
        expect(events[0].attachment).toBe('puzzle');
        expect(events[0].text.length).toBeLessThanOrEqual(90);
        expect(events[0].dayKey).toBe('2026-11-09');
    });
});

describe('topicEvents', () => {
    it('keeps friends\' topics from the last two days', () => {
        const events = topicEvents([
            { id: 't1', createdBy: 'ana', title: 'Novo', createdAt: '2026-11-09T10:00:00Z' },
            { id: 't2', createdBy: 'ana', title: 'Velho', createdAt: '2026-11-01T10:00:00Z' },
            { id: 't3', createdBy: 'zed', title: 'Outro', createdAt: '2026-11-09T10:00:00Z' },
        ], friendIds, NOW);
        expect(events.map((e) => e.topicId)).toEqual(['t1']);
    });
});

describe('friendEvents', () => {
    it('announces a milestone streak reached today and a new friendship', () => {
        const events = friendEvents([
            bia,
            { userId: 'cid', streak: { count: 31, lastVisit: '2026-11-09' } },
            { userId: 'dan', streak: { count: 30, lastVisit: '2026-11-08' } },
            { userId: 'eva', since: '2026-11-07T10:00:00Z' },
            { userId: 'fil', since: '2026-10-01T10:00:00Z' },
        ], { today: '2026-11-09', now: NOW });
        expect(events.map((e) => `${e.kind}:${e.uid}`)).toEqual(['streak:bia', 'friend:eva']);
    });
});

describe('compareGuesses', () => {
    it('ranks a miss below any win', () => {
        expect(compareGuesses({ won: true, guesses: 3 }, { won: true, guesses: 4 })).toBe('ahead');
        expect(compareGuesses({ won: false, guesses: 8 }, { won: true, guesses: 8 })).toBe('behind');
        expect(compareGuesses({ won: true, guesses: 4 }, { won: true, guesses: 4 })).toBe('tied');
        expect(compareGuesses(null, { won: true })).toBeNull();
    });
});

describe('buildFriendActivity', () => {
    const input = {
        friends: [ana, bia],
        selfUid: 'me',
        ranks: { cynthia: ranks, blue: { ...ranks, dayKey: '2026-11-09', boards: { daily: [], free: [] } } },
        puzzles: [{ dayKey: '2026-11-09', rows: [{ uid: 'ana', rows: ['ccc'], won: true, guesses: 1, at: '2026-11-09T16:00:00Z' }, { uid: 'zed', rows: [], at: '2026-11-09T17:00:00Z' }] }],
        posts: [{ topicId: 'diary-2026-11-09', dayKey: '2026-11-09', messages: [{ id: 'm', createdBy: 'bia', text: 'oi', createdAt: '2026-11-09T17:30:00Z' }] }],
        today: '2026-11-09',
        myPuzzle: { won: true, guesses: 3 },
        now: NOW,
    };

    it('merges every source, newest first, with the friend\'s current card', () => {
        const events = buildFriendActivity(input);
        expect(events.map((e) => `${e.kind}:${e.uid}`)).toEqual([
            'post:bia', 'puzzle:ana', 'champion:ana', 'champion:bia', 'streak:bia',
        ]);
        expect(events.find((e) => e.kind === 'champion' && e.uid === 'ana').name).toBe('Ana');
        expect(events.find((e) => e.kind === 'puzzle').vsMe).toBe('ahead');
    });

    it('never shows the trainer\'s own events and is empty with no friends', () => {
        expect(buildFriendActivity({ ...input, friends: [] })).toEqual([]);
        const self = buildFriendActivity({ ...input, selfUid: 'ana' });
        expect(self.some((e) => e.uid === 'ana')).toBe(false);
    });

    it('drops duplicates and respects the limit', () => {
        const doubled = buildFriendActivity({ ...input, puzzles: [...input.puzzles, ...input.puzzles], limit: 2 });
        expect(doubled).toHaveLength(2);
        const all = buildFriendActivity({ ...input, puzzles: [...input.puzzles, ...input.puzzles] });
        expect(all.filter((e) => e.kind === 'puzzle')).toHaveLength(1);
    });
});

describe('friendsActiveToday', () => {
    it('lists each friend once, only for today\'s play', () => {
        const events = buildFriendActivity({
            friends: [ana, bia],
            ranks: { cynthia: ranks },
            puzzles: [{ dayKey: '2026-11-08', rows: [{ uid: 'bia', rows: [], at: '2026-11-08T10:00:00Z' }] }],
            now: NOW,
        });
        const active = friendsActiveToday(events, ['2026-11-09']);
        expect(active.map((f) => f.userId)).toEqual(['ana', 'bia']);
        expect(friendsActiveToday(events, ['2026-11-10'])).toEqual([]);
    });
});

describe('centerCounts', () => {
    it('sums both champions and both boards', () => {
        expect(centerCounts({ puzzleDay: { total: 142 }, ranks: { cynthia: ranks, blue: ranks } }))
            .toEqual({ puzzle: 142, champions: 104, championWins: 26 });
        expect(centerCounts()).toEqual({ puzzle: 0, champions: 0, championWins: 0 });
    });
});
