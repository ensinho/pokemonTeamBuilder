import { describe, it, expect } from 'vitest';

import {
    cutoffLabel,
    filterRows,
    groupFormats,
    isRegulation,
    ladderPairs,
    regulationsOf,
    resolveCutoff,
    searchFormats,
    sortRows,
    usageRows,
} from './metaFormats';

const FORMATS = [
    { id: 'gen9championsvgc2026regmb', label: 'VGC Reg M-B', group: 'Pokémon Champions', kind: 'vgc' },
    { id: 'gen9vgc2026regi', label: 'VGC 2026 Reg I', group: 'Scarlet & Violet', kind: 'vgc' },
    { id: 'gen9ou', label: 'OU', group: 'SV Singles', kind: 'tier' },
    { id: 'gen9uu', label: 'UU', group: 'SV Singles', kind: 'tier' },
    { id: 'gen9doublesou', label: 'Doubles OU', group: 'SV Doubles', kind: 'tier' },
];

// One format's baked file: a detail set at 1695 plus two cutoff ranking tables.
const DATA = {
    detailCutoff: 1695,
    byId: {
        984: { name: 'Great Tusk', usage: 35.1, rawCount: 412356, winRate: 54 },
        645: { name: 'Landorus-Therian', usage: 28.4, rawCount: 331200 },
    },
    cutoffs: {
        0: { totalBattles: 900, byId: { 645: { name: 'Landorus-Therian', usage: 30.2, rawCount: 500 }, 25: { name: 'Pikachu', usage: 4.1, rawCount: 60 } } },
        1695: { totalBattles: 500, byId: { 984: { name: 'Great Tusk', usage: 35.1, rawCount: 412356 }, 645: { name: 'Landorus-Therian', usage: 28.4, rawCount: 331200 } } },
    },
};

describe('format kinds', () => {
    it('treats a missing kind as a regulation, so pre-tier files keep working', () => {
        expect(isRegulation({ id: 'gen9vgc2026regi' })).toBe(true);
        expect(isRegulation({ id: 'gen9ou', kind: 'tier' })).toBe(false);
    });

    it('keeps the builder regulation list to the VGC ladders', () => {
        expect(regulationsOf(FORMATS).map((f) => f.id)).toEqual(['gen9championsvgc2026regmb', 'gen9vgc2026regi']);
    });
});

describe('groupFormats', () => {
    it('buckets by group in catalog order', () => {
        expect(groupFormats(FORMATS).map((g) => g.name)).toEqual([
            'Pokémon Champions', 'Scarlet & Violet', 'SV Singles', 'SV Doubles',
        ]);
        expect(groupFormats(FORMATS)[2].items.map((f) => f.label)).toEqual(['OU', 'UU']);
    });
});

describe('searchFormats', () => {
    it('matches the label', () => {
        expect(searchFormats(FORMATS, 'doubles').map((f) => f.id)).toEqual(['gen9doublesou']);
    });

    it('matches the raw Smogon id and the group', () => {
        expect(searchFormats(FORMATS, 'gen9ou').map((f) => f.id)).toEqual(['gen9ou']);
        expect(searchFormats(FORMATS, 'champions')).toHaveLength(1);
    });

    it('returns everything for an empty query', () => {
        expect(searchFormats(FORMATS, '  ')).toHaveLength(FORMATS.length);
    });
});

describe('resolveCutoff', () => {
    const cutoffs = [0, 1500, 1695];

    it('honours a published request, including one arriving as a URL string', () => {
        expect(resolveCutoff('1500', cutoffs, 1695)).toBe(1500);
        expect(resolveCutoff(0, cutoffs, 1695)).toBe(0);
    });

    it('falls back to the detail cutoff when the request is unpublished or absent', () => {
        expect(resolveCutoff('9999', cutoffs, 1695)).toBe(1695);
        expect(resolveCutoff(null, cutoffs, 1695)).toBe(1695);
    });

    it('falls back to the highest band when there is no detail cutoff', () => {
        expect(resolveCutoff(null, cutoffs, null)).toBe(1695);
        expect(resolveCutoff(null, [], null)).toBe(null);
    });
});

describe('cutoffLabel', () => {
    it('renders a rating band, and names the unrated one', () => {
        expect(cutoffLabel(1630)).toBe('1630+');
        expect(cutoffLabel(0)).toBe('All');
        expect(cutoffLabel(0, true)).toBe('Todos');
        expect(cutoffLabel(undefined)).toBe('');
    });
});

describe('usageRows', () => {
    it('ranks the requested cutoff band, most-used first', () => {
        const rows = usageRows(DATA, 0);
        expect(rows.map((r) => r.id)).toEqual([645, 25]);
        expect(rows[0].usage).toBe(30.2);
    });

    it('accepts the cutoff as a string, as the URL supplies it', () => {
        expect(usageRows(DATA, '0').map((r) => r.id)).toEqual([645, 25]);
    });

    it('merges win rate back in from the detail set', () => {
        const rows = usageRows(DATA, 1695);
        expect(rows.find((r) => r.id === 984).winRate).toBe(54);
        expect(rows.find((r) => r.id === 645).winRate).toBe(null);
    });

    it('flags rows the chaos download did not cover', () => {
        const rows = usageRows(DATA, 0);
        expect(rows.find((r) => r.id === 645).hasDetail).toBe(true);
        expect(rows.find((r) => r.id === 25).hasDetail).toBe(false);
    });

    it('falls back to the detail set for a band with no table', () => {
        expect(usageRows(DATA, 1825).map((r) => r.id)).toEqual([984, 645]);
    });

    it('ranks a pre-cutoff baked file (no `cutoffs` key) from its detail set', () => {
        const legacy = { byId: DATA.byId };
        expect(usageRows(legacy, 1630).map((r) => r.id)).toEqual([984, 645]);
    });

    it('is empty, not broken, without data', () => {
        expect(usageRows(null)).toEqual([]);
    });
});

describe('sortRows', () => {
    const rows = [
        { id: 1, name: 'Alpha', usage: 10, winRate: 40 },
        { id: 2, name: 'Zeta', usage: 30, winRate: null },
        { id: 3, name: 'Mid', usage: 20, winRate: 60 },
    ];

    it('sorts by usage by default', () => {
        expect(sortRows(rows).map((r) => r.id)).toEqual([2, 3, 1]);
    });

    it('sorts by win rate, sinking the rows that have none', () => {
        expect(sortRows(rows, 'wr').map((r) => r.id)).toEqual([3, 1, 2]);
    });

    it('sorts by name', () => {
        expect(sortRows(rows, 'name').map((r) => r.id)).toEqual([1, 3, 2]);
    });

    it('does not mutate the input', () => {
        sortRows(rows, 'name');
        expect(rows.map((r) => r.id)).toEqual([1, 2, 3]);
    });
});

describe('ladderPairs', () => {
    const data = {
        byId: {
            984: { name: 'Great Tusk', n: 1000, teammates: [{ id: 645, name: 'Landorus-Therian', count: 600 }, { id: 25, name: 'Pikachu', count: 100 }] },
            645: { name: 'Landorus-Therian', n: 800, teammates: [{ id: 984, name: 'Great Tusk', count: 600 }] },
            25: { name: 'Pikachu', n: 120, teammates: [{ id: 984, name: 'Great Tusk', count: 100 }] },
        },
    };

    it('pairs by co-occurrence, strongest first', () => {
        const pairs = ladderPairs(data);
        expect(pairs[0].ids).toEqual([645, 984]);
        expect(pairs[0].count).toBe(600);
    });

    it('counts each unordered pair once, not once per direction', () => {
        expect(ladderPairs(data)).toHaveLength(2);
    });

    it('scores against the more-used partner, so a niche mon does not top the list', () => {
        const pairs = ladderPairs(data);
        // Pikachu ran Great Tusk on 100/120 of its own teams (83%), but measured
        // against Great Tusk's 1000 it is the 10% pairing it really is.
        expect(pairs.find((p) => p.ids.includes(25)).pct).toBe(10);
        expect(pairs[0].pct).toBe(60);
    });

    it('honours the limit and survives a file with no teammates', () => {
        expect(ladderPairs(data, 1)).toHaveLength(1);
        expect(ladderPairs({ byId: { 1: { name: 'Bulbasaur', n: 5 } } })).toEqual([]);
        expect(ladderPairs(null)).toEqual([]);
    });
});

describe('filterRows', () => {
    const rows = [
        { id: 984, name: 'Great Tusk' },
        { id: 645, name: 'Landorus-Therian' },
        { id: 25, name: 'Pikachu' },
    ];
    const typesById = new Map([[984, ['ground', 'fighting']], [645, ['ground', 'flying']]]);

    it('searches the display name with hyphens read as spaces', () => {
        expect(filterRows(rows, { query: 'landorus therian' }).map((r) => r.id)).toEqual([645]);
        expect(filterRows(rows, { query: 'tusk' }).map((r) => r.id)).toEqual([984]);
    });

    it('ORs the selected types', () => {
        expect(filterRows(rows, { types: ['flying'], typesById }).map((r) => r.id)).toEqual([645, 25]);
        expect(filterRows(rows, { types: ['fighting', 'flying'], typesById }).map((r) => r.id)).toEqual([984, 645, 25]);
    });

    it('keeps rows whose types are not known yet rather than hiding them', () => {
        expect(filterRows(rows, { types: ['fire'], typesById }).map((r) => r.id)).toEqual([25]);
    });

    it('combines search and type', () => {
        expect(filterRows(rows, { query: 'tusk', types: ['flying'], typesById })).toEqual([]);
    });
});
