import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { forgetCachedLog, readCachedLog, writeCachedLog } from './battleLogCache';
import { asViewer, flattenRounds, opponentRoster, simNameOf } from './pvpView';
import { readBattleField } from './battleState';
import { toTimeline } from './battleTimeline';

// Gary's own stream (he is p2: he accepted Ash's challenge), as the sim sends it.
const GARY = [
    '|player|p1|Ash||',
    '|player|p2|Gary||',
    '|teamsize|p1|2',
    '|teamsize|p2|2',
    '|start',
    '|switch|p1a: Garchomp|Garchomp, L50, M|100/100',
    '|switch|p2a: Pikachu|Pikachu, L50, F|110/110',
    '|turn|1',
    '|move|p1a: Garchomp|Stealth Rock|p2a: Pikachu',
    '|-sidestart|p2: Gary|move: Stealth Rock',
    '|move|p2a: Pikachu|Thunderbolt|p1a: Garchomp',
    '|-immune|p1a: Garchomp',
    '|move|p1a: Garchomp|Earthquake|p2a: Pikachu',
    '|-damage|p1a: Garchomp|90/100|[from] ability: Static|[of] p2a: Pikachu',
    '|-damage|p2a: Pikachu|0 fnt',
    '|faint|p2a: Pikachu',
    '|request|{"forceSwitch":[true],"side":{"name":"Gary","id":"p2","pokemon":[{"ident":"p2: Pikachu","details":"Pikachu, L50, F","condition":"0 fnt","active":true},{"ident":"p2: Lucario","details":"Lucario, L50, M","condition":"140/140","active":false}]}}',
];

describe('asViewer', () => {
    it('leaves the challenger\'s log alone', () => {
        expect(asViewer(GARY, 'p1')).toBe(GARY);
    });

    it('makes the trainer who accepted p1, field by field', () => {
        const lines = asViewer(GARY, 'p2');
        expect(lines[0]).toBe('|player|p2|Ash||');
        expect(lines[1]).toBe('|player|p1|Gary||');
        expect(lines[5]).toBe('|switch|p2a: Garchomp|Garchomp, L50, M|100/100');
        expect(lines[9]).toBe('|-sidestart|p1: Gary|move: Stealth Rock');
        expect(lines[13]).toBe('|-damage|p2a: Garchomp|90/100|[from] ability: Static|[of] p1a: Pikachu');
        // Nicknames, HP, moves and the format line untouched.
        expect(lines[10]).toBe('|move|p1a: Pikachu|Thunderbolt|p2a: Garchomp');
    });

    it('rewrites the request so the sheet and the commands read p1', () => {
        const request = JSON.parse(asViewer(GARY, 'p2').at(-1).slice('|request|'.length));
        expect(request.side.id).toBe('p1');
        expect(request.side.pokemon.map((mon) => mon.ident)).toEqual(['p1: Pikachu', 'p1: Lucario']);
        expect(request.forceSwitch).toEqual([true]);
    });

    it('feeds the challenge readers the right sides', () => {
        const lines = asViewer(GARY, 'p2');
        const field = readBattleField(lines);
        expect(field.mySide).toBe('p1');
        expect(field.mine.active.species).toBe('Pikachu');
        expect(field.theirs.active.species).toBe('Garchomp');
        const faint = toTimeline(lines).find((event) => event.type === 'faint');
        expect(faint.side).toBe('p1');
    });
});

describe('opponentRoster', () => {
    it('reveals the opponent\'s Pokémon in the order they came out', () => {
        const roster = opponentRoster(asViewer(GARY, 'p1'));
        expect(roster).toHaveLength(2);
        expect(roster[0]).toMatchObject({ species: 'Pikachu', revealed: true, fainted: true });
        expect(roster[1]).toMatchObject({ species: null, revealed: false, wildcard: true });
    });

    it('is empty before the teams are announced', () => {
        expect(opponentRoster([])).toEqual([]);
    });
});

describe('simNameOf / flattenRounds', () => {
    it('reads a side\'s sim name', () => {
        expect(simNameOf(GARY, 'p2')).toBe('Gary');
        expect(simNameOf([], 'p2')).toBeNull();
    });

    it('joins rounds in order and stops at the first gap', () => {
        const rounds = new Map([[1, ['b']], [0, ['a']], [3, ['d']]]);
        expect(flattenRounds(rounds)).toEqual({ lines: ['a', 'b'], upTo: 2 });
    });
});

describe('battleLogCache', () => {
    const store = new Map();
    beforeEach(() => {
        store.clear();
        vi.stubGlobal('localStorage', {
            getItem: (k) => (store.has(k) ? store.get(k) : null),
            setItem: (k, v) => store.set(k, String(v)),
            removeItem: (k) => store.delete(k),
            key: (i) => [...store.keys()][i] ?? null,
            get length() { return store.size; },
        });
    });
    afterEach(() => vi.unstubAllGlobals());

    it('round-trips a log per account and battle', () => {
        expect(writeCachedLog('u1', 'b1', { lines: ['|turn|1'], upTo: 1 })).toBe(true);
        expect(readCachedLog('u1', 'b1')).toEqual({ lines: ['|turn|1'], upTo: 1 });
        expect(readCachedLog('u2', 'b1')).toBeNull();
        forgetCachedLog('u1', 'b1');
        expect(readCachedLog('u1', 'b1')).toBeNull();
    });

    it('keeps only the newest battles', () => {
        for (let i = 0; i < 12; i += 1) writeCachedLog('u1', `b${i}`, { lines: ['x'], upTo: 1 });
        expect([...store.keys()].length).toBe(8);
        expect(readCachedLog('u1', 'b11')).not.toBeNull();
    });

    it('never throws when storage is unavailable', () => {
        vi.stubGlobal('localStorage', { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } });
        expect(readCachedLog('u1', 'b1')).toBeNull();
        expect(writeCachedLog('u1', 'b1', { lines: ['x'], upTo: 1 })).toBe(false);
    });
});
