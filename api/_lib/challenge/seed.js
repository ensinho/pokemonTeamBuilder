/**
 * Strings → sim seeds. Zero imports.
 *
 * Every random choice in the challenge (the day's lineup, the wildcard, the
 * daily rental team, the AI's dice) is a pure function of a string such as
 * `'champion:2026-10-14'`, so any of them can be recomputed, audited and tested
 * without storing it. The sim's PRNG takes four 16-bit integers; this is
 * cyrb128 (a small, well-mixed 128-bit string hash) folded to that shape.
 */
export const hashSeed = (...parts) => {
    const text = parts.map((part) => (Array.isArray(part) ? part.join(',') : String(part))).join('|');
    let h1 = 1779033703;
    let h2 = 3144134277;
    let h3 = 1013904242;
    let h4 = 2773480762;
    for (let i = 0; i < text.length; i += 1) {
        const k = text.charCodeAt(i);
        h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
        h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
        h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
        h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
    }
    h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
    h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
    h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
    h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
    h1 ^= h2 ^ h3 ^ h4;
    h2 ^= h1;
    h3 ^= h1;
    h4 ^= h1;
    return [h1, h2, h3, h4].map((h) => ((h >>> 0) ^ (h >>> 16)) & 0xffff);
};
