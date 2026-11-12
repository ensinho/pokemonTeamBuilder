import { describe, expect, it } from 'vitest';
import { navHue, navHueType } from './navHue';
import { typeColors } from '../constants/typeChart';

describe('navHue', () => {
    it('tones every destination with a canon type colour', () => {
        for (const key of ['home', 'builder', 'pokedex', 'feed', 'meta', 'pokepuzzle', 'challenge', 'library', 'gyms']) {
            expect(Object.values(typeColors)).toContain(navHue(key));
        }
    });

    it('falls back to normal for a destination with no tone yet', () => {
        expect(navHueType('somewhere-new')).toBe('normal');
        expect(navHue('somewhere-new')).toBe(typeColors.normal);
    });
});
