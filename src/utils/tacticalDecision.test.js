import { describe, expect, it } from 'vitest';
import { analyzeTeam, rateTeam } from './teamAnalysis';
import {
    buildTacticalDecision,
    inspectTeamVulnerabilities,
    resolveTeamSlots,
    typeMultiplierAgainst,
} from './tacticalDecision';

const mon = (id, name, types, extra = {}) => ({ id, name, types, ...extra });

const SAMPLE_DEX = [
    mon(6, 'charizard', ['fire', 'flying'], { baseStats: { hp: 78, attack: 84, defense: 78, 'special-attack': 109, 'special-defense': 85, speed: 100 } }),
    mon(10, 'caterpie', ['bug'], { baseStats: { hp: 45, attack: 30, defense: 35, 'special-attack': 20, 'special-defense': 20, speed: 45 } }),
    mon(94, 'gengar', ['ghost', 'poison'], { baseStats: { hp: 60, attack: 65, defense: 60, 'special-attack': 130, 'special-defense': 75, speed: 110 } }),
    mon(130, 'gyarados', ['water', 'flying'], { baseStats: { hp: 95, attack: 125, defense: 79, 'special-attack': 60, 'special-defense': 100, speed: 81 } }),
    mon(184, 'azumarill', ['water', 'fairy'], { baseStats: { hp: 100, attack: 50, defense: 80, 'special-attack': 60, 'special-defense': 80, speed: 50 } }),
    mon(279, 'pelipper', ['water', 'flying'], { baseStats: { hp: 60, attack: 50, defense: 100, 'special-attack': 95, 'special-defense': 70, speed: 65 } }),
    mon(445, 'garchomp', ['dragon', 'ground'], { baseStats: { hp: 108, attack: 130, defense: 95, 'special-attack': 80, 'special-defense': 85, speed: 102 } }),
    mon(472, 'gliscor', ['ground', 'flying'], { baseStats: { hp: 75, attack: 95, defense: 125, 'special-attack': 45, 'special-defense': 75, speed: 95 } }),
    mon(485, 'heatran', ['fire', 'steel'], { baseStats: { hp: 91, attack: 90, defense: 106, 'special-attack': 130, 'special-defense': 106, speed: 77 } }),
    mon(598, 'ferrothorn', ['grass', 'steel'], { baseStats: { hp: 74, attack: 94, defense: 131, 'special-attack': 54, 'special-defense': 116, speed: 20 } }),
    mon(645, 'landorus-incarnate', ['ground', 'flying'], { baseStats: { hp: 89, attack: 125, defense: 90, 'special-attack': 115, 'special-defense': 80, speed: 101 } }),
    mon(727, 'incineroar', ['fire', 'dark'], { baseStats: { hp: 95, attack: 115, defense: 90, 'special-attack': 80, 'special-defense': 90, speed: 60 } }),
    mon(823, 'corviknight', ['flying', 'steel'], { baseStats: { hp: 98, attack: 87, defense: 105, 'special-attack': 53, 'special-defense': 85, speed: 67 } }),
    mon(10021, 'landorus-therian', ['ground', 'flying'], { baseId: 645, isForm: true, baseStats: { hp: 89, attack: 145, defense: 90, 'special-attack': 105, 'special-defense': 80, speed: 91 } }),
    mon(10041, 'gyarados-mega', ['water', 'dark'], { baseId: 130, isForm: true, apiName: 'gyarados-mega', baseStats: { hp: 95, attack: 155, defense: 109, 'special-attack': 70, 'special-defense': 130, speed: 81 } }),
];

describe('typeMultiplierAgainst', () => {
    it('computes immunities, dual weaknesses, and dual resistances accurately', () => {
        expect(typeMultiplierAgainst(mon(485, 'heatran', ['fire', 'steel']), 'ground')).toBe(4);
        expect(typeMultiplierAgainst(mon(485, 'heatran', ['fire', 'steel']), 'grass')).toBe(0.25);
        expect(typeMultiplierAgainst(mon(823, 'corviknight', ['flying', 'steel']), 'ground')).toBe(0);
    });

    it('honours pre-Fairy (Gen 2–5) typings and Steel resistances when legacyTypes is true', () => {
        const azumarill = mon(184, 'azumarill', ['water', 'fairy']);
        expect(typeMultiplierAgainst(azumarill, 'dragon', { legacyTypes: false })).toBe(0);
        expect(typeMultiplierAgainst(azumarill, 'dragon', { legacyTypes: true })).toBe(1);
    });
});

describe('resolveTeamSlots', () => {
    it('returns null when team has fewer than 2 members or all 6 slots filled', () => {
        expect(resolveTeamSlots([])).toBeNull();
        expect(resolveTeamSlots([SAMPLE_DEX[0]])).toBeNull();
        expect(resolveTeamSlots(SAMPLE_DEX.slice(0, 6))).toBeNull();
    });

    it('locates the first open slot for both compact arrays and 6-slot sparse arrays', () => {
        const compact = [SAMPLE_DEX[0], SAMPLE_DEX[1]];
        expect(resolveTeamSlots(compact)).toMatchObject({ openSlotIndex: 2, openSlotNumber: 3 });

        const sparse = [SAMPLE_DEX[0], SAMPLE_DEX[1], null, SAMPLE_DEX[2], null, SAMPLE_DEX[3]];
        expect(resolveTeamSlots(sparse)).toMatchObject({ openSlotIndex: 2, openSlotNumber: 3 });
    });
});

describe('buildTacticalDecision', () => {
    it('returns null for empty, 1-member, or full 6-member teams', () => {
        expect(buildTacticalDecision([], null, SAMPLE_DEX)).toBeNull();
        expect(buildTacticalDecision([SAMPLE_DEX[0]], null, SAMPLE_DEX)).toBeNull();
        expect(buildTacticalDecision(SAMPLE_DEX.slice(0, 6), null, SAMPLE_DEX)).toBeNull();
    });

    it('flags a critical 4x/shared weakness with 0 resists and ranks up to 3 distinct immunity/resist candidates', () => {
        // Heatran (4x Ground, 2x Water, 2x Fighting) + Incineroar (2x Ground, 2x Water, 2x Fighting)
        const team = [
            mon(485, 'heatran', ['fire', 'steel']),
            mon(727, 'incineroar', ['fire', 'dark']),
        ];
        const analysis = analyzeTeam(team, SAMPLE_DEX);
        const decision = buildTacticalDecision(team, analysis, SAMPLE_DEX);

        expect(decision).not.toBeNull();
        expect(decision.kind).toBe('critical_weakness');
        expect(decision.isCritical).toBe(true);
        expect(decision.threatType).toBe('ground');
        expect(decision.weakCount).toBe(2);
        expect(decision.quadWeakCount).toBe(1);
        expect(decision.resistCount + decision.immuneCount).toBe(0);
        expect(decision.openSlotIndex).toBe(2);
        expect(decision.openSlotNumber).toBe(3);

        expect(decision.candidates.length).toBe(3);
        // Every suggested candidate must resist or be immune to Ground, with exact rateTeam score math
        for (const cand of decision.candidates) {
            expect(cand.threatMultiplier).toBeLessThan(1);
            const expectedNext = analyzeTeam([...team, cand.pokemon], []).teamAnalysis;
            expect(cand.scoreBefore).toBe(rateTeam(analysis.teamAnalysis, team.length).score);
            expect(cand.scoreAfter).toBe(rateTeam(expectedNext, team.length + 1).score);
            expect(cand.scoreAfter).toBeGreaterThan(cand.scoreBefore);
        }

        // Top pick brings 0x Ground immunity and beats frail NFE Caterpie
        expect(decision.candidates[0].threatMultiplier).toBe(0);
        expect(decision.candidates.map((c) => c.id)).not.toContain(10);

        // Deduplicates Landorus-Incarnate vs Landorus-Therian so all 3 options are distinct species
        const landorusPicks = decision.candidates.filter((c) => c.name.toLowerCase().includes('landorus'));
        expect(landorusPicks.length).toBeLessThanOrEqual(1);
    });

    it('marks non-zero-resist shared weaknesses as non-critical (no false Live Pink)', () => {
        const nonCriticalTeam = [
            mon(485, 'heatran', ['fire', 'steel']),
            mon(727, 'incineroar', ['fire', 'dark']),
            mon(10, 'caterpie', ['bug']), // resists Ground (0.5x) and Fighting (0.5x)
            mon(598, 'ferrothorn', ['grass', 'steel']), // resists Water (0.5x), weak Fighting (2x)
        ];
        const { teamAnalysis } = analyzeTeam(nonCriticalTeam, SAMPLE_DEX);
        const decision = buildTacticalDecision(nonCriticalTeam, teamAnalysis, SAMPLE_DEX);

        expect(decision).not.toBeNull();
        expect(['ground', 'fighting']).toContain(decision.threatType);
        expect(decision.kind).toBe('shared_weakness');
        expect(decision.isCritical).toBe(false);
        expect(decision.resistCount + decision.immuneCount).toBeGreaterThan(0);
    });

    it('identifies a missing coverage gap when the team has no shared weakness yet', () => {
        // Azumarill (Water/Fairy) + Ferrothorn (Grass/Steel): great defensive pair with 0 shared weaknesses!
        // Still exposed to Fire (Ferrothorn 4x, Azumarill 0.5x -> safeCount = 1) and Poison (Azumarill 2x, Ferrothorn 0x -> safeCount = 1)
        // Electric: Azumarill (2x), Ferrothorn (0.5x -> safeCount = 1)
        // Ground: Ferrothorn (1x), Azumarill (1x) -> 0 weak, 0 resist (missing core Ground switch-in!)
        const team = [
            mon(184, 'azumarill', ['water', 'fairy']),
            mon(598, 'ferrothorn', ['grass', 'steel']),
        ];
        const { teamAnalysis } = analyzeTeam(team, SAMPLE_DEX);
        expect(Object.keys(teamAnalysis.weaknesses)).toHaveLength(0);

        const decision = buildTacticalDecision(team, teamAnalysis, SAMPLE_DEX);
        expect(decision).not.toBeNull();
        expect(decision.kind).toBe('coverage_gap');
        expect(decision.isCritical).toBe(false);
        expect(decision.candidates[0].scoreAfter).toBeGreaterThan(decision.scoreBefore);
    });

    it('enforces Species Clause against forms already on the team and respects allowedIds', () => {
        const team = [
            mon(485, 'heatran', ['fire', 'steel']),
            mon(727, 'incineroar', ['fire', 'dark']),
            mon(645, 'landorus-incarnate', ['ground', 'flying']),
        ];
        // Water is 3x weak (Heatran, Incineroar, Landorus) with 0 resists!
        const allowedIds = new Set([130, 184, 10021]);
        const decision = buildTacticalDecision(team, null, SAMPLE_DEX, {
            speciesClause: true,
            allowedIds,
        });

        expect(decision).not.toBeNull();
        expect(decision.threatType).toBe('water');
        const ids = decision.candidates.map((c) => c.id);
        expect(ids).not.toContain(10021); // Landorus-Therian shares base species 645
        expect(ids).toContain(184);
        expect(ids).toContain(130);
    });

    it('works with minimal { id, name, types } entries and inspectTeamVulnerabilities', () => {
        const minimalTeam = [
            { id: 4, name: 'charmander', types: ['fire'] },
            { id: 37, name: 'vulpix', types: ['fire'] },
        ];
        const minimalPool = [
            { id: 7, name: 'squirtle', types: ['water'] },
            { id: 1, name: 'bulbasaur', types: ['grass', 'poison'] },
        ];
        const vuln = inspectTeamVulnerabilities(minimalTeam);
        expect(vuln.rows[0].isCritical).toBe(true);

        const decision = buildTacticalDecision(minimalTeam, null, minimalPool);
        expect(decision).not.toBeNull();
        expect(decision.candidates.length).toBeGreaterThan(0);
        expect(decision.candidates[0].name).toMatch(/Squirtle|Bulbasaur/);
    });

    it('recomputes real coverage when handed an unhydrated blank teamAnalysis placeholder', () => {
        const team = [
            mon(485, 'heatran', ['fire', 'steel']),
            mon(727, 'incineroar', ['fire', 'dark']),
        ];
        const blankPlaceholder = { strengths: new Set(), weaknesses: {}, defensiveCoverage: {} };
        const expected = analyzeTeam(team, SAMPLE_DEX);
        const decision = buildTacticalDecision(team, blankPlaceholder, SAMPLE_DEX);

        expect(decision).not.toBeNull();
        expect(decision.scoreBefore).toBe(rateTeam(expected.teamAnalysis, team.length).score);
        expect(decision.isCritical).toBe(true);
    });
});
