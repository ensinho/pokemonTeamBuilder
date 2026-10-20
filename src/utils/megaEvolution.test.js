import { describe, expect, it } from 'vitest';

import { translate } from './translate';
import { toTimeline } from './battleTimeline';
import { readBattleField } from './battleState';
import { readMyRequest } from './battleProtocol';
import { faintedSpecies, sideHp } from './challengeView';
import { shownConditions } from './challengeSheet';
import { eventText, megaName } from './challengeText';
import { opponentRoster } from './pvpView';

/*
 * A Mega Evolution, as the sim writes it, through every reader of the log: the
 * forme changes once (`detailschange`), the line that names it comes after
 * (`-mega`), and from then on the request calls the Pokémon by its new species
 * — so every reader keyed by species has to follow the rename.
 */
const MEGA_TURN = [
    '|switch|p1a: Zard|Charizard, L50, M|153/153',
    '|switch|p2a: Lucario|Lucario, L50, M|100/100',
    '|turn|1',
    '|detailschange|p1a: Zard|Charizard-Mega-X, L50, M',
    '|-mega|p1a: Zard|Charizard|Charizardite X',
    '|detailschange|p2a: Lucario|Lucario-Mega, L50, M',
    '|-mega|p2a: Lucario|Lucario|Lucarionite',
    '|move|p2a: Lucario|Close Combat|p1a: Zard',
    '|-resisted|p1a: Zard',
    '|-damage|p1a: Zard|100/153',
    '|move|p1a: Zard|Earthquake|p2a: Lucario',
    '|-supereffective|p2a: Lucario',
    '|-damage|p2a: Lucario|0 fnt',
    '|faint|p2a: Lucario',
];

const request = (canMegaEvo) => `|request|${JSON.stringify({
    active: [{ moves: [{ move: 'Flare Blitz', id: 'flareblitz', pp: 24, maxpp: 24 }], canMegaEvo }],
    side: { id: 'p1', pokemon: [{ ident: 'p1: Zard', details: 'Charizard, L50, M', condition: '153/153', active: true }] },
})}`;

describe('Mega Evolution through the log readers', () => {
    it('the timeline plays one mega moment per side, naming the new forme', () => {
        const megas = toTimeline(MEGA_TURN).filter((e) => e.type === 'mega');
        expect(megas).toEqual([
            expect.objectContaining({ side: 'p1', species: 'Charizard', mega: 'Charizard-Mega-X', item: 'Charizardite X', lineIndex: 4 }),
            expect.objectContaining({ side: 'p2', species: 'Lucario', mega: 'Lucario-Mega', item: 'Lucarionite', lineIndex: 6 }),
        ]);
    });

    it('the field swaps the sprite and keeps HP, as of the forme line', () => {
        const before = readBattleField(MEGA_TURN.slice(0, 3));
        expect(before.mine.active.species).toBe('Charizard');
        const after = readBattleField(MEGA_TURN.slice(0, 10));
        expect(after.mine.active).toMatchObject({ species: 'Charizard-Mega-X', hp: { current: 100, max: 153 } });
        expect(after.theirs.active.species).toBe('Lucario-Mega');
    });

    it('a -formechange changes the species for the switch-in only', () => {
        const field = readBattleField([
            '|switch|p2a: Mimikyu|Mimikyu, L50, F|100/100',
            '|-formechange|p2a: Mimikyu|Mimikyu-Busted|[from] ability: Disguise',
        ]);
        expect(field.theirs.active.species).toBe('Mimikyu-Busted');
    });

    it('a fainted Mega, renamed back to its base by the sim, stays fainted everywhere', () => {
        const lines = [...MEGA_TURN, '|detailschange|p2: Lucario|Lucario, L50, M|[silent]'];
        expect([...faintedSpecies(lines, 'p2')]).toEqual(['Lucario']);
        expect(opponentRoster(lines)[0]).toMatchObject({ species: 'Lucario', fainted: true });
        expect([...sideHp(lines, 'p2')]).toEqual([['Lucario', 0]]);
    });

    it('HP, faints and the sheet follow the rename', () => {
        expect([...sideHp(MEGA_TURN, 'p1')]).toEqual([['Charizard-Mega-X', 65]]);
        expect([...sideHp(MEGA_TURN, 'p2')]).toEqual([['Lucario-Mega', 0]]);
        expect([...faintedSpecies(MEGA_TURN, 'p2')]).toEqual(['Lucario-Mega']);
        const shown = shownConditions(MEGA_TURN, 'p1');
        expect(shown.has('Charizard')).toBe(false);
        expect(shown.get('Charizard-Mega-X')).toMatchObject({ hp: { current: 100, max: 153 }, fainted: false });
    });

    it("the opponent's roster keeps one slot, under the new name", () => {
        expect(opponentRoster(['|teamsize|p2|3', ...MEGA_TURN])).toEqual([
            { species: 'Lucario-Mega', dexNum: null, wildcard: false, revealed: true, fainted: true },
            { species: null, dexNum: null, wildcard: true, revealed: false, fainted: false },
            { species: null, dexNum: null, wildcard: true, revealed: false, fainted: false },
        ]);
    });

    it('the request says whether the active Pokémon can Mega Evolve', () => {
        expect(readMyRequest([request(true)]).canMega).toBe(true);
        expect(readMyRequest([request(false)]).canMega).toBe(false);
    });

    it('the text names the Mega the way the games do', () => {
        expect(megaName('Charizard-Mega-X')).toBe('Mega Charizard X');
        expect(megaName('Lucario-Mega')).toBe('Mega Lucario');
        expect(megaName('Garchomp')).toBe('Garchomp');
        const t = (key, params) => translate('en', key, params);
        const [mine, theirs] = toTimeline(MEGA_TURN).filter((e) => e.type === 'mega');
        expect(eventText(mine, { t, mySide: 'p1', championName: 'Cynthia' }).text).toBe('Charizard has Mega Evolved into Mega Charizard X!');
        expect(eventText(theirs, { t, mySide: 'p1', championName: 'Cynthia' }).text).toMatch(/Lucario.*Mega Lucario/);
    });
});

describe('direct hits in the timeline (the flare reads them)', () => {
    const hits = toTimeline([
        ...MEGA_TURN,
        '|-damage|p1a: Zard|90/153|[from] Stealth Rock',
        '|upkeep|',
        '|-damage|p1a: Zard|80/153',
    ]).filter((e) => e.type === 'hp');

    it('tags a -damage with no [from] with the move that dealt it, hard after a crit or super effective', () => {
        expect(hits[0].strike).toEqual({ move: 'Close Combat', hard: false });
        expect(hits[1].strike).toEqual({ move: 'Earthquake', hard: true });
    });

    it('leaves indirect damage, and anything after the upkeep, untagged', () => {
        expect(hits[2].strike).toBe(null);
        expect(hits[3].strike).toBe(null);
    });
});
