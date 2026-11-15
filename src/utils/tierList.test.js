import { describe, expect, it } from 'vitest';
import {
    EXPORT_WIDTH,
    MAX_BOARD_ITEMS,
    TIER_KEYS,
    TIER_TEMPLATES,
    addToPool,
    boardIds,
    createBoard,
    locate,
    meetsCellRule,
    normalizeBoard,
    normalizeStore,
    placeItem,
    placedCount,
    removeItem,
    setCell,
    setTitle,
    tierExportLayout,
    unrankAll,
} from './tierList';

describe('templates', () => {
    it('have unique ids and no repeated Pokémon', () => {
        expect(new Set(TIER_TEMPLATES.map((t) => t.id)).size).toBe(TIER_TEMPLATES.length);
        for (const template of TIER_TEMPLATES.filter((t) => t.kind === 'tier')) {
            expect(new Set(template.ids).size).toBe(template.ids.length);
        }
    });

    it('starters are the 27 of nine generations', () => {
        expect(createBoard('starters').pool).toHaveLength(27);
    });

    it('the type chart has one cell per type', () => {
        expect(Object.keys(createBoard('types').cells)).toHaveLength(18);
        expect(Object.keys(createBoard('generations').cells)).toHaveLength(9);
    });

    it('an unknown template falls back to the first', () => {
        expect(createBoard('nope').templateId).toBe(TIER_TEMPLATES[0].id);
    });
});

describe('placeItem', () => {
    const board = createBoard('eevee');

    it('moves a Pokémon from the pool to a rank', () => {
        const next = placeItem(board, 133, 'S');
        expect(next.tiers.S).toEqual([133]);
        expect(next.pool).not.toContain(133);
        expect(placedCount(next)).toBe(1);
        expect(board.pool).toContain(133);
    });

    it('moves between ranks and back to the pool, never duplicating', () => {
        let next = placeItem(board, 134, 'A');
        next = placeItem(next, 134, 'D');
        expect(locate(next, 134)).toBe('D');
        next = placeItem(next, 134, 'pool', 0);
        expect(next.pool[0]).toBe(134);
        expect(boardIds(next).filter((id) => id === 134)).toHaveLength(1);
    });

    it('lands a card one slot to the right within its row', () => {
        let next = placeItem(board, 133, 'S');
        next = placeItem(next, 134, 'S');
        next = placeItem(next, 135, 'S');
        // Dropped before index 2 as the row looked with 133 in it.
        next = placeItem(next, 133, 'S', 2);
        expect(next.tiers.S).toEqual([134, 133, 135]);
    });

    it('ignores an unknown target or a bad id', () => {
        expect(placeItem(board, 133, 'Z')).toBe(board);
        expect(placeItem(board, -1, 'S')).toBe(board);
        expect(placeItem(createBoard('types'), 1, 'S').kind).toBe('chart');
    });

    it('caps a free board', () => {
        let next = createBoard('free');
        for (let id = 1; id <= MAX_BOARD_ITEMS + 5; id += 1) next = addToPool(next, id);
        expect(boardIds(next)).toHaveLength(MAX_BOARD_ITEMS);
    });
});

describe('the rest of the board', () => {
    it('adds once, removes, and unranks in the template order', () => {
        let next = addToPool(createBoard('free'), 25);
        next = addToPool(next, 25);
        expect(next.pool).toEqual([25]);
        next = removeItem(next, 25);
        expect(boardIds(next)).toEqual([]);

        let eevee = placeItem(createBoard('eevee'), 700, 'S');
        eevee = placeItem(eevee, 133, 'B');
        expect(unrankAll(eevee).pool).toEqual(createBoard('eevee').pool);
    });

    it('fills and clears chart cells', () => {
        let chart = setCell(createBoard('types'), 'fire', 6);
        expect(chart.cells.fire).toBe(6);
        expect(placedCount(chart)).toBe(1);
        chart = setCell(chart, 'fire', null);
        expect(chart.cells.fire).toBeNull();
        expect(setCell(chart, 'nope', 6)).toBe(chart);
    });

    it('trims the title', () => {
        expect(setTitle(createBoard('free'), 'x'.repeat(80)).title).toHaveLength(48);
    });

    it('checks a chart rule', () => {
        expect(meetsCellRule({ type: 'fire' }, { types: ['fire', 'flying'] })).toBe(true);
        expect(meetsCellRule({ type: 'water' }, { types: ['fire'] })).toBe(false);
        expect(meetsCellRule({ generation: 'generation-i' }, { generation: 'generation-i' })).toBe(true);
    });
});

describe('normalizeBoard', () => {
    it('reads garbage as a fresh board', () => {
        expect(normalizeBoard(null, 'starters')).toEqual(createBoard('starters'));
        expect(normalizeBoard({ kind: 'chart' }, 'starters')).toEqual(createBoard('starters'));
    });

    it('dedupes, drops bad ids and puts missing template Pokémon back', () => {
        const board = normalizeBoard({ kind: 'tier', title: 'Mine', tiers: { S: [133, 133, 'x'], Q: [134] }, pool: [-4, 135] }, 'eevee');
        expect(board.tiers.S).toEqual([133]);
        expect(board.title).toBe('Mine');
        expect(boardIds(board).sort((a, b) => a - b)).toEqual([...createBoard('eevee').pool].sort((a, b) => a - b));
        expect(Object.keys(board.tiers)).toEqual(TIER_KEYS);
    });

    it('keeps only the template cells', () => {
        const board = normalizeBoard({ kind: 'chart', cells: { fire: 6, nope: 1, water: 'x' } }, 'types');
        expect(board.cells.fire).toBe(6);
        expect(board.cells.water).toBeNull();
        expect('nope' in board.cells).toBe(false);
    });

    it('a store remembers the last template', () => {
        expect(normalizeStore({ current: 'types', boards: { types: { kind: 'chart', cells: { fire: 6 } } } }).boards.types.cells.fire).toBe(6);
        expect(normalizeStore({ current: 'nope' }).current).toBe(TIER_TEMPLATES[0].id);
    });
});

describe('tierExportLayout', () => {
    it('keeps every rank and wraps a long one inside the width', () => {
        const layout = tierExportLayout({ rows: TIER_KEYS.map((key, i) => ({ key, count: i === 0 ? 20 : 0 })) });
        expect(layout.rows).toHaveLength(5);
        expect(layout.rows[0].height).toBeGreaterThan(layout.rows[1].height);
        for (const item of layout.rows[0].items) {
            expect(item.x + item.size).toBeLessThanOrEqual(EXPORT_WIDTH - layout.pad);
            expect(item.y + item.size).toBeLessThanOrEqual(layout.rows[0].y + layout.rows[0].height);
        }
        expect(layout.height).toBeGreaterThan(layout.rows[4].y + layout.rows[4].height);
    });

    it('lays a chart in rows of six, or three for nine cells', () => {
        expect(tierExportLayout({ cells: 18 }).columns).toBe(6);
        const nine = tierExportLayout({ cells: 9 });
        expect(nine.columns).toBe(3);
        expect(nine.cells[8].x + nine.cells[8].size).toBeLessThanOrEqual(EXPORT_WIDTH - nine.pad);
    });
});

describe('the shared link', () => {
    it('round-trips a tier board and a chart', async () => {
        const { encodeTierList, decodeTierList, boardFromShare } = await import('./tierList');
        let board = placeItem(createBoard('starters'), 7, 'S');
        board = placeItem(board, 4, 'S');
        board = placeItem(board, 906, 'D');
        const code = encodeTierList(board);
        expect(code).toBe('t.starters.7-4....p6');
        const shared = decodeTierList(code);
        expect(shared.tiers.S).toEqual([7, 4]);
        expect(shared.tiers.D).toEqual([906]);
        const mine = boardFromShare(shared);
        expect(placedCount(mine)).toBe(3);
        expect(boardIds(mine)).toHaveLength(27);

        const chart = setCell(setCell(createBoard('types'), 'fire', 6), 'water', 9);
        const chartShared = decodeTierList(encodeTierList(chart));
        expect(chartShared.cells.fire).toBe(6);
        expect(chartShared.cells.normal).toBeNull();
        expect(chartShared.count).toBe(2);
        expect(chartShared.total).toBe(18);
    });

    it('says nothing for an empty board', async () => {
        const { encodeTierList } = await import('./tierList');
        expect(encodeTierList(createBoard('starters'))).toBe('');
    });

    it('never carries the list name', async () => {
        const { encodeTierList } = await import('./tierList');
        const board = setTitle(placeItem(createBoard('eevee'), 133, 'S'), 'my words');
        expect(encodeTierList(board)).not.toMatch(/my|words/);
    });

    it('refuses anything off', async () => {
        const { decodeTierList } = await import('./tierList');
        for (const code of [
            '', null, 't.nope.1....', 't.starters.1.1...', 't.starters.zz....', 't.starters.....',
            't.starters.25....', 'c.starters.1', 'c.types.1', 't.types.1....', 'x.starters.1....',
            't.free.0....', 't.free.<b>....', 'c.generations._-_-_-_-_-_-_-_-_',
        ]) {
            expect(decodeTierList(code)).toBeNull();
        }
        // A free list may hold any base Pokémon; a themed one only its own.
        expect(decodeTierList('t.free.p6....')).not.toBeNull();
        expect(decodeTierList('t.eevee.p6....')).toBeNull();
    });
});

describe('keepFittingCells', () => {
    it('empties a cell whose Pokémon breaks its rule', async () => {
        const { decodeTierList, encodeTierList, keepFittingCells } = await import('./tierList');
        const chart = setCell(setCell(createBoard('types'), 'fire', 6), 'electric', 45);
        const index = new Map([[6, { types: ['fire', 'flying'] }], [45, { types: ['grass', 'poison'] }]]);
        const kept = keepFittingCells(decodeTierList(encodeTierList(chart)), (id) => index.get(id));
        expect(kept.cells.fire).toBe(6);
        expect(kept.cells.electric).toBeNull();
        expect(kept.count).toBe(1);
        expect(keepFittingCells(decodeTierList('c.types._-_-_-_-19-_-_-_-_-_-_-_-_-_-_-_-_-_'), (id) => index.get(id))).toBeNull();
    });
});

describe('the shared link preview', () => {
    it('is titled by the theme, never by the sharer', async () => {
        const { resultShareMeta } = await import('./seoPages');
        const { decodeTierList } = await import('./tierList');
        const meta = resultShareMeta({ kind: 'tierlist', data: decodeTierList('t.starters.7-4....p6') }, 'pt');
        expect(meta.title).toBe('Minha tier list: Iniciais');
        expect(meta.description).toContain('3 Pokémon');
        const chart = resultShareMeta({ kind: 'tierlist', data: decodeTierList('c.types._-6-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_') }, 'en');
        expect(chart.description).toContain('1 of 18');
    });
});
