/**
 * A tier list or a quiz result as a forum attachment (2026-11-15, Enzo: "que
 * sempre tenham a opção de compartilhar no fórum, atualmente a tier list não
 * tem"). The Champion and the PokéPuzzle had theirs (`challengeShare.js`,
 * `pokePuzzleShare.js`); these are the other two games' — `sharedTierList`
 * and `sharedQuiz` on a forum message, posted to the Diário do dia through
 * `useForumStore.postToDiary`.
 *
 * The resultShareCode.js rules hold: **ids and figures only, never text**. A
 * payload comes back from Firestore written by whoever posted, so each has a
 * reader that checks and clamps it before anything is drawn; what a reader
 * refuses simply is not shown.
 */

import { decodeTierList, encodeTierList } from './tierList.js';
import { decodeQuizDuel, encodeQuizDuel } from './resultShareCode.js';

// ── Tier list ───────────────────────────────────────────────────────────────
// `{ v: 1, code }` — the link code of `/tier-list?r=` (tierList.js): a known
// theme and dex ids. The list's own name never leaves the device.

/** The attachment for a board, or null when nothing is ranked or chosen yet. */
export function buildTierListShare(board) {
    const code = encodeTierList(board);
    return code ? { v: 1, code } : null;
}

/** A `sharedTierList` read back: `{ code, ...decoded }`, or null. */
export function readTierListShare(share) {
    if (!share || share.v !== 1 || typeof share.code !== 'string') return null;
    const decoded = decodeTierList(share.code);
    return decoded ? { code: share.code, ...decoded } : null;
}

// ── Quiz ────────────────────────────────────────────────────────────────────
// A category run: `{ v: 1, mode: 'category', list, found, total, daily }` —
// the category's id, how many were named out of how many, and whether it was
// the quiz of the day. A generations run: `{ v: 1, mode: 'generations', duel }`
// — the duel code (`encodeQuizDuel`), which the card's button opens as a mark
// to beat. No names of Pokémon either way: a result never spoils the list.

const LIST_ID = /^[a-z0-9][a-z0-9-]{0,47}$/;
const MAX_CATEGORY_TOTAL = 20;

/** @param {{ listId: string, found: number, total: number, daily?: boolean }} run */
export function buildCategoryQuizShare(run) {
    if (!run || !LIST_ID.test(run.listId || '')) return null;
    const total = Math.trunc(run.total);
    if (!(total >= 1 && total <= MAX_CATEGORY_TOTAL)) return null;
    const found = Math.max(0, Math.min(total, Math.trunc(run.found || 0)));
    return { v: 1, mode: 'category', list: run.listId, found, total, daily: run.daily === true };
}

/** @param {{ generations: string[], found: number, total: number }} run */
export function buildGenerationQuizShare(run) {
    const duel = encodeQuizDuel(run || {});
    return duel ? { v: 1, mode: 'generations', duel } : null;
}

/**
 * A `sharedQuiz` read back: `{ mode: 'category', listId, found, total, daily }`
 * or `{ mode: 'generations', duel, generations, found, total }`, or null.
 */
export function readQuizShare(share) {
    if (!share || share.v !== 1) return null;
    if (share.mode === 'generations') {
        const decoded = typeof share.duel === 'string' ? decodeQuizDuel(share.duel) : null;
        return decoded ? { mode: 'generations', duel: share.duel, ...decoded } : null;
    }
    if (share.mode !== 'category' || !LIST_ID.test(share.list || '')) return null;
    const { found, total } = share;
    if (!Number.isInteger(total) || total < 1 || total > MAX_CATEGORY_TOTAL) return null;
    if (!Number.isInteger(found) || found < 0 || found > total) return null;
    return { mode: 'category', listId: share.list, found, total, daily: share.daily === true };
}

/** The attachment as Firestore gets it: exactly the checked fields, or null. */
export function cleanQuizShare(share) {
    const read = readQuizShare(share);
    if (!read) return null;
    return read.mode === 'generations'
        ? { v: 1, mode: 'generations', duel: read.duel }
        : { v: 1, mode: 'category', list: read.listId, found: read.found, total: read.total, daily: read.daily };
}

/** Likewise for a tier list. */
export function cleanTierListShare(share) {
    const read = readTierListShare(share);
    return read ? { v: 1, code: read.code } : null;
}
