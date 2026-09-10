/**
 * How much of a list to render when it is revealed in pages ("Show more").
 *
 * Pure so the edge cases — a list shorter than a page, a search that shrinks
 * the list under an already-expanded count, the feature switched off on
 * desktop — are testable without rendering anything.
 *
 * @param {number} total     items available
 * @param {number} revealed  items the user has asked to see so far
 * @param {boolean} enabled  false renders everything (e.g. on desktop)
 * @returns {{ limit: number, remaining: number, hasMore: boolean }}
 */
export function getRevealState(total, revealed, enabled = true) {
    const safeTotal = Math.max(0, Math.floor(Number(total) || 0));
    if (!enabled) return { limit: safeTotal, remaining: 0, hasMore: false };
    const limit = Math.min(safeTotal, Math.max(0, Math.floor(Number(revealed) || 0)));
    const remaining = safeTotal - limit;
    return { limit, remaining, hasMore: remaining > 0 };
}
