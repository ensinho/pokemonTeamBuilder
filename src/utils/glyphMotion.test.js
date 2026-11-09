import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GLYPH_MOTIONS, glyphMotion } from './glyphMotion';

describe('glyphMotion', () => {
    it('gives the main destinations the motion of what their icon draws', () => {
        expect(glyphMotion('pokedex')).toBe('wobble');
        expect(glyphMotion('builder')).toBe('clash');
        expect(glyphMotion('challenge')).toBe('lift');
        expect(glyphMotion('pokepuzzle')).toBe('snap');
    });

    it('falls back to a nudge for a destination with no meaning yet', () => {
        expect(glyphMotion('somewhere-new')).toBe('nudge');
        expect(glyphMotion(undefined)).toBe('nudge');
    });

    it('only ever names a motion the stylesheet draws', () => {
        // interactions.css has one @keyframes glyph-<name> per motion.
        const css = readFileSync(join(process.cwd(), 'src/styles/interactions.css'), 'utf8');
        for (const motion of GLYPH_MOTIONS) {
            expect(css).toMatch(new RegExp(`@keyframes glyph-${motion}\\b`));
            expect(css).toMatch(new RegExp(`\\[data-glyph='${motion}'\\]`));
        }
        for (const key of ['home', 'journeys', 'feed', 'meta', 'gyms', 'search', 'x']) {
            expect(GLYPH_MOTIONS).toContain(glyphMotion(key));
        }
    });
});
