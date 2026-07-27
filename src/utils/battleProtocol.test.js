import { describe, it, expect } from 'vitest';
import { readMyRequest, describeLogLines } from './battleProtocol';

const request = (payload) => `|request|${JSON.stringify(payload)}`;

describe('readMyRequest', () => {
    it('reports nothing to do when there is no request', () => {
        expect(readMyRequest([])).toMatchObject({ kind: 'none' });
        expect(readMyRequest(['|turn|1'])).toMatchObject({ kind: 'none' });
    });

    it('reads team preview', () => {
        const result = readMyRequest([request({
            teamPreview: true,
            side: { pokemon: [{ details: 'Charizard, L50, M' }, { details: 'Garchomp, L50, F' }] },
        })]);
        expect(result).toMatchObject({ kind: 'teamPreview', teamSize: 2 });
    });

    it('reads the active Pokémon\'s moves', () => {
        const result = readMyRequest([request({
            active: [{ moves: [
                { move: 'Flamethrower', id: 'flamethrower', pp: 24, maxpp: 24, disabled: false },
                { move: 'Air Slash', id: 'airslash', pp: 15, maxpp: 24, disabled: true },
            ] }],
            side: { pokemon: [
                { details: 'Charizard, L50, M', condition: '153/153', active: true },
                { details: 'Garchomp, L50, F', condition: '183/183', active: false },
            ] },
        })]);

        expect(result.kind).toBe('move');
        expect(result.moves).toEqual([
            { slot: 1, name: 'Flamethrower', pp: 24, maxpp: 24, disabled: false },
            { slot: 2, name: 'Air Slash', pp: 15, maxpp: 24, disabled: true },
        ]);
        // The bench mon is switchable; the active one is not.
        expect(result.switches.map((s) => s.name)).toEqual(['Garchomp']);
    });

    it('excludes fainted Pokémon from the switch list', () => {
        const result = readMyRequest([request({
            active: [{ moves: [{ move: 'Surf' }] }],
            side: { pokemon: [
                { details: 'Blastoise, L50, F', condition: '186/186', active: true },
                { details: 'Pikachu, L50, M', condition: '0 fnt', active: false },
                { details: 'Snorlax, L50, M', condition: '200/220', active: false },
            ] },
        })]);
        expect(result.switches.map((s) => s.name)).toEqual(['Snorlax']);
    });

    it('reads a forced switch after a faint', () => {
        const result = readMyRequest([request({
            forceSwitch: [true],
            side: { pokemon: [
                { details: 'Charizard, L50, M', condition: '0 fnt', active: true },
                { details: 'Garchomp, L50, F', condition: '183/183', active: false },
            ] },
        })]);
        expect(result.kind).toBe('switch');
        expect(result.moves).toEqual([]);
        expect(result.switches.map((s) => s.name)).toEqual(['Garchomp']);
    });

    it('reports waiting on the opponent', () => {
        expect(readMyRequest([request({ wait: true, side: {} })])).toMatchObject({ kind: 'wait' });
    });

    it('uses only the most recent request', () => {
        const result = readMyRequest([
            request({ teamPreview: true, side: { pokemon: [] } }),
            request({ wait: true, side: {} }),
        ]);
        expect(result.kind).toBe('wait');
    });

    it('does not throw on malformed input', () => {
        expect(readMyRequest(['|request|{oops']).kind).toBe('none');
        expect(readMyRequest(['|request|']).kind).toBe('none');
    });
});

describe('describeLogLines', () => {
    it('renders a turn of battle in plain language', () => {
        const text = describeLogLines([
            '|turn|1',
            '|move|p1a: Charizard|Flamethrower|p2a: Blastoise',
            '|-resisted|p2a: Blastoise',
            '|-damage|p2a: Blastoise|137/186',
            '|-crit|p2a: Blastoise',
        ]).map((entry) => entry.text);

        expect(text).toEqual([
            'Turn 1',
            'Charizard used Flamethrower!',
            'It was not very effective…',
            'Blastoise is at 137/186.',
            'A critical hit!',
        ]);
    });

    it('reads a faint out of a damage line', () => {
        expect(describeLogLines(['|-damage|p1a: Charizard|0 fnt'])[0].text)
            .toBe('Charizard fainted!');
    });

    it('announces the winner', () => {
        expect(describeLogLines(['|win|Enzo'])[0]).toMatchObject({ kind: 'win', text: 'Enzo won the battle!' });
        expect(describeLogLines(['|tie'])[0].kind).toBe('win');
    });

    // Structural lines and anything unrecognised must not leak raw protocol.
    it('drops lines it does not understand', () => {
        expect(describeLogLines([
            '|t:|1785153490',
            '|gametype|singles',
            '|request|{"wait":true}',
            '|upkeep',
            '|something-new|whatever',
        ])).toEqual([]);
    });

    it('handles an empty log', () => {
        expect(describeLogLines()).toEqual([]);
        expect(describeLogLines([])).toEqual([]);
    });
});
