import { describe, it, expect } from 'vitest';
import { normalizeSearchText, scoreMatch, prepareEntries, scoreDexNumber, searchGroups } from './globalSearch';

describe('normalizeSearchText', () => {
    it('folds case, accents and punctuation into single spaces', () => {
        expect(normalizeSearchText('Mr. Mime')).toBe('mr mime');
        expect(normalizeSearchText('mr-mime')).toBe('mr mime');
        expect(normalizeSearchText('Pokédex')).toBe('pokedex');
        expect(normalizeSearchText('  #025 ')).toBe('025');
    });
});

describe('scoreMatch', () => {
    it('ranks exact, then prefix (fewer extra words first), then word start, then substring', () => {
        const exact = scoreMatch('charizard', 'charizard');
        const prefixShort = scoreMatch('charmander', 'char');
        const prefixLong = scoreMatch('charizard mega x', 'char');
        const wordStart = scoreMatch('charizard mega x', 'mega');
        const substring = scoreMatch('pikachu', 'kach');
        expect(exact).toBeGreaterThan(prefixShort);
        expect(prefixShort).toBeGreaterThan(prefixLong);
        expect(prefixLong).toBeGreaterThan(wordStart);
        expect(wordStart).toBeGreaterThan(substring);
        expect(substring).toBeGreaterThan(0);
    });

    it('matches every typed word against the start of some word', () => {
        expect(scoreMatch('mr mime', 'mr mi')).toBeGreaterThan(0);
        expect(scoreMatch('tapu koko', 'koko tap')).toBeGreaterThan(0);
    });

    it('matches ignoring spaces as a last resort, and nothing else', () => {
        expect(scoreMatch('mr mime', 'mrmime')).toBeGreaterThan(0);
        expect(scoreMatch('bulbasaur', 'char')).toBe(0);
    });
});

describe('scoreDexNumber', () => {
    it('finds a Pokémon by number, padded or not', () => {
        expect(scoreDexNumber(25, '25')).toBe(100);
        expect(scoreDexNumber(25, '025')).toBe(100);
        expect(scoreDexNumber(251, '25')).toBe(50);
        expect(scoreDexNumber(25, 'pika')).toBe(0);
    });
});

describe('searchGroups', () => {
    const pokemon = prepareEntries(
        [
            { id: 6, name: 'charizard' },
            { id: 4, name: 'charmander' },
            { id: 10034, name: 'charizard-mega-x' },
            { id: 25, name: 'pikachu' },
        ],
        (p) => p.name,
    );
    const pages = prepareEntries(
        [{ key: 'calc', label: 'Calculadora de Dano', path: '/damage-calculator' }],
        (d) => d.label,
        (d) => [d.path],
    );
    const groups = [
        { key: 'pokemon', entries: pokemon, limit: 3, extraScore: (p, q) => scoreDexNumber(p.id, q), tiebreak: (a, b) => a.id - b.id },
        { key: 'pages', entries: pages, limit: 3 },
    ];

    it('returns groups in order, best match first, capped per group', () => {
        const result = searchGroups('charizard', groups);
        expect(result).toHaveLength(1);
        expect(result[0].results.map((p) => p.name)).toEqual(['charizard', 'charizard-mega-x']);
    });

    it('finds by dex number', () => {
        expect(searchGroups('#25', groups)[0].results[0].name).toBe('pikachu');
    });

    it('finds a destination by its route as well as its label', () => {
        expect(searchGroups('damage', groups).map((g) => g.key)).toEqual(['pages']);
        expect(searchGroups('dano', groups).map((g) => g.key)).toEqual(['pages']);
    });

    it('keeps a species line in dex order, forms after it', () => {
        const line = prepareEntries(
            [{ id: 6, name: 'charizard' }, { id: 10034, name: 'charizard-mega-x' }, { id: 5, name: 'charmeleon' }, { id: 4, name: 'charmander' }],
            (p) => p.name,
        );
        const result = searchGroups('char', [{ key: 'pokemon', entries: line, limit: 4, tiebreak: (a, b) => a.id - b.id }]);
        expect(result[0].results.map((p) => p.id)).toEqual([4, 5, 6, 10034]);
    });

    it('lets a boost lead with Pokémon over an equally good move', () => {
        const mixed = [
            { key: 'moves', entries: prepareEntries([{ name: 'charm' }], (m) => m.name), limit: 3 },
            { key: 'pokemon', entries: prepareEntries([{ id: 4, name: 'charmander' }], (p) => p.name), limit: 3, boost: 8 },
        ];
        expect(searchGroups('char', mixed).map((g) => g.key)).toEqual(['pokemon', 'moves']);
        // An exact move name still wins.
        expect(searchGroups('charm', mixed).map((g) => g.key)).toEqual(['moves', 'pokemon']);
    });

    it('puts the group with the strongest hit first', () => {
        const withMeta = [
            { key: 'pokemon', entries: prepareEntries([{ id: 376, name: 'metagross' }], (p) => p.name), limit: 3 },
            { key: 'pages', entries: prepareEntries([{ label: 'Meta' }], (d) => d.label), limit: 3 },
        ];
        expect(searchGroups('meta', withMeta).map((g) => g.key)).toEqual(['pages', 'pokemon']);
        expect(searchGroups('metag', withMeta).map((g) => g.key)).toEqual(['pokemon']);
    });

    it('returns nothing for an empty query', () => {
        expect(searchGroups('   ', groups)).toEqual([]);
    });
});
