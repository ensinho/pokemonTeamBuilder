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
        expect(text.split('\n')[0]).toBe('Pikachu');
        expect(text).toContain('Level: 50');
        expect(text).toContain('Serious Nature');
    });

    it('writes no "@" line part for an empty hand', () => {
        const text = buildShowdownExportText([{ name: 'pikachu', customization: { item: '' } }]);
        expect(text).not.toContain('@');
        expect(text).not.toContain('Nothing');
    });

    it('separates multiple members with a blank line', () => {
        const text = buildShowdownExportText([{ name: 'pikachu' }, { name: 'eevee' }]);
        expect(text.split('\n\n')).toHaveLength(2);
    });

    it('returns empty string for an empty team', () => {
        expect(buildShowdownExportText([])).toBe('');
    });
});

describe('buildShowdownExportText — Tera Type line', () => {
    const member = {
        name: 'garchomp',
        customization: { item: 'life-orb', ability: 'rough-skin', nature: 'jolly', teraType: 'steel', moves: ['earthquake'] },
    };

    it('includes the Tera Type line by default', () => {
        expect(buildShowdownExportText([member])).toContain('Tera Type: Steel');
    });

    it('omits it when the preference is off, leaving the rest intact', () => {
        const text = buildShowdownExportText([member], { includeTeraType: false });
        expect(text).not.toContain('Tera Type');
        expect(text).toContain('Ability: Rough Skin');
        expect(text).toContain('Jolly Nature');
        expect(text).toContain('- Earthquake');
    });

    it('leaves no blank line where the Tera line was', () => {
        expect(buildShowdownExportText([member], { includeTeraType: false })).not.toMatch(/\n\n/);
    });
});

describe('buildShowdownExportText — Mega names', () => {
    it('keeps the name a paste gave verbatim, Mega suffix included', () => {
        const text = buildShowdownExportText([{
            name: 'floette',
            showdownName: 'Floette-Mega',
            customization: { item: 'floettite' },
        }]);
        expect(text.split('\n')[0]).toBe('Floette-Mega @ Floettite');
    });

    it('names plain Floette holding Floettite as Floette-Eternal', () => {
        const text = buildShowdownExportText([{ name: 'floette', customization: { item: 'floettite' } }]);
        expect(text.split('\n')[0]).toBe('Floette-Eternal @ Floettite');
    });

    it('writes a Mega holding its stone as the base species', () => {
        const text = buildShowdownExportText([{ name: 'charizard-mega-y', customization: { item: 'charizardite-y' } }]);
        expect(text.split('\n')[0]).toBe('Charizard @ Charizardite Y');
    });
});

describe('buildShowdownExportText — Stat Points', () => {
    const champion = {
        name: 'garchomp',
        types: ['dragon', 'ground'],
        customization: {
            evScale: 'sp',
            teraType: 'steel',
            evs: { hp: 2, attack: 32, speed: 32 },
        },
    };

    it('keeps Stat Points as written by default', () => {
        const text = buildShowdownExportText([champion]);
        expect(text).toContain('EVs: 2 HP / 32 Atk / 32 Spe');
    });

    it('omits the Tera Type line for a Stat Points member', () => {
        expect(buildShowdownExportText([champion])).not.toContain('Tera Type');
    });

    it('converts Stat Points to EVs only when asked', () => {
        const text = buildShowdownExportText([champion], { evScale: 'ev' });
        expect(text).toContain('EVs: 12 HP / 252 Atk / 252 Spe');
    });

    it('leaves an EV member untouched when asked for EVs', () => {
        const text = buildShowdownExportText([{
            name: 'garchomp',
            customization: { evs: { attack: 252, speed: 252, hp: 4 } },
        }], { evScale: 'ev' });
        expect(text).toContain('EVs: 4 HP / 252 Atk / 252 Spe');
    });
});
