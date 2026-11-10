import { describe, expect, it } from 'vitest';

import { legalOptions } from '../ai/options.js';
import { CHOICE_PATTERN, FORMAT } from './constants.js';
import { apply, battleNames, createMatch, requestOf } from './engine.js';
import { PVP_FORMAT } from '../pvpState.js';

// 2026-11-09: Tera and Z-Moves are the player's, in both battle types, and the
// champion never uses either (docs/plans/battle-gimmicks.md).
const TERA_TEAM = 'Garchomp @ Life Orb\nAbility: Rough Skin\nTera Type: Fire\nEVs: 252 Atk / 252 Spe\nJolly Nature\n- Earthquake\n- Dragon Claw';
const Z_TEAM = 'Pikachu @ Electrium Z\nAbility: Static\nTera Type: Water\n- Thunderbolt\n- Quick Attack';
const FOE = 'Snorlax @ Leftovers\nAbility: Thick Fat\nTera Type: Ghost\n- Body Slam\n- Rest';

const match = (p1, format = FORMAT) => createMatch({
    seed: [1, 2, 3, 4], teams: { p1, p2: FOE }, names: battleNames('Trainer', 'Cynthia'), format,
});
const foeLines = (m) => m.lines.p1.join('\n');

describe('battle gimmicks', () => {
    it.each([['challenge', FORMAT], ['pvp', PVP_FORMAT]])('%s format: Tera is offered and works', (_, format) => {
        const m = match(TERA_TEAM, format);
        expect(requestOf(m.battle, 'p1').active[0].canTerastallize).toBe('Fire');
        expect(apply(m, 'p1', 'move 1 terastallize').ok).toBe(true);
        expect(apply(m, 'p2', 'move 1').ok).toBe(true);
        expect(foeLines(m)).toMatch(/\|-terastallize\|p1a: Garchomp\|Fire/);
    });

    it('a held Z-Crystal gives its move a Z-Move', () => {
        const m = match(Z_TEAM);
        const active = requestOf(m.battle, 'p1').active[0];
        expect(active.canZMove?.[0]?.move).toBe('Gigavolt Havoc');
        expect(active.canZMove?.[1]).toBeFalsy();
        // Holding a Z-Crystal rules Tera out for that Pokémon (the sim's rule).
        expect(active.canTerastallize).toBeFalsy();
        expect(apply(m, 'p1', 'move 1 zmove').ok).toBe(true);
        expect(apply(m, 'p2', 'move 1').ok).toBe(true);
        expect(foeLines(m)).toMatch(/\|-zpower\|p1a: Pikachu/);
    });

    it('the champion never terastallizes or uses a Z-Move', () => {
        const m = match(TERA_TEAM);
        const request = requestOf(m.battle, 'p2');
        expect(request.active[0].canTerastallize).toBe('Ghost');
        expect(legalOptions(request).some(({ choice }) => /terastallize|zmove/.test(choice))).toBe(false);
    });

    it('the endpoint grammar accepts both', () => {
        expect(CHOICE_PATTERN.test('move 2 terastallize')).toBe(true);
        expect(CHOICE_PATTERN.test('move 1 zmove')).toBe(true);
        expect(CHOICE_PATTERN.test('move 1 dynamax')).toBe(false);
    });
});
