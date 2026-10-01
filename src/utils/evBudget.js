/**
 * Effort Value budget math.
 *
 * Two rules the games enforce and every editor has to respect: a single stat
 * caps at 252, and the six together cap at 510. The interesting part is what
 * happens when a requested value breaks the *total* — see `clampEv`.
 */

export const EV_MAX_PER_STAT = 252;
export const EV_TOTAL_BUDGET = 510;

/**
 * Two investment scales exist, and a spread only means something once you know
 * which one it is written in:
 *
 *  - `ev`: the mainline games. 252 per stat, 510 in total, 4 EVs per stat point
 *    at level 100 (8 at level 50, after the first 4).
 *  - `sp`: Pokémon Champions' Stat Points. 32 per stat, 66 in total, one point
 *    per stat point. Pokémon Showdown writes them on the same `EVs:` line of a
 *    paste, which is why a Champions tournament team reads "32 SpA / 32 Spe /
 *    2 HP" and must go back out exactly like that.
 *
 * A member says which it uses through `customization.evScale`; absent means `ev`.
 */
export const EV_SCALES = {
    ev: { id: 'ev', maxPerStat: EV_MAX_PER_STAT, total: EV_TOTAL_BUDGET },
    sp: { id: 'sp', maxPerStat: 32, total: 66 },
};

export const evLimitsFor = (scale) => EV_SCALES[scale] || EV_SCALES.ev;

const toEv = (value) => {
    const numeric = Math.floor(Number(value));
    return Number.isFinite(numeric) ? numeric : 0;
};

/** Total EVs spent across every stat in the spread. */
export const sumEvs = (evs = {}) => Object.values(evs || {}).reduce((sum, value) => sum + toEv(value), 0);

/** EVs still unspent. Can go negative on legacy/imported spreads over budget. */
export const remainingEvs = (evs = {}, scale) => evLimitsFor(scale).total - sumEvs(evs);

/**
 * The highest value `stat` may hold right now: whichever comes first, the
 * per-stat cap or everything the other five stats have left over.
 */
export const maxEvFor = (evs = {}, stat, scale) => {
    const { maxPerStat, total } = evLimitsFor(scale);
    const spentElsewhere = sumEvs(evs) - toEv(evs?.[stat]);
    return Math.max(0, Math.min(maxPerStat, total - spentElsewhere));
};

/**
 * Clamp a requested value into the legal range for `stat`.
 *
 * Deliberately clamps instead of rejecting: refusing an over-budget edit
 * outright freezes the slider under the user's finger with no explanation,
 * which is what the "it stops at specific spots" report was about. Landing on
 * the largest affordable value keeps the control responsive and shows the cap.
 */
export const clampEv = (evs = {}, stat, rawValue, scale) => {
    if (rawValue === '' || rawValue === null || rawValue === undefined) return 0;
    const requested = Number(rawValue);
    if (!Number.isFinite(requested)) return toEv(evs?.[stat]);
    return Math.max(0, Math.min(Math.floor(requested), maxEvFor(evs, stat, scale)));
};

/** Non-mutating `clampEv` applied to a whole spread. */
export const applyEvChange = (evs = {}, stat, rawValue, scale) => ({
    ...evs,
    [stat]: clampEv(evs, stat, rawValue, scale),
});

/**
 * The EVs a Stat Point investment is worth. At level 50 the first stat point
 * costs 4 EVs and each one after costs 8, so `n` points are `8n - 4` EVs — which
 * lands 32 points exactly on 252. Used wherever the mainline stat formula has to
 * be fed a Champions spread (the editor's totals, the in-app battle engine).
 */
export const statPointsToEvs = (points) => {
    const value = toEv(points);
    return value <= 0 ? 0 : Math.min(EV_MAX_PER_STAT, value * 8 - 4);
};

/** Inverse of `statPointsToEvs`: the points an EV investment buys at level 50. */
export const evsToStatPoints = (evs) => {
    const value = toEv(evs);
    return value < 4 ? 0 : Math.min(EV_SCALES.sp.maxPerStat, Math.floor((value + 4) / 8));
};

/** One stat's investment expressed in EVs, whatever scale it was written in. */
export const effectiveEv = (value, scale) => (scale === 'sp' ? statPointsToEvs(value) : toEv(value));

/**
 * Re-express a whole spread in another scale, staying inside the target budget.
 * The per-stat conversion can overshoot the total by a few points (three
 * invested stats are 516 EVs for 66 Stat Points), so the overflow comes off the
 * smallest investments first — those are the leftovers, never the 252s.
 */
export const convertSpread = (evs = {}, fromScale, toScale) => {
    const from = evLimitsFor(fromScale).id;
    const to = evLimitsFor(toScale).id;
    if (from === to) return { ...evs };

    const convert = to === 'sp' ? evsToStatPoints : statPointsToEvs;
    const next = {};
    for (const [stat, value] of Object.entries(evs || {})) next[stat] = convert(value);

    let overflow = sumEvs(next) - evLimitsFor(to).total;
    const smallestFirst = Object.keys(next).filter((stat) => next[stat] > 0).sort((a, b) => next[a] - next[b]);
    for (const stat of smallestFirst) {
        if (overflow <= 0) break;
        const cut = Math.min(next[stat], overflow);
        next[stat] -= cut;
        overflow -= cut;
    }
    return next;
};

/**
 * Which scale a set of spreads is written in. Stat Points never exceed 32 in a
 * stat or 66 in total; a real EV spread essentially always does (a lone 252
 * already breaks both). Spreads that invest nothing carry no signal and are
 * skipped, so an all-empty list reports `null` — "cannot tell" — rather than
 * guessing.
 */
export const detectEvScale = (spreads = []) => {
    const invested = (Array.isArray(spreads) ? spreads : []).filter((evs) => evs && sumEvs(evs) > 0);
    if (invested.length === 0) return null;
    const { maxPerStat, total } = EV_SCALES.sp;
    const looksLikePoints = invested.every((evs) =>
        sumEvs(evs) <= total && Object.values(evs).every((value) => toEv(value) <= maxPerStat));
    return looksLikePoints ? 'sp' : 'ev';
};
