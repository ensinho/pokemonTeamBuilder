import { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useFirestoreTeamsStore } from '../store/useFirestoreTeamsStore';

export function useFirestoreTeams() {
    const userId = useAuthStore(state => state.userId);
    const initFirestoreListeners = useFirestoreTeamsStore(state => state.initFirestoreListeners);
    const cleanupListeners = useFirestoreTeamsStore(state => state.cleanupListeners);

    const savedTeams = useFirestoreTeamsStore(state => state.savedTeams);
    const favoritePokemons = useFirestoreTeamsStore(state => state.favoritePokemons);
    const deleteConfirmation = useFirestoreTeamsStore(state => state.deleteConfirmation);
    const setDeleteConfirmation = useFirestoreTeamsStore(state => state.setDeleteConfirmation);
    const handleDeleteTeam = useFirestoreTeamsStore(state => state.handleDeleteTeam);
    const handleToggleFavorite = useFirestoreTeamsStore(state => state.handleToggleFavorite);
    const handleToggleFavoritePokemon = useFirestoreTeamsStore(state => state.handleToggleFavoritePokemon);

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
        deleteConfirmation,
        setDeleteConfirmation,
        handleDeleteTeam,
        handleToggleFavorite,
        handleToggleFavoritePokemon,
    };
}
