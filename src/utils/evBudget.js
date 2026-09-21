/**
 * Effort Value budget math.
 *
 * Two rules the games enforce and every editor has to respect: a single stat
 * caps at 252, and the six together cap at 510. The interesting part is what
 * happens when a requested value breaks the *total* — see `clampEv`.
 */

export const EV_MAX_PER_STAT = 252;
export const EV_TOTAL_BUDGET = 510;

const toEv = (value) => {
    const numeric = Math.floor(Number(value));
    return Number.isFinite(numeric) ? numeric : 0;
};

/** Total EVs spent across every stat in the spread. */
export const sumEvs = (evs = {}) => Object.values(evs || {}).reduce((sum, value) => sum + toEv(value), 0);

/** EVs still unspent. Can go negative on legacy/imported spreads over budget. */
export const remainingEvs = (evs = {}) => EV_TOTAL_BUDGET - sumEvs(evs);

/**
 * The highest value `stat` may hold right now: whichever comes first, the
 * per-stat cap or everything the other five stats have left over.
 */
export const maxEvFor = (evs = {}, stat) => {
    const spentElsewhere = sumEvs(evs) - toEv(evs?.[stat]);
    return Math.max(0, Math.min(EV_MAX_PER_STAT, EV_TOTAL_BUDGET - spentElsewhere));
};

/**
 * Clamp a requested value into the legal range for `stat`.
 *
 * Deliberately clamps instead of rejecting: refusing an over-budget edit
 * outright freezes the slider under the user's finger with no explanation,
 * which is what the "it stops at specific spots" report was about. Landing on
 * the largest affordable value keeps the control responsive and shows the cap.
 */
export const clampEv = (evs = {}, stat, rawValue) => {
    if (rawValue === '' || rawValue === null || rawValue === undefined) return 0;
    const requested = Number(rawValue);
    if (!Number.isFinite(requested)) return toEv(evs?.[stat]);
    return Math.max(0, Math.min(Math.floor(requested), maxEvFor(evs, stat)));
};

/** Non-mutating `clampEv` applied to a whole spread. */
export const applyEvChange = (evs = {}, stat, rawValue) => ({
    ...evs,
    [stat]: clampEv(evs, stat, rawValue),
});
