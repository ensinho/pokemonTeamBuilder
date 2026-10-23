import { describe, expect, it } from 'vitest';
import { presenceShare, tournamentPresence } from './tournamentPresence';

const team = (id, members) => ({ id, title: id, pokemons: members.map(([pid, name]) => ({ id: pid, name })) });

const TEAMS = [
    team('a', [[445, 'Garchomp'], [727, 'Incineroar'], [892, 'Urshifu-Rapid-Strike']]),
    team('b', [[445, 'Garchomp'], [727, 'Incineroar'], [6, 'Charizard-Mega-Y']]),
    team('c', [[727, 'Incineroar'], [6, 'Charizard']]),
    team('d', [[445, 'Garchomp'], [892, 'Urshifu-Rapid-Strike'], [727, 'Incineroar']]),
];

describe('tournamentPresence', () => {
    it('counts the teams that carried the Pokémon, newest first as baked', () => {
        const p = tournamentPresence(TEAMS, 445);
        expect(p.count).toBe(3);
        expect(p.total).toBe(4);
        expect(p.teams.map((t) => t.id)).toEqual(['a', 'b', 'd']);
    });

    it('ranks partners by how often they were on its teams', () => {
        const p = tournamentPresence(TEAMS, 445);
        expect(p.partners).toEqual([
            { id: 727, count: 3, name: 'Incineroar' },
            { id: 892, count: 2, name: 'Urshifu-Rapid-Strike' },
            { id: 6, count: 1, name: 'Charizard-Mega-Y' },
        ]);
    });

    it('treats a Mega and its base as one Pokémon', () => {
        expect(tournamentPresence(TEAMS, 6).count).toBe(2);
    });

    it('limits what it returns', () => {
        const p = tournamentPresence(TEAMS, 727, { teamLimit: 2, partnerLimit: 1 });
        expect(p.teams).toHaveLength(2);
        expect(p.partners.map((x) => x.id)).toEqual([445]);
    });

    it('answers null when the Pokémon never appeared or there is no data', () => {
        expect(tournamentPresence(TEAMS, 25)).toBeNull();
        expect(tournamentPresence([], 445)).toBeNull();
        expect(tournamentPresence(undefined, 445)).toBeNull();
    });
});

describe('presenceShare', () => {
    it('rounds to a whole percentage and never shows 0 for a Pokémon that appears', () => {
        expect(presenceShare({ count: 3, total: 4 })).toBe(75);
        expect(presenceShare({ count: 1, total: 400 })).toBe(1);
        expect(presenceShare(null)).toBe(0);
    });
});
