/**
 * The trainer card's banner (2026-11-05): a field of pixels that is the same
 * every time for one trainer and different for the next — their Trainer ID
 * drawn as a pattern. Pixels grow denser toward the right, where the partner
 * stands, and a few are accents (gold, the brand's "earned" colour).
 *
 * Pure and deterministic: a uid always gives the same pixels.
 */

/** FNV-1a: a small, stable 32-bit hash of a string. */
export const hashSeed = (text = '') => {
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i += 1) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
};

/** mulberry32: a seeded generator, so the pattern never needs storing. */
const generator = (seed) => {
    let a = seed || 1;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};

/**
 * `[{ x, y, o, accent }]` — cell coordinates in a `cols` × `rows` grid, an
 * opacity step (0.25, 0.45 or 0.7) and whether it is an accent pixel.
 */
export function trainerPixels(seed, { cols = 36, rows = 10, accents = 5 } = {}) {
    const rand = generator(hashSeed(String(seed || 'trainer')));
    const cells = [];
    for (let y = 0; y < rows; y += 1) {
        for (let x = 0; x < cols; x += 1) {
            // Empty on the left, busy on the right: x / cols is the chance.
            const chance = Math.max(0, (x / cols) - 0.18) * 0.95;
            if (rand() < chance) {
                const r = rand();
                cells.push({ x, y, o: r < 0.5 ? 0.25 : r < 0.85 ? 0.45 : 0.7, accent: false });
            }
        }
    }
    // A few accents, always on drawn pixels in the right half.
    const right = cells.filter((c) => c.x >= cols / 2);
    for (let i = 0; i < Math.min(accents, right.length); i += 1) {
        right[Math.floor(rand() * right.length)].accent = true;
    }
    return cells;
}
