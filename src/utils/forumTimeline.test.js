import { describe, it, expect } from 'vitest';
import { groupByDay, latestActivity, timelineGroupOf, topicsBy } from './forumTimeline';

// Local-calendar dates on purpose: the timeline follows the reader's clock,
// so the tests must hold in any time zone.
const NOW = new Date(2026, 10, 10, 15, 0).getTime();
const at = (daysBack, hour = 12) => new Date(2026, 10, 10 - daysBack, hour).toISOString();

describe('timelineGroupOf', () => {
    it('cuts on the calendar day, not on 24 hours', () => {
        expect(timelineGroupOf(at(0, 0), NOW)).toBe('today');
        // 16 hours ago, but on yesterday's date.
        expect(timelineGroupOf(at(1, 23), NOW)).toBe('yesterday');
        expect(timelineGroupOf(at(1, 0), NOW)).toBe('yesterday');
    });

    it('names the week, the month and what is older', () => {
        expect(timelineGroupOf(at(2), NOW)).toBe('week');
        expect(timelineGroupOf(at(7), NOW)).toBe('week');
        expect(timelineGroupOf(at(8), NOW)).toBe('month');
        expect(timelineGroupOf(at(30), NOW)).toBe('month');
        expect(timelineGroupOf(at(31), NOW)).toBe('older');
    });

    it('reads a clock ahead of ours as today and a missing date as older', () => {
        expect(timelineGroupOf(new Date(NOW + 5 * 60 * 1000).toISOString(), NOW)).toBe('today');
        expect(timelineGroupOf(undefined, NOW)).toBe('older');
    });
});

describe('groupByDay', () => {
    const topics = [
        { id: 'a', createdAt: at(0, 14) },
        { id: 'b', createdAt: at(0, 9) },
        { id: 'c', createdAt: at(1) },
        { id: 'd', createdAt: at(45) },
    ];

    it('keeps the order and leaves the empty stretches out', () => {
        expect(groupByDay(topics, NOW).map((g) => [g.id, g.topics.map((t) => t.id)])).toEqual([
            ['today', ['a', 'b']],
            ['yesterday', ['c']],
            ['older', ['d']],
        ]);
    });

    it('falls back to the last activity for a topic with no creation date', () => {
        expect(groupByDay([{ id: 'x', lastActivityAt: at(1) }], NOW)[0].id).toBe('yesterday');
    });

    it('answers an empty list with no groups', () => {
        expect(groupByDay([], NOW)).toEqual([]);
        expect(groupByDay(null, NOW)).toEqual([]);
    });
});

describe('latestActivity', () => {
    const topics = [
        { id: 'old', createdBy: 'u1', createdAt: at(9), lastActivityAt: at(0, 14) },
        { id: 'new', createdBy: 'u2', createdAt: at(0, 10), lastActivityAt: at(0, 10) },
        { id: 'general', createdBy: 'system', lastActivityAt: at(0, 14) },
        { id: 'quiet', createdBy: 'u3', createdAt: at(3), lastActivityAt: at(3) },
    ];

    it('orders by the last reply and leaves the pinned rooms out', () => {
        expect(latestActivity(topics, { now: NOW }).map((t) => t.id)).toEqual(['old', 'new', 'quiet']);
    });

    it('stops at the limit without touching the input', () => {
        const before = topics.map((t) => t.id);
        expect(latestActivity(topics, { limit: 1, now: NOW }).map((t) => t.id)).toEqual(['old']);
        expect(topics.map((t) => t.id)).toEqual(before);
    });
});

describe('topicsBy', () => {
    const topics = [
        { id: 'a', createdBy: 'me', createdAt: at(5) },
        { id: 'b', createdBy: 'you', createdAt: at(1) },
        { id: 'c', createdBy: 'me', createdAt: at(0) },
    ];

    it('lists a trainer\'s own topics, newest first', () => {
        expect(topicsBy(topics, 'me').map((t) => t.id)).toEqual(['c', 'a']);
    });

    it('has nothing for a visitor', () => {
        expect(topicsBy(topics, null)).toEqual([]);
    });
});
