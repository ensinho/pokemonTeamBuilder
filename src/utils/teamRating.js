/**
 * "Avalie meu time" (2026-11-06, docs/plans/social-heart.md B4): a reply to
 * a shared team may carry a verdict, drawn as an evolution line — Gible
 * (needs training), Gabite (almost there), Garchomp (ready for the League).
 */
export const RATINGS = [
    { id: 'train', art: 443 },
    { id: 'almost', art: 444 },
    { id: 'ready', art: 445 },
];

/** `{ train, almost, ready, total, top }` from the thread's replies (one per trainer: their latest). */
export function tallyRatings(messages = []) {
    const latest = new Map();
    for (const m of messages) {
        if (m?.rating && RATINGS.some((r) => r.id === m.rating) && m.createdBy) latest.set(m.createdBy, m.rating);
    }
    const counts = { train: 0, almost: 0, ready: 0 };
    latest.forEach((rating) => { counts[rating] += 1; });
    const total = latest.size;
    const top = total ? RATINGS.reduce((best, r) => (counts[r.id] > counts[best.id] ? r : best), RATINGS[0]).id : null;
    return { ...counts, total, top };
}
