import { describe, it, expect } from 'vitest';
import {
    buildBaseIdLookup,
    dedupeBySpecies,
    findDuplicateSpecies,
    hasDuplicateSpecies,
    speciesIdOf,
    withoutDuplicateSharedTeams,
    wouldDuplicateSpecies,
} from './teamUniqueness';

const index = [
    { id: 6, name: 'charizard' },
    { id: 10034, name: 'charizard-mega-x', baseId: 6 },
    { id: 479, name: 'rotom' },
    { id: 10009, name: 'rotom-wash', baseId: 479 },
    { id: 25, name: 'pikachu' },
];
const baseIdOf = buildBaseIdLookup(index);

describe('buildBaseIdLookup', () => {
    it('maps a form id to its species and knows nothing of base ids', () => {
        expect(baseIdOf(10009)).toBe(479);
        expect(baseIdOf(479)).toBeNull();
        expect(baseIdOf('junk')).toBeNull();
    });

    it('tolerates a missing index', () => {
        expect(buildBaseIdLookup(undefined)(6)).toBeNull();
    });
});

describe('speciesIdOf', () => {
    it('prefers a stamped speciesId over the index', () => {
        expect(speciesIdOf({ id: 10009, speciesId: 479 }, () => null)).toBe(479);
    });

    it('falls back to the index, then to the id itself', () => {
        expect(speciesIdOf({ id: 10034 }, baseIdOf)).toBe(6);
        expect(speciesIdOf({ id: 25 }, baseIdOf)).toBe(25);
    });

    it('returns null for a member with no usable id', () => {
        expect(speciesIdOf({ name: 'missingno' }, baseIdOf)).toBeNull();
        expect(speciesIdOf(null, baseIdOf)).toBeNull();
    });
});

describe('findDuplicateSpecies', () => {
    it('treats a form as its base species', () => {
        const groups = findDuplicateSpecies([
            { id: 6, name: 'Charizard' },
            { id: 25, name: 'Pikachu' },
            { id: 10034, name: 'Mega Charizard X' },
        ], baseIdOf);
        expect(groups).toEqual([{ speciesId: 6, indexes: [0, 2], names: ['Charizard', 'Mega Charizard X'] }]);
    });

    it('reports six copies of the same Pokémon as one group', () => {
        const team = Array.from({ length: 6 }, () => ({ id: 25, name: 'Pikachu' }));
        const groups = findDuplicateSpecies(team, baseIdOf);
        expect(groups).toHaveLength(1);
        expect(groups[0].indexes).toEqual([0, 1, 2, 3, 4, 5]);
    });

    it('ignores slots without an id', () => {
        expect(hasDuplicateSpecies([{ name: 'a' }, { name: 'b' }], baseIdOf)).toBe(false);
    });
});

describe('dedupeBySpecies', () => {
    it('keeps the first of each species and reports the rest', () => {
        const team = [{ id: 479, name: 'Rotom' }, { id: 25 }, { id: 10009, name: 'Rotom-Wash' }];
        const { unique, dropped } = dedupeBySpecies(team, baseIdOf);
        expect(unique.map((m) => m.id)).toEqual([479, 25]);
        expect(dropped.map((m) => m.name)).toEqual(['Rotom-Wash']);
    });
});

describe('wouldDuplicateSpecies', () => {
    it('refuses a form of a species already on the team', () => {
        expect(wouldDuplicateSpecies([{ id: 479 }], { id: 10009 }, baseIdOf)).toBe(true);
        expect(wouldDuplicateSpecies([{ id: 479 }], { id: 25 }, baseIdOf)).toBe(false);
    });

    it('lets a candidate with no id through', () => {
        expect(wouldDuplicateSpecies([{ id: 25 }], {}, baseIdOf)).toBe(false);
    });
});

describe('withoutDuplicateSharedTeams', () => {
    const repeated = { pokemons: [{ id: 25 }, { id: 25 }] };

    it('keeps the post but drops a repeated-Pokémon team attachment', () => {
        const [message] = withoutDuplicateSharedTeams([{ text: 'look', sharedTeam: repeated }], baseIdOf);
        expect(message).toEqual({ text: 'look', sharedTeam: null });
    });

    it('removes a post that was only that team', () => {
        expect(withoutDuplicateSharedTeams([{ text: '  ', sharedTeam: repeated }], baseIdOf)).toEqual([]);
    });

    it('leaves a legal team alone', () => {
        const message = { text: '', sharedTeam: { pokemons: [{ id: 25 }, { id: 6 }] } };
        expect(withoutDuplicateSharedTeams([message], baseIdOf)).toEqual([message]);
    });
});
