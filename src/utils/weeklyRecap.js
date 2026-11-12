/**
 * The Champion week, looked back on (2026-11-12, Enzo: "ao fim da semana
 * exibe um modal do resumo da última semana, exibindo o pódio e os outros").
 *
 * The season docs are the server's (`api/_lib/challenge/ranking.js`
 * `nextWeekRanks`, one per ISO week per champion, world-readable); this turns
 * a finished one into what the recap shows. Rows have the shape
 * `publicWeekRanks` gives the live Week board, so the same podium and rows
 * draw both — and the same privacy rule: a uid travels only with a public
 * profile.
 *
 * Pure: docs in, the recap out. The dialog never re-derives a place.
 */

export const RECAP_TOP = 10;

/** One season row as a board row. */
const shapeRow = (uid) => (entry, index) => ({
    name: entry.name,
    score: entry.score,
    days: Object.keys(entry.days || {}).length,
    profile: entry.profile || null,
    uid: entry.profile && entry.uid ? entry.uid : null,
    me: Boolean(uid) && entry.uid === uid,
    place: index + 1,
});

/**
 * @param {?{weekKey?: string, entries?: Array}} doc  a week's season doc
 * @param {?string} uid  the trainer looking (null for a guest)
 * @returns {null | {
 *   weekKey: ?string,
 *   podium: object[], rest: object[],
 *   mine: null | {place: number, score: number, days: number},
 *   outcome: 'champion'|'podium'|'ranked'|'absent',
 * }}
 * Null when nobody won that week: there is nothing to look back on.
 */
export function seasonRecap(doc, uid, top = RECAP_TOP) {
    const entries = Array.isArray(doc?.entries) ? doc.entries : [];
    if (!entries.length) return null;
    const rows = entries.slice(0, top).map(shapeRow(uid));
    const myIndex = uid ? entries.findIndex((entry) => entry.uid === uid) : -1;
    const mine = myIndex === -1 ? null : {
        place: myIndex + 1,
        score: entries[myIndex].score,
        days: Object.keys(entries[myIndex].days || {}).length,
    };
    const outcome = myIndex === -1 ? 'absent' : myIndex === 0 ? 'champion' : myIndex < 3 ? 'podium' : 'ranked';
    return { weekKey: doc.weekKey || null, podium: rows.slice(0, 3), rest: rows.slice(3), mine, outcome };
}

const OUTCOME_RANK = { champion: 0, podium: 1, ranked: 2, absent: 3 };

/**
 * Which champion's week the recap opens on: the one the trainer did best in,
 * then the room's champion, then the first with a season at all.
 * @param {Record<string, ?object>} recaps  seasonRecap() per champion id
 */
export function recapStart(recaps, roomChampionId, ids) {
    const withData = ids.filter((id) => recaps?.[id]);
    if (!withData.length) return null;
    const best = [...withData].sort((a, b) => {
        const byOutcome = OUTCOME_RANK[recaps[a].outcome] - OUTCOME_RANK[recaps[b].outcome];
        if (byOutcome) return byOutcome;
        const byPlace = (recaps[a].mine?.place ?? Infinity) - (recaps[b].mine?.place ?? Infinity);
        if (byPlace) return byPlace;
        return (a === roomChampionId ? -1 : 0) - (b === roomChampionId ? -1 : 0);
    });
    return best[0];
}

/**
 * The recap opens by itself once per week — the first visit to the Challenge
 * after the season closed — and only with something to show. After that it
 * is one tap away (the Week board's "last week" link).
 */
export const shouldOpenRecap = ({ weekKey, seenWeekKey, recaps }) => Boolean(weekKey)
    && seenWeekKey !== weekKey
    && Object.values(recaps || {}).some(Boolean);

/**
 * Monday and Sunday of an ISO week (`2026-W45`) as `YYYY-MM-DD`, for the
 * recap's dates.
 */
export function weekRange(weekKey) {
    const match = /^(\d{4})-W(\d{2})$/.exec(String(weekKey || ''));
    if (!match) return null;
    const year = Number(match[1]);
    const week = Number(match[2]);
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const monday = new Date(jan4);
    monday.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() || 7) - 1) + (week - 1) * 7);
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    const key = (date) => date.toISOString().slice(0, 10);
    return { start: key(monday), end: key(sunday) };
}
