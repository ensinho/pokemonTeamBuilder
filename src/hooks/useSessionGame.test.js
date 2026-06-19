import { describe, it, expect } from 'vitest';
import { reducer, emptySession, __test } from './useSessionGame';

const { parseKey, firestoreDocId, localSuffix } = __test;

describe('sessionKey helpers', () => {
    it('parses daily and ongoing keys', () => {
        expect(parseKey('daily:2026-6-18')).toEqual({ mode: 'daily', date: '2026-6-18' });
        expect(parseKey('ongoing')).toEqual({ mode: 'ongoing', date: null });
    });
    it('maps keys to firestore docIds', () => {
        expect(firestoreDocId('daily:2026-6-18')).toBe('daily_2026-6-18');
        expect(firestoreDocId('ongoing')).toBe('ongoing');
    });
    it('maps keys to localStorage suffixes', () => {
        expect(localSuffix('daily:2026-6-18')).toBe('daily:2026-6-18');
        expect(localSuffix('ongoing')).toBe('ongoing');
    });
});

describe('reducer race guards', () => {
    const start = (key) => reducer(emptySession(), { type: 'LOAD_START', key });

    it('LOAD_START wipes to a clean LOADING state for the new key', () => {
        const prev = { ...emptySession(), status: 'READY', key: 'daily:2026-6-17', guesses: ['pawniard'], gameStatus: 'WON', target: { id: 624 } };
        const next = reducer(prev, { type: 'LOAD_START', key: 'daily:2026-6-18' });
        expect(next.status).toBe('LOADING');
        expect(next.key).toBe('daily:2026-6-18');
        expect(next.guesses).toEqual([]);          // old guesses gone
        expect(next.gameStatus).toBe('IN_PROGRESS');
        expect(next.target).toBeNull();            // old target gone
    });

    it('REJECTS a LOAD_READY whose key does not match the loading session', () => {
        // We are loading 6-18, but a slow read for 6-17 resolves late.
        const loading = start('daily:2026-6-18');
        const stale = reducer(loading, {
            type: 'LOAD_READY', key: 'daily:2026-6-17',
            target: { id: 624, name: 'pawniard' }, guesses: ['pawniard'], gameStatus: 'WON',
        });
        // Unchanged — the stale 6-17 result is ignored.
        expect(stale).toBe(loading);
        expect(stale.status).toBe('LOADING');
        expect(stale.target).toBeNull();
    });

    it('ACCEPTS a LOAD_READY for the matching key', () => {
        const loading = start('daily:2026-6-18');
        const ready = reducer(loading, {
            type: 'LOAD_READY', key: 'daily:2026-6-18',
            target: { id: 623, name: 'golurk' }, guesses: [], gameStatus: 'IN_PROGRESS',
        });
        expect(ready.status).toBe('READY');
        expect(ready.target.name).toBe('golurk');
        expect(ready.guesses).toEqual([]);
    });

    it('ignores progress mutations when not READY', () => {
        const loading = start('daily:2026-6-18');
        expect(reducer(loading, { type: 'ADD_GUESS', name: 'x' })).toBe(loading);
        expect(reducer(loading, { type: 'SET_STATUS', gameStatus: 'WON' })).toBe(loading);
    });

    it('applies guesses and status only while READY', () => {
        let s = reducer(start('ongoing'), { type: 'LOAD_READY', key: 'ongoing', target: { id: 1, name: 'bulbasaur' } });
        s = reducer(s, { type: 'ADD_GUESS', name: 'ivysaur' });
        expect(s.guesses).toEqual(['ivysaur']);
        s = reducer(s, { type: 'SET_STATUS', gameStatus: 'WON' });
        expect(s.gameStatus).toBe('WON');
    });

    it('rejects late DETAILS_LOADED for a superseded key', () => {
        const ready = reducer(start('daily:2026-6-18'), {
            type: 'LOAD_READY', key: 'daily:2026-6-18', target: { id: 623, name: 'golurk' },
        });
        const staleDetails = reducer(ready, {
            type: 'DETAILS_LOADED', key: 'daily:2026-6-17', details: { types: ['dark'] },
        });
        expect(staleDetails).toBe(ready);            // ignored
        expect(staleDetails.details).toBeNull();
    });
});
