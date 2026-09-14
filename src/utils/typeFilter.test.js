import { describe, it, expect } from 'vitest';
import { matchesTypeFilter, isTypeMatchMode, TYPE_MATCH_ALL, TYPE_MATCH_ANY } from './typeFilter';

const charizard = ['fire', 'flying'];
const squirtle = ['water'];

describe('matchesTypeFilter', () => {
    it('matches everything when nothing is selected', () => {
        expect(matchesTypeFilter(squirtle, [], TYPE_MATCH_ALL)).toBe(true);
        expect(matchesTypeFilter(squirtle, new Set(), TYPE_MATCH_ANY)).toBe(true);
        expect(matchesTypeFilter(squirtle, null)).toBe(true);
    });

    it('OR keeps a Pokémon carrying any one of the selected types', () => {
        expect(matchesTypeFilter(charizard, ['fire', 'water'], TYPE_MATCH_ANY)).toBe(true);
        expect(matchesTypeFilter(squirtle, ['fire', 'water'], TYPE_MATCH_ANY)).toBe(true);
        expect(matchesTypeFilter(['grass'], ['fire', 'water'], TYPE_MATCH_ANY)).toBe(false);
    });

    it('AND requires every selected type — this is the whole point of the switch', () => {
        expect(matchesTypeFilter(charizard, ['fire', 'flying'], TYPE_MATCH_ALL)).toBe(true);
        expect(matchesTypeFilter(charizard, ['fire', 'water'], TYPE_MATCH_ALL)).toBe(false);
        expect(matchesTypeFilter(squirtle, ['fire', 'water'], TYPE_MATCH_ALL)).toBe(false);
    });

    it('agrees with itself on a single selected type', () => {
        expect(matchesTypeFilter(charizard, ['fire'], TYPE_MATCH_ALL))
            .toBe(matchesTypeFilter(charizard, ['fire'], TYPE_MATCH_ANY));
    });

    it('accepts a Set as well as an array', () => {
        expect(matchesTypeFilter(charizard, new Set(['fire', 'flying']), TYPE_MATCH_ALL)).toBe(true);
    });

    it('falls back to OR for a missing or unknown mode', () => {
        expect(matchesTypeFilter(charizard, ['fire', 'water'])).toBe(true);
        expect(matchesTypeFilter(charizard, ['fire', 'water'], 'nonsense')).toBe(true);
    });

    it('never matches an AND of three types — nothing has three', () => {
        expect(matchesTypeFilter(charizard, ['fire', 'flying', 'water'], TYPE_MATCH_ALL)).toBe(false);
    });

    it('tolerates a Pokémon with no types', () => {
        expect(matchesTypeFilter(undefined, ['fire'], TYPE_MATCH_ANY)).toBe(false);
    });
});

describe('isTypeMatchMode', () => {
    it('accepts only the two real modes', () => {
        expect(isTypeMatchMode(TYPE_MATCH_ANY)).toBe(true);
        expect(isTypeMatchMode(TYPE_MATCH_ALL)).toBe(true);
        expect(isTypeMatchMode('either')).toBe(false);
        expect(isTypeMatchMode(undefined)).toBe(false);
    });
});
