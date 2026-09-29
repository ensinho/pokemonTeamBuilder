import { describe, it, expect } from 'vitest';
import { decodeOfflinePokemon, decodeOfflineMove } from './offlineBuilderData';

const DATA = {
    abilities: ['overgrow', 'chlorophyll', 'thick-fat'],
    moves: ['tackle', 'solar-beam', 'mystery-move'],
    moveData: [
        ['normal', 40, 100, 35, 'physical'],
        ['grass', 120, 100, 10, 'special'],
        null,
    ],
    pokemon: {
        1: { n: 'bulbasaur', t: ['grass', 'poison'], s: [45, 49, 49, 65, 65, 45], a: [[0, 0], [1, 1]], m: [0, 1] },
        10033: { n: 'venusaur-mega', t: ['grass', 'poison'], s: [80, 100, 123, 122, 120, 80], a: [[2, 0]], m: [1] },
    },
};

describe('decodeOfflinePokemon', () => {
    it('rebuilds the fat team-member shape from the interned tables', () => {
        expect(decodeOfflinePokemon(DATA, 1, 'https://pokeapi.co/api/v2/')).toEqual({
            id: 1,
            name: 'bulbasaur',
            types: ['grass', 'poison'],
            abilities: [
                { name: 'overgrow', url: 'https://pokeapi.co/api/v2/ability/overgrow/', is_hidden: false },
                { name: 'chlorophyll', url: 'https://pokeapi.co/api/v2/ability/chlorophyll/', is_hidden: true },
            ],
            moves: [
                { name: 'tackle', url: 'https://pokeapi.co/api/v2/move/tackle/' },
                { name: 'solar-beam', url: 'https://pokeapi.co/api/v2/move/solar-beam/' },
            ],
            stats: [
                { name: 'hp', base_stat: 45 },
                { name: 'attack', base_stat: 49 },
                { name: 'defense', base_stat: 49 },
                { name: 'special-attack', base_stat: 65 },
                { name: 'special-defense', base_stat: 65 },
                { name: 'speed', base_stat: 45 },
            ],
        });
    });

    it('keys forms by the index id, whatever PokéAPI calls them', () => {
        expect(decodeOfflinePokemon(DATA, '10033', 'https://x')).toMatchObject({ id: 10033, name: 'venusaur-mega' });
    });

    it('returns null for an unknown id or a missing file', () => {
        expect(decodeOfflinePokemon(DATA, 9999, 'https://x')).toBeNull();
        expect(decodeOfflinePokemon(null, 1, 'https://x')).toBeNull();
    });
});

describe('decodeOfflineMove', () => {
    it('rebuilds the getMoveDetails shape', () => {
        expect(decodeOfflineMove(DATA, 'solar-beam')).toEqual({
            name: 'solar-beam',
            type: 'grass',
            power: 120,
            accuracy: 100,
            pp: 10,
            damage_class: 'special',
            machines: [],
            learnedBy: [],
        });
    });

    it('returns null for a move with no baked data', () => {
        expect(decodeOfflineMove(DATA, 'mystery-move')).toBeNull();
        expect(decodeOfflineMove(DATA, 'not-a-move')).toBeNull();
        expect(decodeOfflineMove(undefined, 'tackle')).toBeNull();
    });
});
