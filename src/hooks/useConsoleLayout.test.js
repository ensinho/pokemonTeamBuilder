import { describe, it, expect } from 'vitest';

import { railModeFor } from './useConsoleLayout';

// rem 14.4: the desktop density band (1024–1919 px runs the root at 90%).
describe('railModeFor', () => {
    it('gives a wide column both rails while the screen keeps nearly all of its size', () => {
        expect(railModeFor({ width: 1482, height: 909, rem: 14.4 })).toBe('two');
        expect(railModeFor({ width: 1638, height: 1000, rem: 16 })).toBe('two');
    });

    it('gives a laptop one rail, and a narrow column none', () => {
        expect(railModeFor({ width: 1196, height: 900, rem: 14.4 })).toBe('one');
        expect(railModeFor({ width: 1041, height: 720, rem: 14.4 })).toBe('one');
        expect(railModeFor({ width: 808, height: 768, rem: 14.4 })).toBe('none');
    });

    it('answers none when there is nothing to measure yet', () => {
        expect(railModeFor({ width: 0, height: 900 })).toBe('none');
        expect(railModeFor({ width: 1400, height: 100 })).toBe('none');
    });
});
