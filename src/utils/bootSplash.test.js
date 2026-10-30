import { describe, it, expect } from 'vitest';
import {
    splashHoldMs,
    splashProgress,
    skipsBootSplash,
    SPLASH_REVEAL_MS,
    SPLASH_MIN_VISIBLE_MS,
    SPLASH_MOBILE_MAX_MS,
} from './bootSplash';

const SEEN_FLOOR = SPLASH_REVEAL_MS + SPLASH_MIN_VISIBLE_MS;

describe('splashHoldMs', () => {
    describe('desktop', () => {
        it('never shows the splash to a boot that was ready before it faded in', () => {
            expect(splashHoldMs({ isMobile: false, elapsedMs: 0, isBootSettled: false })).toBe(0);
            expect(splashHoldMs({ isMobile: false, elapsedMs: SPLASH_REVEAL_MS - 1, isBootSettled: false })).toBe(0);
        });

        it('keeps a splash that has been seen up for the minimum visible time', () => {
            expect(splashHoldMs({ isMobile: false, elapsedMs: SPLASH_REVEAL_MS, isBootSettled: false }))
                .toBe(SPLASH_MIN_VISIBLE_MS);
            expect(splashHoldMs({ isMobile: false, elapsedMs: 500, isBootSettled: false }))
                .toBe(SEEN_FLOOR - 500);
        });

        it('dismisses immediately once the floor has passed', () => {
            expect(splashHoldMs({ isMobile: false, elapsedMs: 5000, isBootSettled: false })).toBe(0);
        });

        it('ignores boot-settled state', () => {
            for (const elapsedMs of [100, 400, 900]) {
                expect(splashHoldMs({ isMobile: false, elapsedMs, isBootSettled: true }))
                    .toBe(splashHoldMs({ isMobile: false, elapsedMs, isBootSettled: false }));
            }
        });
    });

    describe('mobile', () => {
        it('waits out the ceiling while boot has not settled', () => {
            expect(splashHoldMs({ isMobile: true, elapsedMs: 1000, isBootSettled: false }))
                .toBe(SPLASH_MOBILE_MAX_MS - 1000);
        });

        it('a fast settled boot never shows the splash', () => {
            expect(splashHoldMs({ isMobile: true, elapsedMs: 150, isBootSettled: true })).toBe(0);
        });

        it('a slower settled boot keeps the seen splash up for the minimum', () => {
            expect(splashHoldMs({ isMobile: true, elapsedMs: 400, isBootSettled: true }))
                .toBe(SEEN_FLOOR - 400);
        });

        it('never strands the user: the ceiling releases an unsettled boot', () => {
            expect(splashHoldMs({ isMobile: true, elapsedMs: SPLASH_MOBILE_MAX_MS, isBootSettled: false })).toBe(0);
            expect(splashHoldMs({ isMobile: true, elapsedMs: 99999, isBootSettled: false })).toBe(0);
        });

        it('dismisses at once when a settled boot took longer than the floor', () => {
            expect(splashHoldMs({ isMobile: true, elapsedMs: SEEN_FLOOR + 1, isBootSettled: true })).toBe(0);
        });

        it('keeps the ceiling above the floor, so settling can only shorten the wait', () => {
            for (const elapsedMs of [0, 299, 300, 500, 1800, 3000, 5999]) {
                expect(splashHoldMs({ isMobile: true, elapsedMs, isBootSettled: false }))
                    .toBeGreaterThanOrEqual(splashHoldMs({ isMobile: true, elapsedMs, isBootSettled: true }));
            }
        });
    });

    it('treats a missing or bogus elapsed time as zero', () => {
        expect(splashHoldMs({ isMobile: false, elapsedMs: undefined, isBootSettled: false })).toBe(0);
        expect(splashHoldMs({ isMobile: false, elapsedMs: NaN, isBootSettled: false })).toBe(0);
        expect(splashHoldMs({ isMobile: true, elapsedMs: -500, isBootSettled: false })).toBe(SPLASH_MOBILE_MAX_MS);
    });
});

describe('splashProgress', () => {
    it('runs the desktop bar straight to full', () => {
        expect(splashProgress({ isMobile: false, isBootSettled: false }).width).toBe(100);
    });

    it('parks the mobile bar short of full while boot is pending', () => {
        expect(splashProgress({ isMobile: true, isBootSettled: false }).width).toBeLessThan(100);
    });

    it('closes the mobile bar quickly once boot settles', () => {
        const pending = splashProgress({ isMobile: true, isBootSettled: false });
        const settled = splashProgress({ isMobile: true, isBootSettled: true });
        expect(settled.width).toBe(100);
        expect(settled.durationMs).toBeLessThan(pending.durationMs);
    });

    it('never moves the bar backwards when boot settles', () => {
        expect(splashProgress({ isMobile: true, isBootSettled: true }).width)
            .toBeGreaterThanOrEqual(splashProgress({ isMobile: true, isBootSettled: false }).width);
    });
});

describe('skipsBootSplash', () => {
    it('skips it for a first visit landing on Home (the landing)', () => {
        expect(skipsBootSplash({ appPath: '/', isReturning: false })).toBe(true);
    });

    it('keeps it for a returning visitor, whose Home is their own data', () => {
        expect(skipsBootSplash({ appPath: '/', isReturning: true })).toBe(false);
    });

    it('keeps it for a first visit on any other route', () => {
        for (const appPath of ['/builder', '/pokemon/garchomp', '/profile', '']) {
            expect(skipsBootSplash({ appPath, isReturning: false }), appPath).toBe(false);
        }
    });
});
