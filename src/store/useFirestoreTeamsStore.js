import { create } from 'zustand';
import { db } from '../services/firebase';
import { collection, doc, query, orderBy, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';
import { appId } from '../constants/firebase';
import { useAuthStore } from './useAuthStore';
import { useToastStore } from './useToastStore';

export const useFirestoreTeamsStore = create((set, get) => {
    let teamsUnsubscribe = null;
    let favoritesUnsubscribe = null;

    return {
        savedTeams: [],
        favoritePokemons: new Set(),
        deleteConfirmation: { isOpen: false, teamId: null, teamName: '' },

        setDeleteConfirmation: (confirm) => set({ deleteConfirmation: confirm }),

        initFirestoreListeners: () => {
            const userId = useAuthStore.getState().userId;
            if (!db || !userId) return;

            // Clean up existing listeners
            get().cleanupListeners();

            // 1. Listen to saved teams
            const teamsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/teams`);
            const q = query(teamsCollectionRef, orderBy('updatedAt', 'desc'));

            const unsubTeams = onSnapshot(q, (querySnapshot) => {
                const teamsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                set({ savedTeams: teamsData });
            }, (error) => {
                console.error("Error listening to saved teams:", error);
                useToastStore.getState().showToast("Could not fetch saved teams.", "error");
            });

            // 2. Listen to favorite pokemons
            const favoritesDocRef = doc(db, `artifacts/${appId}/users/${userId}/favorites`, 'pokemons');
            const unsubFavorites = onSnapshot(favoritesDocRef, (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    set({ favoritePokemons: new Set(data.ids || []) });
                } else {
                    set({ favoritePokemons: new Set() });
                }
            }, (error) => {
                console.error("Error listening to favorite pokemons:", error);
            });

            teamsUnsubscribe = unsubTeams;
            favoritesUnsubscribe = unsubFavorites;
        },

        cleanupListeners: () => {
            if (teamsUnsubscribe) {
                teamsUnsubscribe();
                teamsUnsubscribe = null;
            }
            if (favoritesUnsubscribe) {
                favoritesUnsubscribe();
                favoritesUnsubscribe = null;
            }
        },

        handleDeleteTeam: async (teamId) => {
            const userId = useAuthStore.getState().userId;
            if (!db || !userId) return;

            try {
                await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/teams`, teamId));
                useToastStore.getState().showToast("Team deleted.", 'info');
            } catch (e) {
                useToastStore.getState().showToast("Error deleting team.", 'error');
            }
        },

        handleToggleFavorite: async (team) => {
            const userId = useAuthStore.getState().userId;
            if (!db || !userId) return;

            try {
                await setDoc(doc(db, `artifacts/${appId}/users/${userId}/teams`, team.id), {
                    ...team,
                    isFavorite: !team.isFavorite
                }, { merge: true });
            } catch (e) {
                useToastStore.getState().showToast("Could not update favorite status.", 'error');
            }
        },

        handleToggleFavoritePokemon: async (pokemonId) => {
            const userId = useAuthStore.getState().userId;
            if (!db || !userId) return;

            const favoritesDocRef = doc(db, `artifacts/${appId}/users/${userId}/favorites`, 'pokemons');
            const currentFavorites = get().favoritePokemons;

            try {
                const newFavorites = new Set(currentFavorites);
                if (newFavorites.has(pokemonId)) {
                    newFavorites.delete(pokemonId);
                    useToastStore.getState().showToast("Removed from favorites!", "info");
                } else {
                    newFavorites.add(pokemonId);
                    useToastStore.getState().showToast("Added to favorites!", "success");
                }

                await setDoc(favoritesDocRef, {
                    ids: Array.from(newFavorites),
                    updatedAt: new Date().toISOString()
                });
            } catch (e) {
                console.error("Error toggling favorite pokemon:", e);
                useToastStore.getState().showToast("Could not update favorite status.", 'error');
            }
        }
    };
});
