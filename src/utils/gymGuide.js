import { typeChart } from '../constants/typeChart';

/**
 * What to bring against a gym leader's team (2026-11-12, GymsView's stage):
 * the attacking types that hit the most members super effectively. Pure, read
 * from the type chart — the same multipliers the team analysis uses.
 */

const ATTACKERS = Object.keys(typeChart);
const cap = (type) => type.charAt(0).toUpperCase() + type.slice(1);

/** How hard an attack of `attacker` hits a Pokémon with these types (0, 0.25 … 4). */
export function effectiveness(attacker, types = []) {
    return types.reduce((product, type) => {
        const taken = typeChart[type]?.damageTaken?.[cap(attacker)];
        return product * (taken === undefined ? 1 : taken);
    }, 1);
}

/**
 * The best types to bring.
 * @param {string[][]} team  each member's types (lower-case); members with none are skipped
 * @param {number} [limit]
 * @returns {{ type: string, hits: number, quad: number, resisted: number, of: number }[]} most members hit first, 4× before 2×
 */
export function teamCounters(team = [], limit = 4) {
    const members = team.filter((types) => Array.isArray(types) && types.length > 0);
    if (!members.length) return [];
    return ATTACKERS
        .map((type) => {
            const marks = members.map((types) => effectiveness(type, types));
            return {
                type,
                hits: marks.filter((m) => m > 1).length,
                quad: marks.filter((m) => m >= 4).length,
                resisted: marks.filter((m) => m < 1).length,
                of: members.length,
            };
        })
        .filter((row) => row.hits > 0)
        .sort((a, b) => b.hits - a.hits || b.quad - a.quad || a.resisted - b.resisted || a.type.localeCompare(b.type))
        .slice(0, limit);
}
