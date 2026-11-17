import { describe, it, expect } from 'vitest';
import {
    dayReceipt, normalizeRound, receiptBars, receiptReady, roundReceipt, trainerNumber, withBaseline, withFullDay, withRoundTaken,
} from './roundReceipt';

const today = (over = {}) => ({
    challenge: { done: false },
    puzzle: { n: 412, done: false },
    quiz: { list: 'johto-starters', done: false },
    tier: { theme: 'ghosts', done: true },
    passed: [],
    streak: 0,
    ...over,
});

describe('the round record', () => {
    it('normalises whatever was stored', () => {
        expect(normalizeRound(null)).toEqual({ v: 1, last: null, seenDay: null, fullDays: 0, lastFullDay: null, daySeen: null });
        const r = normalizeRound({ last: { day: '2026-11-16', at: 5, metaMonth: 'oops', ranks: { 445: 3, '<x>': 2, 6: -1 } }, fullDays: -4, seenDay: 7 });
        expect(r.last).toEqual({ day: '2026-11-16', at: 5, metaMonth: null, ranks: { 445: 3 } });
        expect(r.fullDays).toBe(0);
        expect(r.seenDay).toBe(null);
    });

    it('gives a brand-new trainer a baseline, not a receipt', () => {
        const fresh = withBaseline(normalizeRound(null), { dayKey: '2026-11-17', at: 1 });
        expect(fresh.last.day).toBe('2026-11-17');
        expect(receiptReady(fresh, '2026-11-17')).toBe(false);
        expect(receiptReady(fresh, '2026-11-18')).toBe(true);
        // a baseline never replaces what is there
        expect(withBaseline(fresh, { dayKey: '2026-11-20', at: 9 }).last.day).toBe('2026-11-17');
    });

    it('offers the receipt once a day', () => {
        const before = normalizeRound({ last: { day: '2026-11-16', at: 1 } });
        expect(receiptReady(before, '2026-11-17')).toBe(true);
        const taken = withRoundTaken(before, { dayKey: '2026-11-17', at: 2 });
        expect(receiptReady(taken, '2026-11-17')).toBe(false);
        expect(taken.last.day).toBe('2026-11-17');
    });

    it('counts a full day once, and never takes one away', () => {
        let r = normalizeRound(null);
        r = withFullDay(r, '2026-11-16');
        r = withFullDay(r, '2026-11-16');
        r = withFullDay(r, '2026-11-18');
        expect(r.fullDays).toBe(2);
        expect(r.lastFullDay).toBe('2026-11-18');
    });
});

describe('roundReceipt', () => {
    it('lists the four games of the day, open ones as news', () => {
        const { rows, news } = roundReceipt(normalizeRound({ last: { day: '2026-11-16', at: 0 } }), today());
        expect(rows.map((r) => r.id)).toEqual(['challenge', 'puzzle', 'quiz', 'tier']);
        expect(rows[0].value).toBe('newTeam');
        expect(rows[3].value).toBe('played');
        expect(news).toBe(3);
    });

    it('names a friend who passed the trainer since the last round, once, newest first', () => {
        const round = normalizeRound({ last: { day: '2026-11-16', at: Date.parse('2026-11-16T12:00:00Z') } });
        const passed = [
            { name: 'Bia', at: '2026-11-16T20:00:00Z' },
            { name: 'Bia', at: '2026-11-16T21:00:00Z' },
            { name: 'Leo', at: '2026-11-16T22:00:00Z' },
            { name: 'Old', at: '2026-11-15T22:00:00Z' },
            { name: 'Caio', at: '2026-11-16T23:00:00Z' },
        ];
        const rows = roundReceipt(round, today({ passed })).rows.filter((r) => r.id === 'passed');
        expect(rows.map((r) => r.params.name)).toEqual(['Caio', 'Leo']);
        expect(rows.every((r) => r.bold)).toBe(true);
    });

    it('follows the team in the meta only when a new month of usage landed', () => {
        const round = normalizeRound({ last: { day: '2026-11-16', at: 0, metaMonth: '2026-09', ranks: { 445: 3, 983: 10, 6: 20 } } });
        const same = roundReceipt(round, today({ metaMonth: '2026-09', ranks: { 445: 5 } }));
        expect(same.rows.some((r) => r.id === 'meta')).toBe(false);
        const moved = roundReceipt(round, today({ metaMonth: '2026-10', ranks: { 445: 5, 983: 10, 6: 2 }, names: { 445: 'Garchomp', 6: 'Charizard' } }));
        const meta = moved.rows.filter((r) => r.id === 'meta');
        expect(meta.map((r) => r.params.name)).toEqual(['Charizard', 'Garchomp']);
        expect(meta[0]).toMatchObject({ value: 'up', params: { from: 20, to: 2 } });
        expect(meta[1]).toMatchObject({ value: 'down', params: { from: 3, to: 5 } });
    });

    it('states the streak, never a threat', () => {
        expect(roundReceipt(normalizeRound(null), today({ streak: 12 })).rows.find((r) => r.id === 'streak')).toMatchObject({ value: 'streak', news: false });
        expect(roundReceipt(normalizeRound(null), today({ streak: 1 })).rows.some((r) => r.id === 'streak')).toBe(false);
    });
});

describe('dayReceipt', () => {
    it('words each game from what it noted', () => {
        const day = dayReceipt(
            { challenge: true, pokepuzzle: true, quiz: true, tierList: true },
            { challenge: { won: true, turns: 14 }, puzzle: { solved: true, attempts: 4 }, quiz: { found: 9, total: 9 }, tier: 'ghosts' },
        );
        expect(day.complete).toBe(true);
        expect(day.rows.map((r) => r.value)).toEqual(['wonIn', 'solvedIn', 'named', 'ranked']);
        expect(day.rows[2].bold).toBe(true);
    });

    it('keeps an unplayed game open', () => {
        const day = dayReceipt({ challenge: true }, {});
        expect(day.played).toBe(1);
        expect(day.complete).toBe(false);
        expect(day.rows[1].value).toBe('open');
    });
});

describe('the code', () => {
    it('is twelve digits of the trainer, the same every time', () => {
        expect(trainerNumber('abc')).toMatch(/^\d{4} \d{4} \d{4}$/);
        expect(trainerNumber('abc')).toBe(trainerNumber('abc'));
        expect(trainerNumber('abc')).not.toBe(trainerNumber('abd'));
    });

    it('draws as bars', () => {
        const { bars, width } = receiptBars('0916 1126 0014');
        expect(bars).toHaveLength(44);
        expect(width).toBeGreaterThan(44);
        expect(bars.every(([x, w]) => Number.isFinite(x) && w >= 1 && w <= 3)).toBe(true);
    });
});
