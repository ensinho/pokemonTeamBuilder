import { useStaticData } from './useStaticData';

const NO_GAMES = [];

/**
 * Loads the gym-leaders dataset — each game's gym leaders and their teams. Used
 * by the Gyms & Trainers view. Returns the games array + ready status.
 */
export function useGymLeaders() {
    const { data, status } = useStaticData('gym-leaders.json');
    return { games: Array.isArray(data?.games) ? data.games : NO_GAMES, status };
}
