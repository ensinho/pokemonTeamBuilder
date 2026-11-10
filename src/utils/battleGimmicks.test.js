import { describe, expect, it } from 'vitest';

import { translate } from './translate';
import { toTimeline } from './battleTimeline';
import { readBattleField } from './battleState';
import { readMyRequest } from './battleProtocol';
import { eventText } from './challengeText';
import { flareOf } from './battleFlare';
import { gimmickOf, moveChoice, moveChoosable } from '../hooks/useBattleCommands';

// Tera and Z-Moves (2026-11-09, docs/plans/battle-gimmicks.md) through every
// reader of the request and the log. The sim side is api/_lib/challenge/gimmicks.test.js.
const request = (active) => `|request|${JSON.stringify({
    active: [{ moves: [{ move: 'Thunderbolt', id: 'thunderbolt', pp: 24, maxpp: 24 }, { move: 'Quick Attack', id: 'quickattack', pp: 48, maxpp: 48 }], ...active }],
    side: { pokemon: [{ ident: 'p1: Pikachu', details: 'Pikachu, L50', condition: '100/100', active: true }] },
})}`;

const TERA_TURN = [
    '|switch|p1a: Chomp|Garchomp, L50, M|183/183',
    '|switch|p2a: Snorlax|Snorlax, L50, M|100/100',
    '|turn|1',
    '|-terastallize|p1a: Chomp|Fire',
    '|move|p1a: Chomp|Earthquake|p2a: Snorlax',
    '|-damage|p2a: Snorlax|60/100',
];
const Z_TURN = [
    '|switch|p1a: Pika|Pikachu, L50, M|95/95',
    '|switch|p2a: Snorlax|Snorlax, L50, M|100/100',
    '|turn|1',
    '|-zpower|p1a: Pika',
    '|move|p1a: Pika|Gigavolt Havoc|p2a: Snorlax',
];

const t = (key, params) => translate('en', key, params);

describe('battle gimmicks on the client', () => {
    it('reads what the request offers', () => {
        const tera = readMyRequest([request({ canTerastallize: 'Water' })]);
        expect(tera.canTera).toBe('Water');
        expect(gimmickOf(tera)).toBe('terastallize');

        const z = readMyRequest([request({ canZMove: [{ move: 'Gigavolt Havoc', target: 'normal' }, null] })]);
        expect(z.canZ).toBe(true);
        expect(z.moves.map((m) => m.zMove || null)).toEqual(['Gigavolt Havoc', null]);
        expect(gimmickOf(z)).toBe('zmove');

        const plain = readMyRequest([request({})]);
        expect(plain.canTera).toBeNull();
        expect(gimmickOf(plain)).toBeNull();
    });

    it('builds the choice and the label', () => {
        const [bolt, quick] = readMyRequest([request({ canZMove: [{ move: 'Gigavolt Havoc' }, null] })]).moves;
        expect(moveChoice(bolt, 'zmove', true)).toEqual({ choice: 'move 1 zmove', label: 'Gigavolt Havoc' });
        expect(moveChoosable(quick, 'zmove', true)).toBe(false);
        expect(moveChoosable(quick, 'zmove', false)).toBe(true);
        expect(moveChoice(quick, 'terastallize', true)).toEqual({ choice: 'move 2 terastallize', label: 'Quick Attack · Tera' });
        expect(moveChoice(quick, 'terastallize', false).choice).toBe('move 2');
    });

    it('follows the Tera through the field, the text and the flare', () => {
        const field = readBattleField(TERA_TURN);
        expect(field.sides.p1.active.teraType).toBe('Fire');
        // Back in after a switch, the details carry it.
        expect(readBattleField(['|switch|p1a: Chomp|Garchomp, L50, M, tera:Fire|183/183']).sides.p1.active.teraType).toBe('Fire');

        const tera = toTimeline(TERA_TURN).find((e) => e.type === 'tera');
        expect(tera).toMatchObject({ side: 'p1', species: 'Garchomp', teraType: 'Fire' });
        expect(eventText(tera, { t, mySide: 'p1', championName: 'Cynthia' }).text).toBe('Garchomp has Terastallized into the Fire type!');
        expect(flareOf(tera, { moveMeta: () => null, foeName: 'Cynthia', typeColors: { fire: '#f00' } })).toMatchObject({ variant: 'mega', at: 'mine', colorA: '#f00' });
    });

    it('says the Z-Power before the Z-Move', () => {
        const events = toTimeline(Z_TURN);
        const z = events.find((e) => e.type === 'zpower');
        expect(z).toMatchObject({ side: 'p1', species: 'Pikachu' });
        expect(events.indexOf(z)).toBeLessThan(events.findIndex((e) => e.type === 'move'));
        expect(eventText(z, { t, mySide: 'p1', championName: 'Cynthia' }).text).toBe('Pikachu surrounds itself with its Z-Power!');
    });
});
