import { describe, it, expect, vi } from 'vitest';

export async function enrichImportedTeam(sharedTeam, fetchIndexFn, getStaticDetailFn) {
    if (!sharedTeam || !sharedTeam.pokemons) return [];

    let pokemonIndex = [];
    if (fetchIndexFn) {
        pokemonIndex = await fetchIndexFn() || [];
    }
    const indexById = new Map((pokemonIndex || []).map((p) => [p.id, p]));

    return Promise.all(sharedTeam.pokemons.map(async (p) => {
        if (!p) return p;
        let indexEntry = indexById.get(p.id);
        if (!indexEntry && p.id && getStaticDetailFn) {
            try {
                indexEntry = await getStaticDetailFn(p.id);
            } catch (_) { /* ignore */ }
        }
        const types = (Array.isArray(p.types) && p.types.length > 0)
            ? p.types
            : ((Array.isArray(indexEntry?.types) && indexEntry.types.length > 0) ? indexEntry.types : ['normal']);

        return {
            ...(indexEntry || {}),
            ...p,
            types,
        };
    }));
}

describe('enrichImportedTeam', () => {
    it('preserves types if already present on shared pokemon', async () => {
        const sharedTeam = {
            name: 'Test Team',
            pokemons: [{ id: 25, name: 'pikachu', types: ['electric'] }]
        };
        const result = await enrichImportedTeam(sharedTeam, async () => []);
        expect(result[0].types).toEqual(['electric']);
    });

    it('recovers types from pokemon index if missing from shared team', async () => {
        const sharedTeam = {
            name: 'Test Team',
            pokemons: [{ id: 6, name: 'charizard' }]
        };
        const mockIndex = [{ id: 6, name: 'charizard', types: ['fire', 'flying'] }];
        const result = await enrichImportedTeam(sharedTeam, async () => mockIndex);
        expect(result[0].types).toEqual(['fire', 'flying']);
    });

    it('falls back to static details if index entry is missing', async () => {
        const sharedTeam = {
            name: 'Test Team',
            pokemons: [{ id: 150, name: 'mewtwo' }]
        };
        const mockStaticGetter = vi.fn().mockResolvedValue({ id: 150, name: 'mewtwo', types: ['psychic'] });
        const result = await enrichImportedTeam(sharedTeam, async () => [], mockStaticGetter);
        expect(result[0].types).toEqual(['psychic']);
        expect(mockStaticGetter).toHaveBeenCalledWith(150);
    });

    it('defaults to ["normal"] if types cannot be found', async () => {
        const sharedTeam = {
            name: 'Test Team',
            pokemons: [{ id: 9999, name: 'custom' }]
        };
        const result = await enrichImportedTeam(sharedTeam, async () => []);
        expect(result[0].types).toEqual(['normal']);
    });
});
