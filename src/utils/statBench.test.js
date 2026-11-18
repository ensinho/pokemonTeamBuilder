import { describe, expect, it } from 'vitest';
import {
    BENCH_NATURES,
    EV_PRESETS,
    SHEDINJA_ID,
    SPEED_BENCHMARKS_LV50,
    calcLv50Stat,
    clampBenchEv,
    computeStatBench,
    emptyBenchEvs,
    evaluateSpeedBenchmarks,
    formatNatureOption,
    normalizeBenchNature,
    remainingBenchEvs,
    seedBenchFromBuild,
    setBenchEv,
    stepBenchEv,
} from './statBench';

const GARCHOMP_BASE = [
    { name: 'hp', base_stat: 108 },
    { name: 'attack', base_stat: 130 },
    { name: 'defense', base_stat: 95 },
    { name: 'special-attack', base_stat: 80 },
    { name: 'special-defense', base_stat: 85 },
    { name: 'speed', base_stat: 102 },
];

const GENGAR_BASE = [
    { name: 'hp', base_stat: 60 },
    { name: 'attack', base_stat: 65 },
    { name: 'defense', base_stat: 60 },
    { name: 'special-attack', base_stat: 130 },
    { name: 'special-defense', base_stat: 75 },
    { name: 'speed', base_stat: 110 },
];

describe('statBench — Gen 9 Level 50 stat math & EV clamping', () => {
    it('computes exact Gen 9 Level 50 stats at 31 IV for neutral, +10%, and -10% natures', () => {
        // Garchomp (108/130/95/80/85/102) with Jolly 4 HP / 252 Atk / 252 Spe:
        // HP = floor((216 + 31 + 1) * 50 / 100) + 60 = 124 + 60 = 184
        // Atk = 130 + 20 + 31.5 -> floor((260 + 31 + 63) * 50 / 100) + 5 = 177 + 5 = 182
        // SpA (minus) = floor((floor((160 + 31) * 50 / 100) + 5) * 0.9) = floor(100 * 0.9) = 90
        // Spe (plus)  = floor((floor((204 + 31 + 63) * 50 / 100) + 5) * 1.1) = floor(154 * 1.1) = 169
        expect(calcLv50Stat({ statKey: 'hp', base: 108, ev: 4, nature: 'jolly' })).toBe(184);
        expect(calcLv50Stat({ statKey: 'attack', base: 130, ev: 252, nature: 'jolly' })).toBe(182);
        expect(calcLv50Stat({ statKey: 'special-attack', base: 80, ev: 0, nature: 'jolly' })).toBe(90);
        expect(calcLv50Stat({ statKey: 'speed', base: 102, ev: 252, nature: 'jolly' })).toBe(169);

        // Gengar Timid 4 HP / 252 SpA / 252 Spe -> 136 HP, 76 Atk, 182 SpA, 178 Spe
        expect(calcLv50Stat({ statKey: 'hp', base: 60, ev: 4, nature: 'timid' })).toBe(136);
        expect(calcLv50Stat({ statKey: 'attack', base: 65, ev: 0, nature: 'timid' })).toBe(76);
        expect(calcLv50Stat({ statKey: 'special-attack', base: 130, ev: 252, nature: 'timid' })).toBe(182);
        expect(calcLv50Stat({ statKey: 'speed', base: 110, ev: 252, nature: 'timid' })).toBe(178);
    });

    it('enforces Shedinja (#292) HP = 1 regardless of EVs', () => {
        expect(calcLv50Stat({ statKey: 'hp', base: 1, ev: 252, pokemonId: SHEDINJA_ID })).toBe(1);
        expect(calcLv50Stat({ statKey: 'attack', base: 90, ev: 252, nature: 'adamant', pokemonId: SHEDINJA_ID })).toBe(156);
    });

    it('matches the exact Level 50 speeds of all 5 canonical VGC/OU benchmark anchors', () => {
        const expected = [
            { id: 727, base: 60, ev: 0, nature: 'serious', speed: 80 },
            { id: 812, base: 85, ev: 0, nature: 'serious', speed: 105 },
            { id: 892, base: 97, ev: 252, nature: 'jolly', speed: 163 },
            { id: 445, base: 102, ev: 252, nature: 'jolly', speed: 169 },
            { id: 987, base: 135, ev: 252, nature: 'timid', speed: 205 },
        ];
        expected.forEach((spec, idx) => {
            expect(SPEED_BENCHMARKS_LV50[idx].id).toBe(spec.id);
            expect(SPEED_BENCHMARKS_LV50[idx].speed).toBe(
                calcLv50Stat({ statKey: 'speed', base: spec.base, ev: spec.ev, nature: spec.nature }),
            );
        });
    });

    it('clamps clicking 252 on a 3rd stat to 4 EVs (508 spent, 2 remaining) instead of rejecting', () => {
        expect(EV_PRESETS).toEqual([0, 124, 252]);
        let evs = emptyBenchEvs();
        evs = setBenchEv(evs, 'attack', 252);
        evs = setBenchEv(evs, 'speed', 252);
        expect(remainingBenchEvs(evs)).toBe(6);

        // Clicking 252 on HP clamps smoothly to 4 EVs (the remaining 4-EV step inside 510)
        evs = setBenchEv(evs, 'hp', 252);
        expect(evs.hp).toBe(4);
        expect(remainingBenchEvs(evs)).toBe(2);

        // Stepping +4 past budget stays clamped at 4; stepping -4 returns to 0
        expect(stepBenchEv(evs, 'hp', 4).hp).toBe(4);
        expect(stepBenchEv(evs, 'hp', -4).hp).toBe(0);
        expect(clampBenchEv(evs, 'defense', 124)).toBe(0);
    });

    it('marks the highest calculated stat(s) with isPeak for Gold highlighting', () => {
        const evs = { ...emptyBenchEvs(), hp: 4, 'special-attack': 252, speed: 252 };
        const bench = computeStatBench({ stats: GENGAR_BASE, evs, nature: 'timid', pokemonId: 94 });

        expect(bench.peakValue).toBe(182);
        expect(bench.speed).toBe(178);
        expect(bench.remainingEvs).toBe(2);
        expect(bench.totalBase).toBe(500);

        const peakKeys = bench.rows.filter((r) => r.isPeak).map((r) => r.key);
        expect(peakKeys).toEqual(['special-attack']);
    });

    it('evaluates speed benchmarks with faster, tie, and slower outcomes and mirror-safe sprites', () => {
        // Jolly 252 Garchomp = 169 Spe -> faster than 80, 105, 163; ties Garchomp 169; slower than Flutter Mane 205
        const bench = computeStatBench({
            stats: GARCHOMP_BASE,
            evs: { ...emptyBenchEvs(), hp: 4, attack: 252, speed: 252 },
            nature: 'jolly',
            pokemonId: 445,
        });
        const speedEval = evaluateSpeedBenchmarks(bench.speed);

        expect(speedEval.speed).toBe(169);
        expect(speedEval.clearedCount).toBe(4);
        expect(speedEval.anchors.map((a) => a.outcome)).toEqual([
            'faster',
            'faster',
            'faster',
            'tie',
            'slower',
        ]);
        speedEval.anchors.forEach((anchor) => {
            expect(anchor.sprite).toMatch(/\/pokemon\/\d+\.png$/);
        });
    });

    it('seeds EVs and nature from MostUsedBuild strings (including Stat Points spreads)', () => {
        const standardSeed = seedBenchFromBuild({
            data: { spread: { nature: 'Jolly', evs: '4 HP / 252 Atk / 252 Spe' } },
        });
        expect(standardSeed.nature).toBe('jolly');
        expect(standardSeed.evs).toEqual({
            hp: 4,
            attack: 252,
            defense: 0,
            'special-attack': 0,
            'special-defense': 0,
            speed: 252,
        });

        const spSeed = seedBenchFromBuild({
            data: { spread: { nature: 'Hardy', evs: '2 HP / 32 SpA / 32 Spe' } },
        });
        expect(spSeed.nature).toBe('serious');
        expect(spSeed.evs['special-attack']).toBe(252);
        expect(spSeed.evs.speed).toBe(252);
        expect(spSeed.evs.hp).toBe(4);

        expect(normalizeBenchNature('Quirky')).toBe('serious');
        expect(BENCH_NATURES.length).toBeGreaterThanOrEqual(9);
        expect(formatNatureOption(BENCH_NATURES[0], 'Neutra')).toBe('Neutra');
        expect(formatNatureOption(BENCH_NATURES[1], 'Neutra')).toBe('Timid (+Spe / -Atk)');
    });
});
