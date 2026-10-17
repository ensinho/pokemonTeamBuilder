/**
 * Effort Value budget math.
 *
 * Two rules the games enforce and every editor has to respect: a single stat
 * caps at 252, and the six together cap at 510. The interesting part is what
 * happens when a requested value breaks the *total* — see `clampEv`.
 */

import { SP_MAX_PER_STAT, SP_TOTAL_BUDGET } from './statPoints';

export const EV_MAX_PER_STAT = 252;
export const EV_TOTAL_BUDGET = 510;

/**
 * The same rules on Pokémon Champions' Stat Points scale (32 per stat, 66 in
 * all — see statPoints.js). A member says which scale its spread is written in
 * through `customization.evScale`; absent means EVs.
 */
export const EV_SCALES = {
    ev: { id: 'ev', maxPerStat: EV_MAX_PER_STAT, total: EV_TOTAL_BUDGET },
    sp: { id: 'sp', maxPerStat: SP_MAX_PER_STAT, total: SP_TOTAL_BUDGET },
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
