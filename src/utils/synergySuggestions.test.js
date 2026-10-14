import { describe, it, expect } from 'vitest';

import { buildSynergySuggestions } from './synergySuggestions';

const stats = (n) => ({ hp: n, attack: n, defense: n, 'special-attack': n, 'special-defense': n, speed: n });
const mon = (id, name, types, bst = 100) => ({ id, name, types, baseStats: stats(bst) });

const INDEX = [
    mon(812, 'rillaboom', ['grass']),
    mon(254, 'sceptile', ['grass', 'dragon']),
    mon(763, 'tsareena', ['grass']),
    mon(952, 'scovillain', ['grass', 'fire']),
    mon(130, 'gyarados', ['water', 'flying']),
    mon(727, 'incineroar', ['fire', 'dark']),
    mon(645, 'landorus', ['ground', 'flying']),
];

// Rillaboom sets Grassy Terrain; Sceptile, Tsareena and Scovillain abuse it.
const set = (ability, moves) => ({ sets: [{ ability, moves: moves.map((m) => [m]) }] });
const SMOGON = {
    812: { name: 'Rillaboom', ...set('grassy-surge', ['grassy-glide', 'fake-out']) },
    254: { name: 'Sceptile', ...set('overgrow', ['grassy-glide', 'leaf-storm']) },
    763: { name: 'Tsareena', ...set('queenly-majesty', ['power-whip']) },
    952: { name: 'Scovillain', ...set('chlorophyll', ['leaf-storm']) },
    130: { name: 'Gyarados', ...set('intimidate', ['waterfall']) },
    727: { name: 'Incineroar', ...set('intimidate', ['fake-out']) },
    645: { name: 'Landorus', ...set('intimidate', ['earthquake']) },
};

const suggest = (teamIds) => buildSynergySuggestions({
    team: teamIds.map((id) => ({ id, types: INDEX.find((p) => p.id === id).types })),
    pokemonIndex: INDEX,
    smogonById: SMOGON,
    metaUsage: new Map(INDEX.map((p) => [p.id, 20])),
});

describe('buildSynergySuggestions — saturation check', () => {
    it('still pushes the core while the niche is being built', () => {
        const ids = suggest([812]).map((s) => s.id);
        // Rillaboom alone: Grassy Terrain abusers are the point.
        expect(ids.indexOf(254)).toBeLessThan(ids.indexOf(645));
    });

    it('stops stacking Grass once the team has two, and turns to coverage', () => {
        const ranked = suggest([812, 254]);
        const ids = ranked.map((s) => s.id);
        // Fire/Ice/Flying/Bug/Poison already hit both members: Incineroar
        // (resists Fire, Ice, Bug) and Gyarados must outrank more Grass.
        for (const cover of [727, 130]) {
            for (const grass of [763, 952]) {
                expect(ids.indexOf(cover)).toBeLessThan(ids.indexOf(grass));
            }
        }
    });

    it('gives a Grass abuser less core weight once the core has an abuser', () => {
        const weightOf = (teamIds) => suggest(teamIds).find((s) => s.id === 763)
            ?.reasons.find((r) => r.kind === 'ability')?.weight;
        expect(weightOf([812, 254])).toBeLessThan(weightOf([812]));
    });
});
