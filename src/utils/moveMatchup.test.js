import { describe, expect, it } from 'vitest';
import { defenderTypesOf, matchupTone, moveMatchup, multiplierLabel, typeMultiplier } from './moveMatchup';

describe('typeMultiplier', () => {
    it('multiplies across both types', () => {
        expect(typeMultiplier('ice', ['dragon', 'ground'])).toBe(4);
        expect(typeMultiplier('fire', ['grass', 'poison'])).toBe(2);
        expect(typeMultiplier('grass', ['fire', 'flying'])).toBe(0.25);
        expect(typeMultiplier('normal', ['ghost'])).toBe(0);
    });
    it('reads a type it does not know as neutral', () => {
        expect(typeMultiplier('fire', ['unknown'])).toBe(1);
        expect(typeMultiplier('', ['fire'])).toBe(1);
    });
});

describe('matchupTone and multiplierLabel', () => {
    it('names each band', () => {
        expect(matchupTone(0)).toBe('immune');
        expect(matchupTone(4)).toBe('super');
        expect(matchupTone(2)).toBe('super');
        expect(matchupTone(1)).toBe('neutral');
        expect(matchupTone(0.5)).toBe('weak');
    });
    it('writes the fractions the games do', () => {
        expect(multiplierLabel(0.5)).toBe('×½');
        expect(multiplierLabel(0.25)).toBe('×¼');
        expect(multiplierLabel(4)).toBe('×4');
        expect(multiplierLabel(0)).toBe('×0');
    });
});

describe('defenderTypesOf', () => {
    it('uses the Tera type alone once Terastallized', () => {
        expect(defenderTypesOf({ types: ['dragon', 'ground'], teraType: 'Steel' })).toEqual(['steel']);
    });
    it('keeps the species types for Stellar', () => {
        expect(defenderTypesOf({ types: ['Normal'], teraType: 'Stellar' })).toEqual(['normal']);
    });
});

describe('moveMatchup', () => {
    const roserade = { types: ['grass', 'poison'], abilities: ['Natural Cure', 'Poison Point', 'Technician'] };
    it('reads a damaging move on the target', () => {
        expect(moveMatchup({ moveType: 'flying', category: 'Special', target: roserade })).toEqual({ multiplier: 2, tone: 'super' });
        expect(moveMatchup({ moveType: 'water', category: 'Special', target: roserade })).toEqual({ multiplier: 0.5, tone: 'weak' });
    });
    it('says nothing for a status move or an unknown target', () => {
        expect(moveMatchup({ moveType: 'normal', category: 'Status', target: roserade })).toBeNull();
        expect(moveMatchup({ moveType: 'fire', category: 'Physical', target: null })).toBeNull();
        expect(moveMatchup({ moveType: 'fire', category: 'Physical', target: { types: [] } })).toBeNull();
    });
    it('counts Levitate only when it is the only ability', () => {
        const rotom = { types: ['electric', 'water'], abilities: ['Levitate'] };
        expect(moveMatchup({ moveType: 'ground', category: 'Physical', target: rotom }).tone).toBe('immune');
        const bronzong = { types: ['steel', 'psychic'], abilities: ['Levitate', 'Heatproof', 'Heavy Metal'] };
        expect(moveMatchup({ moveType: 'ground', category: 'Physical', target: bronzong }).tone).toBe('super');
    });
});
