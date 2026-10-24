import { describe, expect, it } from 'vitest';
import { mostUsedBuild } from './mostUsedBuild';

const GARCHOMP = {
    n: 1000,
    usage: 8.5,
    items: [{ name: 'Life Orb', slug: 'life-orb', count: 460 }, { name: 'Choice Scarf', slug: 'choice-scarf', count: 330 }],
    abilities: [{ name: 'Rough Skin', count: 968 }],
    moves: [
        { name: 'Dragon Claw', count: 889 }, { name: 'Rock Slide', count: 737 },
        { name: 'Stomping Tantrum', count: 728 }, { name: 'Earthquake', count: 693 }, { name: 'Protect', count: 632 },
    ],
    spreads: [{ nature: 'Jolly', evs: { hp: 2, atk: 32, spe: 32 }, count: 304 }],
};

describe('mostUsedBuild', () => {
    it('takes the top of each list with its share of the sample', () => {
        expect(mostUsedBuild(GARCHOMP)).toEqual({
            usage: 8.5,
            item: { name: 'Life Orb', slug: 'life-orb', share: 46 },
            ability: { name: 'Rough Skin', slug: null, share: 97 },
            tera: null,
            spread: { nature: 'Jolly', evs: '2 HP / 32 Atk / 32 Spe', share: 30 },
            moves: [
                { name: 'Dragon Claw', share: 89 }, { name: 'Rock Slide', share: 74 },
                { name: 'Stomping Tantrum', share: 73 }, { name: 'Earthquake', share: 69 },
            ],
        });
    });

    it('answers null for a Pokémon outside the sample', () => {
        expect(mostUsedBuild(null)).toBeNull();
        expect(mostUsedBuild({ n: 0 })).toBeNull();
    });

    it('copes with missing lists', () => {
        expect(mostUsedBuild({ n: 10, moves: [{ name: 'Protect', count: 10 }] })).toMatchObject({ item: null, spread: null, moves: [{ name: 'Protect', share: 100 }] });
    });
});
