/**
 * The tier list maker (2026-11-15, Enzo: "Charts, tipo o tierlistmaker…
 * com alguns temas padrão, de iniciais, favoritos de tipo"). Pure on
 * purpose — the view (components/views/TierListView.jsx) only renders and
 * dispatches, the image (components/tierList/drawTierList.js) only draws what
 * `tierExportLayout` places — so every rule here is tested.
 *
 * Two kinds of board:
 * - `tier`  — five ranks and a pool. The ranks are Poké Balls, the games'
 *             own ladder (Master, Ultra, Great, Poké, Premier), not the
 *             tiermaker rainbow.
 * - `chart` — a grid of named cells, one Pokémon each ("your favourite of
 *             each type"); an empty cell is the silhouette's "?".
 *
 * A board is kept on this device only (`TIER_LIST_STORAGE_KEY`, a trainer's
 * key — utils/sessionWipe.js clears it on sign-out), one per template.
 */

import { TYPE_IDS } from './typeMatchups.js';

export const TIER_LIST_STORAGE_KEY = 'ptb:tierList:v1';
export const TIER_LIST_VERSION = 1;

/** The ranks, best first. */
export const TIER_KEYS = ['S', 'A', 'B', 'C', 'D'];

/**
 * Each rank's ball — canon colours, theme-independent like the type colours
 * (design system, "Canon colours"): `top` is the ball's upper half, `band`
 * its marking. Mixed into theme tokens in CSS, drawn raw only in the image.
 */
export const TIER_BALLS = {
    S: { ball: 'master', top: '#7b3fe4', band: '#e04a9a' },
    A: { ball: 'ultra', top: '#2b2b33', band: '#f2c230' },
    B: { ball: 'great', top: '#3a78d8', band: '#e8443a' },
    C: { ball: 'poke', top: '#e8443a', band: '#e8443a' },
    D: { ball: 'premier', top: '#eceef4', band: '#e8443a' },
};

/** Every ball's white half and its seam. */
export const BALL_BASE = '#f4f2fb';
export const BALL_INK = '#1b1426';

const GENERATIONS = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix'];

/**
 * The starting themes. `ids` fill a tier board's pool; `cells` name a
 * chart's cells, each with the rule its Pokémon must meet. `art` is the
 * National Dex id the template's card shows.
 */
export const TIER_TEMPLATES = [
    {
        id: 'starters',
        kind: 'tier',
        art: 7,
        ids: [1, 4, 7, 152, 155, 158, 252, 255, 258, 387, 390, 393, 495, 498, 501, 650, 653, 656, 722, 725, 728, 810, 813, 816, 906, 909, 912],
    },
    {
        id: 'types',
        kind: 'chart',
        art: 133,
        cells: TYPE_IDS.map((type) => ({ key: type, rule: { type } })),
    },
    {
        id: 'legendaries',
        kind: 'tier',
        art: 384,
        ids: [150, 249, 250, 382, 383, 384, 483, 484, 487, 643, 644, 646, 716, 717, 718, 791, 792, 800, 888, 889, 890, 1007, 1008, 1024],
    },
    {
        id: 'generations',
        kind: 'chart',
        art: 25,
        cells: GENERATIONS.map((gen, index) => ({ key: `gen${index + 1}`, rule: { generation: `generation-${gen}` } })),
    },
    {
        id: 'pseudo',
        kind: 'tier',
        art: 445,
        ids: [149, 248, 373, 376, 445, 635, 706, 784, 887, 998],
    },
    {
        id: 'eevee',
        kind: 'tier',
        art: 133,
        ids: [133, 134, 135, 136, 196, 197, 470, 471, 700],
    },
    {
        id: 'mythicals',
        kind: 'tier',
        art: 151,
        ids: [151, 251, 385, 386, 489, 490, 491, 492, 493, 494, 647, 648, 649, 719, 720, 721, 801, 802, 807, 808, 809, 893, 1025],
    },
    {
        id: 'pikaclones',
        kind: 'tier',
        art: 25,
        ids: [25, 311, 312, 417, 587, 702, 777, 877, 921],
    },
    {
        id: 'free',
        kind: 'tier',
        art: 132,
        ids: [],
    },
];

export const TEMPLATES_BY_ID = Object.fromEntries(TIER_TEMPLATES.map((template) => [template.id, template]));
export const DEFAULT_TEMPLATE_ID = TIER_TEMPLATES[0].id;

/** The most Pokémon a board keeps: a free board grows by hand. */
export const MAX_BOARD_ITEMS = 120;

const isDexId = (value) => Number.isInteger(value) && value > 0 && value < 100000;

const emptyTiers = () => Object.fromEntries(TIER_KEYS.map((key) => [key, []]));

/** A fresh board for a template: every Pokémon in the pool, every cell empty. */
export function createBoard(templateId) {
    const template = TEMPLATES_BY_ID[templateId] || TEMPLATES_BY_ID[DEFAULT_TEMPLATE_ID];
    if (template.kind === 'chart') {
        return {
            v: TIER_LIST_VERSION,
            templateId: template.id,
            kind: 'chart',
            title: '',
            cells: Object.fromEntries(template.cells.map((cell) => [cell.key, null])),
        };
    }
    return {
        v: TIER_LIST_VERSION,
        templateId: template.id,
        kind: 'tier',
        title: '',
        tiers: emptyTiers(),
        pool: [...template.ids],
    };
}

/** Every id on a tier board, in rank order and then the pool. */
export const boardIds = (board) => (board?.kind === 'tier'
    ? [...TIER_KEYS.flatMap((key) => board.tiers[key]), ...board.pool]
    : Object.values(board?.cells || {}).filter(isDexId));

/** How many Pokémon have been ranked (tier) or chosen (chart). */
export function placedCount(board) {
    if (!board) return 0;
    if (board.kind === 'chart') return Object.values(board.cells).filter(isDexId).length;
    return TIER_KEYS.reduce((sum, key) => sum + board.tiers[key].length, 0);
}

/** Where an id sits on a tier board: a rank key, 'pool', or null. */
export function locate(board, id) {
    if (board?.kind !== 'tier') return null;
    for (const key of TIER_KEYS) {
        if (board.tiers[key].includes(id)) return key;
    }
    return board.pool.includes(id) ? 'pool' : null;
}

const without = (list, id) => list.filter((item) => item !== id);

/**
 * Put `id` in `target` (a rank key or 'pool') at `index` (the end when
 * omitted or out of range), taking it from wherever it was. Moving within
 * the same row counts the gap it leaves, so dropping a card one slot to the
 * right lands it there. Returns a new board; an unknown target or id is a
 * no-op.
 */
export function placeItem(board, id, target, index) {
    if (board?.kind !== 'tier' || !isDexId(id)) return board;
    if (target !== 'pool' && !TIER_KEYS.includes(target)) return board;
    const from = locate(board, id);
    if (!from && boardIds(board).length >= MAX_BOARD_ITEMS) return board;
    const tiers = Object.fromEntries(TIER_KEYS.map((key) => [key, without(board.tiers[key], id)]));
    const pool = without(board.pool, id);
    const row = target === 'pool' ? pool : tiers[target];
    let at = Number.isInteger(index) ? index : row.length;
    if (from === target && Number.isInteger(index)) {
        const oldIndex = (target === 'pool' ? board.pool : board.tiers[target]).indexOf(id);
        if (oldIndex !== -1 && oldIndex < index) at -= 1;
    }
    row.splice(Math.max(0, Math.min(at, row.length)), 0, id);
    return { ...board, tiers, pool };
}

/** Add a Pokémon to the pool of a tier board (from the search). */
export const addToPool = (board, id) => (locate(board, id) ? board : placeItem(board, id, 'pool'));

/** Take a Pokémon off a tier board entirely. */
export function removeItem(board, id) {
    if (board?.kind !== 'tier') return board;
    return {
        ...board,
        tiers: Object.fromEntries(TIER_KEYS.map((key) => [key, without(board.tiers[key], id)])),
        pool: without(board.pool, id),
    };
}

/** Every ranked Pokémon back in the pool, in the template's order first. */
export function unrankAll(board) {
    if (board?.kind !== 'tier') return board;
    const template = TEMPLATES_BY_ID[board.templateId];
    const ids = boardIds(board);
    const order = template?.ids || [];
    const sorted = [...ids].sort((a, b) => {
        const ia = order.indexOf(a);
        const ib = order.indexOf(b);
        return (ia === -1 ? order.length : ia) - (ib === -1 ? order.length : ib);
    });
    return { ...board, tiers: emptyTiers(), pool: sorted };
}

/** Fill (or, with null, clear) a chart cell. */
export function setCell(board, key, id) {
    if (board?.kind !== 'chart' || !(key in board.cells)) return board;
    if (id !== null && !isDexId(id)) return board;
    return { ...board, cells: { ...board.cells, [key]: id } };
}

/** The title, trimmed to what fits the image's headline. */
export const MAX_TITLE_LENGTH = 48;
export const setTitle = (board, title) => ({ ...board, title: String(title || '').slice(0, MAX_TITLE_LENGTH) });

/**
 * A stored board, made safe against its template: unknown ranks dropped,
 * ids deduplicated and kept only if they are dex ids, the template's own
 * Pokémon that went missing put back in the pool, cells limited to the
 * template's. Never throws; anything unreadable is a fresh board.
 */
export function normalizeBoard(raw, templateId) {
    const fresh = createBoard(templateId);
    if (!raw || typeof raw !== 'object' || raw.kind !== fresh.kind) return fresh;
    const title = typeof raw.title === 'string' ? raw.title.slice(0, MAX_TITLE_LENGTH) : '';
    if (fresh.kind === 'chart') {
        const cells = { ...fresh.cells };
        for (const key of Object.keys(cells)) {
            if (isDexId(raw.cells?.[key])) cells[key] = raw.cells[key];
        }
        return { ...fresh, title, cells };
    }
    const seen = new Set();
    const clean = (list) => (Array.isArray(list) ? list : [])
        .filter((id) => isDexId(id) && !seen.has(id) && seen.add(id));
    const tiers = Object.fromEntries(TIER_KEYS.map((key) => [key, clean(raw.tiers?.[key])]));
    const pool = clean(raw.pool);
    const template = TEMPLATES_BY_ID[fresh.templateId];
    for (const id of template.ids) {
        if (!seen.has(id)) { pool.push(id); seen.add(id); }
    }
    return { ...fresh, title, tiers, pool: pool.slice(0, MAX_BOARD_ITEMS) };
}

/** What is kept on the device: the board of each template and the last one open. */
export function normalizeStore(raw) {
    const value = raw && typeof raw === 'object' ? raw : {};
    const current = TEMPLATES_BY_ID[value.current] ? value.current : DEFAULT_TEMPLATE_ID;
    const boards = {};
    for (const template of TIER_TEMPLATES) {
        if (value.boards?.[template.id]) boards[template.id] = normalizeBoard(value.boards[template.id], template.id);
    }
    return { current, boards };
}

/** Whether a Pokémon (an index entry) may fill a chart cell. */
export function meetsCellRule(rule, pokemon) {
    if (!rule || !pokemon) return false;
    if (rule.type) return Array.isArray(pokemon.types) && pokemon.types.includes(rule.type);
    if (rule.generation) return pokemon.generation === rule.generation;
    return true;
}

// ── The image ──────────────────────────────────────────────────────────────

/** The exported image: a 4:5-wide post, as tall as the board needs. */
export const EXPORT_WIDTH = 1080;

const PAD = 64;
const HEADER = 236;
const FOOTER = 132;
const LABEL = 168;
const SPRITE = 104;
const GAP = 12;
const ROW_PAD = 16;

/**
 * Where everything goes in the image, in pixels, for a board of `rows`
 * (`[{ key, count }]`, a tier board) or `cells` (a chart's cell count).
 * Ranks always show, empty ones at one line, as on a tiermaker image; a
 * rank wraps onto as many lines as it needs. A chart is a grid of square
 * cells, six across (three for a chart of nine).
 */
export function tierExportLayout({ rows = null, cells = 0 } = {}) {
    const width = EXPORT_WIDTH;
    const inner = width - PAD * 2;
    if (rows) {
        const lane = inner - LABEL - GAP;
        const perLine = Math.max(1, Math.floor((lane - ROW_PAD * 2 + GAP) / (SPRITE + GAP)));
        let y = HEADER;
        const placed = rows.map(({ key, count }) => {
            const lines = Math.max(1, Math.ceil(count / perLine));
            const height = lines * SPRITE + (lines - 1) * GAP + ROW_PAD * 2;
            const items = Array.from({ length: count }, (_, i) => ({
                x: PAD + LABEL + GAP + ROW_PAD + (i % perLine) * (SPRITE + GAP),
                y: y + ROW_PAD + Math.floor(i / perLine) * (SPRITE + GAP),
                size: SPRITE,
            }));
            const row = { key, x: PAD, y, width: inner, height, label: { x: PAD, y, width: LABEL, height }, items };
            y += height + GAP;
            return row;
        });
        return { width, height: y - GAP + FOOTER, pad: PAD, header: HEADER, footerY: y - GAP + 40, rows: placed, perLine };
    }
    const columns = cells <= 9 ? 3 : 6;
    const size = Math.floor((inner - GAP * (columns - 1)) / columns);
    const lines = Math.ceil(cells / columns);
    const grid = Array.from({ length: cells }, (_, i) => ({
        x: PAD + (i % columns) * (size + GAP),
        y: HEADER + Math.floor(i / columns) * (size + GAP),
        size,
    }));
    const bottom = HEADER + lines * size + Math.max(0, lines - 1) * GAP;
    return { width, height: bottom + FOOTER, pad: PAD, header: HEADER, footerY: bottom + 40, cells: grid, columns };
}

/** A Pokémon's name as the board shows it: "mr-mime" → "Mr Mime". */
export const monLabel = (name = '') => String(name).replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * The search's matches for `query` among `mons` (index entries): by name
 * (start of the name first) or by dex number, at most `max`.
 */
export function searchMons(mons = [], query = '', max = 12) {
    const q = String(query).trim().toLowerCase().replace(/\s+/g, '-');
    if (!q) return [];
    if (/^\d+$/.test(q)) return mons.filter((mon) => String(mon.id).startsWith(q)).slice(0, max);
    const starts = [];
    const contains = [];
    for (const mon of mons) {
        if (mon.name.startsWith(q)) starts.push(mon);
        else if (mon.name.includes(q)) contains.push(mon);
        if (starts.length >= max) break;
    }
    return [...starts, ...contains].slice(0, max);
}
