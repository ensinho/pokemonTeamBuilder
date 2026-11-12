import { describe, it, expect, vi } from 'vitest';

// The datasets as the build bakes them: keyed by base species, no form ids.
vi.mock('../services/staticData', () => ({
    loadStaticData: async (file) => ({
        'smogon.json': {
            byId: {
                214: { sets: [{ item: 'choice-scarf', ability: 'moxie', nature: 'jolly', moves: [['close-combat'], ['megahorn'], ['stone-edge'], ['knock-off']], evs: { attack: 252, speed: 252, hp: 4 } }] },
            },
        },
        'competitive-usage.json': { byId: {} },
        'usage-index.json': { default: 'fmt' },
        'usage/fmt.json': { byId: {} },
    }[file] ?? null),
}));

import { competitivePresetFor, megaStoneOfForme, usageSpread } from './loadCompetitivePreset';

const STONES = {
    heracronite: { baseId: 214, form: 'Heracross-Mega', spriteId: 10047 },
    'charizardite-y': { baseId: 6, form: 'Charizard-Mega-Y', spriteId: 10035 },
};

describe('megaStoneOfForme', () => {
    it('names the stone of a Mega forme by the forme\'s own id', () => {
        expect(megaStoneOfForme(10047, STONES)).toBe('heracronite');
        expect(megaStoneOfForme('10035', STONES)).toBe('charizardite-y');
    });

    it('is null for a base species, an unknown id or a missing map', () => {
        expect(megaStoneOfForme(214, STONES)).toBeNull();
        expect(megaStoneOfForme(10047, null)).toBeNull();
        expect(megaStoneOfForme(undefined, STONES)).toBeNull();
    });
});

describe('competitivePresetFor', () => {
    it('finds nothing for a form asked by its own id alone', async () => {
        expect(await competitivePresetFor(10047)).toBeNull();
    });

    it('gives a Mega forme its species\' build, holding its own stone', async () => {
        const preset = await competitivePresetFor(10047, { baseId: 214, megaStone: 'heracronite' });
        expect(preset).toMatchObject({
            item: 'heracronite',
            nature: 'jolly',
            moves: ['close-combat', 'megahorn', 'stone-edge', 'knock-off'],
            evs: { attack: 252, speed: 252, hp: 4 },
        });
        // The species' abilities stay candidates only: the member keeps the one the forme has.
        expect(preset.abilities).toEqual(['moxie']);
    });

    it('gives any other form its species\' build as it is', async () => {
        expect((await competitivePresetFor(99999, { baseId: 214 })).item).toBe('choice-scarf');
    });

    it('still hands a Mega its stone when the species has no data', async () => {
        expect(await competitivePresetFor(10035, { baseId: 6, megaStone: 'charizardite-y' })).toEqual({ item: 'charizardite-y' });
    });
});

describe('usageSpread', () => {
    it('converts a Champions Stat Point spread to EVs, keeping its own nature', () => {
        expect(usageSpread({ nature: 'Adamant', evs: { hp: 2, atk: 32, spe: 32 } }))
            .toEqual({ nature: 'adamant', evs: { hp: 6, attack: 252, speed: 252 } }); // 66 SP → trimmed to 510
    });

    it('passes a real EV spread through', () => {
        expect(usageSpread({ nature: 'Modest', evs: { hp: 252, spa: 252, spd: 4 } }))
            .toEqual({ nature: 'modest', evs: { hp: 252, 'special-attack': 252, 'special-defense': 4 } });
    });

    it('ignores a missing or empty spread', () => {
        expect(usageSpread(null)).toBeNull();
        expect(usageSpread({ nature: 'Serious', evs: {} })).toBeNull();
    });
});
