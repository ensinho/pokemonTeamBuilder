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

import { DEFAULT_TEMPLATE_ID, TEMPLATES_BY_ID, TIER_TEMPLATES } from './tierTemplates.js';

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

export {
    DAILY_TIER_TEMPLATES, DEFAULT_TEMPLATE_ID, TEMPLATES_BY_ID, TIER_TEMPLATES, dailyTierTemplate,
} from './tierTemplates.js';

/**
 * Whether a board is finished: every Pokémon of a themed list ranked, every
 * cell of a chart chosen. A free list is finished once it holds a few and
 * none waits in the pool.
 */
export function isBoardComplete(board) {
    if (!board) return false;
    if (board.kind === 'chart') {
        const cells = Object.values(board.cells);
        return cells.length > 0 && cells.every(isDexId);
    }
    const ranked = TIER_KEYS.reduce((sum, key) => sum + board.tiers[key].length, 0);
    return board.pool.length === 0 && ranked >= (board.templateId === 'free' ? 3 : 1);
}

/**
 * The few Pokémon a board is "about", for a card that shows it small: a
 * tier list's best ranked (S first), a chart's chosen cells in order.
 */
export function boardHighlights(board, max = 3) {
    if (!board) return [];
    const ids = board.kind === 'chart'
        ? Object.values(board.cells).filter(isDexId)
        : TIER_KEYS.flatMap((key) => board.tiers[key]);
    return ids.slice(0, max);
}

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

/**
 * What is kept: the board of each template, the last one open, and when each
 * board last changed (`stamps`, ms) — the device's copy and, since
 * 2026-11-17, the account's (`services/tierListSync.js`), merged board by
 * board on the stamp (`mergeTierStores`).
 */
export function normalizeStore(raw) {
    const value = raw && typeof raw === 'object' ? raw : {};
    const current = TEMPLATES_BY_ID[value.current] ? value.current : DEFAULT_TEMPLATE_ID;
    const boards = {};
    const stamps = {};
    for (const template of TIER_TEMPLATES) {
        if (value.boards?.[template.id]) {
            boards[template.id] = normalizeBoard(value.boards[template.id], template.id);
            const stamp = value.stamps?.[template.id];
            if (Number.isFinite(stamp) && stamp > 0) stamps[template.id] = stamp;
        }
    }
    return { current, boards, stamps };
}

const sameBoard = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** `next` with every board that differs from `prev` stamped `ms`. */
export function stampChangedBoards(prev, next, ms) {
    let stamps = next.stamps || {};
    for (const id of Object.keys(next.boards || {})) {
        if (!sameBoard(prev?.boards?.[id], next.boards[id])) stamps = { ...stamps, [id]: ms };
    }
    return stamps === next.stamps ? next : { ...next, stamps };
}

/**
 * This device's store and the account's as one: for each template, the board
 * stamped later (a board only one copy has is kept; an unstamped board loses
 * to a stamped one). The open template stays this device's.
 */
export function mergeTierStores(local, remote) {
    const here = normalizeStore(local);
    const there = normalizeStore(remote);
    const boards = { ...here.boards };
    const stamps = { ...here.stamps };
    for (const [id, board] of Object.entries(there.boards)) {
        if (!here.boards[id] || (there.stamps[id] || 0) > (here.stamps[id] || 0)) {
            boards[id] = board;
            if (there.stamps[id]) stamps[id] = there.stamps[id];
        }
    }
    return { current: here.current, boards, stamps };
}

/** Whether two stores hold the same boards (the open template aside). */
export const sameTierBoards = (a, b) => sameBoard(a?.boards, b?.boards) && sameBoard(a?.stamps, b?.stamps);

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

// ── The shared link (`/tier-list?r=…`, 2026-11-15) ─────────────────────────
// A board as a few URL-safe characters, read by the page (to show the list
// and offer "make mine from this"), by api/render-meta.js (to title the
// preview) and by api/og.js (to draw it). The resultShareCode.js rules:
// **ids only, never text** — the list's own name stays on the device, the
// preview says the theme's — and a strict decode: anything off is null.
//
//   t.{template}.{S}.{A}.{B}.{C}.{D}   each rank's dex ids in base 36, joined by `-`
//   c.{template}.{cells}               one base-36 id or `_` per cell, in order
//
// `t.starters.7-4.1-9c..c.4` — Squirtle and Charmander in S.

/** The highest dex id a list can hold: the base Pokémon the page offers. */
export const MAX_DEX_ID = 1025;

const toCode = (id) => id.toString(36);
const fromCode = (text) => (/^[0-9a-z]{1,2}$/.test(text) ? Number.parseInt(text, 36) : NaN);

/** The board as a link code, or '' when nothing is ranked or chosen yet. */
export function encodeTierList(board) {
    const template = TEMPLATES_BY_ID[board?.templateId];
    if (!template || template.kind !== board.kind || placedCount(board) === 0) return '';
    if (board.kind === 'chart') {
        const cells = template.cells.map((cell) => (isDexId(board.cells[cell.key]) ? toCode(board.cells[cell.key]) : '_'));
        return ['c', template.id, cells.join('-')].join('.');
    }
    return ['t', template.id, ...TIER_KEYS.map((key) => board.tiers[key].map(toCode).join('-'))].join('.');
}

/**
 * A link code, checked: a known theme of the right kind, ids that are base
 * Pokémon, no Pokémon twice, a themed list holding only its theme's
 * Pokémon, a chart with exactly its cells, and at least one placed.
 * Returns `{ kind: 'tier', templateId, tiers, count }` or
 * `{ kind: 'chart', templateId, cells, count, total }`, else null.
 */
export function decodeTierList(code) {
    if (typeof code !== 'string' || code.length > 600) return null;
    const parts = code.split('.');
    const template = TEMPLATES_BY_ID[parts[1]];
    if (!template) return null;
    const seen = new Set();
    const readId = (text) => {
        const id = fromCode(text);
        if (!Number.isInteger(id) || id < 1 || id > MAX_DEX_ID || seen.has(id)) return null;
        if (template.kind === 'tier' && template.id !== 'free' && !template.ids.includes(id)) return null;
        seen.add(id);
        return id;
    };
    if (parts[0] === 'c' && template.kind === 'chart' && parts.length === 3) {
        const texts = parts[2].split('-');
        if (texts.length !== template.cells.length) return null;
        const cells = {};
        for (let i = 0; i < texts.length; i += 1) {
            if (texts[i] === '_') { cells[template.cells[i].key] = null; continue; }
            const id = readId(texts[i]);
            if (id === null) return null;
            cells[template.cells[i].key] = id;
        }
        if (seen.size === 0) return null;
        return { kind: 'chart', templateId: template.id, cells, count: seen.size, total: texts.length };
    }
    if (parts[0] === 't' && template.kind === 'tier' && parts.length === 2 + TIER_KEYS.length) {
        const tiers = {};
        for (let i = 0; i < TIER_KEYS.length; i += 1) {
            const text = parts[2 + i];
            const ids = text === '' ? [] : text.split('-').map(readId);
            if (ids.some((id) => id === null)) return null;
            tiers[TIER_KEYS[i]] = ids;
        }
        if (seen.size === 0 || seen.size > MAX_BOARD_ITEMS) return null;
        return { kind: 'tier', templateId: template.id, tiers, count: seen.size };
    }
    return null;
}

/** A decoded list as a board of one's own: its ranks, the theme's other Pokémon in the pool. */
export function boardFromShare(shared) {
    const fresh = createBoard(shared.templateId);
    if (shared.kind === 'chart') return { ...fresh, cells: { ...fresh.cells, ...shared.cells } };
    const ranked = new Set(TIER_KEYS.flatMap((key) => shared.tiers[key]));
    return { ...fresh, tiers: { ...shared.tiers }, pool: fresh.pool.filter((id) => !ranked.has(id)) };
}

/**
 * A decoded chart with only the cells its rule allows: a link can name any
 * Pokémon, the index says whether it is a Fire type or from Gen 3. `lookup`
 * maps an id to its index entry; an unknown id empties its cell. A tier list
 * is returned as is. Null when nothing is left to show.
 */
export function keepFittingCells(shared, lookup) {
    if (!shared || shared.kind !== 'chart') return shared;
    const template = TEMPLATES_BY_ID[shared.templateId];
    const cells = {};
    let count = 0;
    for (const cell of template.cells) {
        const id = shared.cells[cell.key];
        const fits = id && meetsCellRule(cell.rule, lookup(id));
        cells[cell.key] = fits ? id : null;
        if (fits) count += 1;
    }
    return count ? { ...shared, cells, count } : null;
}
