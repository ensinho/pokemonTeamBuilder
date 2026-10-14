// How Limitless tournament results join a Smogon ladder file.
//
// The two answer different questions, so neither replaces the other. Smogon's
// ladder is the broad sample — usage at every rating band, real spreads, Tera,
// teammates. Limitless is the narrow, high-stakes one — what people registered
// for tournaments, and how often it won. The script used to overwrite the
// Smogon file with the Limitless aggregate, which threw away the rating bands
// and, whenever Limitless was unreachable, left the regulation with no win
// rates at all (Reg M-B, 2026-09).
//
// Now: the ladder stays the file's `byId`; each species it covers gains
// `winRate` and a small `tour` summary; and the full tournament ranking lands
// in a top-level `tournament` block the Meta page can rank by instead.

/** True when a baked usage file carries Smogon ladder detail to merge onto. */
export const hasLadderDetail = (file) => Boolean(file?.byId) && (file.detailCutoff != null || Boolean(file.cutoffs));

/**
 * `ladder` — the Smogon per-format file; `reg` — the Limitless aggregate
 * (`{ byId, teamsAnalyzed, tournaments, from, to }`). Returns a new file.
 */
export function mergeTournamentIntoLadder(ladder, reg, { generatedAt = null } = {}) {
    const byId = {};
    for (const [id, mon] of Object.entries(ladder.byId || {})) {
        const t = reg.byId?.[id];
        // A ladder entry carried over from an earlier merge loses its stale
        // tournament fields first, so a species that left the tournament top
        // slice doesn't keep last month's win rate.
        const { winRate: _w, tour: _t, ...rest } = mon;
        byId[id] = t ? { ...rest, winRate: t.winRate, tour: tourSummary(t) } : rest;
    }

    const ranking = {};
    for (const [id, t] of Object.entries(reg.byId || {})) {
        ranking[id] = { name: t.name, usage: t.usage, rawCount: t.teams, winRate: t.winRate };
    }

    return {
        ...ladder,
        byId,
        tournament: {
            source: 'limitless',
            generatedAt,
            teamsAnalyzed: reg.teamsAnalyzed,
            tournaments: reg.tournaments,
            from: reg.from || null,
            to: reg.to || null,
            byId: ranking,
        },
    };
}

const tourSummary = (t) => ({
    usage: t.usage,
    teams: t.teams,
    winRate: t.winRate,
    ...(Number.isFinite(t.topCut) ? { topCut: t.topCut } : {}),
});
