import { describe, it, expect } from 'vitest';

import { gymRoster, gymTeamForImport } from './gymTeam';
import { buildTeamMembers } from './teamImport';

const INDEX = [
    { id: 74, name: 'geodude', types: ['rock', 'ground'] },
    { id: 95, name: 'onix', types: ['rock', 'ground'] },
    { id: 215, name: 'sneasel', types: ['dark', 'ice'] },
    { id: 10235, name: 'Hisuian Sneasel', apiName: 'sneasel-hisui', baseId: 215, isForm: true, types: ['fighting', 'poison'] },
];
const resolve = (name) => INDEX.find((entry) => entry.name.toLowerCase() === String(name).toLowerCase()) || null;

const BROCK = {
    name: 'Brock',
    team: [
        { name: 'Geodude', level: 12, moves: [{ name: 'defense-curl', type: 'normal' }, { name: 'tackle', type: 'normal' }] },
        { name: 'Onix', level: 14, item: 'Smooth Rock', ability: 'Rock Head', moves: [{ name: 'Stealth Rock', type: 'rock' }] },
    ],
};

describe('gymTeamForImport', () => {
    it('keeps the moves, item, ability and level the page shows', () => {
        const team = gymTeamForImport(BROCK, resolve, { gameLabel: 'Red / Blue' });
        expect(team.name).toBe('Brock · Red / Blue');
        expect(team.pokemons).toEqual([
            { id: 74, name: 'geodude', types: ['rock', 'ground'], customization: { moves: ['defense-curl', 'tackle'], level: 12 } },
            { id: 95, name: 'onix', types: ['rock', 'ground'], customization: { moves: ['stealth-rock'], item: 'smooth-rock', ability: 'rock-head', level: 14 } },
        ]);
    });

    it('skips a Pokémon the index does not know and reports an empty team as empty', () => {
        expect(gymTeamForImport({ name: 'X', team: [{ name: 'Missingno' }] }, resolve).pokemons).toEqual([]);
        expect(gymTeamForImport(null, resolve).pokemons).toEqual([]);
    });

    it('brings the fixed members plus as many of the pool as the leader picks', () => {
        const leader = { poolPick: 1, team: [{ name: 'Onix' }, { name: 'Geodude', pool: true }, { name: 'Sneasel', pool: true }] };
        expect(gymRoster(leader).map((mon) => mon.name)).toEqual(['Onix', 'Geodude']);
    });

    it('becomes builder members: own instance ids, the form\'s id, no Showdown name made of a label', async () => {
        const leader = { name: 'Y', team: [{ name: 'Hisuian Sneasel', level: 30, moves: ['Poison Jab'] }, { name: 'Geodude' }, { name: 'Geodude' }] };
        const detail = (id) => ({ id, abilities: [{ name: 'own-ability' }], moves: [{ name: 'poison-jab' }] });
        const { members, unresolved } = await buildTeamMembers(
            gymTeamForImport(leader, resolve),
            { pokemonIndex: INDEX, resolveDetail: detail },
            { mode: 'import', speciesClause: false },
        );
        expect(unresolved).toEqual([]);
        expect(members.map((m) => m.id)).toEqual([10235, 74, 74]);
        expect(members[0]).toMatchObject({ speciesId: 215, apiName: 'sneasel-hisui' });
        expect(members[0].showdownName).toBeUndefined();
        expect(members[0].customization).toMatchObject({ moves: ['poison-jab'], level: 30, ability: 'own-ability' });
        expect(new Set(members.map((m) => m.instanceId)).size).toBe(3);
    });
});
