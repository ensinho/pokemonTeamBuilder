import { describe, it, expect } from 'vitest';

import { decide } from './index.js';
import { scenario } from './testing/scenario.js';

/**
 * The behaviours the AI doc (§17) promises, one battle situation each. Every
 * team is level 50 (the engine forces it). `move n` / `switch n` refer to the
 * order in Cynthia's (p2's) text.
 */

const run = (spec) => decide(scenario(spec).input);
const choiceOf = (spec) => run(spec).choice;

const GARCHOMP = 'Garchomp @ Yache Berry\nAbility: Rough Skin\nEVs: 252 Atk / 252 Spe\nJolly Nature\n- Swords Dance\n- Earthquake\n- Dragon Claw\n- Stone Edge';
const MILOTIC = 'Milotic @ Leftovers\nAbility: Marvel Scale\nEVs: 252 HP / 252 Def\nBold Nature\n- Scald\n- Ice Beam\n- Recover\n- Haze';

describe('Cynthia AI — scenarios', () => {
    it('1. takes the KO when she has it', () => {
        const choice = choiceOf({
            p1: 'Togekiss @ Leftovers\nAbility: Serene Grace\n- Air Slash\n- Moonblast\n- Roost\n- Thunder Wave',
            p2: GARCHOMP,
            set: { p1: { hpPct: 35 } },
        });
        expect(choice).toBe('move 4'); // Stone Edge; Dragon Claw and Earthquake can't touch Togekiss
    });

    it('2. closes with priority against a faster foe', () => {
        const choice = choiceOf({
            p1: 'Jolteon\nAbility: Volt Absorb\nEVs: 252 SpA / 252 Spe\nTimid Nature\n- Thunderbolt\n- Shadow Ball',
            p2: 'Lucario\nAbility: Inner Focus\n- Aura Sphere\n- Extreme Speed\n- Shadow Ball\n- Stone Edge',
            set: { p1: { hpPct: 15 } },
        });
        expect(choice).toBe('move 2');
    });

    it('3. never fires Earthquake into a Levitate Pokémon', () => {
        const choice = choiceOf({
            p1: 'Rotom-Wash\nAbility: Levitate\n- Hydro Pump\n- Volt Switch',
            p2: GARCHOMP,
        });
        expect(choice).not.toBe('move 2');
    });

    it('4. switches out of a guaranteed KO into a Pokémon that resists', () => {
        const choice = choiceOf({
            p1: 'Volcarona\nAbility: Flame Body\n- Fiery Dance\n- Bug Buzz',
            p2: `Lucario\nAbility: Inner Focus\nBold Nature\n- Aura Sphere\n- Close Combat\n- Swords Dance\n- Meteor Mash\n\n${MILOTIC}\n\n${GARCHOMP}`,
            turns: [['move 1', 'move 1']],
            set: { p2: { hpPct: 100 } },
        });
        expect(choice).toBe('switch 2');
    });

    it('5. never switches her ace out', () => {
        const choice = choiceOf({
            p1: 'Weavile @ Life Orb\nAbility: Pressure\nEVs: 252 Atk / 252 Spe\nJolly Nature\n- Ice Shard\n- Triple Axel\n- Knock Off',
            p2: `${GARCHOMP}\n\n${MILOTIC}`,
        });
        expect(choice.startsWith('move')).toBe(true);
    });

    it('6. sets up when it is safe', () => {
        const choice = choiceOf({
            p1: 'Skarmory\nAbility: Sturdy\n- Iron Head\n- Roost\n- Spikes',
            p2: GARCHOMP,
        });
        expect(choice).toBe('move 1');
    });

    it('7. does not set up under a real threat', () => {
        const choice = choiceOf({
            p1: 'Weavile @ Life Orb\nAbility: Pressure\nEVs: 252 Atk / 252 Spe\nJolly Nature\n- Ice Shard\n- Triple Axel\n- Knock Off',
            p2: GARCHOMP,
            turns: [['move 2', 'move 3']],
            set: { p2: { hpPct: 100 } },
        });
        expect(choice).not.toBe('move 1');
    });

    it('8. burns a physical attacker', () => {
        const choice = choiceOf({
            p1: 'Machamp\nAbility: Guts\n- Close Combat\n- Knock Off',
            p2: 'Spiritomb @ Lum Berry\nAbility: Pressure\n- Dark Pulse\n- Will-O-Wisp\n- Confuse Ray\n- Rest',
            profile: 'platinum',
        });
        // Guts is a possible ability, not a revealed one — she still burns.
        expect(choice).toBe('move 2');
    });

    it('9. never burns a Fire type', () => {
        const choice = choiceOf({
            p1: 'Arcanine\nAbility: Intimidate\n- Flare Blitz\n- Extreme Speed',
            p2: 'Spiritomb @ Lum Berry\nAbility: Pressure\n- Dark Pulse\n- Will-O-Wisp\n- Confuse Ray\n- Rest',
            profile: 'platinum',
        });
        expect(choice).not.toBe('move 2');
    });

    it('10. puts no status on a Pokémon that already has one', () => {
        const result = run({
            p1: 'Machamp\nAbility: No Guard\n- Close Combat\n- Knock Off',
            p2: 'Spiritomb @ Lum Berry\nAbility: Pressure\n- Dark Pulse\n- Will-O-Wisp\n- Confuse Ray\n- Rest',
            set: { p1: { status: 'par' } },
            profile: 'platinum',
        });
        expect(result.choice).not.toBe('move 2');
        expect(result.trace.candidates.find((c) => c.choice === 'move 2').final).toBe(-Infinity);
    });

    it('11. recovers when low and safe', () => {
        const choice = choiceOf({
            p1: 'Chansey @ Eviolite\nAbility: Natural Cure\n- Seismic Toss\n- Soft-Boiled',
            p2: MILOTIC,
            set: { p2: { hpPct: 40 } },
        });
        expect(choice).toBe('move 3');
    });

    it('12. attacks instead of healing when she would fall anyway', () => {
        const choice = choiceOf({
            p1: 'Zapdos @ Life Orb\nAbility: Static\nEVs: 252 SpA / 252 Spe\nTimid Nature\n- Thunderbolt\n- Hurricane',
            p2: MILOTIC,
            turns: [['move 1', 'move 2']],
            set: { p2: { hpPct: 30 } },
        });
        expect(choice).not.toBe('move 3');
    });

    it('13. respects the Sleep Clause', () => {
        const choice = choiceOf({
            p1: 'Snorlax\nAbility: Thick Fat\n- Body Slam\n- Curse\n\nVaporeon\nAbility: Water Absorb\n- Scald\n- Wish',
            p2: 'Roserade\nAbility: Natural Cure\n- Spore\n- Sludge Bomb\n- Leaf Storm\n- Spikes',
            turns: [['switch 2', 'move 1'], ['switch 2', 'move 2']],
        });
        expect(choice).not.toBe('move 1');
    });

    it('14. replaces a fainted Pokémon with the one that revenge-kills', () => {
        const choice = choiceOf({
            p1: 'Jolteon\nAbility: Volt Absorb\nEVs: 252 SpA / 252 Spe\nTimid Nature\n- Thunderbolt\n- Shadow Ball',
            p2: 'Gyarados\nAbility: Intimidate\n- Waterfall\n- Earthquake\n\nSnorlax\nAbility: Thick Fat\n- Body Slam\n- Rest\n\nLucario\nAbility: Inner Focus\n- Extreme Speed\n- Aura Sphere',
            turns: [['move 1', 'move 1']],
            set: { p1: { hpPct: 18 } },
        });
        expect(choice).toBe('switch 3');
    });

    it('15. keeps the ace for last when replacing', () => {
        const choice = choiceOf({
            p1: 'Jolteon\nAbility: Volt Absorb\nEVs: 252 SpA / 252 Spe\nTimid Nature\n- Thunderbolt\n- Shadow Ball',
            p2: `Gyarados\nAbility: Intimidate\n- Waterfall\n- Earthquake\n\n${GARCHOMP}\n\n${MILOTIC}`,
            turns: [['move 1', 'move 1']],
        });
        expect(choice).toBe('switch 3');
    });

    it('16. reads the switch (rematch) after the player switched three times', () => {
        const p2 = 'Lucario\nAbility: Inner Focus\n- Aura Sphere\n- Flash Cannon\n- Shadow Ball\n- Vacuum Wave';
        const switching = run({
            p1: 'Tyranitar\nAbility: Sand Stream\n- Stone Edge\n- Crunch\n\nSkarmory\nAbility: Sturdy\n- Iron Head\n- Roost',
            p2,
            turns: [['switch 2', 'move 4'], ['switch 2', 'move 4'], ['switch 2', 'move 4']],
            profile: 'rematch',
        });
        const auraSphere = switching.trace.candidates.find((c) => c.choice === 'move 1');
        expect(auraSphere.parts.readSwitch).toBeGreaterThan(0);

        const staying = run({
            p1: 'Skarmory\nAbility: Sturdy\n- Iron Head\n- Roost\n\nTyranitar\nAbility: Sand Stream\n- Stone Edge\n- Crunch',
            p2,
            turns: [['move 2', 'move 4'], ['move 2', 'move 4'], ['move 2', 'move 4']],
            profile: 'rematch',
        });
        expect(staying.trace.candidates.find((c) => c.choice === 'move 1').parts?.readSwitch).toBeUndefined();
    });

    it('17. hazes a player who is setting up', () => {
        const choice = choiceOf({
            p1: 'Scizor @ Leftovers\nAbility: Technician\n- Swords Dance\n- Bullet Punch\n- Roost',
            p2: MILOTIC,
            turns: [['move 1', 'move 1'], ['move 1', 'move 1']],
        });
        expect(choice).toBe('move 4');
    });

    it('18. does not fire a second Leaf Storm at −2 without a KO', () => {
        const choice = choiceOf({
            p1: 'Snorlax @ Leftovers\nAbility: Thick Fat\nEVs: 252 HP / 252 SpD\nCareful Nature\n- Body Slam\n- Rest',
            p2: 'Roserade\nAbility: Natural Cure\n- Leaf Storm\n- Sludge Bomb\n- Sleep Powder\n- Spikes',
            turns: [['move 2', 'move 1']],
            profile: 'platinum',
        });
        expect(choice).not.toBe('move 1');
    });

    it('19. gambles when losing and plays safe when winning (risk mode)', () => {
        // Focus Blast (70%) KOs; Aura Sphere (never misses) doesn't. The same
        // position, judged by two fixed win-probability models.
        const spec = {
            p1: 'Tyranitar @ Leftovers\nAbility: Sand Stream\nEVs: 252 HP / 252 SpD\nCareful Nature\n- Stone Edge\n- Crunch',
            p2: 'Lucario\nAbility: Inner Focus\nEVs: 252 SpA / 252 Spe\nTimid Nature\n- Focus Blast\n- Aura Sphere\n- Flash Cannon\n- Nasty Plot',
        };
        const losing = { version: 'test-low', mean: [0, 0, 0, 0, 0, 0], sd: [1, 1, 1, 1, 1, 1], weights: [0, 0, 0, 0, 0, 0], bias: -3 };
        const winning = { ...losing, version: 'test-high', bias: 3 };
        const s = scenario(spec);
        const low = decide({ ...s.input, model: losing }).trace.candidates;
        const high = decide({ ...s.input, model: winning }).trace.candidates;
        const gap = (cands) => cands.find((c) => c.choice === 'move 1').final - cands.find((c) => c.choice === 'move 2').final;
        expect(gap(low)).toBeGreaterThan(gap(high));
    });
});
