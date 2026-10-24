import { describe, expect, it } from 'vitest';
import { bestTeamsSummary, placementRank } from './bestTeams';

const team = (id, placement, members, format = 'Reg M-B', tournament = 'Worlds') => ({
    id, placement, format, tournament, title: id,
    pokemons: members.map(([pid, name]) => ({ id: pid, name })),
});

const TEAMS = [
    team('t9', '9th', [[727, 'Incineroar'], [445, 'Garchomp']]),
    team('champ', 'Champion', [[727, 'Incineroar'], [445, 'Garchomp'], [6, 'Charizard-Mega-Y']]),
    team('ru', 'Runner Up', [[727, 'Incineroar'], [6, 'Charizard']], 'Reg M-B', 'Regional'),
    team('old', 'Champion', [[25, 'Pikachu']], 'Reg I'),
];

describe('placementRank', () => {
    it('orders finishes the way a bracket does', () => {
        expect(['Champion', 'Champion (Seniors)', 'Runner Up', '3rd', 'Top 8', '17th', '31st', '51st', ''].map(placementRank)).toEqual([1, 1, 2, 3, 8, 17, 31, 51, 999]);
    });
});

describe('bestTeamsSummary', () => {
    const summary = bestTeamsSummary(TEAMS);

    it('keeps to the regulation most of the dataset is in', () => {
        expect(summary.format).toBe('Reg M-B');
        expect(summary.total).toBe(3);
        expect(summary.events).toBe(2);
        expect(summary.top.map((t) => t.id)).toEqual(['champ', 'ru', 't9']);
    });

    it('counts each species once per team, a Mega as its base', () => {
        expect(summary.pokemon).toEqual([
            { id: 727, name: 'Incineroar', count: 3, share: 100 },
            { id: 6, name: 'Charizard-Mega-Y', count: 2, share: 67 },
            { id: 445, name: 'Garchomp', count: 2, share: 67 },
        ]);
    });

    it('finds the pairs built together most', () => {
        expect(summary.pairs[0]).toEqual({ a: { id: 6, name: 'Charizard-Mega-Y' }, b: { id: 727, name: 'Incineroar' }, count: 2, share: 67 });
        expect(summary.pairs).toHaveLength(3);
    });

    it('answers null without data', () => {
        expect(bestTeamsSummary([])).toBeNull();
        expect(bestTeamsSummary(undefined)).toBeNull();
    });
});
