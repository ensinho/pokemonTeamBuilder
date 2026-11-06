import { describe, it, expect } from 'vitest';
import { easter, seasonalHat, isNight, personaTone, sizeTraits, resolvePose, MOODS, POSES } from './catalog.js';
import { ICON_INNER, ICON_INNER_SMALL } from './icon.js';
import { mascotInner } from './rig.js';
import { LOADER_SCENES } from './constants.js';

const at = (y, m, d, h = 12) => new Date(y, m - 1, d, h);

describe('seasons', () => {
    it('finds Easter (Carnaval is 47 days before)', () => {
        expect(easter(2026).toDateString()).toBe(at(2026, 4, 5).toDateString());
        expect(easter(2027).toDateString()).toBe(at(2027, 3, 28).toDateString());
    });

    it('dresses for the right week', () => {
        expect(seasonalHat(at(2026, 10, 31))).toBe('witch');
        expect(seasonalHat(at(2026, 10, 23))).toBeNull();
        expect(seasonalHat(at(2026, 12, 24))).toBe('santa');
        expect(seasonalHat(at(2026, 12, 27))).toBeNull();
        expect(seasonalHat(at(2027, 6, 15))).toBe('straw');
        // Carnaval 2027: Tue 9 Feb; the window is Sat 6 → Ash Wed 10
        expect(seasonalHat(at(2027, 2, 9))).toBe('mask');
        expect(seasonalHat(at(2027, 2, 6))).toBe('mask');
        expect(seasonalHat(at(2027, 2, 11))).toBeNull();
        expect(seasonalHat(at(2026, 11, 6))).toBeNull();
    });

    it('knows the night', () => {
        expect(isNight(at(2026, 1, 1, 23))).toBe(true);
        expect(isNight(at(2026, 1, 1, 5))).toBe(true);
        expect(isNight(at(2026, 1, 1, 6))).toBe(false);
        expect(isNight(at(2026, 1, 1, 21))).toBe(false);
    });
});

describe('vocabulary', () => {
    it('maps personas to their type tone', () => {
        expect(personaTone('strategist')).toBe('dragon');
        expect(personaTone('nobody')).toBeNull();
    });

    it('simplifies small sizes', () => {
        expect(sizeTraits(16)).toMatchObject({ blush: 'none', fangs: false, sparks: 'none' });
        expect(sizeTraits(24).strokeK).toBeGreaterThan(sizeTraits(48).strokeK);
        expect(sizeTraits(160)).toEqual({});
    });

    it('lets the mood win over the pose for the face', () => {
        expect(resolvePose({ mood: 'triste', pose: 'parado' }).eyes).toBe('teary');
        expect(Object.keys(MOODS)).toHaveLength(32);
        expect(Object.keys(POSES).length).toBeGreaterThanOrEqual(20);
    });
});

describe('loader scenes', () => {
    it('name real moods and poses, and each one moves by itself (a CSS loop at rest)', () => {
        expect(Object.keys(LOADER_SCENES)).toEqual(['capture', 'battle', 'pokedex', 'think', 'search']);
        for (const [name, { mood, pose }] of Object.entries(LOADER_SCENES)) {
            expect(MOODS[mood], `${name}: mood ${mood}`).toBeDefined();
            expect(POSES[pose], `${name}: pose ${pose}`).toBeDefined();
            const markup = mascotInner({ ...resolvePose({ mood, pose }), ...sizeTraits(120) });
            expect(markup, name).toContain('m-loop');
            expect(/NaN|undefined|Infinity/.test(markup), name).toBe(false);
        }
    });
});

describe('icon', () => {
    it('is the rig at rest (rerun scripts/build-mascot-icon.mjs if this fails)', () => {
        expect(ICON_INNER).toBe(mascotInner({}));
        expect(ICON_INNER_SMALL).toBe(mascotInner(sizeTraits(24)));
    });
});
