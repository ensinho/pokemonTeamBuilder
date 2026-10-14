import { describe, it, expect } from 'vitest';
import { passwordStrength } from './passwordStrength';

describe('passwordStrength', () => {
    it('reads an empty field as empty', () => {
        expect(passwordStrength('')).toMatchObject({ score: 0, level: 'empty', meetsMinimum: false });
    });

    it('keeps anything under the 6-character floor weak', () => {
        expect(passwordStrength('aB1!x')).toMatchObject({ level: 'weak', meetsMinimum: false });
    });

    it('climbs with length and variety', () => {
        expect(passwordStrength('pikachu').level).toBe('weak');
        expect(passwordStrength('pikachu25').level).toBe('fair');
        expect(passwordStrength('Pikachu25').level).toBe('good');
        expect(passwordStrength('Pikachu25!thunder').level).toBe('strong');
    });

    it('never goes past 4', () => {
        expect(passwordStrength('Aa1!Aa1!Aa1!Aa1!').score).toBe(4);
    });
});
