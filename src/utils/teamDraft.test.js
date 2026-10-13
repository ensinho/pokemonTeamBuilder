import { describe, it, expect } from 'vitest';
import { teamSignature, prettyPokemonName, uniqueTeamName } from './teamDraft';

const member = (id, build) => ({ id, instanceId: `${id}-x`, customization: build });

describe('teamSignature', () => {
    it('ignores key order inside a build (Firestore does not keep it)', () => {
        const a = teamSignature('Rain', [member(7, { item: 'leftovers', evs: { hp: 4, speed: 252 } })]);
        const b = teamSignature('Rain', [member(7, { evs: { speed: 252, hp: 4 }, item: 'leftovers' })]);
        expect(a).toBe(b);
    });

    it('changes when a build, the order or the name changes', () => {
        const base = teamSignature('Rain', [member(7, { item: 'leftovers' }), member(8, {})]);
        expect(teamSignature('Rain', [member(7, { item: 'choice-scarf' }), member(8, {})])).not.toBe(base);
        expect(teamSignature('Rain', [member(8, {}), member(7, { item: 'leftovers' })])).not.toBe(base);
        expect(teamSignature('Sun', [member(7, { item: 'leftovers' }), member(8, {})])).not.toBe(base);
    });

    it('treats surrounding spaces in the name and undefined fields as no change', () => {
        expect(teamSignature(' Rain ', [member(7, { item: 'x', tera: undefined })]))
            .toBe(teamSignature('Rain', [member(7, { item: 'x' })]));
    });
});

describe('prettyPokemonName', () => {
    it('title-cases hyphenated slugs', () => {
        expect(prettyPokemonName('iron-valiant')).toBe('Iron Valiant');
        expect(prettyPokemonName('pikachu')).toBe('Pikachu');
    });
});

describe('uniqueTeamName', () => {
    it('keeps a free name and numbers a taken one', () => {
        expect(uniqueTeamName('Pikachu team', ['Rain'])).toBe('Pikachu team');
        expect(uniqueTeamName('Pikachu team', ['pikachu team ', 'Pikachu team 2'])).toBe('Pikachu team 3');
    });
});

describe('buildSignature', () => {
    it('is the same build whatever the key order, different when a value changes', async () => {
        const { buildSignature } = await import('./teamDraft');
        expect(buildSignature({ item: 'x', evs: { hp: 4, speed: 252 } })).toBe(buildSignature({ evs: { speed: 252, hp: 4 }, item: 'x' }));
        expect(buildSignature({ item: 'x' })).not.toBe(buildSignature({ item: 'y' }));
        expect(buildSignature(undefined)).toBe(buildSignature({}));
    });
});
