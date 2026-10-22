import { afterEach, describe, expect, it } from 'vitest';
import { fetchSharedTeam, fromFirestoreValue, sharedTeamFromDoc, sharedTeamIdFrom } from './sharedTeam.js';

const str = (v) => ({ stringValue: v });
const member = (id, name, types) => ({
    mapValue: { fields: { id: { integerValue: String(id) }, name: str(name), types: { arrayValue: { values: types.map(str) } } } },
});
const teamDoc = (name, members) => ({ fields: { name: str(name), pokemons: { arrayValue: { values: members } } } });

describe('sharedTeamIdFrom', () => {
    it('reads the page and the legacy builder link', () => {
        expect(sharedTeamIdFrom('/t/abc_123')).toBe('abc_123');
        expect(sharedTeamIdFrom('/t/abc/')).toBe('abc');
        expect(sharedTeamIdFrom('/builder', 'team=xyz')).toBe('xyz');
    });

    it('ignores other pages and anything that is not a Firestore id', () => {
        expect(sharedTeamIdFrom('/teams/abc')).toBeNull();
        expect(sharedTeamIdFrom('/pokedex', 'team=abc')).toBeNull();
        expect(sharedTeamIdFrom('/t/a%2Fb')).toBeNull();
        expect(sharedTeamIdFrom('/builder', 'team=%22%3E%3C')).toBeNull();
    });
});

describe('fromFirestoreValue / sharedTeamFromDoc', () => {
    it('turns REST values into plain data', () => {
        expect(fromFirestoreValue({ arrayValue: { values: [str('a'), { integerValue: '2' }] } })).toEqual(['a', 2]);
        expect(fromFirestoreValue({ mapValue: { fields: { x: { booleanValue: true } } } })).toEqual({ x: true });
    });

    it('keeps the name and up to six members, each with id, name and types', () => {
        const members = Array.from({ length: 7 }, (_, i) => member(i + 1, `mon-${i}`, ['fire']));
        const team = sharedTeamFromDoc(teamDoc('  Rain   team ', members));
        expect(team.name).toBe('Rain team');
        expect(team.pokemons).toHaveLength(6);
        expect(team.pokemons[0]).toEqual({ id: 1, name: 'mon-0', types: ['fire'], sprite: null });
    });

    it('refuses a document with no usable roster', () => {
        expect(sharedTeamFromDoc(teamDoc('x', []))).toBeNull();
        expect(sharedTeamFromDoc(null)).toBeNull();
    });
});

describe('fetchSharedTeam', () => {
    const env = { ...process.env };
    afterEach(() => { process.env = { ...env }; });

    it('reads the public document and resolves null on a miss', async () => {
        process.env.FIREBASE_PROJECT_ID = 'demo';
        let asked = '';
        const ok = await fetchSharedTeam('abc', {
            fetchImpl: async (url) => { asked = url; return { ok: true, json: async () => teamDoc('T', [member(6, 'charizard', ['fire', 'flying'])]) }; },
        });
        expect(asked).toContain('/projects/demo/databases/(default)/documents/artifacts/pokemonTeamBuilder/public/data/teams/abc');
        expect(ok).toMatchObject({ id: 'abc', name: 'T', pokemons: [{ id: 6 }] });
        expect(await fetchSharedTeam('abc', { fetchImpl: async () => ({ ok: false }) })).toBeNull();
        expect(await fetchSharedTeam('abc', { fetchImpl: async () => { throw new Error('down'); } })).toBeNull();
    });

    it('never asks for an id that is not one', async () => {
        process.env.FIREBASE_PROJECT_ID = 'demo';
        let called = false;
        await fetchSharedTeam('../x', { fetchImpl: async () => { called = true; return { ok: false }; } });
        expect(called).toBe(false);
    });
});
