import { typeChart } from '../constants/types';

/**
 * The Gen 2–5 type chart, for playthroughs of games that predate Fairy (X/Y).
 * Two differences from the modern chart: no Fairy at all, and Steel still
 * resists Ghost and Dark (it lost both in Gen 6). Gen 1's own quirks are not
 * modelled — it is close enough for team coverage.
 */
export const LEGACY_TYPE_CHART = (() => {
    const stripFairy = (table = {}) => Object.fromEntries(
        Object.entries(table).filter(([type]) => type !== 'Fairy'),
    );
    const chart = Object.fromEntries(
        Object.entries(typeChart)
            .filter(([type]) => type !== 'fairy')
            .map(([type, { damageTaken, damageDealt }]) => [type, {
                damageTaken: stripFairy(damageTaken),
                damageDealt: stripFairy(damageDealt),
            }]),
    );
    chart.steel.damageTaken = { ...chart.steel.damageTaken, Ghost: 0.5, Dark: 0.5 };
    chart.ghost.damageDealt = { ...chart.ghost.damageDealt, Steel: 0.5 };
    chart.dark.damageDealt = { ...chart.dark.damageDealt, Steel: 0.5 };
    return chart;
})();

const ROMAN_GENERATION = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9 };

/** True for a game generation ('generation-iii' or 3) that predates Fairy. */
export const isPreFairyGeneration = (generation) => {
    const n = typeof generation === 'number'
        ? generation
        : ROMAN_GENERATION[String(generation || '').replace(/^generation-/, '').toLowerCase()];
    return Boolean(n) && n < 6;
};

export const typeChartFor = (legacyTypes = false) => (legacyTypes ? LEGACY_TYPE_CHART : typeChart);

/**
 * A Pokémon's typing before Fairy existed. Every retyped Pokémon follows one
 * rule: a primary Fairy was Normal (Clefairy, Togepi, Snubbull; Togekiss was
 * Normal/Flying), a secondary Fairy simply wasn't there (Azumarill was pure
 * Water, Gardevoir pure Psychic, Jigglypuff pure Normal).
 */
export const typesForEra = (types = [], legacyTypes = false) => {
    if (!legacyTypes || !types.includes('fairy')) return types;
    const mapped = types[0] === 'fairy' ? ['normal', ...types.slice(1)] : types.filter((type) => type !== 'fairy');
    return [...new Set(mapped)];
};

/**
 * Pure type-coverage engine for a team.
 *
 * Extracted from `useActiveTeamStore` so it can be unit-tested in isolation
 * and reused (quiz hints, generator, recommendations) without instantiating
 * the store. Takes the data it needs as arguments — no store access here.
 *
 * @param {Array<{types?: string[]}>} currentTeam - team members (each with a `types` array)
 * @param {Array<{id: number|string, types?: string[]}>} pokemonsList - full pokédex, used to suggest fillers
 * @param {{ legacyTypes?: boolean }} [options] - legacyTypes: analyse with the pre-Fairy (Gen 2–5) chart and typings
 * @returns {{ teamAnalysis: { strengths: Set<string>, weaknesses: Object, defensiveCoverage: Object }, suggestedPokemonIds: Set<number|string> }}
 */
export const analyzeTeam = (currentTeam = [], pokemonsList = [], { legacyTypes = false } = {}) => {
    if (currentTeam.length === 0) {
        return {
            teamAnalysis: { strengths: new Set(), weaknesses: {}, defensiveCoverage: {} },
            suggestedPokemonIds: new Set(),
        };
    }

    const chart = typeChartFor(legacyTypes);
    const typesOf = (pokemon) => typesForEra(pokemon.types || [], legacyTypes);
    const teamWeaknessCounts = {};
    const teamResistanceCounts = {};
    const offensiveCoverage = new Set();

    currentTeam.flatMap(typesOf).forEach(type => {
        Object.entries(chart[type]?.damageDealt || {}).forEach(([vs, mult]) => {
            if (mult > 1) offensiveCoverage.add(vs.toLowerCase());
        });
    });

    Object.keys(chart).forEach(attackingType => {
        const capitalizedAttackingType = attackingType.charAt(0).toUpperCase() + attackingType.slice(1);
        let weakCount = 0;
        let resistanceCount = 0;

        currentTeam.forEach(pokemon => {
            const multiplier = typesOf(pokemon).reduce((acc, pokemonType) => {
                return acc * (chart[pokemonType]?.damageTaken[capitalizedAttackingType] ?? 1);
            }, 1);

            if (multiplier > 1) {
                weakCount++;
            } else if (multiplier < 1) {
                resistanceCount++;
            }
        });

        if (weakCount > 0 && weakCount >= currentTeam.length / 2 && weakCount > resistanceCount) {
            teamWeaknessCounts[attackingType] = weakCount;
        }

        if (resistanceCount > 0) {
            teamResistanceCounts[attackingType] = resistanceCount;
        }
    });

    const weaknessTypes = Object.keys(teamWeaknessCounts);
    let suggestions = new Set();
    if (weaknessTypes.length > 0 && pokemonsList.length > 0) {
        const potentialSuggestions = pokemonsList.filter(p => {
            if (!p.types) return false;
            return weaknessTypes.some(weakType => {
                const capitalizedWeakType = weakType.charAt(0).toUpperCase() + weakType.slice(1);
                const typeMultiplier = typesOf(p).reduce((multiplier, pokemonType) => {
                    return multiplier * (chart[pokemonType]?.damageTaken[capitalizedWeakType] ?? 1);
                }, 1);
                return typeMultiplier < 1;
            });
        });
        suggestions = new Set(potentialSuggestions.map(p => p.id).slice(0, 10));
    }

    return {
        teamAnalysis: {
            strengths: offensiveCoverage,
            weaknesses: teamWeaknessCounts,
            defensiveCoverage: teamResistanceCounts,
        },
        suggestedPokemonIds: suggestions,
    };
};

/**
 * One rating for a team, used everywhere a team is graded (phone analysis
 * chip, desktop identity strip, saved-team detail). Three formulas used to
 * disagree on the same roster — "Risky" on the phone, "Strong" on desktop, 72
 * on the detail page — so this is the only one.
 *
 * Score 0–100: a neutral 50, plus offensive breadth (2 per type hit
 * super-effectively) and resistance depth (1.5 per resisted type), minus 7.5
 * per team-wide weakness, plus 5 for a full six. Clamped to 5..100 so a bad
 * team still reads as a number, not as nothing.
 *
 * @param {{ strengths?: Set<string>|string[], weaknesses?: Object, defensiveCoverage?: Object }} analysis - `teamAnalysis` from analyzeTeam
 * @param {number} teamSize
 * @returns {{ score: number, grade: 'building'|'weak'|'fair'|'solid'|'excellent' }}
 */
export const rateTeam = (analysis = {}, teamSize = 0) => {
    if (!teamSize) return { score: 0, grade: 'building' };
    const strengths = analysis?.strengths;
    const offense = strengths instanceof Set ? strengths.size : (Array.isArray(strengths) ? strengths.length : 0);
    const resist = Object.keys(analysis?.defensiveCoverage || {}).length;
    const weak = Object.keys(analysis?.weaknesses || {}).length;
    const raw = 50 + offense * 2 + resist * 1.5 - weak * 7.5 + (teamSize >= 6 ? 5 : 0);
    const score = Math.round(Math.max(5, Math.min(100, raw)));
    let grade = 'weak';
    if (score >= 82) grade = 'excellent';
    else if (score >= 66) grade = 'solid';
    else if (score >= 44) grade = 'fair';
    return { score, grade };
};

/** Semantic colour token per grade (`var(--color-<tone>)`). */
export const RATING_TONE = {
    building: 'muted',
    weak: 'danger',
    fair: 'warning',
    solid: 'primary',
    excellent: 'success',
};
