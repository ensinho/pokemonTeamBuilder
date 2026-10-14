import { describe, it, expect } from 'vitest';

import { usageSpread } from './loadCompetitivePreset';

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
