import { describe, it, expect } from 'vitest';
import {
    UI_SCALE_STEPS, DEFAULT_UI_SCALE, normalizeUiScale, stepUiScale,
    isMinUiScale, isMaxUiScale, formatUiScale,
} from './uiScale';

describe('normalizeUiScale', () => {
    it('keeps a supported step as-is', () => {
        UI_SCALE_STEPS.forEach((step) => expect(normalizeUiScale(step)).toBe(step));
    });

    it('snaps an arbitrary number to the nearest step', () => {
        expect(normalizeUiScale(1.06)).toBe(1.1);
        expect(normalizeUiScale(0.5)).toBe(0.9);
        expect(normalizeUiScale(3)).toBe(1.25);
    });

    it('parses a stored string', () => {
        expect(normalizeUiScale('1.1')).toBe(1.1);
    });

    it('falls back to the default for junk', () => {
        [null, undefined, 'abc', NaN, Infinity, {}].forEach((value) => {
            expect(normalizeUiScale(value)).toBe(DEFAULT_UI_SCALE);
        });
    });
});

describe('stepUiScale', () => {
    it('moves one step at a time', () => {
        expect(stepUiScale(1, 1)).toBe(1.1);
        expect(stepUiScale(1, -1)).toBe(0.9);
    });

    it('clamps at both ends instead of wrapping', () => {
        expect(stepUiScale(0.9, -1)).toBe(0.9);
        expect(stepUiScale(1.25, 1)).toBe(1.25);
    });

    it('steps from an unsupported value via its nearest step', () => {
        expect(stepUiScale(1.06, 1)).toBe(1.25);
    });
});

describe('bounds and formatting', () => {
    it('reports the ends', () => {
        expect(isMinUiScale(0.9)).toBe(true);
        expect(isMinUiScale(1)).toBe(false);
        expect(isMaxUiScale(1.25)).toBe(true);
        expect(isMaxUiScale(1.1)).toBe(false);
    });

    it('formats as a whole percentage', () => {
        expect(formatUiScale(0.9)).toBe('90%');
        expect(formatUiScale(1)).toBe('100%');
        expect(formatUiScale(1.25)).toBe('125%');
    });
});
