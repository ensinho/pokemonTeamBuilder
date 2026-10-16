import { describe, it, expect } from 'vitest';

import * as server from '../../api/_lib/challenge/day.js';
import { effectiveStreak as serverStreak } from '../../api/_lib/challenge/outcome.js';
import { challengeSummaryState, dayKeyAt, effectiveStreak, nextResetAt, previousDayKey } from './challengeDay';

describe('the challenge day on the client', () => {
    it('mirrors the server over 800 instants, including the minutes around midnight', () => {
        const start = Date.UTC(2026, 0, 1, 2, 30);
        for (let i = 0; i < 800; i += 1) {
            // Walk ~11 h at a time, plus a few seconds either side of each Brasília midnight.
            const base = start + i * 11 * 3_600_000 + (i % 7) * 61_000;
            for (const ms of [base, server.nextResetAt(base) - 1000, server.nextResetAt(base)]) {
                expect(dayKeyAt(ms)).toBe(server.dayKeyAt(ms));
                expect(nextResetAt(ms)).toBe(server.nextResetAt(ms));
            }
        }
    });

    it('turns at midnight in Brasília, not in UTC', () => {
        expect(dayKeyAt(Date.UTC(2026, 9, 15, 2, 59))).toBe('2026-10-14'); // 23:59 in Brasília
        expect(dayKeyAt(Date.UTC(2026, 9, 15, 3, 0))).toBe('2026-10-15');
        expect(nextResetAt(Date.UTC(2026, 9, 15, 2, 59))).toBe(Date.UTC(2026, 9, 15, 3, 0));
    });

    it('steps back across months and years', () => {
        expect(previousDayKey('2026-03-01')).toBe(server.previousDayKey('2026-03-01'));
        expect(previousDayKey('2027-01-01')).toBe('2026-12-31');
    });

    it('keeps the streak alive for a win today or yesterday, as the server does', () => {
        const stats = { streak: 4, lastWonDay: '2026-10-14' };
        for (const today of ['2026-10-14', '2026-10-15', '2026-10-16']) {
            expect(effectiveStreak(stats, today)).toBe(serverStreak(stats, today));
        }
        expect(effectiveStreak(stats, '2026-10-16')).toBe(0);
        expect(effectiveStreak(null, '2026-10-16')).toBe(0);
    });

    it("gives the Home card each of its states", () => {
        const state = (hasDay, runStatus, isGuest = false) => challengeSummaryState({ hasDay, runStatus, isGuest });
        expect(state(true, 'active', true)).toBe('guest'); // a guest never sees a run
        expect(state(false, null)).toBe('new');
        expect(state(true, null)).toBe('ready');
        expect(state(true, 'active')).toBe('active');
        expect(state(true, 'won')).toBe('won');
        expect(state(true, 'lost')).toBe('lost');
        expect(state(true, 'expired')).toBe('lost');
    });
});
