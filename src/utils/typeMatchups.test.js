import { describe, expect, it } from 'vitest';
import { comboDefense, defensiveMultiplier, hasExactTyping, immunitiesOf, resistancesOf, toggleComboType, typeMatchups, weaknessesOf } from './typeMatchups';

describe('typeMatchups', () => {
    it('reads both sides of a type off the chart', () => {
        expect(typeMatchups('ghost')).toEqual({
            weakTo: ['ghost', 'dark'],
            resists: ['poison', 'bug'],
            immuneTo: ['normal', 'fighting'],
            superEffective: ['psychic', 'ghost'],
            notVeryEffective: ['dark'],
            noEffect: ['normal'],
        });
    });

    it('multiplies a dual typing, immunities included', () => {
        expect(defensiveMultiplier('electric', ['water', 'flying'])).toBe(4);
        expect(defensiveMultiplier('ground', ['steel', 'flying'])).toBe(0);
        expect(immunitiesOf(['steel', 'flying'])).toEqual(['poison', 'ground']);
        expect(weaknessesOf(['steel', 'flying']).map((w) => w.type)).toEqual(['fire', 'electric']);
    });

    it('lists the strongest resistance first', () => {
        expect(resistancesOf(['steel', 'flying'])[0]).toEqual({ type: 'grass', multiplier: 0.25 });
    });
});

describe('comboDefense', () => {
    it('groups a dual typing by multiplier', () => {
        const tiers = comboDefense(['fire', 'flying']);
        expect(tiers[4]).toEqual(['rock']);
        expect(tiers[2]).toEqual(['water', 'electric']);
        expect(tiers[0.25]).toEqual(['grass', 'bug']);
        expect(tiers[0]).toEqual(['ground']);
    });

    it('returns empty tiers for no types', () => {
        expect(Object.values(comboDefense([])).flat()).toEqual([]);
    });
});

describe('hasExactTyping / toggleComboType', () => {
    it('matches a typing in either order and nothing wider', () => {
        expect(hasExactTyping(['flying', 'fire'], ['fire', 'flying'])).toBe(true);
        expect(hasExactTyping(['fire'], ['fire', 'flying'])).toBe(false);
        expect(hasExactTyping(['fire', 'flying'], ['fire'])).toBe(false);
    });

    it('keeps at most two types, dropping the oldest', () => {
        expect(toggleComboType(['fire'], 'water')).toEqual(['fire', 'water']);
        expect(toggleComboType(['fire', 'water'], 'grass')).toEqual(['water', 'grass']);
        expect(toggleComboType(['fire', 'water'], 'fire')).toEqual(['water']);
    });
});
