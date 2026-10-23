import { useMemo } from 'react';
import { useTournamentData } from './useTournamentData';
import { tournamentPresence } from '../utils/tournamentPresence';

/**
 * The "In tournaments" facts for one Pokémon (utils/tournamentPresence.js):
 * null until the dataset is in, and whenever no recent team carried it, so the
 * host renders nothing.
 */
export function useTournamentPresence(pokemonId) {
    const { teams } = useTournamentData();
    return useMemo(() => tournamentPresence(teams, pokemonId), [teams, pokemonId]);
}
