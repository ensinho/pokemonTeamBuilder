import { describe, it, expect } from 'vitest';

import { challengePhase, championRoster, myRoster, railTeams, sideHp, timeUntil } from './challengeView';

const request = (pokemon) => `|request|${JSON.stringify({ active: [{ moves: [] }], side: { name: 'Enzo', id: 'p1', pokemon } })}`;

describe('myRoster', () => {
    it('reads the six from the latest request, with HP and faints', () => {
        const lines = [
            request([{ details: 'Pelipper, L50, M', condition: '100/100', active: true }]),
            request([
                { details: 'Pelipper, L50, M', condition: '0 fnt', active: false },
                { details: 'Kingdra, L50, F', condition: '75/150 par', active: true },
            ]),
        ];
        expect(myRoster(lines)).toEqual([
            { species: 'Pelipper', active: false, fainted: true, hpPct: 0 },
            { species: 'Kingdra', active: true, fainted: false, hpPct: 50 },
        ]);
        expect(myRoster([])).toEqual([]);
    });
});

describe('championRoster', () => {
    const lineup = [
        { species: 'Spiritomb', dexNum: 442 },
        { wildcard: true },
        { species: 'Milotic', dexNum: 350 },
        { species: 'Garchomp', dexNum: 445 },
    ];

    it('keeps the wildcard hidden until it comes out', () => {
        const roster = championRoster(['|switch|p2a: Spiritomb|Spiritomb, L50, F|100/100'], lineup);
        expect(roster.map((m) => [m.species, m.revealed])).toEqual([
            ['Spiritomb', true], [null, false], ['Milotic', false], ['Garchomp', false],
        ]);
    });

    it('fills the wildcard slot with the species that was not in the lineup, and marks faints', () => {
        const lines = [
            '|switch|p2a: Spiritomb|Spiritomb, L50, F|100/100',
            '|faint|p2a: Spiritomb',
            '|switch|p2a: Pawmot|Pawmot, L50, M|100/100',
        ];
        const roster = championRoster(lines, lineup);
        expect(roster[0]).toMatchObject({ species: 'Spiritomb', revealed: true, fainted: true });
        expect(roster[1]).toMatchObject({ species: 'Pawmot', wildcard: true, revealed: true, fainted: false });
    });
});

describe('timeUntil', () => {
    it('counts down to the next team and never goes negative', () => {
        expect(timeUntil(3 * 3_600_000 + 5 * 60_000 + 30_000, 0)).toEqual({ hours: 3, minutes: 5 });
        expect(timeUntil(0, 10)).toEqual({ hours: 0, minutes: 0 });
    });
});

describe('challengePhase', () => {
    const base = { status: 'ready', hasLoaded: true, isAnonymous: false, run: null, pickingPractice: false };
    it('routes each state to its screen', () => {
        expect(challengePhase({ ...base, hasLoaded: false, status: 'loading' })).toBe('loading');
        expect(challengePhase({ ...base, hasLoaded: false, status: 'error' })).toBe('error');
        expect(challengePhase({ ...base, isAnonymous: true })).toBe('guest');
        expect(challengePhase(base)).toBe('pick');
        expect(challengePhase({ ...base, run: { status: 'active' } })).toBe('battle');
        expect(challengePhase({ ...base, run: { status: 'won' } })).toBe('result');
        expect(challengePhase({ ...base, run: { status: 'lost' }, pickingPractice: true })).toBe('pick');
    });
});

describe('sideHp', () => {
    it('follows one side through switches, damage, heals and faints, nicknames resolved', () => {
        const lines = [
            '|switch|p1a: Bolt|Jolteon, L50, M|160/160',
            '|switch|p2a: Spiritomb|Spiritomb, L50, F|100/100',
            '|-damage|p1a: Bolt|80/160',
            '|-damage|p2a: Spiritomb|35/100',
            '|-heal|p1a: Bolt|120/160|[from] item: Sitrus Berry',
            '|switch|p1a: Kingdra|Kingdra, L50, F|150/150',
            '|-damage|p1a: Kingdra|0 fnt',
            '|faint|p1a: Kingdra',
        ];
        expect([...sideHp(lines, 'p1')]).toEqual([['Jolteon', 75], ['Kingdra', 0]]);
        expect([...sideHp(lines, 'p2')]).toEqual([['Spiritomb', 35]]);
        expect(sideHp([], 'p1').size).toBe(0);
    });
});

describe('railTeams', () => {
    it('keeps the order from the request but only the HP the playback has shown', () => {
        const lines = [
            request([
                { details: 'Jolteon, L50, M', condition: '0 fnt', active: false },
                { details: 'Kingdra, L50, F', condition: '150/150', active: true },
            ]),
            '|switch|p1a: Jolteon|Jolteon, L50, M|160/160',
            '|switch|p2a: Spiritomb|Spiritomb, L50, F|100/100',
            '|-damage|p2a: Spiritomb|40/100',
            '|-damage|p1a: Jolteon|0 fnt',
            '|faint|p1a: Jolteon',
        ];
        const shown = lines.slice(0, 4); // Spiritomb hit, Jolteon not yet
        const { mine, foe } = railTeams(lines, [{ species: 'Spiritomb' }, { wildcard: true }], shown);
        expect(mine).toEqual([
            { species: 'Jolteon', hpPct: 100, fainted: false },
            { species: 'Kingdra', hpPct: 100, fainted: false },
        ]);
        expect(foe.map((m) => [m.species, m.revealed, m.hpPct])).toEqual([['Spiritomb', true, 40], [null, false, 100]]);
        expect(railTeams(lines, [], lines).mine[0]).toEqual({ species: 'Jolteon', hpPct: 0, fainted: true });
    });
});
