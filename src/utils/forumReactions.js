/**
 * Battle-text reactions (2026-11-06, docs/plans/social-heart.md A2): the
 * games' own lines instead of emoji. One per trainer per post, stored as
 * `reactions: { [uid]: kind }` (firestore.rules `touchesOnlyOwnReaction`).
 * `tone` is the type whose canon colour edges the battle box.
 */
export const REACTION_KINDS = [
    { id: 'super', tone: 'fire' },
    { id: 'crit', tone: 'electric' },
    { id: 'weak', tone: 'steel' },
    { id: 'confused', tone: 'psychic' },
];

const KIND_IDS = new Set(REACTION_KINDS.map((k) => k.id));

/** `[{ id, tone, count, mine }]` for the kinds that have at least one, most first. */
export function summarizeReactions(reactions, userId) {
    const counts = {};
    for (const kind of Object.values(reactions || {})) {
        if (KIND_IDS.has(kind)) counts[kind] = (counts[kind] || 0) + 1;
    }
    const mine = userId ? reactions?.[userId] : null;
    return REACTION_KINDS
        .filter((k) => counts[k.id])
        .map((k) => ({ ...k, count: counts[k.id], mine: mine === k.id }))
        .sort((a, b) => b.count - a.count);
}

/** The trainer's own reaction, or null. */
export const myReaction = (reactions, userId) => (userId && KIND_IDS.has(reactions?.[userId]) ? reactions[userId] : null);

/** Tapping a kind: set it, or take it back if it is already yours. */
export const nextReaction = (current, kind) => (current === kind ? null : kind);
