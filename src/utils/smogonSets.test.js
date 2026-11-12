import { describe, it, expect } from 'vitest';

import { applySmogonSet, formatEvSpread, formatSetSpread, setSpreadParts } from './smogonSets';

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

describe('applySmogonSet', () => {
    const set = { item: 'flame-orb', ability: 'guts', nature: 'jolly', moves: [['close-combat'], ['facade'], ['megahorn'], ['knock-off']], evs: { attack: 252 } };

    it('applies the set as written when nothing says what the Pokémon can have', () => {
        expect(applySmogonSet(set, { ability: 'swarm', isShiny: true })).toMatchObject({
            item: 'flame-orb', ability: 'guts', nature: 'jolly', isShiny: true,
            moves: ['close-combat', 'facade', 'megahorn', 'knock-off'],
        });
    });

    it('keeps a Mega forme legal: its own ability, its stone, only moves it learns', () => {
        const own = { abilities: ['skill-link'], moves: ['close-combat', 'megahorn', 'pin-missile'], megaStone: 'heracronite' };
        expect(applySmogonSet(set, { ability: 'skill-link' }, own)).toMatchObject({
            item: 'heracronite', ability: 'skill-link', nature: 'jolly', moves: ['close-combat', 'megahorn'],
        });
    });
});
