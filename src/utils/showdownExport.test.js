import { describe, it, expect } from 'vitest';
import { buildShowdownExportText, formatShowdownCase, getDefaultCustomization } from './showdownExport';

describe('formatShowdownCase', () => {
    it('title-cases hyphenated names', () => {
        expect(formatShowdownCase('great-tusk')).toBe('Great Tusk');
        expect(formatShowdownCase('choice-band')).toBe('Choice Band');
    });
    it('handles empty / undefined input', () => {
        expect(formatShowdownCase('')).toBe('');
        expect(formatShowdownCase()).toBe('');
    });
});

describe('getDefaultCustomization', () => {
    it('defaults teraType to the first type and ability to the first ability', () => {
        const def = getDefaultCustomization({ types: ['fire', 'flying'], abilities: [{ name: 'blaze' }] });
        expect(def.teraType).toBe('fire');
        expect(def.ability).toBe('blaze');
        expect(def.nature).toBe('serious');
    });
    it('falls back to normal / unknown with no data', () => {
        const def = getDefaultCustomization();
        expect(def.teraType).toBe('normal');
        expect(def.ability).toBe('unknown');
    });
});

describe('buildShowdownExportText', () => {
    it('builds a valid paste for a customized member', () => {
        const text = buildShowdownExportText([{
            name: 'garchomp',
            types: ['dragon', 'ground'],
            customization: {
                item: 'rocky-helmet',
                ability: 'rough-skin',
                nature: 'jolly',
                teraType: 'steel',
                isShiny: true,
                moves: ['earthquake', 'dragon-claw'],
                evs: { speed: 252, attack: 252, hp: 4 },
                ivs: { attack: 31 },
            },
        }]);
        expect(text).toContain('Garchomp @ Rocky Helmet');
        expect(text).toContain('Ability: Rough Skin');
        expect(text).toContain('Shiny: Yes');
        expect(text).toContain('Tera Type: Steel');
        expect(text).toContain('Jolly Nature');
        expect(text).toContain('- Earthquake');
        expect(text).toContain('- Dragon Claw');
        // EV string joins only non-zero stats
        expect(text).toMatch(/EVs: .*252 Spe/);
        expect(text).toMatch(/252 Atk/);
    });

    it('omits Shiny line when not shiny and emits "IVs: 0 Atk" for 0 attack IV', () => {
        const text = buildShowdownExportText([{
            name: 'gengar',
            types: ['ghost'],
            customization: { isShiny: false, ivs: { attack: 0 } },
        }]);
        expect(text).not.toContain('Shiny: Yes');
        expect(text).toContain('IVs: 0 Atk');
    });

    it('falls back gracefully for a bare member', () => {
        const text = buildShowdownExportText([{ name: 'pikachu' }]);
        expect(text).toContain('Pikachu @ Nothing');
        expect(text).toContain('Level: 50');
        expect(text).toContain('Serious Nature');
    });

    it('separates multiple members with a blank line', () => {
        const text = buildShowdownExportText([{ name: 'pikachu' }, { name: 'eevee' }]);
        expect(text.split('\n\n')).toHaveLength(2);
    });

    it('returns empty string for an empty team', () => {
        expect(buildShowdownExportText([])).toBe('');
    });
});
