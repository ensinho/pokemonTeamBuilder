import { describe, it, expect } from 'vitest';
import { buildListSignature } from './pokedexListKey';

describe('buildListSignature', () => {
    it('is stable for the same filters', () => {
        const filters = { mode: 'pokedex', generation: 'generation-i', types: new Set(['fire']), search: 'char' };
        expect(buildListSignature(filters)).toBe(buildListSignature({ ...filters }));
    });

    it('separates the pokedex list from the builder list', () => {
        expect(buildListSignature({ mode: 'pokedex' })).not.toBe(buildListSignature({ mode: 'builder' }));
    });

    it('ignores type order — the filter is a set, not a sequence', () => {
        expect(buildListSignature({ types: new Set(['fire', 'water']) }))
            .toBe(buildListSignature({ types: new Set(['water', 'fire']) }));
    });

    it('ignores search casing and surrounding whitespace', () => {
        expect(buildListSignature({ search: '  CHARizard ' })).toBe(buildListSignature({ search: 'charizard' }));
    });

    it('changes when any filter changes', () => {
        const base = buildListSignature({ mode: 'pokedex' });
        expect(buildListSignature({ mode: 'pokedex', generation: 'generation-ii' })).not.toBe(base);
        expect(buildListSignature({ mode: 'pokedex', game: 'red' })).not.toBe(base);
        expect(buildListSignature({ mode: 'pokedex', types: new Set(['fire']) })).not.toBe(base);
        expect(buildListSignature({ mode: 'pokedex', search: 'pika' })).not.toBe(base);
        expect(buildListSignature({ mode: 'pokedex', favoritesOnly: true })).not.toBe(base);
    });

    it('treats missing filters as the defaults', () => {
        expect(buildListSignature({ mode: 'pokedex' }))
            .toBe(buildListSignature({ mode: 'pokedex', generation: null, game: undefined, types: null, search: null }));
    });
});
