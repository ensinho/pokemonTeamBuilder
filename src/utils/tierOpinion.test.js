import { describe, it, expect } from 'vitest';
import { boardTiers, compareTiers, opinionTiers, opinionVerdict } from './tierOpinion';

const mon = (id, total, types = ['normal']) => ({ id, types, baseStats: { hp: total } });

describe('his tier list', () => {
    it('ranks by base stat total, the Gengar line always S, a Ghost one tier up', () => {
        const mons = [mon(1, 600), mon(2, 550), mon(3, 500), mon(4, 450), mon(5, 400), mon(6, 350), mon(7, 300), mon(8, 250), mon(9, 200), mon(94, 100, ['ghost']), mon(10, 330, ['ghost'])];
        const his = opinionTiers(mons);
        expect(his[94]).toBe('S');
        expect(his[1]).toBe('S');
        expect(his[9]).toBe('D');
        // 330 + 80 for being a Ghost passes the 400 and the 350
        expect(['A', 'B']).toContain(his[10]);
        expect(Object.keys(his)).toHaveLength(mons.length);
    });

    it('is the same list every time', () => {
        const mons = [mon(3, 500), mon(1, 500), mon(2, 500)];
        expect(opinionTiers(mons)).toEqual(opinionTiers([...mons].reverse()));
    });

    it('says how much two lists agree and where they differ most', () => {
        const mine = boardTiers({ tiers: { S: [1], A: [2], B: [], C: [3], D: [] } });
        const result = compareTiers(mine, { 1: 'S', 2: 'B', 3: 'A' });
        expect(result).toMatchObject({ same: 1, total: 3, worst: { id: 3, mine: 'C', his: 'A' } });
        expect(opinionVerdict(result).id).toBe('far');
        expect(opinionVerdict({ same: 9, total: 10 }).mood).toBe('apaixonado');
        expect(opinionVerdict({ same: 0, total: 0 })).toBe(null);
    });
});
