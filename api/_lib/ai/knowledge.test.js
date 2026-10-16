import { describe, it, expect } from 'vitest';

import { knowledgeFrom } from './knowledge.js';
import { memoryFrom } from './memory.js';
import { legalOptions } from './options.js';

const LOG = [
    '|player|p1|Enzo|',
    '|teamsize|p1|3',
    '|teamsize|p2|6',
    '|start',
    '|switch|p1a: Pelly|Pelipper, L50, M|100/100',
    '|switch|p2a: Spiritomb|Spiritomb, L50, F|145/145',
    '|-weather|RainDance|[from] ability: Drizzle|[of] p1a: Pelly',
    '|turn|1',
    '|move|p1a: Pelly|Hurricane|p2a: Spiritomb',
    '|-damage|p2a: Spiritomb|100/145',
    '|move|p2a: Spiritomb|Will-O-Wisp|p1a: Pelly',
    '|-status|p1a: Pelly|brn',
    '|-heal|p1a: Pelly|80/100|[from] item: Leftovers',
    '|turn|2',
    '|switch|p1a: Swampert|Swampert, L50, F|100/100',
    '|move|p2a: Spiritomb|Hypnosis|p1a: Swampert',
    '|-status|p1a: Swampert|slp|[from] move: Hypnosis',
    '|turn|3',
    '|switch|p1a: Pelly|Pelipper, L50, M|80/100',
    '|move|p2a: Spiritomb|Dark Pulse|p1a: Pelly',
    '|-damage|p1a: Pelly|40/100',
    '|turn|4',
    '|move|p1a: Pelly|Hurricane|p2a: Spiritomb',
    '|-damage|p2a: Spiritomb|10/145',
    '|move|p2a: Spiritomb|Dark Pulse|p1a: Pelly',
    '|-damage|p1a: Pelly|0 fnt',
    '|faint|p1a: Pelly',
    '|switch|p1a: Swampert|Swampert, L50, F|100/100',
    '|turn|5',
];

describe('knowledgeFrom', () => {
    const k = knowledgeFrom(LOG);

    it('maps nicknames to species and counts what is left', () => {
        expect(k.foeOrder).toEqual(['Pelipper', 'Swampert']);
        expect(k.foeTeamSize).toBe(3);
        expect(k.foeFainted).toBe(1);
        expect(k.foeRemaining).toBe(2);
        expect(k.turn).toBe(5);
    });

    it('only knows what the log revealed', () => {
        const pelipper = k.foe.get('Pelipper');
        expect([...pelipper.moves]).toEqual(['hurricane']);
        expect(pelipper.ability).toBe('drizzle'); // via [of]
        expect(pelipper.item).toBe('leftovers'); // via [from] item
        expect(pelipper.itemKnown).toBe(true);
        const swampert = k.foe.get('Swampert');
        expect(swampert.itemKnown).toBe(false);
        expect(swampert.ability).toBe(null);
        expect(swampert.status).toBe('slp');
    });

    it('tracks the Sleep Clause', () => {
        expect(k.sleepClauseActive).toBe(true);
        expect(knowledgeFrom([...LOG, '|-curestatus|p1a: Swampert|slp|[msg]']).sleepClauseActive).toBe(false);
    });
});

describe('memoryFrom', () => {
    it('counts voluntary switches, not forced ones', () => {
        const m = memoryFrom(knowledgeFrom(LOG));
        expect(m.foeSwitches).toBe(2); // turn 2 and turn 3; the one after the faint is forced
        expect(m.switchRate).toBeCloseTo(2 / 4);
        expect(m.lastFoeMove).toBe('hurricane');
        expect(m.foeFaints).toBe(1);
        expect(m.lastMyMove).toBe('darkpulse');
    });

    it('sees a repeated move', () => {
        const repeat = [
            '|switch|p1a: Kingdra|Kingdra, L50, M|100/100', '|turn|1',
            '|move|p1a: Kingdra|Draco Meteor|p2a: X', '|turn|2',
            '|move|p1a: Kingdra|Draco Meteor|p2a: X', '|turn|3',
        ];
        expect(memoryFrom(knowledgeFrom(repeat)).repeat).toEqual({ moveId: 'dracometeor', count: 2 });
    });
});

describe('legalOptions', () => {
    const side = (pokemon) => ({ pokemon });
    const mon = (details, condition, active = false, extra = {}) => ({ details, condition, active, ...extra });

    it('offers usable moves and healthy switches', () => {
        const request = {
            active: [{ moves: [{ id: 'surf', pp: 5 }, { id: 'icebeam', pp: 0 }, { id: 'recover', pp: 5, disabled: true }] }],
            side: side([mon('Milotic, L50', '100/100', true), mon('Garchomp, L50', '0 fnt'), mon('Lucario, L50', '50/100')]),
        };
        expect(legalOptions(request).map((o) => o.choice)).toEqual(['move 1', 'switch 3']);
    });

    it('offers no switch when trapped, and only switches when forced', () => {
        const trapped = { active: [{ moves: [{ id: 'surf', pp: 5 }], trapped: true }], side: side([mon('A', '1/1', true), mon('B', '1/1')]) };
        expect(legalOptions(trapped).map((o) => o.choice)).toEqual(['move 1']);
        const forced = { forceSwitch: [true], side: side([mon('A', '0 fnt', true), mon('B', '1/1'), mon('C', '0 fnt')]) };
        expect(legalOptions(forced).map((o) => o.choice)).toEqual(['switch 2']);
    });

    it('offers only fainted Pokémon after Revival Blessing', () => {
        const request = { forceSwitch: [true], side: side([mon('Pawmot', '50/100', true, { reviving: true }), mon('B', '1/1'), mon('C', '0 fnt')]) };
        expect(legalOptions(request)).toEqual([{ choice: 'switch 3', kind: 'revive', slot: 2, species: 'C' }]);
    });

    it('waits when told to', () => {
        expect(legalOptions({ wait: true })).toEqual([]);
    });
});
