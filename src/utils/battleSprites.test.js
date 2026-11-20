import { describe, it, expect, vi } from 'vitest';

vi.mock('../services/speciesIndex', () => ({
    getSpeciesIndex: () => ({ ready: true, entryByName: () => null }),
    ensureSpeciesIndex: async () => ({ ready: true, entryByName: () => null }),
}));

import { buildBattleSpriteFallbacks } from './battleSprites';

describe('buildBattleSpriteFallbacks', () => {
    it('falls back from missing back sprite to front Showdown sprite, then site default sprites and base species', () => {
        const urls = buildBattleSpriteFallbacks('Garchomp-Mega-Z', {
            back: true,
            shiny: false,
            entry: { id: 10299, name: 'Mega Garchomp Z', apiName: 'garchomp-mega-z', baseId: 445 },
        });
        expect(urls.length).toBeGreaterThanOrEqual(4);
        expect(urls[0]).toContain('/sprites/gen5/garchomp-megaz.png');
        expect(urls.some((u) => u.includes('/pokemon/10299.png'))).toBe(true);
        expect(urls.some((u) => u.includes('/official-artwork/10299.png'))).toBe(true);
        expect(urls.some((u) => u.includes('garchomp.png'))).toBe(true);
    });

    it('includes site default sprites for forms missing from Showdown (e.g. Mega Raichu Y)', () => {
        const urls = buildBattleSpriteFallbacks('Raichu-Mega-Y', {
            back: false,
            shiny: false,
            entry: { id: 10310, name: 'Mega Raichu Y', apiName: 'raichu-mega-y', baseId: 26 },
        });
        expect(urls.some((u) => u.includes('/pokemon/10310.png'))).toBe(true);
        expect(urls.some((u) => u.includes('/official-artwork/10310.png'))).toBe(true);
        expect(urls.some((u) => u.includes('raichu.png'))).toBe(true);
    });
});
