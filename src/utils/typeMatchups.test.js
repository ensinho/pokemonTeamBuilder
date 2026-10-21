import { describe, expect, it } from 'vitest';
import { defensiveMultiplier, immunitiesOf, resistancesOf, typeMatchups, weaknessesOf } from './typeMatchups';

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
