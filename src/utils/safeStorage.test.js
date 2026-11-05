import { describe, it, expect, afterEach, vi } from 'vitest';
import { readLocal, writeLocal, removeLocal } from './safeStorage';

const throwing = () => { throw new DOMException('quota', 'QuotaExceededError'); };

describe('safeStorage', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('falls back instead of throwing when storage is unusable', () => {
        vi.stubGlobal('window', { localStorage: { getItem: throwing, setItem: throwing, removeItem: throwing } });
        expect(readLocal('k', 'x')).toBe('x');
        expect(writeLocal('k', 'v')).toBe(false);
        expect(() => removeLocal('k')).not.toThrow();
    });

    it('reads and writes when it works', () => {
        const map = new Map();
        vi.stubGlobal('window', { localStorage: {
            getItem: (k) => (map.has(k) ? map.get(k) : null),
            setItem: (k, v) => map.set(k, v),
            removeItem: (k) => map.delete(k),
        } });
        expect(writeLocal('k', 1)).toBe(true);
        expect(readLocal('k')).toBe('1');
        removeLocal('k');
        expect(readLocal('k', 'none')).toBe('none');
    });
});
