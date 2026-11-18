import { analyzeTeam, rateTeam, typeChartFor, typesForEra } from './teamAnalysis';
import { buildBaseIdLookup, speciesIdOf, wouldDuplicateSpecies } from './teamUniqueness';
import { prettyPokemonName } from './teamDraft';

/**
 * Competitive pressure order for attacking types: used only as a deterministic
 * tie-breaker when two vulnerabilities share the same count and severity.
 */
const THREAT_PRIORITY = [
    'ground',
    'ice',
    'fairy',
    'water',
    'fire',
    'fighting',
    'electric',
    'ghost',
    'dark',
    'dragon',
    'rock',
    'steel',
    'flying',
    'grass',
    'poison',
    'psychic',
    'bug',
    'normal',
];

const CORE_DEFENSIVE_TYPES = new Set([
    'ground',
    'ice',
    'fairy',
    'water',
    'fire',
    'fighting',
    'electric',
    'ghost',
    'dark',
    'dragon',
    'rock',
    'steel',
]);

const threatRank = (type) => {
    const idx = THREAT_PRIORITY.indexOf(type);
    return idx >= 0 ? THREAT_PRIORITY.length - idx : 0;
};

const BATTLE_ONLY_FORM_RE = /(?:-mega(?:-[xy])?|-primal|-gmax|-totem|^mega\s)/i;

const isBattleOnlyForm = (pokemon) => {
    const slug = `${pokemon?.apiName || ''} ${pokemon?.name || ''}`.trim();
    return BATTLE_ONLY_FORM_RE.test(slug);
};

const sumBaseStats = (pokemon) => {
    const stats = pokemon?.baseStats;
    if (Array.isArray(pokemon?.stats)) {
        return pokemon.stats.reduce((acc, entry) => acc + (Number(entry?.base_stat) || 0), 0);
    }
    if (stats && typeof stats === 'object') {
        return Object.values(stats).reduce((acc, value) => acc + (Number(value) || 0), 0);
    }
    return 0;
};

const viabilityScore = (pokemon, metaUsage) => {
    const usage = metaUsage instanceof Map ? (metaUsage.get(pokemon.id) || 0) : 0;
    const usageBonus = Math.min(usage, 40) * 0.45;
    const bst = sumBaseStats(pokemon);
    if (!bst) return usageBonus;
    if (bst >= 460 && bst <= 600) return usageBonus + 14 + (bst - 460) * 0.03;
    if (bst >= 410 && bst < 460) return usageBonus + 8;
    if (bst > 600) return usageBonus + (usage >= 5 ? 14 : 4);
    return usageBonus - 20;
};

/**
 * Defensive damage multiplier taken by `pokemon` from `attackingType` (`0`,
 * `0.25`, `0.5`, `1`, `2`, `4`), matching `analyzeTeam`'s type chart & era rules.
 */
export function typeMultiplierAgainst(pokemon, attackingType, { legacyTypes = false } = {}) {
    const types = typesForEra(pokemon?.types || [], legacyTypes);
    if (!types.length || !attackingType) return 1;
    const chart = typeChartFor(legacyTypes);
    const cap = attackingType.charAt(0).toUpperCase() + attackingType.slice(1);
    return types.reduce((acc, defType) => acc * (chart[defType]?.damageTaken?.[cap] ?? 1), 1);
}

/**
 * Normalises a team array (either a compact `0..6` roster or a 6-slot sparse
 * array with `null` holes) into active members and the first open slot index.
 */
export function resolveTeamSlots(team = []) {
    const list = Array.isArray(team) ? team : [];
    const members = list.filter((m) => m && Array.isArray(m.types) && m.types.length > 0);
    if (members.length < 2 || members.length >= 6) return null;

    const holeIndex = list.findIndex((m) => !m);
    const openSlotIndex = holeIndex >= 0 && holeIndex < 6 ? holeIndex : members.length;
    return {
        members,
        openSlotIndex,
        openSlotNumber: openSlotIndex + 1,
    };
}

const isAnalysisBlank = (a) => {
    if (!a) return true;
    const target = a.teamAnalysis || a;
    const strSize = target.strengths instanceof Set
        ? target.strengths.size
        : (Array.isArray(target.strengths) ? target.strengths.length : 0);
    const weakSize = target.weaknesses ? Object.keys(target.weaknesses).length : 0;
    const covSize = target.defensiveCoverage ? Object.keys(target.defensiveCoverage).length : 0;
    return strSize === 0 && weakSize === 0 && covSize === 0;
};

const normalizeAnalysisInput = (members, analysis, pokemonsList, legacyTypes) => {
    const computed = isAnalysisBlank(analysis)
        ? analyzeTeam(members, pokemonsList, { legacyTypes })
        : null;
    const teamAnalysis = computed?.teamAnalysis || analysis?.teamAnalysis || analysis || {
        strengths: new Set(),
        weaknesses: {},
        defensiveCoverage: {},
    };

    const suggestedIds = new Set();
    const extraCandidates = [];
    const collectSuggested = (source) => {
        if (!source) return;
        for (const item of source) {
            if (item && typeof item === 'object' && item.id != null) {
                suggestedIds.add(item.id);
                extraCandidates.push(item);
            } else if (item != null) {
                suggestedIds.add(item);
            }
        }
    };
    collectSuggested(analysis?.suggestedPokemonIds);
    collectSuggested(analysis?.suggestedPokemon);
    collectSuggested(computed?.suggestedPokemonIds);

    return { teamAnalysis, suggestedIds, extraCandidates };
};

/**
 * Ranks every tactical vulnerability or defensive coverage gap on a partial
 * team (`2..5` Pokémon). Returns `null` when the team has `< 2` members or is full.
 */
export function inspectTeamVulnerabilities(team = [], analysis = null, { legacyTypes = false } = {}) {
    const slotState = resolveTeamSlots(team);
    if (!slotState) return null;
    const { members, openSlotIndex, openSlotNumber } = slotState;
    const { teamAnalysis } = normalizeAnalysisInput(members, analysis, [], legacyTypes);
    const chart = typeChartFor(legacyTypes);
    const flaggedWeaknesses = teamAnalysis?.weaknesses || {};

    const rows = [];
    for (const type of Object.keys(chart)) {
        let weakCount = 0;
        let quadWeakCount = 0;
        let resistCount = 0;
        let immuneCount = 0;

        for (const member of members) {
            const mult = typeMultiplierAgainst(member, type, { legacyTypes });
            if (mult === 0) {
                immuneCount += 1;
            } else if (mult >= 4) {
                weakCount += 1;
                quadWeakCount += 1;
            } else if (mult > 1) {
                weakCount += 1;
            } else if (mult < 1) {
                resistCount += 1;
            }
        }

        const safeCount = resistCount + immuneCount;
        const isCritical = weakCount >= 2 && safeCount === 0;
        const isFlagged = Boolean(flaggedWeaknesses[type]) || (weakCount >= 2 && weakCount > safeCount);
        const isUnresistedQuad = quadWeakCount >= 1 && safeCount === 0;
        const isUnresistedSingle = weakCount === 1 && safeCount === 0;
        const isMissingCoreResist = weakCount === 0 && safeCount === 0 && CORE_DEFENSIVE_TYPES.has(type);

        let kind = null;
        let tierWeight = 0;
        if (isCritical) {
            kind = 'critical_weakness';
            tierWeight = 3000 + quadWeakCount * 200 + weakCount * 80;
        } else if (isFlagged || isUnresistedQuad) {
            kind = 'shared_weakness';
            tierWeight = 2000 + (weakCount - safeCount) * 90 + quadWeakCount * 140 + weakCount * 40;
        } else if (isUnresistedSingle) {
            kind = 'coverage_gap';
            tierWeight = 1000 + quadWeakCount * 100 + 40;
        } else if (isMissingCoreResist) {
            kind = 'coverage_gap';
            tierWeight = 500;
        }

        if (kind) {
            rows.push({
                type,
                kind,
                isCritical,
                weakCount,
                quadWeakCount,
                resistCount,
                immuneCount,
                safeCount,
                priorityScore: tierWeight + threatRank(type),
            });
        }
    }

    rows.sort((a, b) => b.priorityScore - a.priorityScore);
    return { members, openSlotIndex, openSlotNumber, teamAnalysis, rows };
}

/**
 * Identifies the #1 actionable tactical vulnerability for a partial team
 * (`2..5` Pokémon, `>= 1` open slot) and ranks up to `limit` (default 3)
 * concrete Pokémon candidates with exact `scoreBefore → scoreAfter` (`0–100`)
 * team synergy ratings when placed in the first open slot.
 *
 * @param {Array<object|null>} team
 * @param {object|null} analysis
 * @param {Array<object>} pokemonsList
 * @param {{
 *   legacyTypes?: boolean,
 *   speciesClause?: boolean,
 *   allowedIds?: Set<number|string>|Array<number|string>|null,
 *   metaUsage?: Map<number, number>|null,
 *   suggestedPokemonIds?: Iterable<number|string>|null,
 *   limit?: number,
 * }} [options]
 */
export function buildTacticalDecision(team = [], analysis = null, pokemonsList = [], options = {}) {
    const {
        legacyTypes = false,
        speciesClause = true,
        allowedIds = null,
        metaUsage = null,
        suggestedPokemonIds = null,
        limit = 3,
    } = options;

    const slotState = resolveTeamSlots(team);
    if (!slotState) return null;
    const { members, openSlotIndex, openSlotNumber } = slotState;

    const { teamAnalysis, suggestedIds, extraCandidates } = normalizeAnalysisInput(
        members,
        analysis,
        pokemonsList,
        legacyTypes,
    );
    if (suggestedPokemonIds) {
        for (const id of suggestedPokemonIds) suggestedIds.add(id);
    }

    const inspection = inspectTeamVulnerabilities(team, teamAnalysis, { legacyTypes });
    if (!inspection || inspection.rows.length === 0) return null;

    const rawPool = [...(Array.isArray(pokemonsList) ? pokemonsList : []), ...extraCandidates];
    if (rawPool.length === 0) return null;

    const baseIdOf = buildBaseIdLookup(rawPool);
    const memberIds = new Set(members.map((m) => m.id));
    const allowedSet = allowedIds
        ? (allowedIds instanceof Set ? allowedIds : new Set(allowedIds))
        : null;

    const seenPoolIds = new Set();
    const eligiblePool = [];
    for (const entry of rawPool) {
        if (!entry || entry.id == null || !Array.isArray(entry.types) || entry.types.length === 0) continue;
        if (seenPoolIds.has(entry.id) || memberIds.has(entry.id)) continue;
        if (allowedSet && !allowedSet.has(entry.id)) continue;
        if (speciesClause && wouldDuplicateSpecies(members, entry, baseIdOf)) continue;
        seenPoolIds.add(entry.id);
        eligiblePool.push(entry);
    }
    if (eligiblePool.length === 0) return null;

    const nonBattleForms = eligiblePool.filter((entry) => !isBattleOnlyForm(entry));
    const candidatePools = nonBattleForms.length > 0 ? [nonBattleForms, eligiblePool] : [eligiblePool];

    const beforeRating = rateTeam(teamAnalysis, members.length);
    const beforeWeakTypes = Object.keys(teamAnalysis?.weaknesses || {});
    const beforeStrengths = teamAnalysis?.strengths instanceof Set
        ? teamAnalysis.strengths
        : new Set(Array.isArray(teamAnalysis?.strengths) ? teamAnalysis.strengths : []);

    const rankCandidatesForRow = (row, pool) => {
        const scored = [];
        for (const entry of pool) {
            const threatMultiplier = typeMultiplierAgainst(entry, row.type, { legacyTypes });
            if (threatMultiplier >= 1) continue;

            const nextTeam = [...members, entry];
            const nextAnalysis = analyzeTeam(nextTeam, [], { legacyTypes }).teamAnalysis;
            const afterRating = rateTeam(nextAnalysis, nextTeam.length);
            const scoreAfter = afterRating.score;
            const scoreDelta = scoreAfter - beforeRating.score;

            // Pure coverage gaps (no current weakness) must genuinely lift team synergy.
            if (row.kind === 'coverage_gap' && row.weakCount === 0 && scoreDelta <= 0) continue;

            const coveredWeaknesses = beforeWeakTypes.filter(
                (weakType) => typeMultiplierAgainst(entry, weakType, { legacyTypes }) < 1,
            );
            if (!coveredWeaknesses.includes(row.type)) {
                coveredWeaknesses.unshift(row.type);
            }

            const addedStrengths = [...nextAnalysis.strengths].filter((t) => !beforeStrengths.has(t));
            const defenseBonus = threatMultiplier === 0 ? 18 : threatMultiplier <= 0.25 ? 10 : 4;
            const suggestedBonus = suggestedIds.has(entry.id) ? 4 : 0;
            const rankScore = scoreAfter * 3
                + defenseBonus
                + coveredWeaknesses.length * 5
                + suggestedBonus
                + viabilityScore(entry, metaUsage);

            scored.push({
                pokemon: entry,
                id: entry.id,
                speciesKey: speciesIdOf(entry, baseIdOf) ?? entry.id,
                name: prettyPokemonName(entry.name || `#${entry.id}`),
                types: typesForEra(entry.types, legacyTypes),
                threatMultiplier,
                coveredWeaknesses,
                addedStrengths,
                scoreBefore: beforeRating.score,
                scoreAfter,
                scoreDelta,
                gradeAfter: afterRating.grade,
                rankScore,
            });
        }

        scored.sort((a, b) => (
            b.rankScore - a.rankScore
            || b.scoreAfter - a.scoreAfter
            || a.threatMultiplier - b.threatMultiplier
            || (Number(a.id) || 0) - (Number(b.id) || 0)
        ));

        const distinct = [];
        const usedSpecies = new Set();
        for (const item of scored) {
            if (usedSpecies.has(item.speciesKey)) continue;
            usedSpecies.add(item.speciesKey);
            const { rankScore: _rankScore, speciesKey: _speciesKey, ...clean } = item;
            distinct.push(clean);
            if (distinct.length >= Math.max(1, limit)) break;
        }
        return distinct;
    };

    for (const row of inspection.rows) {
        for (const pool of candidatePools) {
            const candidates = rankCandidatesForRow(row, pool);
            if (candidates.length > 0) {
                return {
                    kind: row.kind,
                    isCritical: row.isCritical,
                    threatType: row.type,
                    weakCount: row.weakCount,
                    quadWeakCount: row.quadWeakCount,
                    resistCount: row.resistCount,
                    immuneCount: row.immuneCount,
                    openSlotIndex,
                    openSlotNumber,
                    scoreBefore: beforeRating.score,
                    gradeBefore: beforeRating.grade,
                    candidates,
                };
            }
        }
    }

    return null;
}
