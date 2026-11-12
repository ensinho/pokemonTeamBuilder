import { describe, expect, it } from 'vitest';
import { effectiveness, teamCounters } from './gymGuide';

describe('gymGuide', () => {
    it('multiplies an attack across both of a Pokémon\'s types', () => {
        expect(effectiveness('electric', ['water'])).toBe(2);
        expect(effectiveness('grass', ['water', 'ground'])).toBe(4);
        expect(effectiveness('electric', ['water', 'ground'])).toBe(0);
        expect(effectiveness('normal', ['fire'])).toBe(1);
        expect(effectiveness('fire', [])).toBe(1);
    });

    it('brings Grass and Electric against Misty', () => {
        // Staryu (Water), Starmie (Water/Psychic).
        const rows = teamCounters([['water'], ['water', 'psychic']]);
        expect(rows.slice(0, 2).map((r) => [r.type, r.hits, r.resisted])).toEqual([
            ['electric', 2, 0],
            ['grass', 2, 0],
        ]);
        expect(rows.every((r) => r.of === 2)).toBe(true);
    });

    it('prefers the type fewer members resist, and skips unresolved members', () => {
        // Geodude and Onix (Rock/Ground): Grass and Water hit both for 4×, so they
        // come before the types that only hit for 2×.
        const rows = teamCounters([['rock', 'ground'], ['rock', 'ground'], []], 3);
        expect(rows.map((r) => r.type)).toEqual(['grass', 'water', 'fighting']);
        expect(rows[0].quad).toBe(2);
        expect(rows[0].of).toBe(2);
        expect(teamCounters([[], null])).toEqual([]);
    });
});
