import { describe, it, expect } from 'vitest';
import { pickBestState, migrateLocalProgress, listLocalSuffixesForUid, ppLocalKey } from './pokePuzzleMigration';

// Minimal in-memory localStorage stand-in for the pure tests.
const makeStorage = (initial = {}) => {
    const map = new Map(Object.entries(initial));
    return {
        get length() { return map.size; },
        key(i) { return Array.from(map.keys())[i] ?? null; },
        getItem(k) { return map.has(k) ? map.get(k) : null; },
        setItem(k, v) { map.set(k, String(v)); },
        removeItem(k) { map.delete(k); },
        _dump() { return Object.fromEntries(map); },
    };
};

const won = (n, t = '2026-06-17T10:00:00Z') => JSON.stringify({ guesses: Array(n).fill('x'), gameStatus: 'WON', targetId: 1, updatedAt: t });
const inProg = (n, t = '2026-06-17T10:00:00Z') => JSON.stringify({ guesses: Array(n).fill('x'), gameStatus: 'IN_PROGRESS', targetId: 1, updatedAt: t });

describe('pickBestState', () => {
    it('prefers a finished game over an in-progress one', () => {
        const finished = { gameStatus: 'WON', guesses: ['a', 'b'] };
        const ongoing = { gameStatus: 'IN_PROGRESS', guesses: ['a', 'b', 'c', 'd'] };
        expect(pickBestState(ongoing, finished)).toBe(finished);
        expect(pickBestState(finished, ongoing)).toBe(finished);
    });

    it('prefers more guesses among same finished/unfinished state', () => {
        const few = { gameStatus: 'IN_PROGRESS', guesses: ['a'] };
        const more = { gameStatus: 'IN_PROGRESS', guesses: ['a', 'b', 'c'] };
        expect(pickBestState(few, more)).toBe(more);
    });

    it('returns incoming when existing is missing', () => {
        const incoming = { gameStatus: 'WON', guesses: ['a'] };
        expect(pickBestState(null, incoming)).toBe(incoming);
    });

    it('breaks ties by newer updatedAt', () => {
        const older = { gameStatus: 'WON', guesses: ['a'], updatedAt: '2026-06-17T08:00:00Z' };
        const newer = { gameStatus: 'WON', guesses: ['a'], updatedAt: '2026-06-17T12:00:00Z' };
        expect(pickBestState(older, newer)).toBe(newer);
        expect(pickBestState(newer, older)).toBe(newer);
    });
});

describe('listLocalSuffixesForUid', () => {
    it('lists only suffixes for the given uid', () => {
        const s = makeStorage({
            [ppLocalKey('anon123', 'ongoing')]: inProg(2),
            [ppLocalKey('anon123', 'daily:2026-6-17')]: won(4),
            [ppLocalKey('acct999', 'ongoing')]: inProg(1),
            'unrelated:key': 'x',
        });
        const suffixes = listLocalSuffixesForUid('anon123', s).sort();
        expect(suffixes).toEqual(['daily:2026-6-17', 'ongoing']);
    });
});

describe('migrateLocalProgress', () => {
    it('moves anonymous progress onto an empty account namespace and clears the source', () => {
        const s = makeStorage({
            [ppLocalKey('anon', 'daily:2026-6-17')]: won(4),
            [ppLocalKey('anon', 'ongoing')]: inProg(2),
        });
        const migrated = migrateLocalProgress('anon', 'acct', s).sort();
        expect(migrated).toEqual(['daily:2026-6-17', 'ongoing']);

        // Source cleared
        expect(s.getItem(ppLocalKey('anon', 'daily:2026-6-17'))).toBeNull();
        expect(s.getItem(ppLocalKey('anon', 'ongoing'))).toBeNull();

        // Destination has the data
        expect(JSON.parse(s.getItem(ppLocalKey('acct', 'daily:2026-6-17'))).gameStatus).toBe('WON');
    });

    it('keeps the account game when it is further along', () => {
        const s = makeStorage({
            [ppLocalKey('anon', 'daily:2026-6-17')]: inProg(2),
            [ppLocalKey('acct', 'daily:2026-6-17')]: won(5),
        });
        migrateLocalProgress('anon', 'acct', s);
        expect(JSON.parse(s.getItem(ppLocalKey('acct', 'daily:2026-6-17'))).gameStatus).toBe('WON');
    });

    it('surfaces an anonymous win over an in-progress account game', () => {
        const s = makeStorage({
            [ppLocalKey('anon', 'daily:2026-6-17')]: won(3),
            [ppLocalKey('acct', 'daily:2026-6-17')]: inProg(4),
        });
        migrateLocalProgress('anon', 'acct', s);
        const result = JSON.parse(s.getItem(ppLocalKey('acct', 'daily:2026-6-17')));
        expect(result.gameStatus).toBe('WON');
        expect(result.guesses.length).toBe(3);
    });

    it('skips the derived daily:summary key', () => {
        const s = makeStorage({
            [ppLocalKey('anon', 'daily:summary')]: JSON.stringify({ solved: true }),
        });
        const migrated = migrateLocalProgress('anon', 'acct', s);
        expect(migrated).toEqual([]);
        // summary still removed from source though
        expect(s.getItem(ppLocalKey('anon', 'daily:summary'))).toBeNull();
    });

    it('no-ops when uids match or are missing', () => {
        const s = makeStorage({ [ppLocalKey('anon', 'ongoing')]: inProg(2) });
        expect(migrateLocalProgress('anon', 'anon', s)).toEqual([]);
        expect(migrateLocalProgress(null, 'acct', s)).toEqual([]);
        expect(s.getItem(ppLocalKey('anon', 'ongoing'))).not.toBeNull();
    });
});
