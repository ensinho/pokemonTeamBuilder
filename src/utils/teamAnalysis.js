import { typeChart } from '../constants/types';

/**
 * Pure type-coverage engine for a team.
 *
 * Extracted from `useActiveTeamStore` so it can be unit-tested in isolation
 * and reused (quiz hints, generator, recommendations) without instantiating
 * the store. Takes the data it needs as arguments — no store access here.
 *
 * @param {Array<{types?: string[]}>} currentTeam - team members (each with a `types` array)
 * @param {Array<{id: number|string, types?: string[]}>} pokemonsList - full pokédex, used to suggest fillers
 * @returns {{ teamAnalysis: { strengths: Set<string>, weaknesses: Object, defensiveCoverage: Object }, suggestedPokemonIds: Set<number|string> }}
 */
export const analyzeTeam = (currentTeam = [], pokemonsList = []) => {
    if (currentTeam.length === 0) {
        return {
            teamAnalysis: { strengths: new Set(), weaknesses: {}, defensiveCoverage: {} },
            suggestedPokemonIds: new Set(),
        };
    }

    const teamWeaknessCounts = {};
    const teamResistanceCounts = {};
    const offensiveCoverage = new Set();

    currentTeam.flatMap(d => d.types || []).forEach(type => {
        Object.entries(typeChart[type]?.damageDealt || {}).forEach(([vs, mult]) => {
            if (mult > 1) offensiveCoverage.add(vs.toLowerCase());
        });
    });

    Object.keys(typeChart).forEach(attackingType => {
        const capitalizedAttackingType = attackingType.charAt(0).toUpperCase() + attackingType.slice(1);
        let weakCount = 0;
        let resistanceCount = 0;

        currentTeam.forEach(pokemon => {
            const multiplier = (pokemon.types || []).reduce((acc, pokemonType) => {
                return acc * (typeChart[pokemonType]?.damageTaken[capitalizedAttackingType] ?? 1);
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
                const typeMultiplier = p.types.reduce((multiplier, pokemonType) => {
                    return multiplier * (typeChart[pokemonType]?.damageTaken[capitalizedWeakType] ?? 1);
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
