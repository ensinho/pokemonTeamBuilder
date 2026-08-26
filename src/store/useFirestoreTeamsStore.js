import { create } from 'zustand';
import { db } from '../services/firebase';
import { collection, doc, query, orderBy, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';
import { appId } from '../constants/firebase';
import { useAuthStore } from './useAuthStore';
import { useToastStore } from './useToastStore';
import { useLanguageStore } from './useLanguageStore';
import { buildDuplicateTeamName, buildDuplicateTeamPayload } from '../utils/teamDuplication';

export const useFirestoreTeamsStore = create((set, get) => {
    let teamsUnsubscribe = null;
    let favoritesUnsubscribe = null;
    // Names claimed by a duplication that is still in flight. `savedTeams` only
    // catches up when the snapshot lands, so without this a double-click would
    // hand both copies the same name — and the user's first save on either one
    // would then bounce off the duplicate-name guard.
    const pendingDuplicateNames = new Set();

    return {
        savedTeams: [],
        favoritePokemons: new Set(),
        deleteConfirmation: { isOpen: false, teamId: null, teamName: '' },
        activeTeamId: (() => {
            try {
                return localStorage.getItem('ptbActiveTeamId') || null;
            } catch {
                return null;
            }
        })(),

        setDeleteConfirmation: (confirm) => set({ deleteConfirmation: confirm }),
        setActiveTeamId: (activeTeamId) => {
            try {
                if (activeTeamId) {
                    localStorage.setItem('ptbActiveTeamId', activeTeamId);
                } else {
                    localStorage.removeItem('ptbActiveTeamId');
                }
            } catch (e) {
                console.error(e);
            }
            set({ activeTeamId });
        },

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
                    // Normalize to numbers: ids may have been persisted as strings
                    // (e.g. added from the /pokemon/:idOrName route param), which
                    // would break Set.has() comparisons against numeric pokemon.id.
                    set({ favoritePokemons: new Set((data.ids || []).map(Number)) });
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

        // Copy a saved team into a new document so the user can experiment on the
        // copy without touching the original. The copy is built from the stored
        // doc (already serialized), so no Pokémon details have to be re-resolved.
        // Returns the new team (id + data) so callers can offer to open it.
        handleDuplicateTeam: async (team) => {
            const userId = useAuthStore.getState().userId;
            const language = useLanguageStore.getState().language;
            const pt = language === 'pt';

            if (!db || !userId || !team) {
                useToastStore.getState().showToast(
                    pt ? 'Não foi possível duplicar o time.' : 'Could not duplicate team.',
                    'error',
                );
                return null;
            }

            const name = buildDuplicateTeamName(
                team.name,
                [...get().savedTeams.map((saved) => saved.name), ...pendingDuplicateNames],
                language,
            );
            const payload = buildDuplicateTeamPayload(team, name);
            const teamId = doc(collection(db, `artifacts/${appId}/users/${userId}/teams`)).id;

            pendingDuplicateNames.add(name);
            try {
                await setDoc(doc(db, `artifacts/${appId}/users/${userId}/teams`, teamId), payload);
                return { id: teamId, ...payload };
            } catch (e) {
                useToastStore.getState().showToast(
                    pt ? 'Erro ao duplicar o time.' : 'Error duplicating team.',
                    'error',
                );
                return null;
            } finally {
                pendingDuplicateNames.delete(name);
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
                const id = Number(pokemonId); // keep the Set numeric regardless of caller
                const newFavorites = new Set(currentFavorites);
                if (newFavorites.has(id)) {
                    newFavorites.delete(id);
                    useToastStore.getState().showToast("Removed from favorites!", "info");
                } else {
                    newFavorites.add(id);
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
