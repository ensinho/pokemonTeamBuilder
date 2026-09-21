import { describe, it, expect } from 'vitest';
import {
    EV_MAX_PER_STAT,
    EV_TOTAL_BUDGET,
    sumEvs,
    remainingEvs,
    maxEvFor,
    clampEv,
    applyEvChange,
} from './evBudget';

const spread = (overrides = {}) => ({
    hp: 0,
    attack: 0,
    defense: 0,
    'special-attack': 0,
    'special-defense': 0,
    speed: 0,
    ...overrides,
});

describe('sumEvs / remainingEvs', () => {
    it('adds every stat and reports what is left', () => {
        const evs = spread({ attack: 252, speed: 252, 'special-defense': 4 });
        expect(sumEvs(evs)).toBe(508);
        expect(remainingEvs(evs)).toBe(2);
    });

    it('treats missing and junk values as zero', () => {
        expect(sumEvs({})).toBe(0);
        expect(sumEvs()).toBe(0);
        expect(sumEvs({ hp: undefined, attack: 'abc', defense: 12 })).toBe(12);
    });

    it('goes negative on an over-budget spread rather than lying', () => {
        expect(remainingEvs(spread({ hp: 252, attack: 252, defense: 252 }))).toBe(-246);
    });
});

describe('maxEvFor', () => {
    it('caps at 252 when the budget is roomy', () => {
        expect(maxEvFor(spread(), 'hp')).toBe(EV_MAX_PER_STAT);
    });

    it('caps at what the other stats left behind', () => {
        // 252 + 252 spent elsewhere → 6 left, and hp's own 0 does not count against it.
        expect(maxEvFor(spread({ attack: 252, speed: 252 }), 'hp')).toBe(6);
    });

    it('counts the stat being edited as reclaimable', () => {
        // The 200 already in hp is free to re-spend on hp itself.
        expect(maxEvFor(spread({ hp: 200, attack: 252 }), 'hp')).toBe(EV_MAX_PER_STAT);
    });

    it('never goes below zero on an over-budget spread', () => {
        expect(maxEvFor(spread({ hp: 252, attack: 252, defense: 252 }), 'speed')).toBe(0);
    });
});

describe('clampEv', () => {
    it('passes a legal value straight through', () => {
        expect(clampEv(spread(), 'hp', 172)).toBe(172);
    });

    it('allows any precise number, not just multiples of four', () => {
        expect(clampEv(spread(), 'hp', 1)).toBe(1);
        expect(clampEv(spread(), 'hp', 39)).toBe(39);
        expect(clampEv(spread(), 'speed', 251)).toBe(251);
    });

    it('clamps to the largest affordable value instead of rejecting the edit', () => {
        // Only 2 EVs are free; asking for 252 must still spend those 2.
        const evs = spread({ attack: 252, speed: 252, 'special-defense': 4 });
        expect(clampEv(evs, 'hp', 252)).toBe(2);
    });

    it('clamps to the per-stat cap', () => {
        expect(clampEv(spread(), 'hp', 500)).toBe(EV_MAX_PER_STAT);
    });

    it('floors negatives and fractions', () => {
        expect(clampEv(spread(), 'hp', -20)).toBe(0);
        expect(clampEv(spread(), 'hp', 12.9)).toBe(12);
    });

    it('reads a cleared number field as zero', () => {
        expect(clampEv(spread({ hp: 100 }), 'hp', '')).toBe(0);
        expect(clampEv(spread({ hp: 100 }), 'hp', null)).toBe(0);
    });

    it('keeps the current value when the input is not a number at all', () => {
        expect(clampEv(spread({ hp: 100 }), 'hp', 'abc')).toBe(100);
    });

    it('accepts the string values range/number inputs actually emit', () => {
        expect(clampEv(spread(), 'hp', '84')).toBe(84);
    });

    it('walks an over-budget spread back toward legality instead of freezing it', () => {
        // 756 spent. Editing defense frees its own 252, leaving 6 affordable —
        // so the edit lands on 6 rather than being refused.
        const evs = spread({ hp: 252, attack: 252, defense: 252 });
        expect(clampEv(evs, 'defense', 100)).toBe(6);
        expect(clampEv(evs, 'defense', 0)).toBe(0);
    });
});

describe('applyEvChange', () => {
    it('returns a new spread with only the edited stat changed', () => {
        const evs = spread({ attack: 252 });
        const next = applyEvChange(evs, 'speed', 252);
        expect(next).toEqual(spread({ attack: 252, speed: 252 }));
        expect(evs.speed).toBe(0);
    });

    it('never lets a spread exceed the total budget', () => {
        const evs = spread({ attack: 252, speed: 252 });
        const next = applyEvChange(evs, 'hp', 252);
        expect(sumEvs(next)).toBe(EV_TOTAL_BUDGET);
        expect(next.hp).toBe(6);
    });
});
