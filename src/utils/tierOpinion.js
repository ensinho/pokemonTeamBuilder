/**
 * His tier list (2026-11-17, "Fantasminha de plantão"): the mascot ranks the
 * day's theme too, and when the trainer's list is complete he says how much
 * they agree. He has a method and a bias, both said out loud on the card:
 * he ranks by base stat total, and a Ghost goes up one tier — the Gengar line
 * always tops his list (he is that ghost).
 *
 * Pure and deterministic: everyone gets the same list of his for a theme, so
 * "concordamos em 9 de 12" means the same thing in the Diário as at home.
 */

import { TIER_KEYS } from './tierList.js';

/** How his list fills the tiers, top to bottom (rounded, at least one in S). */
export const OPINION_SHARES = [0.15, 0.25, 0.3, 0.2, 0.1];
/** The Gengar line: S, always. */
export const FAMILY = new Set([92, 93, 94]);
/** What being a Ghost is worth to him, in base stat points. */
export const GHOST_BONUS = 80;

const statTotal = (stats) => Object.values(stats || {}).reduce((sum, value) => sum + (Number(value) || 0), 0);

/**
 * His tier for each Pokémon.
 * @param {Array<{ id: number, types?: string[], baseStats?: object }>} mons
 * @returns {Record<number, string>}
 */
export function opinionTiers(mons = []) {
    const scored = mons
        .filter((mon) => Number.isInteger(mon?.id))
        .map((mon) => ({
            id: mon.id,
            score: FAMILY.has(mon.id) ? Infinity : statTotal(mon.baseStats) + ((mon.types || []).includes('ghost') ? GHOST_BONUS : 0),
        }))
        // ties keep the dex order, so the list never shuffles between renders
        .sort((a, b) => (b.score - a.score) || (a.id - b.id));
    const n = scored.length;
    const out = {};
    let start = 0;
    TIER_KEYS.forEach((tier, i) => {
        const last = i === TIER_KEYS.length - 1;
        let size = last ? n - start : Math.round(OPINION_SHARES[i] * n);
        if (i === 0 && n > 0) size = Math.max(1, size);
        scored.slice(start, start + size).forEach(({ id }) => { out[id] = tier; });
        start = Math.min(n, start + size);
    });
    // a forced S stays S even past the share
    scored.forEach(({ id }) => { if (FAMILY.has(id)) out[id] = 'S'; });
    return out;
}

/** The trainer's board as `{ id: tier }`. */
export const boardTiers = (board) => Object.fromEntries(TIER_KEYS.flatMap((tier) => (board?.tiers?.[tier] || []).map((id) => [id, tier])));

/**
 * How much the two lists agree, and the one they disagree on most.
 * @returns {{ same: number, total: number, worst: { id: number, mine: string, his: string } | null }}
 */
export function compareTiers(mine = {}, his = {}) {
    const ids = Object.keys(mine).filter((id) => his[id]);
    const rank = (tier) => TIER_KEYS.indexOf(tier);
    let worst = null;
    let same = 0;
    ids.forEach((id) => {
        if (mine[id] === his[id]) { same += 1; return; }
        const gap = Math.abs(rank(mine[id]) - rank(his[id]));
        if (!worst || gap > worst.gap || (gap === worst.gap && Number(id) < worst.id)) worst = { id: Number(id), mine: mine[id], his: his[id], gap };
    });
    return { same, total: ids.length, worst: worst ? { id: worst.id, mine: worst.mine, his: worst.his } : null };
}

/** His face and line for an agreement: close · some · far. */
export function opinionVerdict({ same = 0, total = 0 } = {}) {
    if (!total) return null;
    const share = same / total;
    if (share >= 0.8) return { id: 'close', mood: 'apaixonado' };
    if (share >= 0.5) return { id: 'some', mood: 'confiante' };
    return { id: 'far', mood: 'travesso' };
}
