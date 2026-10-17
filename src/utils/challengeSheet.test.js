import { describe, expect, it } from 'vitest';

import { settledRequest, sheetFromRequest, sheetFromSaved, sheetFromSet, shownConditions, withShown } from './challengeSheet';

const dex = {
    moves: {
        sludgewave: ['Sludge Wave', 'poison', 'Special', 95, 100, 10, ''],
        weatherball: ['Weather Ball', 'normal', 'Special', 50, 100, 10, ''],
        scald: ['Scald', 'water', 'Special', 80, 100, 15, ''],
    },
    species: {
        victreebel: ['Victreebel', ['grass', 'poison'], [80, 105, 65, 100, 70, 70], ['Chlorophyll', 'Gluttony'], 1.7, 15.5],
        phione: ['Phione', ['water'], [80, 80, 80, 80, 80, 80], ['Hydration'], 0.4, 3.1],
    },
};
const items = [{ slug: 'life-orb', name: 'Life Orb' }, { slug: 'leftovers', name: 'Leftovers' }];

// Trimmed from a real request of the challenge's sim (`createMatch`, Time do dia of 2026-10-17).
const request = (overrides = {}) => ({
    active: [{ moves: [
        { move: 'Sludge Wave', id: 'sludgewave', pp: 15, maxpp: 16 },
        { move: 'Weather Ball', id: 'weatherball', pp: 16, maxpp: 16 },
    ] }],
    side: { id: 'p1', pokemon: [
        { details: 'Victreebel, L50, M', condition: '120/166 par', active: true, stats: { atk: 136, def: 96, spa: 131, spd: 101, spe: 101 }, moves: ['sludgewave', 'weatherball'], baseAbility: 'chlorophyll', ability: 'chlorophyll', item: 'lifeorb' },
        { details: 'Phione, L50', condition: '0 fnt', active: false, stats: { atk: 85, def: 111, spa: 111, spd: 111, spe: 111 }, moves: ['scald'], baseAbility: 'hydration', ability: 'hydration', item: '' },
    ] },
    ...overrides,
});
const line = (payload) => `|request|${JSON.stringify(payload)}`;

describe('sheetFromRequest', () => {
    it('names ids, reads the condition and keeps the active PP', () => {
        const [vic, phione] = sheetFromRequest(request(), { dex, items });
        expect(vic).toMatchObject({
            species: 'Victreebel', level: 50, gender: 'M', types: ['grass', 'poison'],
            ability: 'Chlorophyll', item: 'Life Orb', itemSlug: 'life-orb',
            hp: { current: 120, max: 166, pct: 72 }, status: 'par', fainted: false, active: true,
            stats: { hp: 166, atk: 136, spe: 101 }, statsKind: 'real',
        });
        expect(vic.moves[0]).toMatchObject({ name: 'Sludge Wave', type: 'poison', category: 'Special', power: 95, pp: 15, maxpp: 16 });
        expect(phione).toMatchObject({ gender: null, item: '', fainted: true, hp: { pct: 0 } });
        // A benched Pokémon's PP is not in the request: unknown, never guessed.
        expect(phione.moves[0]).toMatchObject({ name: 'Scald', pp: null, maxpp: null });
    });

    it('degrades to readable names before the dex and the items arrive', () => {
        const [vic] = sheetFromRequest(request());
        expect(vic).toMatchObject({ ability: 'Chlorophyll', item: 'Lifeorb', types: [] });
        expect(vic.moves[0].name).toBe('Sludgewave');
    });
});

describe('sheets before the battle', () => {
    it('a rental set shows base stats', () => {
        const member = sheetFromSet({ species: 'Victreebel', item: 'Life Orb', ability: 'Chlorophyll', moves: ['Sludge Wave'] }, { dex, items });
        expect(member).toMatchObject({ item: 'Life Orb', itemSlug: 'life-orb', statsKind: 'base', stats: { hp: 80, atk: 105 }, hp: null });
        expect(member.moves[0]).toMatchObject({ type: 'poison', power: 95 });
    });

    it('a saved member from the team builder', () => {
        const member = sheetFromSaved({ name: 'victreebel', customization: { item: 'life-orb', ability: 'chlorophyll', nature: 'modest', moves: ['sludge-wave', ''] } }, { dex, items });
        expect(member).toMatchObject({ species: 'Victreebel', item: 'Life Orb', ability: 'Chlorophyll', nature: 'Modest' });
        expect(member.moves.map((m) => m.name)).toEqual(['Sludge Wave']);
    });
});

describe('settledRequest', () => {
    const first = request({ side: { id: 'p1', pokemon: [{ details: 'Victreebel, L50', condition: '166/166' }] } });
    const second = request();
    const lines = ['|start', '|switch|p1a: Victreebel|Victreebel, L50|166/166', '|turn|1', line(first), '|move|p1a: Victreebel|Sludge Wave', '|-damage|p1a: Victreebel|120/166', '|turn|2', line(second)];

    it('is the first request while the opening plays', () => {
        expect(settledRequest(lines, 1).side.pokemon[0].condition).toBe('166/166');
    });

    it('never runs ahead of the playback', () => {
        expect(settledRequest(lines, 6).side.pokemon[0].condition).toBe('166/166');
        expect(settledRequest(lines, lines.length).side.pokemon[0].condition).toBe('120/166 par');
    });

    it('is null with no request at all', () => {
        expect(settledRequest(['|start'])).toBeNull();
    });
});

describe('shownConditions / withShown', () => {
    it('lays the drawn HP and status over the sheet, by species, nicknames resolved', () => {
        const shown = shownConditions([
            '|switch|p1a: Vic|Victreebel, L50, M|166/166',
            '|-damage|p1a: Vic|100/166',
            '|-status|p1a: Vic|brn',
            '|switch|p2a: Phione|Phione, L50|100/100',
            '|-damage|p2a: Phione|50/100',
        ], 'p1');
        expect(shown.get('Victreebel')).toEqual({ hp: { current: 100, max: 166, pct: 60 }, status: 'brn', fainted: false });
        expect(shown.has('Phione')).toBe(false);

        const [vic, phione] = withShown(sheetFromRequest(request(), { dex, items }), shown);
        expect(vic).toMatchObject({ hp: { current: 100, pct: 60 }, status: 'brn' });
        expect(phione.fainted).toBe(true); // not drawn yet: the request's own figures stand
    });

    it('a faint zeroes the HP', () => {
        const shown = shownConditions(['|switch|p1a: Vic|Victreebel, L50|166/166', '|faint|p1a: Vic'], 'p1');
        expect(shown.get('Victreebel')).toEqual({ hp: { current: 0, max: 166, pct: 0 }, status: null, fainted: true });
    });
});
