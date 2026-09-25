import { describe, it, expect } from 'vitest';
import { decryptFrame, decryptDuration } from './decrypt';

const fixed = () => 0; // always the first glyph, 'A'

describe('decryptFrame', () => {
    it('reveals a prefix and scrambles the rest', () => {
        expect(decryptFrame('Pikachu', 3, fixed)).toEqual({ resolved: 'Pik', noise: 'AAAA' });
    });

    it('keeps spaces and punctuation in place so the shape is right from frame one', () => {
        expect(decryptFrame('Mr. Mime', 0, fixed)).toEqual({ resolved: '', noise: 'AA. AAAA' });
        expect(decryptFrame('Ho-Oh', 1, fixed)).toEqual({ resolved: 'H', noise: 'A-AA' });
    });

    it('clamps the reveal count to the text', () => {
        expect(decryptFrame('Mew', 99, fixed)).toEqual({ resolved: 'Mew', noise: '' });
        expect(decryptFrame('Mew', -2, fixed)).toEqual({ resolved: '', noise: 'AAA' });
    });

    it('treats accented letters as letters', () => {
        expect(decryptFrame('Flabébé', 5, fixed).noise).toBe('AA');
    });
});

describe('decryptDuration', () => {
    it('scales with the name, within a readable band', () => {
        expect(decryptDuration('Mew')).toBe(450);
        expect(decryptDuration('Charmander')).toBe(700);
        expect(decryptDuration('Fletchinder Fletchinder')).toBe(900);
    });
});
