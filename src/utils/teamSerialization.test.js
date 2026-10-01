import { describe, it, expect } from 'vitest';
import { newInstanceId, serializeCustomization, stripUndefined, withUniqueInstanceIds } from './teamSerialization';

describe('newInstanceId', () => {
    it('never repeats within the same millisecond', () => {
        const ids = new Set(Array.from({ length: 6 }, () => newInstanceId(25)));
        expect(ids.size).toBe(6);
    });

    it('works without a Pokémon id', () => {
        expect(newInstanceId(undefined)).toMatch(/^x-/);
    });
});

describe('withUniqueInstanceIds', () => {
    it('gives six members that share no id six different ids', () => {
        const team = Array.from({ length: 6 }, () => ({ id: 25 }));
        const ids = withUniqueInstanceIds(team).map((m) => m.instanceId);
        expect(new Set(ids).size).toBe(6);
        expect(ids.every(Boolean)).toBe(true);
    });

    it('replaces only the repeats of a shared id', () => {
        const team = [{ id: 1, instanceId: 'a' }, { id: 2, instanceId: 'a' }, { id: 3, instanceId: 'b' }];
        const out = withUniqueInstanceIds(team);
        expect(out[0]).toBe(team[0]);
        expect(out[1].instanceId).not.toBe('a');
        expect(out[2]).toBe(team[2]);
    });

    it('regenerates every id on request and drops empty slots', () => {
        const out = withUniqueInstanceIds([{ id: 1, instanceId: 'a' }, null], { regenerate: true });
        expect(out).toHaveLength(1);
        expect(out[0].instanceId).not.toBe('a');
    });
});

describe('stripUndefined', () => {
    it('removes undefined at any depth and keeps null', () => {
        expect(stripUndefined({ a: undefined, b: null, c: { d: undefined, e: [1, undefined, { f: undefined }] } }))
            .toEqual({ b: null, c: { e: [1, {}] } });
    });
});

describe('serializeCustomization', () => {
    it('writes full spreads and at most four distinct moves', () => {
        const out = serializeCustomization({
            item: undefined,
            moves: ['tackle', { name: 'growl' }, 'tackle', '', 'ember', 'surf', 'fly'],
            evs: { spa: 252 },
        });
        expect(out).not.toHaveProperty('item');
        expect(out.moves).toEqual(['tackle', 'growl', 'ember', 'surf']);
        expect(out.evs['special-attack']).toBe(252);
        expect(out.ivs.speed).toBe(31);
    });
});
