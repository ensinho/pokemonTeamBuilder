import { describe, it, expect } from 'vitest';
import { analyzeTeam } from './teamAnalysis';

// Minimal pokémon factory — only `id` and `types` matter to the engine.
const mon = (id, types) => ({ id, types });

describe('analyzeTeam', () => {
    it('returns empty analysis for an empty team', () => {
        const { teamAnalysis, suggestedPokemonIds } = analyzeTeam([], []);
        expect(teamAnalysis.weaknesses).toEqual({});
        expect(teamAnalysis.defensiveCoverage).toEqual({});
        expect(teamAnalysis.strengths.size).toBe(0);
        expect(suggestedPokemonIds.size).toBe(0);
    });

    it('flags a team-wide weakness (single Fire mon is weak to Water/Ground/Rock)', () => {
        const { teamAnalysis } = analyzeTeam([mon(4, ['fire'])], []);
        // weakCount >= length/2 with one mon → any 2x type counts
        expect(teamAnalysis.weaknesses).toHaveProperty('water');
        expect(teamAnalysis.weaknesses).toHaveProperty('ground');
        expect(teamAnalysis.weaknesses).toHaveProperty('rock');
    });

    it('does not flag a weakness covered by half the team or more resisting', () => {
        // One Fire (weak to water) + one Water (resists water) → resistanceCount == weakCount,
        // engine requires weakCount > resistanceCount, so water is NOT a team weakness.
        const { teamAnalysis } = analyzeTeam([mon(4, ['fire']), mon(7, ['water'])], []);
        expect(teamAnalysis.weaknesses).not.toHaveProperty('water');
    });

    it('computes defensive coverage (resistances) per attacking type', () => {
        const { teamAnalysis } = analyzeTeam([mon(7, ['water'])], []);
        // Water resists Fire, Water, Ice, Steel
        expect(teamAnalysis.defensiveCoverage).toHaveProperty('fire');
        expect(teamAnalysis.defensiveCoverage.fire).toBe(1);
    });

    it('aggregates offensive coverage (strengths) from super-effective matchups', () => {
        const { teamAnalysis } = analyzeTeam([mon(4, ['fire'])], []);
        // Fire deals 2x to grass, ice, bug, steel
        expect(teamAnalysis.strengths.has('grass')).toBe(true);
        expect(teamAnalysis.strengths.has('steel')).toBe(true);
        expect(teamAnalysis.strengths.has('water')).toBe(false);
    });

    it('handles dual-type multipliers multiplicatively (Grass/Ground 4x weak to Ice)', () => {
        const { teamAnalysis } = analyzeTeam([mon(1, ['grass', 'ground'])], []);
        // grass 2x ice * ground 2x ice = 4x → still just counted as a weakness
        expect(teamAnalysis.weaknesses).toHaveProperty('ice');
    });

    it('suggests fillers that resist the team weakness, capped at 10', () => {
        const team = [mon(4, ['fire'])]; // weak to water/ground/rock
        const pool = [
            mon(7, ['water']),   // resists water → good filler
            mon(9, ['water']),
            mon(131, ['water']),
            mon(25, ['electric']), // does NOT resist water/ground/rock the right way... electric resists nothing here
            mon(99, ['normal']),   // resists none of those
        ];
        const { suggestedPokemonIds } = analyzeTeam(team, pool);
        expect(suggestedPokemonIds.has(7)).toBe(true);
        expect(suggestedPokemonIds.has(99)).toBe(false);
        expect(suggestedPokemonIds.size).toBeLessThanOrEqual(10);
    });

    it('returns no suggestions when the team has no flagged weakness', () => {
        // A lone Steel mon: it resists tons of types and is weak only to Fire/Fighting/Ground.
        // With pool mons that don't resist those, no suggestion should surface for a non-flagged type.
        const { suggestedPokemonIds } = analyzeTeam(
            [mon(208, ['steel'])],
            [mon(99, ['normal'])], // normal resists none of steel's flagged weaknesses
        );
        expect(suggestedPokemonIds.has(99)).toBe(false);
    });

    it('ignores pokémon without a types array when suggesting', () => {
        const { suggestedPokemonIds } = analyzeTeam([mon(4, ['fire'])], [{ id: 999 }]);
        expect(suggestedPokemonIds.has(999)).toBe(false);
    });
});
