import { describe, it, expect } from 'vitest';

import {
    dayKeyAt, nextResetAt, weekdayOf, previousDayKey, shiftDayKey, daysBetween, isoWeekOf, isDayKey,
} from './day.js';

// Brasília has been a fixed UTC−3 since 2019, so these instants are unambiguous.
const brt = (iso) => Date.parse(`${iso}-03:00`);

describe('challenge day (America/Sao_Paulo)', () => {
    it('turns at midnight in Brasília, not in UTC', () => {
        expect(dayKeyAt(brt('2026-10-14T23:59:59'))).toBe('2026-10-14');
        expect(dayKeyAt(brt('2026-10-15T00:00:00'))).toBe('2026-10-15');
        // 23:30 in Brasília is already the next day in UTC.
        expect(dayKeyAt(Date.parse('2026-10-15T02:30:00Z'))).toBe('2026-10-14');
    });

    it('crosses month and year boundaries', () => {
        expect(dayKeyAt(brt('2026-10-31T23:59:59'))).toBe('2026-10-31');
        expect(dayKeyAt(brt('2026-11-01T00:00:00'))).toBe('2026-11-01');
        expect(dayKeyAt(brt('2026-12-31T23:59:59'))).toBe('2026-12-31');
        expect(dayKeyAt(brt('2027-01-01T00:00:00'))).toBe('2027-01-01');
        expect(previousDayKey('2027-01-01')).toBe('2026-12-31');
        expect(previousDayKey('2028-03-01')).toBe('2028-02-29');
        expect(shiftDayKey('2026-12-30', 3)).toBe('2027-01-02');
    });

    it('knows when the next team arrives', () => {
        expect(nextResetAt(brt('2026-10-14T10:00:00'))).toBe(brt('2026-10-15T00:00:00'));
        expect(nextResetAt(brt('2026-10-14T23:59:59'))).toBe(brt('2026-10-15T00:00:00'));
        expect(nextResetAt(brt('2026-10-15T00:00:00'))).toBe(brt('2026-10-16T00:00:00'));
        expect(nextResetAt(brt('2026-12-31T22:00:00'))).toBe(brt('2027-01-01T00:00:00'));
    });

    it('matches the calendar weekday', () => {
        expect(weekdayOf('2026-10-14')).toBe(3); // Wednesday
        expect(weekdayOf('2026-10-18')).toBe(0); // Sunday
        expect(weekdayOf('2027-01-01')).toBe(5); // Friday
    });

    it('counts days and ISO weeks', () => {
        expect(daysBetween('2026-10-01', '2026-10-14')).toBe(13);
        expect(daysBetween('2026-10-14', '2026-10-01')).toBe(-13);
        expect(isoWeekOf('2026-10-14')).toBe('2026-W42');
        expect(isoWeekOf('2027-01-01')).toBe('2026-W53');
        expect(isDayKey('2026-10-14')).toBe(true);
        expect(isDayKey('14/10/2026')).toBe(false);
    });

    it('agrees with a plain −3 h shift over a year of hourly instants', () => {
        const start = brt('2026-01-01T00:00:00');
        for (let h = 0; h < 24 * 366; h += 7) {
            const ms = start + h * 3_600_000;
            const shifted = new Date(ms - 3 * 3_600_000).toISOString().slice(0, 10);
            expect(dayKeyAt(ms)).toBe(shifted);
        }
    });
});
