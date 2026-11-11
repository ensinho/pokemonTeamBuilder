import { describe, expect, it } from 'vitest';
import {
    coverageFor, defensesFor, quickLookPath, resolveAbility, resolveItem, resolveMove, resolvePokemon, sameLook, toShowdownId,
} from './quickLook';

const dex = {
    moves: {
        earthquake: ['Earthquake', 'ground', 'Physical', 100, 100, 10, 'Hits adjacent Pokemon.'],
        swift: ['Swift', 'normal', 'Special', 60, true, 20, 'This move does not check accuracy.'],
        swordsdance: ['Swords Dance', 'normal', 'Status', 0, true, 20, 'Raises the user\'s Attack by 2.'],
    },
    species: {
        garchomp: ['Garchomp', ['dragon', 'ground'], [108, 130, 95, 80, 85, 102], ['Sand Veil', 'Rough Skin'], 1.9, 95],
        meowsticf: ['Meowstic-F', ['psychic'], [74, 48, 76, 83, 81, 104], ['Keen Eye', 'Infiltrator', 'Competitive'], 0.6, 8.5],
    },
};

describe('toShowdownId', () => {
    it('keeps only lowercase letters and digits', () => {
        expect(toShowdownId('Will-O-Wisp')).toBe('willowisp');
        expect(toShowdownId('choice-scarf')).toBe('choicescarf');
    });
});

describe('defensesFor', () => {
    it('multiplies both types and groups worst first', () => {
        const groups = defensesFor(['dragon', 'ground']);
        expect(groups[0]).toEqual({ multiplier: 4, types: ['ice'] });
        expect(groups.find((g) => g.multiplier === 0).types).toEqual(['electric']);
        expect(groups.find((g) => g.multiplier === 2).types.sort()).toEqual(['dragon', 'fairy']);
    });

    it('returns nothing for unknown types', () => {
        expect(defensesFor(['shadow'])).toEqual([]);
    });
});

describe('coverageFor', () => {
    it('lists what an attacking type hits hard, softly and not at all', () => {
        const ground = coverageFor('ground');
        expect(ground.strong).toEqual(expect.arrayContaining(['fire', 'electric', 'poison', 'rock', 'steel']));
        expect(ground.none).toEqual(['flying']);
        expect(ground.weak).toEqual(expect.arrayContaining(['grass', 'bug']));
    });
});

describe('resolvePokemon', () => {
    it('joins the index entry with the battle dex', () => {
        const look = resolvePokemon({ id: 445, name: 'garchomp', types: ['dragon', 'ground'], baseStats: { hp: 108, attack: 130, defense: 95, 'special-attack': 80, 'special-defense': 85, speed: 102 } }, dex);
        expect(look.name).toBe('Garchomp');
        expect(look.total).toBe(600);
        expect(look.abilities).toEqual(['Sand Veil', 'Rough Skin']);
        expect(look.defenses[0].multiplier).toBe(4);
    });

    it('finds a form under Showdown\'s shorter spelling', () => {
        const look = resolvePokemon({ id: 10025, name: 'Meowstic Female', apiName: 'meowstic-female', types: ['psychic'] }, dex);
        expect(look.abilities).toContain('Competitive');
        // No index stats: they come from the dex.
        expect(look.stats.find((s) => s.name === 'speed').base_stat).toBe(104);
    });

    it('still answers when the dex does not know the species', () => {
        const look = resolvePokemon({ id: 9999, name: 'missingno', types: ['normal'] }, dex);
        expect(look.abilities).toEqual([]);
        expect(look.stats).toEqual([]);
        expect(look.total).toBeNull();
    });

    it('returns null without an entry', () => {
        expect(resolvePokemon(null, dex)).toBeNull();
    });
});

describe('resolveMove', () => {
    it('reads a damaging move with its coverage', () => {
        const look = resolveMove('earthquake', dex);
        expect(look).toMatchObject({ name: 'Earthquake', type: 'ground', damageClass: 'physical', power: 100, accuracy: 100, pp: 10 });
        expect(look.coverage.none).toEqual(['flying']);
    });

    it('treats accuracy `true` as never missing', () => {
        const look = resolveMove('swift', dex);
        expect(look.accuracy).toBeNull();
        expect(look.neverMisses).toBe(true);
    });

    it('gives a status move no power and no coverage', () => {
        const look = resolveMove('swords-dance', dex);
        expect(look.power).toBeNull();
        expect(look.coverage).toBeNull();
    });

    it('returns null for a move the dex does not have', () => {
        expect(resolveMove('not-a-move', dex)).toBeNull();
    });
});

describe('resolveAbility / resolveItem', () => {
    it('match by slug', () => {
        expect(resolveAbility('rough-skin', [{ n: 'rough-skin', en: 'Rough Skin', e: 'Hurts attackers.' }])).toEqual({
            kind: 'ability', slug: 'rough-skin', name: 'Rough Skin', effect: 'Hurts attackers.',
        });
        expect(resolveItem('choice-scarf', [{ n: 'choice-scarf', en: 'Choice Scarf', c: 'choice', e: 'Speed ×1.5.' }]).name).toBe('Choice Scarf');
        expect(resolveItem('nope', [])).toBeNull();
    });
});

describe('quickLookPath / sameLook', () => {
    it('points each kind at its page', () => {
        expect(quickLookPath({ kind: 'pokemon', key: 445 })).toBe('/pokemon/445');
        expect(quickLookPath({ kind: 'move', key: 'earthquake' })).toBe('/moves/earthquake');
        expect(quickLookPath({ kind: 'ability', key: 'rough-skin' })).toBe('/abilities/rough-skin');
        expect(quickLookPath({ kind: 'item', key: 'choice-scarf' })).toBe('/items/choice-scarf');
    });

    it('compares keys as text', () => {
        expect(sameLook({ kind: 'pokemon', key: 445 }, { kind: 'pokemon', key: '445' })).toBe(true);
        expect(sameLook({ kind: 'pokemon', key: 445 }, { kind: 'move', key: '445' })).toBe(false);
    });
});
