import { describe, expect, it } from 'vitest';

import { FLARE_VARIANTS, flareOf } from './battleFlare';

const context = {
    moveMeta: (name) => ({ Earthquake: { type: 'ground' }, Tackle: { type: 'normal' } }[name] || null),
    foeName: 'Cynthia',
    typeColors: { ground: '#E2BF65', normal: '#A8A77A' },
};

describe('flareOf', () => {
    it('a direct hit flares on the side it hit, in the move type colour', () => {
        expect(flareOf({ type: 'hp', side: 'p2', strike: { move: 'Tackle', hard: false } }, context))
            .toEqual({ variant: 'hit', at: 'foe', colorA: '#A8A77A', colorB: 'var(--ds-banner-stripe)' });
    });

    it('a critical or super-effective hit gets the larger flare', () => {
        expect(flareOf({ type: 'hp', side: 'p1', strike: { move: 'Earthquake', hard: true } }, context))
            .toMatchObject({ variant: 'crit', at: 'mine', colorA: '#E2BF65' });
    });

    it('an unknown move still flares, in the screen ink', () => {
        expect(flareOf({ type: 'hp', side: 'p1', strike: { move: 'Struggle', hard: false } }, context).colorA).toBe('var(--ds-paper)');
    });

    it('indirect damage and heals stay quiet', () => {
        expect(flareOf({ type: 'hp', side: 'p1', strike: null, from: 'Stealth Rock' }, context)).toBe(null);
        expect(flareOf({ type: 'hp', side: 'p1', heal: true, strike: null }, context)).toBe(null);
        expect(flareOf({ type: 'move', side: 'p1', move: 'Tackle' }, context)).toBe(null);
        expect(flareOf(null, context)).toBe(null);
    });

    it('a Mega Evolution flares on the Pokémon', () => {
        expect(flareOf({ type: 'mega', side: 'p2', mega: 'Garchomp-Mega' }, context)).toMatchObject({ variant: 'mega', at: 'foe' });
    });

    it('only a battle you won ends on a flare', () => {
        expect(flareOf({ type: 'end', winner: 'Enzo' }, context)).toMatchObject({ variant: 'win', at: 'centre' });
        expect(flareOf({ type: 'end', winner: 'Cynthia' }, context)).toBe(null);
    });

    it('every variant the scene can ask for is drawn', () => {
        for (const variant of ['hit', 'crit', 'mega', 'win']) {
            expect(FLARE_VARIANTS[variant]).toMatchObject({ size: expect.any(Number), duration: expect.any(Number) });
        }
    });
});
