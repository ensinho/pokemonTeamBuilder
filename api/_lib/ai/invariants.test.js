import { describe, it, expect } from 'vitest';
import { PRNG } from '@pkmn/sim';

import { createMatch, apply, owes, replay, requestOf, snapshot, outcome } from '../challenge/engine.js';
import { championTeamTextFor } from '../challenge/rotation.js';
import { dailyTeamFor } from '../challenge/dailyTeam.js';
import { shiftDayKey } from '../challenge/day.js';
import { decide } from './index.js';
import { legalOptions } from './options.js';
import { PROFILES } from './profiles.js';
import { scenario } from './testing/scenario.js';
import { undefinedPathIn } from '../testing/fakeFirestore.js';

/**
 * The AI doc's invariants (§1), each as a property. The fuzz runs a reduced
 * number of battles per profile in `npm test` so the suite stays quick; set
 * AI_FUZZ=200 for the full sweep the doc asks for (or use `npm run ai:arena`).
 */

const FUZZ = Number(process.env.AI_FUZZ || 6);
const ACE = 'Garchomp';
const withoutMs = ({ trace, ...rest }) => ({ ...rest, trace: trace && { ...trace, ms: 0 } });

const randomChoice = (request, prng) => {
    const options = legalOptions(request);
    return options[prng.random(options.length)].choice;
};

/** Cynthia (AI) against a uniformly random player; returns what happened. */
const fuzzBattle = (day, profileKey, seed) => {
    const prng = new PRNG(seed);
    const input = { seed, teams: { p1: dailyTeamFor(day).showdownText, p2: championTeamTextFor(day) }, names: { p1: 'Robot', p2: 'Cynthia' } };
    const match = createMatch(input);
    const choices = [];
    const problems = [];
    let slowest = 0;
    for (let step = 0; step < 600 && !match.battle.ended; step += 1) {
        let mine = null;
        if (owes(match.battle, 'p2')) {
            const request = requestOf(match.battle, 'p2');
            const active = match.battle.sides[1].active[0];
            const started = performance.now();
            const decision = decide({ snapshot: snapshot(match.battle), request, p2Lines: match.lines.p2, seed, turn: step, profileKey });
            mine = decision.choice;
            // The trace is written to Firestore as-is (secret/state.aiTrace).
            const unstorable = undefinedPathIn(decision.trace);
            if (unstorable) problems.push(`trace has undefined at ${unstorable} on turn ${match.battle.turn}`);
            slowest = Math.max(slowest, performance.now() - started);
            const target = mine.startsWith('switch') ? match.battle.sides[1].pokemon[Number(mine.split(' ')[1]) - 1] : null;
            const othersStanding = match.battle.sides[1].pokemon.filter((m) => !m.fainted && m.species.name !== ACE && m !== active).length;
            if (target && !request.forceSwitch && active.species.name === ACE) problems.push(`ace switched out on turn ${match.battle.turn}`);
            if (target && target.species.name === ACE && othersStanding > 0 && !target.fainted) problems.push(`ace sent early on turn ${match.battle.turn}`);
        }
        if (owes(match.battle, 'p1')) {
            const choice = randomChoice(requestOf(match.battle, 'p1'), prng);
            if (!apply(match, 'p1', choice).ok) problems.push(`robot illegal ${choice}`);
            choices.push({ side: 'p1', choice });
        }
        if (mine) {
            const result = apply(match, 'p2', mine);
            if (!result.ok) problems.push(`AI illegal "${mine}": ${result.error}`);
            choices.push({ side: 'p2', choice: mine });
        }
    }
    return { match, input, choices, problems, slowest };
};

describe('Cynthia AI — invariants', () => {
    it('I1: decides from the snapshot taken before the player moves', () => {
        const spec = {
            p1: 'Togekiss @ Leftovers\nAbility: Serene Grace\n- Air Slash\n- Moonblast\n- Roost\n- Thunder Wave',
            p2: 'Garchomp @ Yache Berry\nAbility: Rough Skin\n- Swords Dance\n- Earthquake\n- Dragon Claw\n- Stone Edge',
        };
        const before = withoutMs(decide(scenario(spec).input));
        // The player's choice lands in the battle after the snapshot was taken,
        // so whatever it is, the AI's input — and its decision — are the same.
        for (const choice of ['move 1', 'move 3', 'move 4']) {
            const fork = scenario(spec);
            expect(apply(fork.match, 'p1', choice).ok).toBe(true);
            expect(withoutMs(decide(fork.input))).toEqual(before);
        }
    });

    it('I2 + I4: never touches the real battle — a replay of the recorded choices is identical', () => {
        const { match, input, choices } = fuzzBattle('2026-10-18', 'world', [3, 1, 4, 1]);
        const again = replay({ ...input, choices });
        expect(again.lines.p1).toEqual(match.lines.p1);
        expect(again.lines.p2).toEqual(match.lines.p2);

        // Retuning the AI can't rewrite a recorded battle: the replay never asks it.
        const saved = PROFILES.world.weights.attack;
        PROFILES.world.weights.attack = 0.1;
        try {
            expect(replay({ ...input, choices }).lines.p1).toEqual(match.lines.p1);
        } finally {
            PROFILES.world.weights.attack = saved;
        }
    }, 60_000);

    it('I3: the same input gives the same choice and the same trace', () => {
        for (const profile of Object.keys(PROFILES)) {
            const s = scenario({
                p1: 'Machamp\nAbility: Guts\n- Close Combat\n- Knock Off\n\nTogekiss\n- Air Slash',
                p2: 'Spiritomb\nAbility: Pressure\n- Dark Pulse\n- Will-O-Wisp\n- Confuse Ray\n- Shadow Ball',
                profile,
            });
            expect(withoutMs(decide(s.input))).toEqual(withoutMs(decide(s.input)));
        }
    });

    it("I5: doesn't peek — a hidden item or EV spread can't change the decision", () => {
        const p2 = 'Garchomp @ Yache Berry\nAbility: Rough Skin\nEVs: 252 Atk / 252 Spe\nJolly Nature\n- Swords Dance\n- Earthquake\n- Dragon Claw\n- Stone Edge';
        const a = scenario({ p1: 'Togekiss @ Assault Vest\nAbility: Serene Grace\nEVs: 252 HP / 252 SpD\nCalm Nature\n- Air Slash\n- Moonblast', p2 });
        const b = scenario({ p1: 'Togekiss @ Choice Specs\nAbility: Serene Grace\nEVs: 252 SpA / 252 Spe\nTimid Nature\n- Air Slash\n- Moonblast', p2 });
        expect(withoutMs(decide(a.input))).toEqual(withoutMs(decide(b.input)));
    });

    describe.each(Object.keys(PROFILES))('I6–I8 fuzz: %s', (profileKey) => {
        it(`plays ${FUZZ} battles against a random player with no illegal choice, the ace last, inside the budget`, () => {
            for (let n = 0; n < FUZZ; n += 1) {
                const day = shiftDayKey('2026-10-12', n);
                const { match, problems, slowest } = fuzzBattle(day, profileKey, [n + 1, 9, 9, profileKey.length]);
                expect(problems, `${profileKey} ${day}`).toEqual([]);
                expect(match.battle.ended).toBe(true);
                expect(outcome(match.battle).turns).toBeLessThan(300);
                expect(slowest).toBeLessThan(250);
                expect(match.lines.p2.join('\n')).not.toContain('|error|');
            }
        }, 300_000);
    });
});
