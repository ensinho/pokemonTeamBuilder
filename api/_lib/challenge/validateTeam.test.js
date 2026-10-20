import { describe, it, expect } from 'vitest';
import { Teams } from '@pkmn/sim';

import { dailyTeamFor } from './dailyTeam.js';
import { validateTeam } from './validateTeam.js';

const VALID = 'Pelipper @ Damp Rock\nAbility: Drizzle\nLevel: 100\n- Hurricane\n- Scald\n\nKingdra\nAbility: Swift Swim\n- Draco Meteor';

describe('validateTeam', () => {
    it('accepts a real team, forcing level 50', () => {
        const result = validateTeam(VALID);
        expect(result.ok).toBe(true);
        expect(result.members.map((m) => m.species)).toEqual(['Pelipper', 'Kingdra']);
        expect(Teams.import(result.text).every((set) => set.level === 50)).toBe(true);
        expect(result.packed).toContain('Pelipper');
    });

    it.each([
        ['empty', ''],
        ['tooLong', 'x'.repeat(9000)],
        ['tooMany', Array.from({ length: 7 }, (_, i) => `${['Pikachu', 'Eevee', 'Snorlax', 'Lapras', 'Ditto', 'Mew', 'Onix'][i]}\n- Tackle`).join('\n\n')],
    ])('refuses %s', (code, text) => {
        const result = validateTeam(text);
        expect(result.ok).toBe(false);
        expect(result.errors[0].code).toBe(code);
    });

    it('lists every slot problem at once', () => {
        const result = validateTeam('Pikachu\nAbility: Static\n\nPikachu\n- Thunderbolt\n\nOnix\n- Fissure\n- Double Team\n\nFakemon\n- Tackle\n\nEevee\n- Flamingo Dance');
        expect(result.ok).toBe(false);
        const codes = result.errors.map((e) => `${e.slot}:${e.code}`);
        expect(codes).toEqual(expect.arrayContaining([
            '0:noMoves', '1:duplicateSpecies', '2:bannedMove', '3:unknownSpecies', '4:unknownMove',
        ]));
        expect(result.errors.filter((e) => e.code === 'bannedMove').map((e) => e.detail)).toEqual(['Fissure', 'Double Team']);
    });

    it('starts a Mega saved as its Mega forme as its base, so it Mega Evolves in battle', () => {
        const result = validateTeam('Charizard-Mega-X @ Charizardite X\nAbility: Blaze\n- Flare Blitz\n\nDarmanitan-Zen\nAbility: Zen Mode\n- Flamethrower');
        expect(result.ok).toBe(true);
        expect(result.members.map((m) => m.species)).toEqual(['Charizard', 'Darmanitan']);
        expect(Teams.import(result.text)[0]).toMatchObject({ species: 'Charizard', item: 'Charizardite X' });
    });

    it('allows legendaries (tier is only a label)', () => {
        expect(validateTeam('Mewtwo\n- Psystrike\n\nKoraidon\n- Collision Course').ok).toBe(true);
    });
});

describe('dailyTeamFor', () => {
    it('is the same six for everyone on a day, all at level 50 with moves', () => {
        const a = dailyTeamFor('2026-10-14');
        expect(dailyTeamFor('2026-10-14')).toEqual(a);
        expect(a.members).toHaveLength(6);
        expect(a.members.every((m) => m.moves.length >= 1 && m.dexNum > 0)).toBe(true);
        expect(Teams.import(a.showdownText).every((set) => set.level === 50)).toBe(true);
        expect(validateTeam(a.showdownText).ok).toBe(true);
        expect(dailyTeamFor('2026-10-15').showdownText).not.toBe(a.showdownText);
        // Shown in the picker: display names, never ids like "hypervoice".
        expect(a.members.flatMap((m) => m.moves).every((move) => /[A-Z]/.test(move))).toBe(true);
    });
});
