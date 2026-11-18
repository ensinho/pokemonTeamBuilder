import { describe, expect, it } from 'vitest';
import { MASTERY_STAGE_LEVELS, buildMasteryEvolution, resolveMasteryLine } from './masteryEvolution';
import { xpForLevel } from './trainerLevel';

describe('masteryEvolution', () => {
    it('falls back to Gastly → Haunter → Gengar when no partner or persona matches', () => {
        const line = resolveMasteryLine();
        expect(line.map((s) => s.id)).toEqual([92, 93, 94]);
        expect(resolveMasteryLine({ partnerId: 132 }).map((s) => s.id)).toEqual([92, 93, 94]);
    });

    it('resolves a 3-stage line from any member of the partner trio or from persona', () => {
        expect(resolveMasteryLine({ partnerId: 6 }).map((s) => s.id)).toEqual([4, 5, 6]);
        expect(resolveMasteryLine({ partnerId: 25 }).map((s) => s.id)).toEqual([172, 25, 26]);
        expect(resolveMasteryLine({ personaId: 'strategist' }).map((s) => s.id)).toEqual([443, 444, 445]);
    });

    it('keeps unreached stages as silhouettes with progressPct toward Lv 6 at Lv 1–5', () => {
        const start = buildMasteryEvolution({ xp: 0, level: 1 });
        expect(start.mastered).toBe(false);
        expect(start.nextLevel).toBe(MASTERY_STAGE_LEVELS[1]);
        expect(start.stages.map((s) => ({ id: s.id, reached: s.reached, current: s.current, isNext: s.isNext }))).toEqual([
            { id: 92, reached: true, current: true, isNext: false },
            { id: 93, reached: false, current: false, isNext: true },
            { id: 94, reached: false, current: false, isNext: false },
        ]);

        // xpForLevel(6) = 750 → 300 XP is 40% of the way to evolving into Haunter
        const mid = buildMasteryEvolution({ xp: 300 });
        expect(mid.progressPct).toBe(40);
        expect(mid.stages[0].progressPct).toBe(40);
        expect(mid.stages[1].progressPct).toBe(40);
        expect(mid.stages[2].progressPct).toBe(0);
    });

    it('unlocks Stage 2 at Lv 6 and tracks progress toward Stage 3 at Lv 15', () => {
        const lv6Floor = xpForLevel(6); // 750
        const lv15Floor = xpForLevel(15); // 3675
        const midXp = lv6Floor + Math.round((lv15Floor - lv6Floor) / 2);

        const state = buildMasteryEvolution({ xp: midXp, partnerId: 445 });
        expect(state.lineLabel).toBe('Gible → Gabite → Garchomp');
        expect(state.stages[0]).toMatchObject({ id: 443, reached: true, completed: true, current: false, progressPct: 100 });
        expect(state.stages[1]).toMatchObject({ id: 444, reached: true, completed: false, current: true, progressPct: 50 });
        expect(state.stages[2]).toMatchObject({ id: 445, reached: false, completed: false, isNext: true, progressPct: 50 });
    });

    it('marks all three stages reached and mastered at Lv 15+ even when given level alone', () => {
        const mastered = buildMasteryEvolution({ level: 18 });
        expect(mastered.mastered).toBe(true);
        expect(mastered.nextLevel).toBeNull();
        expect(mastered.xpToEvolve).toBe(0);
        expect(mastered.progressPct).toBe(100);
        expect(mastered.stages.every((s) => s.reached && s.completed)).toBe(true);
        expect(mastered.stages[2].current).toBe(true);
    });
});
