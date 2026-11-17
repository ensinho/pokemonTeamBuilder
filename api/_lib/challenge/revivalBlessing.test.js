import { describe, it, expect } from 'vitest';

import { createMatch, apply, owes, battleNames } from './engine.js';
import { readMyRequest } from '../../../src/utils/battleProtocol.js';
import { readBattleField } from '../../../src/utils/battleState.js';
import { faintedSpecies } from '../../../src/utils/challengeView.js';
import { shownConditions } from '../../../src/utils/challengeSheet.js';

/*
 * Revival Blessing (2026-11-17): the sim answers the move with a forced
 * "switch" whose only legal picks are the FAINTED bench — the active entry of
 * the request carries `reviving`. The client offered the standing bench, as for
 * any forced switch, so every pick came back "You have to pass to a fainted
 * Pokémon" and the battle was stuck. Driven through the real sim, because the
 * bug lives in the handshake between the request and the client's reading of it.
 */
const P1_TEAM = [
    'Magikarp\nAbility: Swift Swim\n- Memento',
    'Rabsca\nAbility: Synchronize\n- Revival Blessing\n- Tackle',
    'Pidgey\nAbility: Keen Eye\n- Tackle',
].join('\n\n');
const P2_TEAM = 'Magikarp\nAbility: Swift Swim\n- Splash';

const input = { seed: [1, 2, 3, 4], teams: { p1: P1_TEAM, p2: P2_TEAM }, names: battleNames('Enzo', 'Cynthia') };

const play = (match, side, choice) => {
    const result = apply(match, side, choice);
    expect(result).toEqual({ ok: true });
};

describe('Revival Blessing', () => {
    const match = createMatch(input);
    // Magikarp faints itself; Rabsca comes in and uses Revival Blessing.
    play(match, 'p2', 'move 1');
    play(match, 'p1', 'move 1');
    const afterFaint = readMyRequest(match.lines.p1);
    play(match, 'p1', `switch ${afterFaint.switches.find((mon) => mon.name === 'Rabsca').slot}`);
    play(match, 'p2', 'move 1');
    play(match, 'p1', 'move 1');
    const revive = readMyRequest(match.lines.p1);

    it('offers only the fainted bench, flagged as a revive', () => {
        expect(revive).toMatchObject({ kind: 'switch', reviving: true });
        expect(revive.switches.map((mon) => mon.name)).toEqual(['Magikarp']);
    });

    it('the sim takes that pick, and the battle goes on', () => {
        play(match, 'p1', `switch ${revive.switches[0].slot}`);
        expect(owes(match.battle, 'p1')).toBe(true);
        expect(readMyRequest(match.lines.p1).kind).toBe('move');
    });

    it('the revived one is back on the sheet — and the HP lands on it, not the one out', () => {
        const lines = match.lines.p1;
        expect(lines.some((line) => /^\|-heal\|p1: Magikarp\|.*Revival Blessing/.test(line))).toBe(true);
        expect(faintedSpecies(lines, 'p1').has('Magikarp')).toBe(false);
        expect(shownConditions(lines, 'p1').get('Magikarp')).toMatchObject({ fainted: false });
        const field = readBattleField(lines);
        expect(field.mine.active.species).toBe('Rabsca');
        expect(field.mine.active.hp.pct).toBe(100);
    });
});
