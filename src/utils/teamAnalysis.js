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
