import { describe, expect, it } from 'vitest';
import { hashSeed, trainerPixels } from './trainerCardPattern';

describe('trainerPixels', () => {
    it('is the same pattern for the same trainer', () => {
        expect(trainerPixels('uid-a')).toEqual(trainerPixels('uid-a'));
    });

    it('differs between trainers', () => {
        expect(trainerPixels('uid-a')).not.toEqual(trainerPixels('uid-b'));
    });

    it('stays inside the grid and leaves the left edge clear', () => {
        const cells = trainerPixels('someone', { cols: 20, rows: 6 });
        expect(cells.length).toBeGreaterThan(0);
        for (const c of cells) {
            expect(c.x).toBeGreaterThanOrEqual(0);
            expect(c.x).toBeLessThan(20);
            expect(c.y).toBeLessThan(6);
        }
        expect(cells.some((c) => c.x < 3)).toBe(false);
    });

    it('marks a few accents, only on the right half', () => {
        const cells = trainerPixels('accent-check', { cols: 36, rows: 10, accents: 5 });
        const accents = cells.filter((c) => c.accent);
        expect(accents.length).toBeGreaterThan(0);
        expect(accents.length).toBeLessThanOrEqual(5);
        expect(accents.every((c) => c.x >= 18)).toBe(true);
    });

    it('hashes strings stably', () => {
        expect(hashSeed('abc')).toBe(hashSeed('abc'));
        expect(hashSeed('abc')).not.toBe(hashSeed('abd'));
    });
});
