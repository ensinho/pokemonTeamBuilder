import { describe, it, expect } from 'vitest';
import {
    splashHoldMs,
    splashProgress,
    SPLASH_MIN_MS,
    SPLASH_MOBILE_MIN_MS,
    SPLASH_MOBILE_MAX_MS,
} from './bootSplash';

describe('splashHoldMs', () => {
    describe('desktop', () => {
        it('holds out the remainder of the 900ms beat', () => {
            expect(splashHoldMs({ isMobile: false, elapsedMs: 200, isBootSettled: false }))
                .toBe(SPLASH_MIN_MS - 200);
        });

        it('dismisses immediately once the beat has already passed', () => {
            expect(splashHoldMs({ isMobile: false, elapsedMs: 5000, isBootSettled: false })).toBe(0);
        });

        it('ignores boot-settled state — desktop behaviour is unchanged', () => {
            expect(splashHoldMs({ isMobile: false, elapsedMs: 100, isBootSettled: true }))
                .toBe(splashHoldMs({ isMobile: false, elapsedMs: 100, isBootSettled: false }));
        });
    });

    describe('mobile', () => {
        it('waits out the ceiling while boot has not settled', () => {
            expect(splashHoldMs({ isMobile: true, elapsedMs: 1000, isBootSettled: false }))
                .toBe(SPLASH_MOBILE_MAX_MS - 1000);
        });

        it('collapses to the floor once boot settles', () => {
            expect(splashHoldMs({ isMobile: true, elapsedMs: 300, isBootSettled: true }))
                .toBe(SPLASH_MOBILE_MIN_MS - 300);
        });

        it('holds longer than desktop for the same elapsed time', () => {
            const elapsedMs = 400;
            expect(splashHoldMs({ isMobile: true, elapsedMs, isBootSettled: true }))
                .toBeGreaterThan(splashHoldMs({ isMobile: false, elapsedMs, isBootSettled: true }));
        });

        it('never strands the user: the ceiling releases an unsettled boot', () => {
            expect(splashHoldMs({ isMobile: true, elapsedMs: SPLASH_MOBILE_MAX_MS, isBootSettled: false })).toBe(0);
            expect(splashHoldMs({ isMobile: true, elapsedMs: 99999, isBootSettled: false })).toBe(0);
        });

        it('dismisses at once when a settled boot took longer than the floor', () => {
            expect(splashHoldMs({ isMobile: true, elapsedMs: SPLASH_MOBILE_MIN_MS + 1, isBootSettled: true })).toBe(0);
        });

        it('keeps the ceiling above the floor, so settling can only shorten the wait', () => {
            for (const elapsedMs of [0, 500, 1799, 1800, 3000, 5999]) {
                expect(splashHoldMs({ isMobile: true, elapsedMs, isBootSettled: false }))
                    .toBeGreaterThanOrEqual(splashHoldMs({ isMobile: true, elapsedMs, isBootSettled: true }));
            }
        });
    });

    it('treats a missing or bogus elapsed time as zero', () => {
        expect(splashHoldMs({ isMobile: false, elapsedMs: undefined, isBootSettled: false })).toBe(SPLASH_MIN_MS);
        expect(splashHoldMs({ isMobile: false, elapsedMs: NaN, isBootSettled: false })).toBe(SPLASH_MIN_MS);
        expect(splashHoldMs({ isMobile: true, elapsedMs: -500, isBootSettled: true })).toBe(SPLASH_MOBILE_MIN_MS);
    });
});

describe('splashProgress', () => {
    it('runs the desktop bar straight to full over the desktop beat', () => {
        expect(splashProgress({ isMobile: false, isBootSettled: false }))
            .toEqual({ width: 100, durationMs: SPLASH_MIN_MS });
    });

    it('parks the mobile bar short of full while boot is pending', () => {
        const bar = splashProgress({ isMobile: true, isBootSettled: false });
        expect(bar.width).toBeLessThan(100);
        expect(bar.durationMs).toBe(SPLASH_MOBILE_MIN_MS);
    });

    it('closes the mobile bar quickly once boot settles', () => {
        const bar = splashProgress({ isMobile: true, isBootSettled: true });
        expect(bar.width).toBe(100);
        expect(bar.durationMs).toBeLessThan(SPLASH_MOBILE_MIN_MS);
    });

    it('never moves the bar backwards when boot settles', () => {
        expect(splashProgress({ isMobile: true, isBootSettled: true }).width)
            .toBeGreaterThanOrEqual(splashProgress({ isMobile: true, isBootSettled: false }).width);
    });
});
