import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('./firebase', () => ({ db: null }));

describe('resolvePokemonDetail form & moveless fallback', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
        vi.resetModules();
    });

    afterEach(() => {
        global.fetch = originalFetch;
    });

    it('inherits moves and abilities from baseId for Gigantamax and recent Mega forms without moves', async () => {
        const mockIndex = [
            {
                id: 445,
                name: 'garchomp',
                types: ['dragon', 'ground'],
                baseStats: { hp: 108, attack: 130, defense: 95, 'special-attack': 80, 'special-defense': 85, speed: 102 },
            },
            {
                id: 10299,
                name: 'Mega Garchomp Z',
                apiName: 'garchomp-mega-z',
                types: ['dragon', 'ground'],
                baseId: 445,
                isForm: true,
                baseStats: { hp: 108, attack: 170, defense: 115, 'special-attack': 120, 'special-defense': 95, speed: 92 },
            },
            {
                id: 10196,
                name: 'Gigantamax Charizard',
                apiName: 'charizard-gmax',
                types: ['fire', 'flying'],
                baseId: 6,
                isForm: true,
                baseStats: { hp: 78, attack: 84, defense: 78, 'special-attack': 109, 'special-defense': 85, speed: 100 },
            },
            {
                id: 6,
                name: 'charizard',
                types: ['fire', 'flying'],
                baseStats: { hp: 78, attack: 84, defense: 78, 'special-attack': 109, 'special-defense': 85, speed: 100 },
            },
        ];

        global.fetch = vi.fn(async (url) => {
            const str = String(url);
            if (str.includes('cache-manifest.json')) {
                return { ok: true, json: async () => ({ files: {} }) };
            }
            if (str.includes('pokemon-index.json')) {
                return { ok: true, json: async () => mockIndex };
            }
            // Simulate PokéAPI returning 404 for brand-new Legends Z-A Mega
            if (str.endsWith('/pokemon/10299')) {
                return { ok: false, status: 404, json: async () => ({}) };
            }
            // Simulate PokéAPI returning Gigantamax Charizard with empty moves
            if (str.endsWith('/pokemon/10196')) {
                return {
                    ok: true,
                    json: async () => ({
                        id: 10196,
                        name: 'charizard-gmax',
                        types: [{ type: { name: 'fire' } }, { type: { name: 'flying' } }],
                        abilities: [{ ability: { name: 'blaze', url: '' }, is_hidden: false }],
                        moves: [],
                        stats: [{ stat: { name: 'hp' }, base_stat: 78 }],
                        sprites: {},
                    }),
                };
            }
            if (str.endsWith('/pokemon/445')) {
                return {
                    ok: true,
                    json: async () => ({
                        id: 445,
                        name: 'garchomp',
                        types: [{ type: { name: 'dragon' } }, { type: { name: 'ground' } }],
                        abilities: [{ ability: { name: 'sand-veil', url: '' }, is_hidden: false }],
                        moves: [{ move: { name: 'earthquake', url: '' } }],
                        stats: [{ stat: { name: 'hp' }, base_stat: 108 }],
                        sprites: {},
                    }),
                };
            }
            if (str.endsWith('/pokemon/6')) {
                return {
                    ok: true,
                    json: async () => ({
                        id: 6,
                        name: 'charizard',
                        types: [{ type: { name: 'fire' } }, { type: { name: 'flying' } }],
                        abilities: [{ ability: { name: 'blaze', url: '' }, is_hidden: false }],
                        moves: [{ move: { name: 'flamethrower', url: '' } }],
                        stats: [{ stat: { name: 'hp' }, base_stat: 78 }],
                        sprites: {},
                    }),
                };
            }
            return { ok: false, status: 404, json: async () => ({}) };
        });

        const { resolvePokemonDetail } = await import('./pokemonDataCache');

        // 1. Recent Mega Evolution (404 on PokéAPI) resolves from index + inherits base species moves & abilities
        const megaZ = await resolvePokemonDetail(10299);
        expect(megaZ).not.toBeNull();
        expect(megaZ.id).toBe(10299);
        expect(megaZ.name).toBe('Mega Garchomp Z');
        expect(megaZ.types).toEqual(['dragon', 'ground']);
        expect(megaZ.moves.map((m) => m.name)).toContain('earthquake');
        expect(megaZ.abilities.map((a) => a.name)).toContain('sand-veil');
        expect(megaZ.stats.length).toBe(6);

        // 2. Gigantamax form (empty moves on PokéAPI) inherits base species moves
        const gmax = await resolvePokemonDetail(10196);
        expect(gmax).not.toBeNull();
        expect(gmax.id).toBe(10196);
        expect(gmax.moves.map((m) => m.name)).toContain('flamethrower');
        expect(gmax.abilities.map((a) => a.name)).toContain('blaze');
    });
});
