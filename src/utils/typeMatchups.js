/**
 * Type matchups read straight off the Gen 6+ chart (constants/typeChart.js).
 * Node-safe (explicit `.js` imports, no assets): the server's prerendered
 * pages and the client's type chart both compute from here.
 */
import { typeChart } from '../constants/typeChart.js';

export const TYPE_IDS = Object.keys(typeChart);

const key = (name) => String(name).toLowerCase();

/** Damage multiplier of one attacking type against a (one- or two-type) typing. */
export function defensiveMultiplier(attacker, types = []) {
    return types.map(key).filter((t) => typeChart[t]).reduce((acc, t) => {
        const entry = Object.entries(typeChart[t].damageTaken).find(([k]) => key(k) === attacker);
        return acc * (entry ? entry[1] : 1);
    }, 1);
}

/** Attacking multiplier of one type into one defending type. */
export function offensiveMultiplier(attacker, defender) {
    return defensiveMultiplier(attacker, [defender]);
}

/**
 * Every attacking type that does more than neutral damage to a typing,
 * strongest first (4× before 2×), in chart order within a tier.
 */
export function weaknessesOf(types = []) {
    if (!types.some((t) => typeChart[key(t)])) return [];
    return TYPE_IDS
        .map((type) => ({ type, multiplier: defensiveMultiplier(type, types) }))
        .filter((w) => w.multiplier > 1)
        .sort((a, b) => b.multiplier - a.multiplier);
}

/** Attacking types a typing takes less than neutral damage from (immunities excluded). */
export function resistancesOf(types = []) {
    return TYPE_IDS
        .map((type) => ({ type, multiplier: defensiveMultiplier(type, types) }))
        .filter((r) => r.multiplier > 0 && r.multiplier < 1)
        .sort((a, b) => a.multiplier - b.multiplier);
}

export function immunitiesOf(types = []) {
    return TYPE_IDS.filter((type) => defensiveMultiplier(type, types) === 0);
}

/** What one type hits for 2×. */
export function strongAgainst(type) {
    return TYPE_IDS.filter((defender) => offensiveMultiplier(type, defender) > 1);
}

/** Both sides of one type, for its page. */
export function typeMatchups(type) {
    const attack = (test) => TYPE_IDS.filter((d) => test(offensiveMultiplier(type, d)));
    return {
        weakTo: weaknessesOf([type]).map((w) => w.type),
        resists: resistancesOf([type]).map((r) => r.type),
        immuneTo: immunitiesOf([type]),
        superEffective: attack((m) => m > 1),
        notVeryEffective: attack((m) => m > 0 && m < 1),
        noEffect: attack((m) => m === 0),
    };
}
