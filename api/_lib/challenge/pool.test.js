import { describe, it, expect } from 'vitest';
import { Dex, Teams } from '@pkmn/sim';

import { BANNED_MOVES } from './constants.js';
import { createMatch, apply, owes, requestOf } from './engine.js';
import { CYNTHIA_POOL } from './pool.js';
import { DIFFICULTIES } from './rotation.js';

/** Moves a species (or anything it evolved from) can learn, in any generation. */
const learnable = (name) => {
    const ids = new Set();
    for (let species = Dex.species.get(name); species?.exists; species = species.prevo ? Dex.species.get(species.prevo) : null) {
        for (const id of Object.keys(Dex.species.getLearnsetData(species.id)?.learnset || {})) ids.add(id);
    }
    return ids;
};

// Renegade Platinum changes a few sets on purpose; these are the only liberties.
const RENEGADE_LIBERTIES = new Set(['Togekiss:moonblast', 'Lucario:ability:adaptability']);

const allVariants = CYNTHIA_POOL.flatMap((entry) => Object.entries(entry.variants)
    .map(([key, variant]) => ({ entry, key, variant, set: Teams.import(variant.showdownText)[0] })));

describe("Cynthia's pool", () => {
    it('has the ace as its only core member and one variant per difficulty', () => {
        expect(CYNTHIA_POOL.filter((entry) => entry.tier === 'core').map((entry) => entry.species)).toEqual(['Garchomp']);
        for (const entry of CYNTHIA_POOL) {
            expect(Object.keys(entry.variants).sort()).toEqual([...DIFFICULTIES].sort());
            expect(Dex.species.get(entry.species).num).toBe(entry.dexNum);
        }
        expect(CYNTHIA_POOL.filter((entry) => entry.tier === 'frequent')).toHaveLength(5);
        expect(CYNTHIA_POOL.filter((entry) => entry.tier === 'occasional')).toHaveLength(4);
    });

    it.each(allVariants.map((v) => [`${v.entry.species}/${v.key}`, v]))('%s is a real, legal set with a source', (_, { entry, key, variant, set }) => {
        expect(variant.source).toBeTruthy();
        expect(set.species).toBe(entry.species);
        expect(variant.showdownText).not.toMatch(/Level:/);
        expect(set.moves).toHaveLength(4);
        const moves = learnable(set.species);
        for (const name of set.moves) {
            const move = Dex.moves.get(name);
            expect(move.exists, name).toBe(true);
            expect(BANNED_MOVES).not.toContain(move.id);
            if (!(key === 'rematch' && RENEGADE_LIBERTIES.has(`${entry.species}:${move.id}`))) {
                expect(moves.has(move.id), `${entry.species} learns ${name}`).toBe(true);
            }
        }
        const abilities = Object.values(Dex.species.get(set.species).abilities);
        if (!(key === 'rematch' && RENEGADE_LIBERTIES.has(`${entry.species}:ability:${Dex.toID(set.ability)}`))) {
            expect(abilities).toContain(set.ability);
        }
        if (set.item) expect(Dex.items.get(set.item).exists).toBe(true);
    });

    it('every variant battles without a simulator error', () => {
        const foe = 'Snorlax\nAbility: Thick Fat\n- Body Slam\n- Rest';
        for (const { variant } of allVariants) {
            const match = createMatch({ seed: [1, 2, 3, 4], teams: { p1: foe, p2: variant.showdownText }, names: { p1: 'A', p2: 'B' } });
            for (let turn = 0; turn < 4 && !match.battle.ended; turn += 1) {
                for (const side of ['p1', 'p2']) {
                    if (!owes(match.battle, side)) continue;
                    const moves = requestOf(match.battle, side).active?.[0]?.moves || [];
                    const index = Math.max(0, moves.findIndex((move) => !move.disabled));
                    expect(apply(match, side, `move ${(index + turn) % Math.max(1, moves.length) + 1}`).ok || apply(match, side, 'default').ok).toBe(true);
                }
            }
            expect(match.lines.p2.join('\n')).not.toContain('|error|');
        }
    });
});
