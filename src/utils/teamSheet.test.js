import { describe, expect, it } from 'vitest';
import { luminance, mixHex, sheetBase, sheetMember } from './teamSheet';

const COLORS = { electric: '#F7D02C', dragon: '#6F35FC', water: '#6390F0' };

describe('mixHex', () => {
    it('mixes toward the second colour', () => {
        expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080');
        expect(mixHex('#ff0000', '#000000', 0)).toBe('#ff0000');
        expect(mixHex('#fff', '#000', 1)).toBe('#000000');
    });

    it('survives bad input', () => {
        expect(mixHex('nope', '#ffffff', 0)).toBe('#000000');
    });
});

describe('sheetBase', () => {
    it('follows the lead type on auto', () => {
        const base = sheetBase('auto', [{ types: ['dragon'] }], COLORS);
        expect(base.startsWith('#')).toBe(true);
        expect(luminance(base)).toBeLessThanOrEqual(0.18);
    });

    it('darkens a light tone until white text reads on it', () => {
        expect(luminance(COLORS.electric)).toBeGreaterThan(0.18);
        expect(luminance(sheetBase('auto', [{ types: ['electric'] }], COLORS))).toBeLessThanOrEqual(0.18);
    });

    it('uses the champion red when nothing else applies', () => {
        expect(sheetBase('champion', [], COLORS)).toBe('#c8102e');
        expect(sheetBase('auto', [], COLORS)).toBe('#c8102e');
    });
});

describe('sheetMember', () => {
    it('keeps four move slots and resolves move types', () => {
        const m = sheetMember({ name: 'garchomp', customization: { moves: ['Earthquake', 'Protect'], item: 'Choice Scarf', ability: 'rough-skin', nature: 'jolly' } }, { earthquake: 'ground' });
        expect(m.moves).toHaveLength(4);
        expect(m.moves[0]).toEqual({ name: 'Earthquake', type: 'ground' });
        expect(m.moves[1]).toEqual({ name: 'Protect', type: null });
        expect(m.moves[2]).toBeNull();
        expect(m.item).toBe('Choice Scarf');
        expect(m.ability).toBe('rough-skin');
    });

    it('is null for an empty slot', () => {
        expect(sheetMember(null)).toBeNull();
    });
});
