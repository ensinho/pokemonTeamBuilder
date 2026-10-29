import { describe, it, expect } from 'vitest';
import { attackTypesOf, bestHit, compareTeams, duel, profileMember } from './teamMatchup';

// A slice of battle-dex.json's `moves`: [name, type, category, basePower, …].
const MOVES = {
    thunderbolt: ['Thunderbolt', 'electric', 'Special', 90],
    surf: ['Surf', 'water', 'Special', 90],
    earthquake: ['Earthquake', 'ground', 'Physical', 100],
    swordsdance: ['Swords Dance', 'normal', 'Status', 0],
};

const INDEX = new Map([
    [6, { id: 6, name: 'charizard', types: ['fire', 'flying'], baseStats: { speed: 100 } }],
    [9, { id: 9, name: 'blastoise', types: ['water'], baseStats: { speed: 78 } }],
    [94, { id: 94, name: 'gengar', types: ['ghost', 'poison'], baseStats: { speed: 110 } }],
    [143, { id: 143, name: 'snorlax', types: ['normal'], baseStats: { speed: 30 } }],
    [25, { id: 25, name: 'pikachu', types: ['electric'], baseStats: { speed: 90 } }],
    [26, { id: 26, name: 'raichu', types: ['electric'], baseStats: { speed: 110 } }],
]);

const opts = { indexById: INDEX, moveDex: MOVES };
const mon = (id, moves) => ({ id, name: INDEX.get(id).name, ...(moves ? { customization: { moves } } : {}) });
const profile = (id, moves) => profileMember(mon(id, moves), opts);

describe('attackTypesOf', () => {
    it('falls back to the own types when no moves are saved', () => {
        expect(attackTypesOf(['fire', 'flying'], [], MOVES)).toEqual({ types: ['fire', 'flying'], fromMoves: false });
    });

    it('uses the damaging moves and skips status moves', () => {
        expect(attackTypesOf(['water'], ['Surf', 'Swords Dance', 'earthquake'], MOVES))
            .toEqual({ types: ['water', 'ground'], fromMoves: true });
    });

    it('ignores moves the dex does not know, and works without a dex', () => {
        expect(attackTypesOf(['water'], ['Made Up Move'], MOVES).fromMoves).toBe(false);
        expect(attackTypesOf(['water'], ['Surf'], null).types).toEqual(['water']);
    });
});

describe('profileMember', () => {
    it('resolves types and base Speed from the index', () => {
        const p = profile(6);
        expect(p.types).toEqual(['fire', 'flying']);
        expect(p.speed).toBe(100);
    });

    it('keeps the saved types when the member has them', () => {
        expect(profileMember({ id: 6, types: ['dragon'] }, opts).types).toEqual(['dragon']);
    });

    it('has a null speed when nothing knows it', () => {
        expect(profileMember({ id: 9999, types: ['water'] }, opts).speed).toBeNull();
    });
});

describe('bestHit', () => {
    it('counts STAB: a neutral STAB move beats a resisted one', () => {
        // Charizard on Blastoise: Fire is ½× (0.75 with STAB), Flying is 1× (1.5 with STAB).
        expect(bestHit(profile(6), ['water'])).toMatchObject({ type: 'flying', multiplier: 1, power: 1.5 });
    });

    it('reads immunities as zero', () => {
        expect(bestHit(profile(143), ['ghost', 'poison'])).toMatchObject({ multiplier: 0, power: 0 });
    });
});

describe('duel', () => {
    it('gives the duel to the harder hitter', () => {
        const d = duel(profile(6), profile(9));
        expect(d.bHit).toMatchObject({ type: 'water', multiplier: 2, power: 3 });
        expect(d.winner).toBe('b');
        expect(d.faster).toBe('a');
    });

    it('saved coverage changes the outcome', () => {
        // Blastoise with Earthquake still out-hits Charizard (Water 2× STAB = 3)…
        // …but a Charizard with Thunderbolt now threatens it 2×.
        const d = duel(profile(6, ['Thunderbolt']), profile(9));
        expect(d.aHit).toMatchObject({ type: 'electric', multiplier: 2, power: 2 });
        expect(d.winner).toBe('b');
    });

    it('an immune side cannot lose to the type it is immune to', () => {
        expect(duel(profile(94), profile(143)).winner).toBe('a');
    });

    it('breaks a tie on hits with base Speed', () => {
        expect(duel(profile(26), profile(25)).winner).toBe('a');
        expect(duel(profile(25), profile(26)).winner).toBe('b');
    });

    it('calls equal hits at equal speed even', () => {
        expect(duel(profile(25), profile(25)).winner).toBe('even');
    });
});

describe('compareTeams', () => {
    it('builds the A × B grid and totals it from A\'s side', () => {
        const r = compareTeams([mon(6), mon(94)], [mon(9), mon(143)], opts);
        expect(r.grid).toHaveLength(2);
        expect(r.grid[0]).toHaveLength(2);
        expect(r.wins + r.losses + r.evens).toBe(4);
        expect(r.total).toBe(4);
    });

    it('a mirror match is even', () => {
        const team = [mon(6), mon(9), mon(94)];
        const r = compareTeams(team, team, opts);
        expect(r.wins).toBe(r.losses);
        expect(r.verdict).toBe('even');
        expect(r.share).toBe(0.5);
    });

    it('swapping the sides mirrors the result', () => {
        const ab = compareTeams([mon(9), mon(26)], [mon(6), mon(143)], opts);
        const ba = compareTeams([mon(6), mon(143)], [mon(9), mon(26)], opts);
        expect(ab.wins).toBe(ba.losses);
        expect(ab.losses).toBe(ba.wins);
        expect(ab.pressure).toEqual({ a: ba.pressure.b, b: ba.pressure.a });
    });

    it('a team that out-types the other gets the verdict', () => {
        // Water + Electric against two Fire/Flying: every duel goes to A.
        const r = compareTeams([mon(9), mon(26)], [mon(6), mon(6)], opts);
        expect(r.wins).toBe(4);
        expect(r.verdict).toBe('a');
        expect(r.pressure.a).toBe(2);
        expect(r.threatsToA).toEqual([]);
        expect(r.threatsToB.map((p) => p.id)).toEqual([9, 26]);
    });

    it('lists the members A has no winning answer to', () => {
        const r = compareTeams([mon(6)], [mon(9), mon(143)], opts);
        expect(r.threatsToA.map((p) => p.id)).toContain(9);
    });

    it('has no verdict when a side is empty', () => {
        const r = compareTeams([], [mon(9)], opts);
        expect(r.verdict).toBeNull();
        expect(r.total).toBe(0);
        expect(r.threatsToA).toEqual([]);
    });
});
