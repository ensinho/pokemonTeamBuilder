import { describe, it, expect } from 'vitest';
import { getPokemonNeighbors, resolveBrowseList } from './pokemonNeighbors';

const entry = (id, name) => ({ id, name, types: ['normal'] });
const sequence = [entry(7, 'squirtle'), entry(25, 'pikachu'), entry(133, 'eevee')];
const national = [entry(1, 'bulbasaur'), entry(2, 'ivysaur'), entry(3, 'venusaur')];

describe('resolveBrowseList', () => {
    it('uses the browsed sequence when it holds the current Pokémon', () => {
        expect(resolveBrowseList(sequence, 25, national)).toBe(sequence);
    });

    it('falls back to national order when the sequence does not hold it', () => {
        expect(resolveBrowseList(sequence, 2, national)).toBe(national);
    });

    it('tolerates a missing sequence', () => {
        expect(resolveBrowseList(undefined, 2, national)).toBe(national);
        expect(resolveBrowseList(null, 2, null)).toEqual([]);
    });
});

describe('getPokemonNeighbors', () => {
    it('walks the filtered order, not the national one', () => {
        const { prev, next } = getPokemonNeighbors(sequence, 25, national);
        expect(prev.id).toBe(7);
        expect(next.id).toBe(133);
    });

    it('does not wrap at either end', () => {
        expect(getPokemonNeighbors(sequence, 7, national).prev).toBeNull();
        expect(getPokemonNeighbors(sequence, 133, national).next).toBeNull();
    });

    it('matches string ids (route params arrive as strings)', () => {
        expect(getPokemonNeighbors(sequence, '25', national).next.id).toBe(133);
    });

    it('returns nothing for an unknown Pokémon', () => {
        expect(getPokemonNeighbors(sequence, 999, national)).toEqual({ prev: null, next: null });
        expect(getPokemonNeighbors(sequence, undefined, national)).toEqual({ prev: null, next: null });
    });

    it('falls back to national order for a Pokémon outside the browsed list', () => {
        const { prev, next } = getPokemonNeighbors(sequence, 2, national);
        expect(prev.id).toBe(1);
        expect(next.id).toBe(3);
    });
});
