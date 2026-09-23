import { describe, it, expect } from 'vitest';

import {
    shouldDismissSheet,
    releaseVelocity,
    SHEET_DISMISS_FRACTION,
    SHEET_DISMISS_VELOCITY,
} from './sheetDismiss';

describe('shouldDismissSheet', () => {
    it('closes once pulled past the fraction of its height', () => {
        expect(shouldDismissSheet({ dy: 600 * SHEET_DISMISS_FRACTION, height: 600, velocity: 0 })).toBe(true);
        expect(shouldDismissSheet({ dy: 600 * SHEET_DISMISS_FRACTION - 1, height: 600, velocity: 0 })).toBe(false);
    });

    it('closes on a hard flick however short the pull', () => {
        expect(shouldDismissSheet({ dy: 20, height: 800, velocity: SHEET_DISMISS_VELOCITY })).toBe(true);
    });

    it('springs back from a slow, short pull', () => {
        expect(shouldDismissSheet({ dy: 40, height: 500, velocity: 0.1 })).toBe(false);
    });

    it('never closes on an upward or zero pull, even with speed', () => {
        expect(shouldDismissSheet({ dy: 0, height: 500, velocity: 2 })).toBe(false);
        expect(shouldDismissSheet({ dy: -30, height: 500, velocity: 2 })).toBe(false);
    });

    it('does not divide its way into a dismissal when the height is unknown', () => {
        expect(shouldDismissSheet({ dy: 10, height: 0, velocity: 0 })).toBe(false);
        expect(shouldDismissSheet({ dy: 10, height: NaN, velocity: 0 })).toBe(false);
    });
});

describe('releaseVelocity', () => {
    it('measures across the whole sample window', () => {
        expect(releaseVelocity([{ y: 100, t: 0 }, { y: 130, t: 50 }, { y: 200, t: 100 }])).toBe(1);
    });

    it('is zero without enough samples or elapsed time', () => {
        expect(releaseVelocity([])).toBe(0);
        expect(releaseVelocity([{ y: 1, t: 5 }])).toBe(0);
        expect(releaseVelocity([{ y: 1, t: 5 }, { y: 50, t: 5 }])).toBe(0);
    });

    it('is negative for an upward release', () => {
        expect(releaseVelocity([{ y: 200, t: 0 }, { y: 100, t: 100 }])).toBe(-1);
    });
});
