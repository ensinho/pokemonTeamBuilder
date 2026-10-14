import { describe, it, expect } from 'vitest';
import { analyzeTeam, rateTeam, typesForEra, LEGACY_TYPE_CHART, isPreFairyGeneration } from './teamAnalysis';

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

describe('rateTeam', () => {
    it('grades an empty team as still building', () => {
        expect(rateTeam(analyzeTeam([], []).teamAnalysis, 0)).toEqual({ score: 0, grade: 'building' });
    });

    it('is one number for one roster, whatever renders it', () => {
        const team = [mon(4, ['fire'])];
        const { teamAnalysis } = analyzeTeam(team, []);
        // 50 + 4 offence * 2 + 6 resists * 1.5 - 3 weaknesses * 7.5 = 44.5
        expect(rateTeam(teamAnalysis, team.length)).toEqual({ score: 45, grade: 'fair' });
    });

    it('rewards a full six and clamps to 5..100', () => {
        const letters = (s) => s.split('');
        const bad = { strengths: new Set(), weaknesses: Object.fromEntries(letters('abcdefgh').map((k) => [k, 1])), defensiveCoverage: {} };
        expect(rateTeam(bad, 3).score).toBe(5);
        const strong = {
            strengths: new Set(letters('abcdefghijklmnop')),
            weaknesses: {},
            defensiveCoverage: Object.fromEntries(letters('abcdefghijklmnopq').map((k) => [k, 2])),
        };
        expect(rateTeam(strong, 6)).toEqual({ score: 100, grade: 'excellent' });
        const mid = { strengths: new Set(['a', 'b']), weaknesses: {}, defensiveCoverage: { a: 1, b: 1 } };
        expect(rateTeam(mid, 5).score).toBe(57);
        expect(rateTeam(mid, 6).score).toBe(62);
    });

    it('accepts strengths as an array too', () => {
        expect(rateTeam({ strengths: ['a', 'b'], weaknesses: {}, defensiveCoverage: {} }, 1).score).toBe(54);
    });
});

describe('pre-Fairy (Gen 2–5) mode', () => {
    it('restores the typings every Fairy Pokémon had before Gen 6', () => {
        expect(typesForEra(['water', 'fairy'], true)).toEqual(['water']); // Azumarill
        expect(typesForEra(['normal', 'fairy'], true)).toEqual(['normal']); // Jigglypuff, Azurill
        expect(typesForEra(['psychic', 'fairy'], true)).toEqual(['psychic']); // Gardevoir, Mr. Mime
        expect(typesForEra(['fairy'], true)).toEqual(['normal']); // Clefairy, Togepi, Snubbull
        expect(typesForEra(['fairy', 'flying'], true)).toEqual(['normal', 'flying']); // Togekiss
    });

    it('knows which game generations predate Fairy', () => {
        expect(isPreFairyGeneration('generation-iii')).toBe(true);
        expect(isPreFairyGeneration('generation-v')).toBe(true);
        expect(isPreFairyGeneration('generation-vi')).toBe(false);
        expect(isPreFairyGeneration('generation-ix')).toBe(false);
        expect(isPreFairyGeneration(4)).toBe(true);
        expect(isPreFairyGeneration(undefined)).toBe(false);
    });

    it('leaves typings alone outside the mode', () => {
        expect(typesForEra(['water', 'fairy'], false)).toEqual(['water', 'fairy']);
        expect(typesForEra(['fire'], true)).toEqual(['fire']);
    });

    it('drops Fairy from the chart and gives Steel back its Ghost/Dark resists', () => {
        expect(LEGACY_TYPE_CHART).not.toHaveProperty('fairy');
        Object.values(LEGACY_TYPE_CHART).forEach(({ damageTaken, damageDealt }) => {
            expect(damageTaken).not.toHaveProperty('Fairy');
            expect(damageDealt).not.toHaveProperty('Fairy');
        });
        expect(LEGACY_TYPE_CHART.steel.damageTaken).toMatchObject({ Ghost: 0.5, Dark: 0.5 });
    });

    it('analyses Azumarill as the pure Water type it was in Gen 3', () => {
        const azumarill = mon(184, ['water', 'fairy']);
        const modern = analyzeTeam([azumarill], []).teamAnalysis;
        const legacy = analyzeTeam([azumarill], [], { legacyTypes: true }).teamAnalysis;

        expect(modern.weaknesses).toHaveProperty('poison');
        expect(modern.defensiveCoverage).toHaveProperty('dragon');
        expect(legacy.weaknesses).not.toHaveProperty('poison');
        expect(legacy.defensiveCoverage).not.toHaveProperty('dragon');
        expect(legacy.weaknesses).toHaveProperty('grass');
    });

    it('never reports Fairy as a weakness, resist or target', () => {
        const team = [mon(149, ['dragon', 'flying']), mon(248, ['rock', 'dark'])];
        const { teamAnalysis } = analyzeTeam(team, [], { legacyTypes: true });
        expect(teamAnalysis.weaknesses).not.toHaveProperty('fairy');
        expect(teamAnalysis.defensiveCoverage).not.toHaveProperty('fairy');
        expect(teamAnalysis.strengths.has('fairy')).toBe(false);
    });
});
