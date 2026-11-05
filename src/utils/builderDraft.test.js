import { describe, it, expect } from 'vitest';
import { decodeDraft, encodeDraft, hasUnsavedDraft, withResolvedDetail } from './builderDraft';
import { teamSignature } from './teamDraft';

const member = (id, item = '') => ({
    id,
    name: `mon${id}`,
    types: ['water'],
    instanceId: `${id}-a`,
    moves: [{ name: 'surf' }],
    abilities: [{ name: 'torrent' }],
    customization: { item, moves: ['surf'] },
});

describe('hasUnsavedDraft', () => {
    it('is false for an empty builder and true for a team never saved', () => {
        expect(hasUnsavedDraft({ currentTeam: [] })).toBe(false);
        expect(hasUnsavedDraft({ currentTeam: [member(7)], teamName: '' })).toBe(true);
    });

    it('follows the saved baseline for a loaded team', () => {
        const team = [member(7)];
        const state = { currentTeam: team, teamName: 'Rain', editingTeamId: 't1', savedSignature: teamSignature('Rain', team) };
        expect(hasUnsavedDraft(state)).toBe(false);
        expect(hasUnsavedDraft({ ...state, teamName: 'Rain 2' })).toBe(true);
    });
});

describe('encodeDraft / decodeDraft', () => {
    it('keeps identity and build only, and round-trips to the same signature', () => {
        const team = [member(7, 'leftovers'), member(8)];
        const encoded = encodeDraft({ currentTeam: team, teamName: 'Rain', editingTeamId: null }, 'u1');
        expect(encoded.members[0].moves).toBeUndefined();
        expect(encoded.members[0].abilities).toBeUndefined();

        const decoded = decodeDraft(JSON.stringify(encoded), 'u1');
        expect(decoded.teamName).toBe('Rain');
        expect(teamSignature(decoded.teamName, decoded.currentTeam)).toBe(teamSignature('Rain', team));
    });

    it('stores nothing when there is nothing unsaved', () => {
        const team = [member(7)];
        expect(encodeDraft({ currentTeam: team, teamName: 'A', editingTeamId: 't', savedSignature: teamSignature('A', team) })).toBeNull();
    });

    it('refuses another account’s draft and malformed input', () => {
        const encoded = encodeDraft({ currentTeam: [member(7)], teamName: '' }, 'u1');
        expect(decodeDraft(encoded, 'u2')).toBeNull();
        expect(decodeDraft(encoded, null)).not.toBeNull();
        expect(decodeDraft('{nope', 'u1')).toBeNull();
        expect(decodeDraft({ v: 99, members: [] })).toBeNull();
    });
});

describe('withResolvedDetail', () => {
    it('lets the member’s build win over the detail record', () => {
        const light = { id: 7, name: 'squirtle', instanceId: 'x', customization: { item: 'a' } };
        const merged = withResolvedDetail(light, { id: 7, name: 'squirtle', moves: [{ name: 'surf' }], customization: { item: 'b' } });
        expect(merged.moves).toHaveLength(1);
        expect(merged.customization.item).toBe('a');
        expect(merged.instanceId).toBe('x');
    });
});
