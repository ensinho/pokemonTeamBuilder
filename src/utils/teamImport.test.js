import { describe, it, expect, vi } from 'vitest';
import { annotateEvScales, buildTeamMembers, resolveSetForm, teamEvScale, toSlug } from './teamImport';

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

const pokemonIndex = [
    { id: 479, name: 'Rotom', apiName: 'rotom' },
    { id: 10009, name: 'Rotom-Wash', apiName: 'rotom-wash', baseId: 479 },
    { id: 670, name: 'Floette', apiName: 'floette' },
    { id: 745, name: 'Lycanroc', apiName: 'lycanroc-midday' },
    { id: 25, name: 'Pikachu', apiName: 'pikachu' },
];

const detailFor = (id) => ({
    id,
    name: pokemonIndex.find((entry) => entry.id === id)?.name || `#${id}`,
    types: ['electric'],
    abilities: [{ name: 'static' }, { name: 'levitate' }],
    moves: [{ name: 'thunderbolt' }, { name: 'volt-switch' }, { name: 'hydro-pump' }, { name: 'protect' }],
});

const deps = (overrides = {}) => ({
    pokemonIndex,
    resolveDetail: vi.fn(async (id) => detailFor(id)),
    resolveDetailByName: vi.fn(async () => null),
    ...overrides,
});

const tournamentSet = (overrides = {}) => ({
    id: 25,
    name: 'Pikachu',
    item: 'Light Ball',
    ability: 'Static',
    nature: 'Timid',
    moves: ['Thunderbolt', 'Volt Switch', 'Protect'],
    evs: { spa: 252, spe: 252, hp: 4 },
    ...overrides,
});

describe('toSlug', () => {
    it('turns Showdown spelling into PokéAPI slugs', () => {
        expect(toSlug("Farfetch'd")).toBe('farfetchd');
        expect(toSlug('Light Ball')).toBe('light-ball');
        expect(toSlug(undefined)).toBe('');
    });
});

describe('resolveSetForm', () => {
    it('finds a form the dataset filed under its base species', () => {
        expect(resolveSetForm({ id: 479, name: 'Rotom-Wash' }, pokemonIndex).id).toBe(10009);
    });

    it('asks PokéAPI by name for a form the index lacks', () => {
        const form = resolveSetForm({ id: 745, name: 'Lycanroc-Dusk' }, pokemonIndex);
        expect(form.id).toBe(745);
        expect(form.lookupName).toBe('lycanroc-dusk');
    });

    it('keeps a Mega as its base species and its name exactly as written', () => {
        const form = resolveSetForm({ id: 670, name: 'Floette-Mega' }, pokemonIndex);
        expect(form.id).toBe(670);
        expect(form.lookupName).toBeNull();
        expect(form.showdownName).toBe('Floette-Mega');
    });

    it('treats Showdown\'s short name for a default form as the species', () => {
        expect(resolveSetForm({ id: 745, name: 'Lycanroc' }, pokemonIndex).lookupName).toBeNull();
    });
});

describe('teamEvScale / annotateEvScales', () => {
    it('reads Stat Points from the numbers', () => {
        expect(teamEvScale({ pokemons: [{ evs: { hp: 2, spa: 32, spe: 32 } }] })).toBe('sp');
        expect(teamEvScale({ pokemons: [{ evs: { spa: 252, spe: 252, hp: 4 } }] })).toBe('ev');
    });

    it('trusts a scale the team states', () => {
        expect(teamEvScale({ evScale: 'sp', pokemons: [{ evs: { spa: 252 } }] })).toBe('sp');
    });

    it('gives a spread-less team the scale of its format', () => {
        const [, silent, other] = annotateEvScales([
            { format: 'champions', pokemons: [{ evs: { spe: 32, atk: 32, hp: 2 } }] },
            { format: 'champions', pokemons: [{ evs: {} }] },
            { format: 'vgc', pokemons: [{ evs: {} }] },
        ]);
        expect(silent.evScale).toBe('sp');
        expect(other.evScale).toBe('ev');
    });
});

describe('buildTeamMembers — tournament team', () => {
    it('turns each set into a member carrying that set', async () => {
        const { members, dropped, unresolved } = await buildTeamMembers({ pokemons: [tournamentSet()] }, deps());
        const [member] = members;
        expect(dropped).toEqual([]);
        expect(unresolved).toEqual([]);
        expect(member.id).toBe(25);
        expect(member.speciesId).toBe(25);
        expect(member.customization).toMatchObject({
            item: 'light-ball',
            ability: 'static',
            nature: 'timid',
            moves: ['thunderbolt', 'volt-switch', 'protect'],
        });
        expect(member.customization.evs).toMatchObject({ 'special-attack': 252, speed: 252, hp: 4 });
        expect(member.customization).not.toHaveProperty('evScale');
    });

    it('gives every member its own instance id', async () => {
        const team = { pokemons: [tournamentSet(), tournamentSet({ id: 479, name: 'Rotom-Wash' }), tournamentSet({ id: 670, name: 'Floette' })] };
        const { members } = await buildTeamMembers(team, deps());
        const ids = members.map((m) => m.instanceId);
        expect(ids.every(Boolean)).toBe(true);
        expect(new Set(ids).size).toBe(3);
    });

    it('marks a Champions team as Stat Points and keeps the numbers', async () => {
        const team = { pokemons: [tournamentSet({ evs: { hp: 2, spa: 32, spe: 32 } })] };
        const { members: [member] } = await buildTeamMembers(team, deps());
        expect(member.customization.evScale).toBe('sp');
        expect(member.customization.evs).toMatchObject({ hp: 2, 'special-attack': 32, speed: 32 });
    });

    it('keeps "Floette-Mega" as the paste wrote it', async () => {
        const team = { pokemons: [tournamentSet({ id: 670, name: 'Floette-Mega', item: 'Floettite' })] };
        const { members: [member] } = await buildTeamMembers(team, deps());
        expect(member.id).toBe(670);
        expect(member.showdownName).toBe('Floette-Mega');
        expect(member.customization.item).toBe('floettite');
    });

    it('drops a repeated species, keeps the first, and says which', async () => {
        const team = { pokemons: [tournamentSet({ id: 479, name: 'Rotom' }), tournamentSet(), tournamentSet({ id: 479, name: 'Rotom-Wash' })] };
        const { members, dropped } = await buildTeamMembers(team, deps());
        expect(members.map((m) => m.id)).toEqual([479, 25]);
        expect(dropped).toHaveLength(1);
    });

    it('reduces six copies of one Pokémon to one', async () => {
        const team = { pokemons: Array.from({ length: 6 }, () => tournamentSet()) };
        const { members, dropped } = await buildTeamMembers(team, deps());
        expect(members).toHaveLength(1);
        expect(dropped).toHaveLength(5);
    });

    it('uses the real form when PokéAPI knows it by name', async () => {
        const resolveDetailByName = vi.fn(async (slug) => (slug === 'lycanroc-dusk' ? { id: 10152, name: 'lycanroc-dusk', types: ['rock'] } : null));
        const team = { pokemons: [tournamentSet({ id: 745, name: 'Lycanroc-Dusk' })] };
        const { members: [member] } = await buildTeamMembers(team, deps({ resolveDetailByName }));
        expect(resolveDetailByName).toHaveBeenCalledWith('lycanroc-dusk');
        expect(member.id).toBe(10152);
        expect(member.apiName).toBe('lycanroc-dusk');
        expect(member.speciesId).toBe(745);
    });

    it('still builds a member whose details failed to load, and reports it', async () => {
        const resolveDetail = vi.fn(async () => { throw new Error('offline'); });
        const team = { pokemons: [tournamentSet({ id: 9999, name: 'Mystery', types: undefined })] };
        const { members, unresolved } = await buildTeamMembers(team, deps({ resolveDetail }));
        expect(members).toHaveLength(1);
        expect(members[0].types).toEqual(['normal']);
        expect(unresolved).toEqual(['Mystery']);
    });

    it('takes at most six and skips empty slots', async () => {
        const team = { pokemons: [null, ...[25, 479, 670, 745, 10009, 1, 2].map((id) => tournamentSet({ id, name: `p${id}` }))] };
        const { members } = await buildTeamMembers(team, deps({ pokemonIndex: [] }));
        expect(members).toHaveLength(6);
    });
});

describe('buildTeamMembers — saved team', () => {
    const stored = (id, instanceId) => ({
        id,
        name: `#${id}`,
        instanceId,
        customization: { item: 'leftovers', moves: [{ name: 'protect' }], evs: { spe: 252 } },
    });

    it('opens the user\'s own team as it is, repeats and ids included', async () => {
        const team = { id: 'team-1', pokemons: [stored(25, 'a'), stored(25, 'b')] };
        const { members, dropped } = await buildTeamMembers(team, deps(), { mode: 'edit' });
        expect(members.map((m) => m.instanceId)).toEqual(['a', 'b']);
        expect(dropped).toEqual([]);
        expect(members[0].customization.moves).toEqual(['protect']);
        expect(members[0].customization.evs.speed).toBe(252);
    });

    it('gives a shared copy of a saved team fresh ids', async () => {
        const { members } = await buildTeamMembers({ pokemons: [stored(25, 'a')] }, deps());
        expect(members[0].instanceId).not.toBe('a');
    });
});
