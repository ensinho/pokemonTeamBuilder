import { describe, it, expect } from 'vitest';
import { buildDuplicateTeamName, buildDuplicateTeamPayload } from './teamDuplication';

describe('buildDuplicateTeamName', () => {
    it('appends the copy suffix when the name is free', () => {
        expect(buildDuplicateTeamName('Rain Team', ['Rain Team'])).toBe('Rain Team (copy)');
    });

    it('counts up while copies already exist', () => {
        const taken = ['Rain Team', 'Rain Team (copy)', 'Rain Team (copy 2)'];
        expect(buildDuplicateTeamName('Rain Team', taken)).toBe('Rain Team (copy 3)');
    });

    it('does not stack suffixes when duplicating a duplicate', () => {
        expect(buildDuplicateTeamName('Rain Team (copy)', ['Rain Team (copy)'])).toBe('Rain Team (copy 2)');
    });

    it('treats collisions case-insensitively', () => {
        expect(buildDuplicateTeamName('Rain Team', ['rain team (COPY)'])).toBe('Rain Team (copy 2)');
    });

    it('uses the portuguese copy word', () => {
        expect(buildDuplicateTeamName('Time da Chuva', [], 'pt')).toBe('Time da Chuva (cópia)');
        expect(buildDuplicateTeamName('Time da Chuva (cópia)', ['Time da Chuva (cópia)'], 'pt'))
            .toBe('Time da Chuva (cópia 2)');
    });

    it('falls back to a generic base for a blank name', () => {
        expect(buildDuplicateTeamName('   ', [])).toBe('Team (copy)');
        expect(buildDuplicateTeamName('', [], 'pt')).toBe('Time (cópia)');
    });

    it('keeps the result within the length budget by trimming the base, not the suffix', () => {
        const long = 'A'.repeat(90);
        const result = buildDuplicateTeamName(long, []);
        expect(result.length).toBeLessThanOrEqual(60);
        expect(result.endsWith(' (copy)')).toBe(true);
    });

    it('ignores non-string entries in the taken list', () => {
        expect(buildDuplicateTeamName('Rain Team', [null, undefined, 42])).toBe('Rain Team (copy)');
    });
});

describe('buildDuplicateTeamPayload', () => {
    const now = '2026-08-26T12:00:00.000Z';

    it('copies the roster and resets ownership metadata', () => {
        const team = {
            id: 'source-id',
            name: 'Rain Team',
            pokemons: [{ id: 9, instanceId: 'a' }],
            isFavorite: true,
            createdAt: '2020-01-01T00:00:00.000Z',
            updatedAt: '2020-01-02T00:00:00.000Z',
        };

        expect(buildDuplicateTeamPayload(team, 'Rain Team (copy)', now)).toEqual({
            name: 'Rain Team (copy)',
            pokemons: [{ id: 9, instanceId: 'a' }],
            isFavorite: false,
            createdAt: now,
            updatedAt: now,
        });
    });

    it('never writes the source document id into the copy', () => {
        const payload = buildDuplicateTeamPayload({ id: 'source-id', pokemons: [] }, 'X', now);
        expect(payload).not.toHaveProperty('id');
    });

    it('tolerates a team with no roster', () => {
        expect(buildDuplicateTeamPayload({}, 'X', now).pokemons).toEqual([]);
    });
});
