import { describe, it, expect } from 'vitest';

import { formatEvSpread, formatSetSpread, setSpreadParts } from './smogonSets';

describe('formatSetSpread', () => {
    it('shows a Champions set in the Stat Points the game uses', () => {
        const set = {
            sp: { hp: 2, attack: 0, defense: 0, 'special-attack': 32, 'special-defense': 0, speed: 32 },
            evs: { hp: 6, attack: 0, defense: 0, 'special-attack': 252, 'special-defense': 0, speed: 252 },
        };
        expect(formatSetSpread(set)).toBe('2 HP / 32 SpA / 32 Spe SP');
    });

    it('shows any other set in EVs, and nothing for a set with no spread', () => {
        expect(formatSetSpread({ evs: { hp: 252, attack: 252, speed: 4 } })).toBe('252 HP / 252 Atk / 4 Spe');
        expect(formatSetSpread({})).toBe('');
        expect(formatEvSpread(undefined)).toBe('');
    });

    it('splits unit from value for a labelled row', () => {
        expect(setSpreadParts({ sp: { hp: 32, attack: 32 } })).toEqual({ unit: 'SP', text: '32 HP / 32 Atk' });
        expect(setSpreadParts({ evs: { hp: 252 } })).toEqual({ unit: 'EVs', text: '252 HP' });
    });
});
