import { describe, it, expect } from 'vitest';
import { Battle, Teams } from '@pkmn/sim';

import { QUICK_THAW_RULE } from './simRules.js';
import { FORMAT } from './challenge/constants.js';
import { PVP_FORMAT } from './pvpState.js';

const OLD_FORMAT = 'gen9anythinggoes@@@!Team Preview,Sleep Clause Mod';
const frozenTeam = Teams.pack(Teams.import('Iron Hands\nAbility: Quark Drive\n- Drain Punch'));
const foeTeam = Teams.pack(Teams.import('Blissey\nAbility: Natural Cure\n- Soft-Boiled'));

/** How often a frozen Pokémon gets to move on its first turn, over `trials` seeds. */
const thawRate = (formatid, trials = 600) => {
    let thawed = 0;
    for (let i = 0; i < trials; i += 1) {
        const battle = new Battle({ formatid, seed: [i, 7, 13, 21] });
        battle.setPlayer('p1', { team: frozenTeam });
        battle.setPlayer('p2', { team: foeTeam });
        battle.p1.active[0].setStatus('frz');
        battle.makeChoices('move 1', 'move 1');
        if (battle.p1.active[0].status !== 'frz') thawed += 1;
    }
    return thawed / trials;
};

describe('Quick Thaw Mod', () => {
    it('is part of every new battle', () => {
        expect(FORMAT).toContain(QUICK_THAW_RULE);
        expect(PVP_FORMAT).toContain(QUICK_THAW_RULE);
    });

    it('thaws about 1 time in 3 instead of 1 in 5', () => {
        const before = thawRate(OLD_FORMAT);
        expect(before).toBeGreaterThan(0.15);
        expect(before).toBeLessThan(0.25);
        const rate = thawRate(FORMAT);
        expect(rate).toBeGreaterThan(0.28);
        expect(rate).toBeLessThan(0.39);
    }, 30_000);

    it('thaws once: never "frozen solid" after thawing on the same move', () => {
        for (let i = 0; i < 200; i += 1) {
            const battle = new Battle({ formatid: FORMAT, seed: [i, 1, 2, 3] });
            battle.setPlayer('p1', { team: frozenTeam });
            battle.setPlayer('p2', { team: foeTeam });
            battle.p1.active[0].setStatus('frz');
            battle.makeChoices('move 1', 'move 1');
            const cures = battle.log.filter((line) => line.startsWith('|-curestatus|p1a'));
            const cant = battle.log.filter((line) => line.startsWith('|cant|p1a'));
            expect(cures.length + cant.length).toBe(1);
        }
    });

    it('never joins a battle whose format does not name it (old battles replay as they were)', () => {
        expect(new Battle({ formatid: OLD_FORMAT, seed: [3, 1, 4, 1] }).ruleTable.has('quickthawmod')).toBe(false);
        expect(new Battle({ formatid: FORMAT, seed: [3, 1, 4, 1] }).ruleTable.has('quickthawmod')).toBe(true);
    });
});
