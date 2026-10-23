import { useCallback, useMemo } from 'react';
import { useStaticData } from './useStaticData';
import { buildCoOccurrence, suggestPartners } from '../utils/tournamentSynergy';
import { annotateEvScales } from '../utils/teamImport';
import { hasDuplicateSpecies } from '../utils/teamUniqueness';

/**
 * What the app accepts from the baked dataset: only teams that hold each species
 * once (tournament ids are already base-species ids, so no index is needed to
 * tell), each stamped with the scale its spreads are written in. The build
 * script filters the same way; this is the net for a dataset baked before it did.
 */
export const prepareTournamentTeams = (teams = []) =>
    annotateEvScales((Array.isArray(teams) ? teams : []).filter((team) =>
        Array.isArray(team?.pokemons) && team.pokemons.length > 0 && !hasDuplicateSpecies(team.pokemons)));

// Prepared once per loaded file, however many components hold the hook (the
// Pokémon page alone has three).
const preparedByFile = new WeakMap();
const NO_TEAMS = [];
const preparedTeams = (data) => {
    if (!Array.isArray(data?.teams)) return NO_TEAMS;
    if (!preparedByFile.has(data)) preparedByFile.set(data, prepareTournamentTeams(data.teams));
    return preparedByFile.get(data);
};

/**
 * Loads the baked tournaments dataset and derives "popular" Pokémon from real
 * usage — i.e. how often each species appears across tournament teams. Shared by
 * the Tournaments view and the Home dashboard so the fetch is requested once.
 */
export function useTournamentData({ enabled = true } = {}) {
    // `enabled: false` (Team Builder playthrough mode) skips the download
    // entirely — nothing on screen consumes it there.
    const { data, status } = useStaticData('tournaments.json', { enabled });
    const teams = preparedTeams(data);

    const popular = useMemo(() => {
        const counts = new Map();
        for (const team of teams) {
            for (const mon of team.pokemons || []) {
                const entry = counts.get(mon.id) || { id: mon.id, name: mon.name, count: 0 };
                entry.count += 1;
                counts.set(mon.id, entry);
            }
        }
        return [...counts.values()].sort((a, b) => b.count - a.count);
    }, [teams]);

    const recent = useMemo(() => {
        // featured (podium) first, then the rest — already date-sorted in the file.
        return [...teams].sort((a, b) => Number(b.featured) - Number(a.featured));
    }, [teams]);

    // Co-occurrence model for the Team Builder's partner suggestions.
    const synergy = useMemo(() => buildCoOccurrence(teams), [teams]);
    const partnersFor = useCallback(
        (teamIds, lastId, limit = 12) => suggestPartners(synergy, teamIds, lastId, limit),
        [synergy]
    );

    return { teams, popular, recent, status, partnersFor, synergy };
}
