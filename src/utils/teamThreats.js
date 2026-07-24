import { typeChart } from '../constants/types';

// Ranks the meta Pokémon that most PRESSURE the current team, from real
// competitive data (usage + tournament win-rate, mined by build-limitless-usage).
//
// A "threat" score blends two independent signals so neither dominates:
//   1. meta prominence  — how much this mon actually shows up AND wins
//      (usage% scaled by win-rate; a 55% win-rate mon weighs ~1.1×, a 45% ~0.9×).
//   2. matchup pressure — how hard its STAB types hit YOUR team, i.e. the share
//      of your members that take super-effective damage from its type(s).
//
// Only mons that actually threaten the team (≥1 member weak to their STAB) are
// returned, most-threatening first. Pure + deterministic → unit-testable.

const cap = (type) => type.charAt(0).toUpperCase() + type.slice(1);

// Combined damage multiplier an attack of `attackingType` deals to a defender
// with `defenderTypes` (product across the defender's types).
const multiplierInto = (attackingType, defenderTypes = []) =>
    defenderTypes.reduce((acc, defType) => acc * (typeChart[defType]?.damageTaken[cap(attackingType)] ?? 1), 1);

/**
 * @param {Array<{types?: string[]}>} team - current team members (each with `types`)
 * @param {Array<{id:number,name?:string,types?:string[],usage?:number,winRate?:number}>} meta
 *        - ranked meta list for the selected regulation
 * @param {{ limit?: number, excludeIds?: Set<number> }} [opts]
 * @returns {Array<{id, name, types, usage, winRate, weakCount, teamSize, worst, score}>}
 */
export const buildTeamThreats = (team = [], meta = [], opts = {}) => {
    const { limit = 6, excludeIds = new Set() } = opts;
    if (!team.length || !meta.length) return [];

    const teamSize = team.length;
    const memberTypes = team.map((p) => p.types || []);

    const scored = [];
    for (const mon of meta) {
        if (!mon || excludeIds.has(mon.id)) continue;
        const attackTypes = (mon.types || []).filter((t) => typeChart[t]);
        if (!attackTypes.length) continue;

        // How many team members are hit super-effectively by ANY of the threat's
        // STAB types, and how hard the worst hit lands (max multiplier over members).
        let weakCount = 0;
        let worst = 1;
        for (const defTypes of memberTypes) {
            const best = attackTypes.reduce((m, at) => Math.max(m, multiplierInto(at, defTypes)), 0);
            if (best > 1) weakCount += 1;
            if (best > worst) worst = best;
        }
        if (weakCount === 0) continue; // doesn't pressure this team — not a threat

        const usage = Number.isFinite(mon.usage) ? mon.usage : 0;
        // Win-rate nudges prominence around a 50% baseline; missing → neutral (1).
        const perf = Number.isFinite(mon.winRate) ? mon.winRate / 50 : 1;
        const pressure = (weakCount / teamSize) * Math.min(worst, 4); // 0..~4
        const score = Math.max(usage, 0.5) * perf * pressure;

        scored.push({
            id: mon.id,
            name: mon.name,
            types: mon.types || [],
            usage,
            winRate: Number.isFinite(mon.winRate) ? mon.winRate : null,
            weakCount,
            teamSize,
            worst,
            score,
        });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit);
};
