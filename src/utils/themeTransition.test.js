import { describe, it, expect, vi } from 'vitest';
import { originFromEvent, revealRadius, runThemeTransition } from './themeTransition';
import { pairedTheme, themeModeOf, THEME_PAIRS, THEME_META } from '../constants/theme';

describe('revealRadius', () => {
    it('reaches the farthest corner from the origin', () => {
        // Top-right corner of a 400×800 viewport: the farthest corner is bottom-left.
        expect(revealRadius(400, 0, 400, 800)).toBeCloseTo(Math.hypot(400, 800));
        // From the centre every corner is equally far.
        expect(revealRadius(200, 400, 400, 800)).toBeCloseTo(Math.hypot(200, 400));
    });
});

describe('originFromEvent', () => {
    it('uses the centre of the pressed control, so a keyboard press spreads from it too', () => {
        const event = {
            clientX: 0,
            clientY: 0,
            currentTarget: { getBoundingClientRect: () => ({ left: 100, top: 20, width: 40, height: 30 }) },
        };
        expect(originFromEvent(event)).toEqual({ x: 120, y: 35 });
    });

    it('falls back to the pointer, then to nothing', () => {
        expect(originFromEvent({ clientX: 5, clientY: 9 })).toEqual({ x: 5, y: 9 });
        expect(originFromEvent(undefined)).toBeNull();
    });
});

describe('runThemeTransition', () => {
    it('applies at once when there is no origin — a theme restored on boot is not an event', () => {
        const apply = vi.fn();
        runThemeTransition(apply, null);
        expect(apply).toHaveBeenCalledTimes(1);
    });
});

describe('theme pairs', () => {
    it('always flips to the other mode', () => {
        for (const { id } of THEME_META) {
            expect(themeModeOf(pairedTheme(id))).not.toBe(themeModeOf(id));
        }
    });

    it('is symmetric, so two presses land back where they started', () => {
        for (const [from, to] of Object.entries(THEME_PAIRS)) {
            expect(THEME_PAIRS[to]).toBe(from);
        }
    });

    it('covers every theme', () => {
        expect(Object.keys(THEME_PAIRS).sort()).toEqual(THEME_META.map((m) => m.id).sort());
    });
});
