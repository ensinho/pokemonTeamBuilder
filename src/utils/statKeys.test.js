import { describe, it, expect } from 'vitest';
import { normalizeSpread, toStatKey } from './statKeys';

describe('toStatKey', () => {
    it('reads every spelling of a stat', () => {
        expect(toStatKey('SpA')).toBe('special-attack');
        expect(toStatKey('special-defense')).toBe('special-defense');
        expect(toStatKey('Spe')).toBe('speed');
        expect(toStatKey('luck')).toBeNull();
        expect(toStatKey(undefined)).toBeNull();
    });
});

describe('normalizeSpread', () => {
    it('fills all six stats with the fallback', () => {
        expect(normalizeSpread(undefined, 31)).toEqual({
            hp: 31, attack: 31, defense: 31, 'special-attack': 31, 'special-defense': 31, speed: 31,
        });
    });

    it('lets the real value win over a placeholder under the other spelling', () => {
        expect(normalizeSpread({ 'special-attack': 0, spa: 252 }, 0)['special-attack']).toBe(252);
        expect(normalizeSpread({ spa: 252, 'special-attack': 0 }, 0)['special-attack']).toBe(252);
    });

    it('drops unknown keys and junk values', () => {
        const out = normalizeSpread({ luck: 9, atk: 'x', def: -4, spe: '32.9' }, 0);
        expect(out).not.toHaveProperty('luck');
        expect(out.attack).toBe(0);
        expect(out.defense).toBe(0);
        expect(out.speed).toBe(32);
    });
});
