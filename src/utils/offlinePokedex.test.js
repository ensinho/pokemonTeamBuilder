import { describe, it, expect } from 'vitest';
import {
    SPRITE_BASE,
    pokedexFileId,
    decodePokedexPokemon,
    decodePokedexSpecies,
    decodePokedexEncounters,
    decodePokedexChain,
    decodePokedexMove,
    decodePokedexMachine,
    decodePokedexAbilityEffect,
    planPokedexDownload,
} from './offlinePokedex';

const API = 'https://pokeapi.co/api/v2';

const SHARED = {
    versionGroups: ['red-blue', 'scarlet-violet'],
    learnMethods: ['level-up', 'machine'],
    versions: ['red', 'blue'],
    encounterMethods: ['walk'],
    areas: ['viridian-forest-area'],
    moves: ['thunder-shock', 'thunderbolt'],
    moveData: [
        ['electric', 40, 100, 30, 'special', []],
        ['electric', 90, 100, 15, 'special', [0, 24, 1, 400]],
    ],
    machines: { 24: 'tm24', 400: 'tm126' },
    abilities: ['static', 'lightning-rod'],
    abilityEffects: ['May paralyze on contact.', 'Draws in Electric moves.'],
    chains: { 10: ['pichu', 172, [['pikachu', 25, [['raichu', 26, []]]]]] },
    apiIdToIndexId: { 10300: 10280 },
};

const PIKACHU = {
    p: {
        id: 25,
        n: 'pikachu',
        h: 4,
        w: 60,
        t: ['electric'],
        s: [[35, 0], [55, 0], [40, 0], [50, 0], [50, 0], [90, 2]],
        a: [[0, 0], [1, 1]],
        sp: ['pikachu', 25],
        m: [[0, [0, 0, 1]], [1, [0, 1, 0, 1, 1, 0]]],
        spr: { fd: '25.png', g5ad: 'versions/generation-v/black-white/animated/25.gif' },
    },
    e: [[0, [[0, [[0, 5, 3, 5]]], [1, [[0, 5, 3, 5], [0, 10, 4, 6]]]]]],
    s: {
        id: 25,
        n: 'pikachu',
        g: 'Mouse Pokémon',
        f: [['en', 'It keeps its tail raised.', 'red'], ['pt', 'Mantém a cauda erguida.', 'sword']],
        gr: 4,
        eg: ['ground', 'fairy'],
        bh: 50,
        gw: 'medium',
        hc: 10,
        cr: 190,
        ec: 10,
        ef: ['pichu', 172],
        v: [['pikachu', 25, 1], ['pikachu-gmax', 10199, 0]],
        b: 0,
        l: 0,
        my: 0,
        gen: 'generation-i',
        hab: 'forest',
        col: 'yellow',
        sh: 'quadruped',
    },
};

describe('pokedexFileId', () => {
    it('prefers an index id, and maps PokéAPI ids of locally-numbered forms', () => {
        expect(pokedexFileId(SHARED, { indexId: 25 })).toBe(25);
        expect(pokedexFileId(SHARED, { apiId: 25 })).toBe(25);
        expect(pokedexFileId(SHARED, { apiId: 10300 })).toBe(10280);
        expect(pokedexFileId(SHARED, {})).toBeNull();
    });
});

describe('decodePokedexPokemon', () => {
    const pokemon = decodePokedexPokemon(PIKACHU, SHARED, API);

    it('rebuilds the fields the detail hook and quizzes read', () => {
        expect(pokemon).toMatchObject({ id: 25, name: 'pikachu', height: 4, weight: 60 });
        expect(pokemon.types).toEqual([{ slot: 1, type: { name: 'electric', url: `${API}/type/electric/` } }]);
        expect(pokemon.stats[5]).toEqual({ base_stat: 90, effort: 2, stat: { name: 'speed', url: `${API}/stat/speed/` } });
        expect(pokemon.abilities.map((a) => [a.ability.name, a.is_hidden])).toEqual([['static', false], ['lightning-rod', true]]);
        expect(pokemon.species).toEqual({ name: 'pikachu', url: `${API}/pokemon-species/25/` });
    });

    it('expands learnsets back into version_group_details', () => {
        expect(pokemon.moves[1]).toEqual({
            move: { name: 'thunderbolt', url: `${API}/move/thunderbolt/` },
            version_group_details: [
                { version_group: { name: 'red-blue', url: `${API}/version-group/red-blue/` }, move_learn_method: { name: 'machine', url: `${API}/move-learn-method/machine/` }, level_learned_at: 0 },
                { version_group: { name: 'scarlet-violet', url: `${API}/version-group/scarlet-violet/` }, move_learn_method: { name: 'machine', url: `${API}/move-learn-method/machine/` }, level_learned_at: 0 },
            ],
        });
    });

    it('rebuilds every sprite slot, null where absent, so chained reads never throw', () => {
        expect(pokemon.sprites.front_default).toBe(`${SPRITE_BASE}25.png`);
        expect(pokemon.sprites.versions['generation-v']['black-white'].animated.front_default)
            .toBe(`${SPRITE_BASE}versions/generation-v/black-white/animated/25.gif`);
        expect(pokemon.sprites.other['official-artwork'].front_default).toBeNull();
        expect(pokemon.sprites.versions['generation-i']['red-blue'].front_default).toBeNull();
    });

    it('returns null without a file or shared tables', () => {
        expect(decodePokedexPokemon(null, SHARED, API)).toBeNull();
        expect(decodePokedexPokemon(PIKACHU, null, API)).toBeNull();
    });
});

describe('decodePokedexSpecies', () => {
    it('rebuilds the species record', () => {
        const species = decodePokedexSpecies(PIKACHU, API);
        expect(species).toMatchObject({
            id: 25,
            name: 'pikachu',
            gender_rate: 4,
            capture_rate: 190,
            hatch_counter: 10,
            base_happiness: 50,
            is_baby: false,
            growth_rate: { name: 'medium' },
            evolution_chain: { url: `${API}/evolution-chain/10/` },
            evolves_from_species: { name: 'pichu', url: `${API}/pokemon-species/172/` },
        });
        expect(species.genera).toEqual([{ genus: 'Mouse Pokémon', language: { name: 'en' } }]);
        expect(species.flavor_text_entries.map((e) => e.language.name)).toEqual(['en', 'pt']);
        expect(species.varieties[1]).toEqual({ is_default: false, pokemon: { name: 'pikachu-gmax', url: `${API}/pokemon/10199/` } });
    });

    it('returns null for a form file, which carries no species', () => {
        expect(decodePokedexSpecies({ p: PIKACHU.p }, API)).toBeNull();
    });
});

describe('decodePokedexEncounters', () => {
    it('rebuilds areas, versions and encounter details', () => {
        const [encounter] = decodePokedexEncounters(PIKACHU, SHARED);
        expect(encounter.location_area.name).toBe('viridian-forest-area');
        expect(encounter.version_details[1]).toEqual({
            version: { name: 'blue' },
            max_chance: 10,
            encounter_details: [
                { method: { name: 'walk' }, chance: 5, min_level: 3, max_level: 5, condition_values: [] },
                { method: { name: 'walk' }, chance: 10, min_level: 4, max_level: 6, condition_values: [] },
            ],
        });
    });
});

describe('decodePokedexChain', () => {
    it('rebuilds the chain tree', () => {
        const chain = decodePokedexChain(SHARED, 10, API);
        expect(chain.chain.species.name).toBe('pichu');
        expect(chain.chain.evolves_to[0].species).toEqual({ name: 'pikachu', url: `${API}/pokemon-species/25/` });
        expect(chain.chain.evolves_to[0].evolves_to[0].species.name).toBe('raichu');
        expect(decodePokedexChain(SHARED, 999, API)).toBeNull();
    });
});

describe('moves, machines and abilities', () => {
    it('rebuilds move details with per-version machines', () => {
        expect(decodePokedexMove(SHARED, 'thunderbolt', API)).toEqual({
            name: 'thunderbolt',
            type: 'electric',
            power: 90,
            accuracy: 100,
            pp: 15,
            damage_class: 'special',
            machines: [
                { machine: { url: `${API}/machine/24/` }, version_group: { name: 'red-blue' } },
                { machine: { url: `${API}/machine/400/` }, version_group: { name: 'scarlet-violet' } },
            ],
            learnedBy: [],
        });
        expect(decodePokedexMove(SHARED, 'splash', API)).toBeNull();
    });

    it('resolves a machine to its TM item', () => {
        expect(decodePokedexMachine(SHARED, 400)).toEqual({ id: 400, item: { name: 'tm126' } });
        expect(decodePokedexMachine(SHARED, 1)).toBeNull();
    });

    it('resolves an ability short effect', () => {
        expect(decodePokedexAbilityEffect(SHARED, 'lightning-rod')).toBe('Draws in Electric moves.');
        expect(decodePokedexAbilityEffect(SHARED, 'levitate')).toBeNull();
    });
});

describe('planPokedexDownload', () => {
    it('lists data files through the data URL, then sprites on the sprite base', () => {
        const tasks = planPokedexDownload(
            { files: ['shared.json', '1.json'], sprites: ['1.png', 'shiny/1.png'] },
            (name) => `/app/data/pokedex/${name}`,
        );
        expect(tasks).toEqual([
            { kind: 'data', url: '/app/data/pokedex/shared.json' },
            { kind: 'data', url: '/app/data/pokedex/1.json' },
            { kind: 'sprite', url: `${SPRITE_BASE}1.png` },
            { kind: 'sprite', url: `${SPRITE_BASE}shiny/1.png` },
        ]);
    });

    it('tolerates a missing manifest', () => {
        expect(planPokedexDownload(null, (n) => n)).toEqual([]);
    });
});
