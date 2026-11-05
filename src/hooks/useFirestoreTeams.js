import { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useFirestoreTeamsStore } from '../store/useFirestoreTeamsStore';

export function useFirestoreTeams() {
    const userId = useAuthStore(state => state.userId);
    const initFirestoreListeners = useFirestoreTeamsStore(state => state.initFirestoreListeners);
    const cleanupListeners = useFirestoreTeamsStore(state => state.cleanupListeners);

    const savedTeams = useFirestoreTeamsStore(state => state.savedTeams);
    const favoritePokemons = useFirestoreTeamsStore(state => state.favoritePokemons);
    const handleDeleteTeam = useFirestoreTeamsStore(state => state.handleDeleteTeam);
    const handleToggleFavorite = useFirestoreTeamsStore(state => state.handleToggleFavorite);
    const handleDuplicateTeam = useFirestoreTeamsStore(state => state.handleDuplicateTeam);
    const handleToggleFavoritePokemon = useFirestoreTeamsStore(state => state.handleToggleFavoritePokemon);
    const activeTeamId = useFirestoreTeamsStore(state => state.activeTeamId);
    const setActiveTeamId = useFirestoreTeamsStore(state => state.setActiveTeamId);

    useEffect(() => {
        if (userId) {
            initFirestoreListeners();
        } else {
            cleanupListeners();
        }
        return () => cleanupListeners();
    }, [userId, initFirestoreListeners, cleanupListeners]);

    return {
        savedTeams,
        favoritePokemons,
        handleDeleteTeam,
        handleToggleFavorite,
        handleDuplicateTeam,
        handleToggleFavoritePokemon,
        activeTeamId,
        setActiveTeamId,
    };
}
