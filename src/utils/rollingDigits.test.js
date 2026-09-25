import { describe, it, expect } from 'vitest';
import { splitRollingDigits } from './rollingDigits';

describe('splitRollingDigits', () => {
    it('gives every digit its value and every other character none', () => {
        expect(splitRollingDigits('40.7%')).toEqual([
            { key: 'd4', char: '4', digit: 4 },
            { key: 'd3', char: '0', digit: 0 },
            { key: 's2', char: '.', digit: null },
            { key: 'd1', char: '7', digit: 7 },
            { key: 's0', char: '%', digit: null },
        ]);
    });

    it('keys from the right, so the units column survives a new leading digit', () => {
        const nine = splitRollingDigits('9');
        const ten = splitRollingDigits('10');
        expect(nine.at(-1).key).toBe('d0');
        expect(ten.at(-1).key).toBe('d0');
        expect(ten[0]).toEqual({ key: 'd1', char: '1', digit: 1 });
    });

    it('treats a slash figure as two numbers around a still glyph', () => {
        expect(splitRollingDigits('3/6').map((t) => t.digit)).toEqual([3, null, 6]);
    });

    it('is empty for nothing and stringifies numbers', () => {
        expect(splitRollingDigits(undefined)).toEqual([]);
        expect(splitRollingDigits(null)).toEqual([]);
        expect(splitRollingDigits(508).map((t) => t.char).join('')).toBe('508');
    });
});
