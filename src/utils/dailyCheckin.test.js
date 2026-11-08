import { describe, expect, it } from 'vitest';
import {
    MAX_SHIELDS,
    applyCheckin,
    checkinCalendar,
    dayDiff,
    liveStreak,
    localDayKey,
    mergeCheckins,
    mergeStreaks,
    normalizeStreak,
    settleCheckin,
} from './dailyCheckin';
import { CHECKIN_CYCLE_XP } from './trainerLevel';

describe('dayDiff', () => {
    it('counts calendar days, across months and a DST change', () => {
        expect(dayDiff('2026-10-17', '2026-10-17')).toBe(0);
        expect(dayDiff('2026-10-17', '2026-10-18')).toBe(1);
        expect(dayDiff('2026-10-31', '2026-11-01')).toBe(1);
        expect(dayDiff('2026-02-28', '2026-03-01')).toBe(1);
        expect(dayDiff('2026-03-07', '2026-03-09')).toBe(2);
    });

    it('is null for a missing or malformed day', () => {
        expect(dayDiff(null, '2026-10-17')).toBeNull();
        expect(dayDiff('2026-10-17T00:00', '2026-10-17')).toBeNull();
    });
});

describe('localDayKey', () => {
    it('formats the local calendar day', () => {
        expect(localDayKey(new Date(2026, 0, 5, 23, 50))).toBe('2026-01-05');
    });
});

describe('applyCheckin', () => {
    it('starts a first-time trainer on day one of both counters', () => {
        const next = applyCheckin({}, '2026-10-17');
        expect(next.checkin).toEqual({ count: 1, lastDay: '2026-10-17' });
        expect(next.streak).toMatchObject({ count: 1, longest: 1, lastVisit: '2026-10-17', shields: 0 });
        expect(next.result).toMatchObject({ count: 1, cycleDay: 1, xp: CHECKIN_CYCLE_XP[0], streak: 1 });
    });

    it('is a no-op the second time on the same day', () => {
        const first = applyCheckin({}, '2026-10-17');
        expect(applyCheckin(first, '2026-10-17')).toBeNull();
    });

    it('extends the streak on consecutive days', () => {
        const day1 = applyCheckin({}, '2026-10-17');
        const day2 = applyCheckin(day1, '2026-10-18');
        expect(day2.streak.count).toBe(2);
        expect(day2.result.cycleDay).toBe(2);
    });

    it('lets a shield cover exactly one missed day', () => {
        const state = { checkin: { count: 9, lastDay: '2026-10-15' }, streak: { count: 9, longest: 9, lastVisit: '2026-10-15', shields: 1 } };
        const next = applyCheckin(state, '2026-10-17');
        expect(next.streak).toMatchObject({ count: 10, shields: 0 });
        expect(next.result.usedShield).toBe(true);
    });

    it('resets the streak after a longer gap, but never the check-in cycle', () => {
        const state = { checkin: { count: 3, lastDay: '2026-10-10' }, streak: { count: 3, longest: 12, lastVisit: '2026-10-10', shields: 2 } };
        const next = applyCheckin(state, '2026-10-17');
        expect(next.streak).toMatchObject({ count: 1, longest: 12, shields: 2 });
        expect(next.result.usedShield).toBe(false);
        expect(next.result.cycleDay).toBe(4);
    });

    it('earns a shield every seven days in a row, up to the cap', () => {
        let state = {};
        const days = Array.from({ length: 28 }, (_, i) => `2026-10-${String(i + 1).padStart(2, '0')}`);
        const earned = [];
        for (const day of days) {
            state = applyCheckin(state, day);
            if (state.result.earnedShield) earned.push(state.streak.count);
        }
        expect(earned).toEqual([7, 14]);
        expect(state.streak.shields).toBe(MAX_SHIELDS);
        expect(state.result.cycleComplete).toBe(true);
    });

    it('does not double-count a day the puzzle already advanced', () => {
        // An older build advanced the streak from the puzzle without a check-in.
        const state = { checkin: { count: 4, lastDay: '2026-10-16' }, streak: { count: 5, longest: 5, lastVisit: '2026-10-17', shields: 0 } };
        const next = applyCheckin(state, '2026-10-17');
        expect(next.streak.count).toBe(5);
        expect(next.checkin.count).toBe(5);
    });
});

describe('liveStreak', () => {
    it('keeps the count through today and yesterday', () => {
        expect(liveStreak({ count: 4, lastVisit: '2026-10-17' }, '2026-10-17')).toBe(4);
        expect(liveStreak({ count: 4, lastVisit: '2026-10-16' }, '2026-10-17')).toBe(4);
    });

    it('keeps it one day longer with a shield, and drops it after', () => {
        expect(liveStreak({ count: 4, lastVisit: '2026-10-15', shields: 1 }, '2026-10-17')).toBe(4);
        expect(liveStreak({ count: 4, lastVisit: '2026-10-15', shields: 0 }, '2026-10-17')).toBe(0);
        expect(liveStreak({ count: 4, lastVisit: '2026-10-10', shields: 2 }, '2026-10-17')).toBe(0);
        expect(liveStreak({}, '2026-10-17')).toBe(0);
    });
});

describe('normalizeStreak', () => {
    it('clamps shields and keeps longest at least the count', () => {
        expect(normalizeStreak({ count: 5, longest: 2, shields: 9 })).toMatchObject({ count: 5, longest: 5, shields: MAX_SHIELDS });
    });
});

describe('checkinCalendar', () => {
    it('shows the next day as today before the check-in', () => {
        const cal = checkinCalendar({ count: 2, lastDay: '2026-10-16' }, '2026-10-17');
        expect(cal.doneToday).toBe(false);
        expect(cal.todayIndex).toBe(3);
        expect(cal.days.filter((d) => d.claimed).map((d) => d.day)).toEqual([1, 2]);
        expect(cal.xpToday).toBe(CHECKIN_CYCLE_XP[2]);
    });

    it('marks today claimed after the check-in', () => {
        const cal = checkinCalendar({ count: 3, lastDay: '2026-10-17' }, '2026-10-17');
        expect(cal.doneToday).toBe(true);
        expect(cal.todayIndex).toBe(3);
        expect(cal.days.filter((d) => d.claimed).map((d) => d.day)).toEqual([1, 2, 3]);
    });

    it('starts a fresh strip once a cycle is complete', () => {
        const cal = checkinCalendar({ count: 7, lastDay: '2026-10-16' }, '2026-10-17');
        expect(cal.todayIndex).toBe(1);
        expect(cal.days.some((d) => d.claimed)).toBe(false);
    });
});

describe('mergeStreaks', () => {
    const account = { count: 22, longest: 22, lastVisit: '2026-11-07', shields: 2 };

    it('keeps the copy that saw the later day when the runs do not touch', () => {
        const fresh = { count: 1, longest: 1, lastVisit: '2026-11-08', shields: 0 };
        const old = { count: 9, longest: 9, lastVisit: '2026-11-01', shields: 0 };
        expect(mergeStreaks(old, fresh)).toMatchObject({ count: 1, longest: 9, lastVisit: '2026-11-08' });
    });

    // 2026-11-08: a device a week behind checked in from its own copy (a run
    // of 1) and that replaced the account's 22 days.
    it('joins a run of 1 counted from a stale copy onto the live run before it', () => {
        const stale = { count: 1, longest: 14, lastVisit: '2026-11-08', shields: 2 };
        expect(mergeStreaks(stale, account)).toMatchObject({ count: 23, longest: 23, lastVisit: '2026-11-08' });
        expect(mergeStreaks(account, stale).count).toBe(23);
    });

    it('joins overlapping runs without counting a day twice', () => {
        const other = { count: 3, longest: 3, lastVisit: '2026-11-08', shields: 0 };
        expect(mergeStreaks(account, other).count).toBe(23);
    });

    it('joins across one missed day only when a shield covers it', () => {
        const later = { count: 1, longest: 1, lastVisit: '2026-11-09', shields: 0 };
        expect(mergeStreaks(account, later).count).toBe(23);
        expect(mergeStreaks({ ...account, shields: 0 }, later).count).toBe(1);
    });

    it('takes the higher count for the same day', () => {
        const reset = { count: 1, longest: 1, lastVisit: '2026-11-07', shields: 0 };
        expect(mergeStreaks(reset, account)).toMatchObject({ count: 22, shields: 2 });
    });
});

describe('mergeCheckins', () => {
    it('keeps the larger count and the later day', () => {
        expect(mergeCheckins({ count: 4, lastDay: '2026-11-08' }, { count: 22, lastDay: '2026-11-07' }))
            .toEqual({ count: 22, lastDay: '2026-11-08' });
    });
});

describe('settleCheckin', () => {
    const remote = {
        checkin: { count: 22, lastDay: '2026-11-07' },
        streak: { count: 22, longest: 22, lastVisit: '2026-11-07', shields: 2 },
    };

    it('counts the day on top of the account copy, not the stale device copy', () => {
        const base = {
            checkin: { count: 15, lastDay: '2026-10-31' },
            streak: { count: 15, longest: 15, lastVisit: '2026-10-31', shields: 2 },
        };
        const settled = settleCheckin({ base, day: '2026-11-08' }, remote);
        expect(settled.checkin).toEqual({ count: 23, lastDay: '2026-11-08' });
        expect(settled.streak).toMatchObject({ count: 23, lastVisit: '2026-11-08' });
    });

    it('settles a check-in made before the profile loaded on an empty device', () => {
        const settled = settleCheckin({ base: {}, day: '2026-11-08' }, remote);
        expect(settled.streak.count).toBe(23);
        expect(settled.checkin.count).toBe(23);
    });

    it('does not count a day the account already counted', () => {
        const done = { ...remote, checkin: { count: 23, lastDay: '2026-11-08' }, streak: { ...remote.streak, count: 23, lastVisit: '2026-11-08' } };
        const settled = settleCheckin({ base: {}, day: '2026-11-08' }, done);
        expect(settled.checkin.count).toBe(23);
        expect(settled.streak.count).toBe(23);
    });
});
