// Team-aware synergy suggestion engine.
//
// Given the active team, it ranks the WHOLE competitively-relevant dex (not just
// the Pokémon currently loaded in the picker) and returns the most effective
// partners, each tagged with WHY it's suggested:
//   • partner  — frequently teamed with a member in real tournaments
//   • ability  — completes a meta core (e.g. Tyranitar's sand → Excadrill)
//   • type     — covers a type the team is collectively weak to
// Reactive: call it with the current team and it re-ranks from scratch.

import { typeChart } from '../constants/types';
import { buildCores } from './metaCores';

const TYPES = Object.keys(typeChart);
const capType = (t = '') => t.charAt(0).toUpperCase() + t.slice(1);

// Defensive multiplier of `attacking` against a Pokémon with `defTypes`.
const defMultiplier = (attacking, defTypes = []) =>
    defTypes.reduce((m, d) => m * (typeChart[d]?.damageTaken?.[capType(attacking)] ?? 1), 1);

const WEIGHTS = { ABILITY: 40, PARTNER_CAP: 30, TYPE_PER: 6, USAGE_FACTOR: 0.5, USAGE_CAP: 30 };
// A pure type-coverage pick must be meta-relevant to surface (avoids suggesting
// a frail early-route mon just because it resists a type).
const COVERAGE_MIN_BST = 500;

const bstOf = (entry) => entry ? Object.values(entry.baseStats || {}).reduce((a, b) => a + (b || 0), 0) : 0;

/**
 * @param {object} ctx
 * @param {Array<{id:number, types?:string[]}>} ctx.team   - active team
 * @param {Array<{id:number,name:string,types:string[],baseStats:object}>} ctx.pokemonIndex
 * @param {{co?:Map, usage?:Map}} ctx.synergy              - tournament co-occurrence model
 * @param {Record<string,object>} ctx.smogonById           - smogon.json byId
 * @param {Record<string,object>} ctx.usageById            - competitive-usage.json byId
 * @param {Array<{id:number,name:string,count:number}>} ctx.popular
 * @param {number} [ctx.limit=12]
 * @param {Set<number>|null} [ctx.allowedIds] - when set (game filter active), only
 *        Pokémon obtainable in the selected game are eligible to be suggested.
 * @returns {Array<{id,name,types,score,reasons,primary}>}
 */
export function buildSynergySuggestions({
    team = [], pokemonIndex = [], synergy = {}, smogonById = {}, usageById = {}, popular = [], metaUsage = null, limit = 15, allowedIds = null,
} = {}) {
    const indexById = new Map(pokemonIndex.map((p) => [p.id, p]));
    // Prefer the real Smogon ladder usage (metaUsage) for every "how meta is this"
    // signal; fall back to the tournament popular counts when it's unavailable.
    const popularMap = (metaUsage && metaUsage.size) ? metaUsage : new Map(popular.map((p) => [p.id, p.count]));
    const teamIds = new Set(team.map((p) => p.id));
    const { co, usage } = synergy || {};
    const nameOf = (id) => indexById.get(id)?.name || `#${id}`;
    const typesOf = (id) => indexById.get(id)?.types || [];

    // Empty team → the meta's most-used Pokémon as a starting point.
    if (team.length === 0) {
        const ranked = (metaUsage && metaUsage.size)
            ? [...metaUsage.entries()].sort((a, b) => b[1] - a[1])
            : (usage ? [...usage.entries()].sort((a, b) => b[1] - a[1]) : []);
        return ranked
            .filter(([id]) => indexById.has(id) && (!allowedIds || allowedIds.has(id)))
            .slice(0, limit)
            .map(([id]) => ({ id, name: nameOf(id), types: typesOf(id), score: 0, reasons: [{ kind: 'meta', label: 'Top meta pick' }], primary: { kind: 'meta', label: 'Top meta pick' } }));
    }

    const cand = new Map(); // id -> { reasons: [], score }
    const add = (id, reason) => {
        if (teamIds.has(id) || !indexById.has(id)) return;
        if (allowedIds && !allowedIds.has(id)) return; // game filter: keep suggestions obtainable
        if (!cand.has(id)) cand.set(id, { reasons: [], score: 0 });
        const c = cand.get(id);
        c.reasons.push(reason);
        c.score += reason.weight || 0;
    };

    // 1) ABILITY / core synergy — the highest-signal reason.
    const cores = buildCores({ smogonById, usageById, popular });
    for (const core of cores) {
        const hasSetter = core.setters.some((s) => teamIds.has(s.id));
        const hasAbuser = core.abusers.some((a) => teamIds.has(a.id));
        if (hasSetter) {
            for (const ab of core.abusers) add(ab.id, { kind: 'ability', coreId: core.id, label: `${core.name}: ${ab.tag}`, weight: WEIGHTS.ABILITY });
        } else if (hasAbuser) {
            for (const st of core.setters) add(st.id, { kind: 'ability', coreId: core.id, label: `Sets ${core.name}`, weight: WEIGHTS.ABILITY });
        }
    }

    // 2) PARTNER — tournament co-occurrence, weighting the most-recently-added mon.
    if (co) {
        const lastId = team[team.length - 1]?.id;
        const agg = new Map(); // id -> { score, bestMember, bestCount }
        for (const mem of teamIds) {
            const partners = co.get(mem);
            if (!partners) continue;
            const w = mem === lastId ? 2.5 : 1;
            for (const [pid, count] of partners) {
                if (teamIds.has(pid)) continue;
                const e = agg.get(pid) || { score: 0, bestMember: mem, bestCount: 0 };
                e.score += count * w;
                if (count > e.bestCount) { e.bestCount = count; e.bestMember = mem; }
                agg.set(pid, e);
            }
        }
        for (const [pid, e] of agg) {
            add(pid, { kind: 'partner', label: `Pairs with ${nameOf(e.bestMember)}`, weight: Math.min(e.score, WEIGHTS.PARTNER_CAP) });
        }
    }

    // 3) TYPE coverage — partners that resist the team's shared weaknesses.
    const weakTypes = [];
    for (const atk of TYPES) {
        let weak = 0; let res = 0;
        for (const mem of team) {
            const m = defMultiplier(atk, mem.types || typesOf(mem.id));
            if (m > 1) weak += 1; else if (m < 1) res += 1;
        }
        if (weak >= Math.ceil(team.length / 2) && weak > res) weakTypes.push(atk);
    }
    if (weakTypes.length) {
        const relevant = new Set([...Object.keys(smogonById).map(Number), ...(usage ? [...usage.keys()] : []), ...popularMap.keys()]);
        for (const id of relevant) {
            if (teamIds.has(id) || !indexById.has(id)) continue;
            const entry = indexById.get(id);
            const isMeta = (popularMap.get(id) || 0) > 0 || bstOf(entry) >= COVERAGE_MIN_BST;
            if (!isMeta) continue;
            const covered = weakTypes.filter((t) => defMultiplier(t, entry.types || []) < 1);
            if (covered.length) {
                add(id, { kind: 'type', label: `Covers ${capType(covered[0])}${covered.length > 1 ? ` +${covered.length - 1}` : ''}`, weight: covered.length * WEIGHTS.TYPE_PER });
            }
        }
    }

    // Effectiveness boosts so the strongest options float up within each reason:
    // real tournament usage first, then raw base-stat total as a gentle tiebreak.
    for (const [id, c] of cand) {
        const usageCount = (popularMap.get(id) || 0) + (usageById[id]?.n || 0);
        c.score += Math.min(usageCount, WEIGHTS.USAGE_CAP) * WEIGHTS.USAGE_FACTOR;
        c.score += Math.min(bstOf(indexById.get(id)) / 120, 5);
    }

    return [...cand.entries()]
        .sort((a, b) => b[1].score - a[1].score)
        .slice(0, limit)
        .map(([id, c]) => {
            const primary = [...c.reasons].sort((x, y) => (y.weight || 0) - (x.weight || 0))[0];
            return { id, name: nameOf(id), types: typesOf(id), score: c.score, reasons: c.reasons, primary };
        });
}
