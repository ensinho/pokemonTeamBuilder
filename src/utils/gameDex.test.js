import { describe, it, expect } from 'vitest';
import { buildGameSections } from './gameDex';

// Minimal index: three base species from different generations plus one Mega and
// one hypothetical (project-added) Mega, which must never reach a real game's dex.
const index = [
    { id: 1, name: 'bulbasaur', apiName: 'bulbasaur', generation: 'generation-i', types: ['grass'] },
    { id: 3, name: 'venusaur', apiName: 'venusaur', generation: 'generation-i', types: ['grass'] },
    { id: 906, name: 'sprigatito', apiName: 'sprigatito', generation: 'generation-ix', types: ['grass'] },
    { id: 10033, name: 'venusaur-mega', apiName: 'venusaur-mega', baseId: 3, isForm: true, generation: 'generation-vi', types: ['grass'] },
    { id: 10999, name: 'sprigatito-mega', apiName: 'sprigatito-mega', baseId: 906, isForm: true, generation: 'generation-ix', types: ['grass'] },
];

const dexes = [{ key: 'champions', name: 'Champions', speciesIds: [3, 906] }];

describe('buildGameSections', () => {
    it('appends a National section for an ordinary game', () => {
        const sections = buildGameSections({
            fullIndex: index,
            gameDexes: dexes,
            game: { generation: 'generation-ix', formSuffixes: [] },
        });
        expect(sections.map((s) => s.key)).toEqual(['champions', 'national']);
        // Bulbasaur is not in the sub-dex but is obtainable by gen IX.
        expect(sections[1].mons.map((m) => m.id)).toEqual([1]);
    });

    it('omits the National section for a closed-roster game', () => {
        const sections = buildGameSections({
            fullIndex: index,
            gameDexes: dexes,
            game: { generation: 'generation-ix', formSuffixes: [], closedRoster: true },
        });
        expect(sections.map((s) => s.key)).toEqual(['champions']);
        expect(sections[0].mons.map((m) => m.id)).not.toContain(1);
    });

    it('inlines an official Mega under its base species but drops a hypothetical one', () => {
        const [section] = buildGameSections({
            fullIndex: index,
            gameDexes: dexes,
            game: { generation: 'generation-ix', formSuffixes: ['mega'], closedRoster: true },
        });
        expect(section.mons.map((m) => m.id)).toEqual([3, 10033, 906]);
    });

    it('returns nothing without a dex or an index', () => {
        expect(buildGameSections({ fullIndex: index, gameDexes: null, game: {} })).toEqual([]);
        expect(buildGameSections({ fullIndex: [], gameDexes: dexes, game: {} })).toEqual([]);
    });
});
