import { describe, expect, it } from 'vitest';
import {
    DEFAULT_POKEDEX_FILTERS,
    filtersFromParams,
    filtersFromStore,
    hasPokedexFilterParams,
    storePatchForFilters,
    writeFilterParams,
} from './pokedexUrlFilters';

const storeState = (overrides = {}) => ({
    pokedexSearchInput: '',
    pokedexSelectedGeneration: 'all',
    pokedexSelectedGame: 'all',
    pokedexSelectedTypes: new Set(),
    pokedexTypeMatchMode: 'any',
    pokedexShowOnlyFavorites: false,
    ...overrides,
});

describe('pokedexUrlFilters', () => {
    it('reads a default store as the default filters and writes no params', () => {
        const filters = filtersFromStore(storeState());
        expect(filters).toEqual(DEFAULT_POKEDEX_FILTERS);
        const params = new URLSearchParams('pokemon=25');
        writeFilterParams(params, filters);
        expect(params.toString()).toBe('pokemon=25');
    });

    it('round-trips every filter through the URL', () => {
        const state = storeState({
            pokedexSearchInput: 'char',
            pokedexSelectedGeneration: 'generation-i',
            pokedexSelectedGame: 'red-blue',
            pokedexSelectedTypes: new Set(['water', 'fire']),
            pokedexTypeMatchMode: 'all',
            pokedexShowOnlyFavorites: true,
        });
        const params = new URLSearchParams();
        writeFilterParams(params, filtersFromStore(state));
        expect(params.get('types')).toBe('fire,water');
        expect(filtersFromParams(params)).toEqual(filtersFromStore(state));
        expect(hasPokedexFilterParams(params)).toBe(true);
    });

    it('drops unknown types and normalises odd values', () => {
        const params = new URLSearchParams('types=banana,fire&match=xor&fav=yes');
        const filters = filtersFromParams(params, new Set(['fire', 'water']));
        expect(filters.types).toBe('fire');
        expect(filters.match).toBe('any');
        expect(filters.fav).toBe('');
    });

    it('patches only the fields that changed, keeping the Set identity otherwise', () => {
        const state = storeState({ pokedexSelectedTypes: new Set(['fire']) });
        const patch = storePatchForFilters(state, { ...filtersFromStore(state), q: 'pika' });
        expect(patch).toEqual({ pokedexSearchInput: 'pika' });
        const typed = storePatchForFilters(state, { ...filtersFromStore(state), types: 'fire,water' });
        expect([...typed.pokedexSelectedTypes]).toEqual(['fire', 'water']);
    });

    it('does not treat unrelated params as Pokédex filters', () => {
        expect(hasPokedexFilterParams(new URLSearchParams('pokemon=25'))).toBe(false);
    });
});
