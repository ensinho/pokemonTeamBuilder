import { describe, expect, it } from 'vitest';
import { SHARE_SIZE, puzzleGridLayout } from './puzzleShareLayout';

describe('puzzleGridLayout', () => {
    it('keeps any board inside its band', () => {
        for (const [rows, cols] of [[1, 3], [3, 7], [8, 12], [8, 5], [1, 12]]) {
            const g = puzzleGridLayout(rows, cols);
            expect(g.y).toBeGreaterThanOrEqual(560);
            expect(g.y + g.height).toBeLessThanOrEqual(1090);
            expect(g.x).toBeGreaterThanOrEqual(90);
            expect(g.x + g.width).toBeLessThanOrEqual(SHARE_SIZE.width - 90);
            expect(g.tile).toBeGreaterThan(20);
        }
    });
    it('caps the tile on small boards', () => {
        expect(puzzleGridLayout(2, 4).tile).toBe(84);
    });
});
