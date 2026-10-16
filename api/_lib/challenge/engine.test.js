import { describe, it, expect } from 'vitest';

import { createMatch, apply, replay, owes, outcome, requestOf, battleNames, snapshot } from './engine.js';

const P1_TEAM = [
    'Pelipper @ Damp Rock\nAbility: Drizzle\nEVs: 252 HP / 252 SpA\nModest Nature\n- Hurricane\n- Scald\n- U-turn\n- Roost',
    'Rattata @ Life Orb\nAbility: Guts\n- Quick Attack\n- Tackle',
    'Pidgey\nAbility: Keen Eye\n- Tackle\n- Quick Attack',
].join('\n\n');

const P2_TEAM = [
    'Garchomp @ Choice Band\nAbility: Rough Skin\nEVs: 252 Atk / 252 Spe\nJolly Nature\n- Earthquake\n- Dragon Claw\n- Stone Edge\n- Fire Fang',
    'Magikarp @ Light Ball\nAbility: Swift Swim\n- Tackle\n- Splash',
].join('\n\n');

const input = { seed: [11, 22, 33, 44], teams: { p1: P1_TEAM, p2: P2_TEAM }, names: battleNames('Enzo', 'Cynthia') };

/** A legal answer to whatever the sim is asking `side`, chosen deterministically. */
const legalChoice = (battle, side, turnSalt = 0) => {
    const request = requestOf(battle, side);
    if (!request || request.wait) return null;
    if (request.forceSwitch) {
        const index = request.side.pokemon.findIndex((mon) => !mon.active && !mon.condition.endsWith(' fnt'));
        return index === -1 ? 'default' : `switch ${index + 1}`;
    }
    const moves = request.active[0].moves;
    const usable = moves.map((move, i) => ({ move, i })).filter(({ move }) => !move.disabled);
    const pick = usable[turnSalt % usable.length];
    return pick ? `move ${pick.i + 1}` : 'default';
};

/** Play the battle to its end, recording every choice in the order applied. */
const playOut = (match) => {
    const choices = [];
    for (let step = 0; step < 300 && !match.battle.ended; step += 1) {
        for (const side of ['p2', 'p1']) {
            if (!owes(match.battle, side)) continue;
            const choice = legalChoice(match.battle, side, step);
            expect(apply(match, side, choice).ok).toBe(true);
            choices.push({ side, choice });
        }
    }
    return choices;
};

describe('challenge engine', () => {
    it('opens straight into the first turn, without team preview', () => {
        const match = createMatch(input);
        expect(match.lines.p1.some((line) => line.startsWith('|poke|'))).toBe(false);
        expect(match.lines.p1.some((line) => line.startsWith('|switch|p1a: Pelipper'))).toBe(true);
        expect(owes(match.battle, 'p1')).toBe(true);
        expect(owes(match.battle, 'p2')).toBe(true);
    });

    it('replays to the byte-identical log of the live battle', () => {
        const live = createMatch(input);
        const choices = playOut(live);
        expect(live.battle.ended).toBe(true);

        const again = replay({ ...input, choices });
        expect(again.lines.p1).toEqual(live.lines.p1);
        expect(again.lines.p2).toEqual(live.lines.p2);
        expect(outcome(again.battle)).toEqual(outcome(live.battle));
        // No wall-clock lines: two runs at different times must match.
        expect(live.lines.p1.some((line) => line.startsWith('|t:|'))).toBe(false);
    });

    it('emits nothing until the battle is flushed (the sendUpdates guard)', () => {
        const match = createMatch(input);
        const before = match.lines.p1.length;
        match.battle.choose('p2', 'move 1');
        match.battle.choose('p1', 'move 2');
        expect(match.lines.p1.length).toBe(before);
        match.battle.sendUpdates();
        expect(match.lines.p1.length).toBeGreaterThan(before);
    });

    it('refuses an illegal choice and keeps no trace of it', () => {
        const match = createMatch(input);
        const before = [...match.lines.p1];
        const result = apply(match, 'p1', 'switch 1');
        expect(result.ok).toBe(false);
        expect(result.error).toMatch(/Invalid choice/);
        expect(match.lines.p1).toEqual(before);
        expect(apply(match, 'p1', 'move 9').ok).toBe(false);
    });

    it('asks only the side that fainted for a switch', () => {
        const match = createMatch(input);
        let oneSided = null;
        for (let step = 0; step < 60 && !match.battle.ended && !oneSided; step += 1) {
            const owing = ['p1', 'p2'].filter((side) => owes(match.battle, side));
            if (owing.length === 1 && requestOf(match.battle, owing[0]).forceSwitch) {
                oneSided = owing[0];
                break;
            }
            for (const side of owing) apply(match, side, legalChoice(match.battle, side, step));
        }
        expect(oneSided).toBeTruthy();
        const other = oneSided === 'p1' ? 'p2' : 'p1';
        expect(requestOf(match.battle, other).wait).toBe(true);
        expect(apply(match, other, 'move 1').ok).toBe(false);
    });

    it("never shows a side the other's held item or exact HP", () => {
        const match = createMatch(input);
        playOut(match);
        const p1Text = match.lines.p1.join('\n');
        expect(p1Text).not.toContain('Choice Band');
        expect(p1Text).not.toContain('Light Ball');
        // Garchomp's HP reaches p1 as a percentage only.
        expect(match.lines.p1.filter((line) => /\|p2a: Garchomp\|/.test(line) && /\d+\/\d+/.test(line))
            .every((line) => /\|\d+\/100\b|\|0 fnt/.test(line))).toBe(true);
        expect(match.lines.p2.join('\n')).not.toContain('Damp Rock');
    });

    it('snapshots without disturbing the live battle', () => {
        const live = createMatch(input);
        apply(live, 'p2', 'move 1');
        apply(live, 'p1', 'move 2');
        snapshot(live.battle);
        const choices = playOut(live);
        const again = replay({ ...input, choices: [{ side: 'p2', choice: 'move 1' }, { side: 'p1', choice: 'move 2' }, ...choices] });
        expect(again.lines.p1).toEqual(live.lines.p1);
    });

    it('keeps the two names distinct', () => {
        expect(battleNames('Cynthia', 'Cynthia')).toEqual({ p1: 'Cynthia (2)', p2: 'Cynthia' });
        expect(battleNames('a|b\nc', 'Cynthia').p1).toBe('abc');
        expect(battleNames('', 'Cynthia').p1).toBe('Trainer');
    });
});
