// Pokémon Champions has no EVs: each stat takes 0–32 Stat Points, 66 in all.
// One point is +1 to the stat at level 50, which is what 8 EVs buy — except the
// first, where 4 EVs already round up. So n SP ↔ 8n − 4 EVs: 32 SP is the
// familiar 252, and a full 66 SP spends at most 508 of the 510 EV budget.
//
// Smogon's Champions sets and usage spreads are written in SP; the app's
// editor, damage calc and Showdown export all speak EVs.

export const SP_MAX_PER_STAT = 32;
export const SP_TOTAL_BUDGET = 66;

/** Stat Points → the EVs that give the same level-50 stat. */
export function statPointsToEvs(sp = 0) {
    const n = Math.max(0, Math.min(SP_MAX_PER_STAT, Math.floor(Number(sp) || 0)));
    return n === 0 ? 0 : 8 * n - 4;
}

/**
 * True when a spread is plainly in Stat Points: every value fits in 0–32 and
 * the total fits the 66-point budget. A real EV spread almost never passes —
 * one 252 fails it — but a deliberately tiny one could, so callers that know
 * the format should trust the format over this guess.
 */
export function looksLikeStatPoints(spread = {}) {
    const values = Object.values(spread || {}).map((v) => Number(v) || 0);
    if (!values.length) return false;
    return values.every((v) => v >= 0 && v <= SP_MAX_PER_STAT) && values.reduce((a, b) => a + b, 0) <= SP_TOTAL_BUDGET;
}

const EV_TOTAL_BUDGET = 510;

/**
 * A whole Stat Point spread → an EV spread the editor will accept.
 *
 * Converting stat by stat is not enough: 66 SP buys one more level-50 point
 * than 510 EVs can (32/32/2 SP is 252/252/12 = 516 EVs). The overflow comes off
 * the least-invested stats first, which costs at most that one point — the
 * same trade every EV spread already makes.
 */
export function statPointSpreadToEvs(spread = {}) {
    const evs = Object.fromEntries(Object.entries(spread || {}).map(([k, v]) => [k, statPointsToEvs(v)]));
    let overflow = Object.values(evs).reduce((a, b) => a + b, 0) - EV_TOTAL_BUDGET;
    const ascending = Object.keys(evs).filter((k) => evs[k] > 0).sort((a, b) => evs[a] - evs[b]);
    for (const k of ascending) {
        if (overflow <= 0) break;
        const cut = Math.min(overflow, evs[k]);
        evs[k] -= cut;
        overflow -= cut;
    }
    return evs;
}
