// Pokémon Champions has no EVs: each stat takes 0–32 Stat Points, 66 in all.
// One point is +1 to the stat at level 50, which is what 8 EVs buy — except the
// first, where 4 EVs already round up. So n SP ↔ 8n − 4 EVs: 32 SP is the
// familiar 252, and a full 66 SP spends at most 508 of the 510 EV budget.
//
// Smogon's Champions sets, usage spreads and tournament pastes are written in
// SP. A team member keeps its spread in SP when `customization.evScale` is
// 'sp' (an imported Champions team): Showdown's Champions formats read the
// `EVs:` line of a paste as Stat Points, so that is how it goes back out. Only
// the mainline stat formula (the editor's totals, the in-app battles) needs
// them as EVs — `statPointsToEvs` / `convertSpread` below.

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
const EV_MAX_PER_STAT = 252;

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

/** Inverse of `statPointsToEvs`: the points an EV investment buys at level 50. */
export function evsToStatPoints(evs = 0) {
    const value = Math.floor(Number(evs) || 0);
    return value < 4 ? 0 : Math.min(SP_MAX_PER_STAT, Math.floor((value + 4) / 8));
}

/**
 * Re-express a whole spread in the other scale ('ev' ↔ 'sp'), inside the target
 * budget. The per-stat conversion can overshoot the total by a few points, so
 * the overflow comes off the smallest investments first, as above.
 */
export function convertSpread(spread = {}, fromScale = 'ev', toScale = 'ev') {
    const from = fromScale === 'sp' ? 'sp' : 'ev';
    const to = toScale === 'sp' ? 'sp' : 'ev';
    if (from === to) return { ...(spread || {}) };
    if (to === 'ev') return statPointSpreadToEvs(spread);
    const points = Object.fromEntries(Object.entries(spread || {}).map(([k, v]) => [k, evsToStatPoints(Math.min(EV_MAX_PER_STAT, Number(v) || 0))]));
    let overflow = Object.values(points).reduce((a, b) => a + b, 0) - SP_TOTAL_BUDGET;
    const ascending = Object.keys(points).filter((k) => points[k] > 0).sort((a, b) => points[a] - points[b]);
    for (const k of ascending) {
        if (overflow <= 0) break;
        const cut = Math.min(overflow, points[k]);
        points[k] -= cut;
        overflow -= cut;
    }
    return points;
}

/**
 * Which scale a list of spreads is written in: 'sp' when every invested one
 * passes `looksLikeStatPoints`, 'ev' otherwise, and null when none invests
 * anything (no signal — the caller decides, e.g. from the format).
 */
export function detectEvScale(spreads = []) {
    const invested = (Array.isArray(spreads) ? spreads : [])
        .filter((evs) => evs && Object.values(evs).some((v) => Number(v) > 0));
    if (invested.length === 0) return null;
    return invested.every((evs) => looksLikeStatPoints(evs)) ? 'sp' : 'ev';
}
