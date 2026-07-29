import { create } from 'zustand';
import { db } from '../services/firebase';
import { collection, doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';
import { appId } from '../constants/firebase';
import { useAuthStore } from './useAuthStore';
import { CATEGORY_LISTS } from '../data/categoryListsData';

const LOCAL_STORAGE_PREFIX = 'pokeQuizRun:';
const ACTIVE_RUN_KEY = 'pokeQuizActiveRunId';
const RECENT_LISTS_KEY = 'pokeQuizRecentListIds';

const loadLocalRuns = () => {
    const runs = [];
    if (typeof window === 'undefined') return runs;
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(LOCAL_STORAGE_PREFIX)) {
                const rawValue = localStorage.getItem(key);
                if (rawValue) {
                    runs.push(JSON.parse(rawValue));
                }
            }
        }
    } catch (e) {
        console.error('Error loading local PokéQuiz runs:', e);
    }
    return runs;
};

const loadActiveRunId = () => {
    if (typeof window === 'undefined') return null;
    try {
        return localStorage.getItem(ACTIVE_RUN_KEY) || null;
    } catch (_) {
        return null;
    }
};

const loadRecentListIds = () => {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(RECENT_LISTS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (_) {
        return [];
    }
};

export const useCategoryGuesserStore = create((set, get) => {
    let runsUnsubscribe = null;

    return {
        quizRuns: loadLocalRuns(),
        activeRunId: loadActiveRunId(),
        recentListIds: loadRecentListIds(),

        initFirestoreListeners: () => {
            const userId = useAuthStore.getState().userId;
            if (!db || !userId) return;

            if (runsUnsubscribe) {
                runsUnsubscribe();
            }

            const runsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/categoryGuesserRuns`);
            runsUnsubscribe = onSnapshot(runsCollectionRef, (snapshot) => {
                const remoteRuns = snapshot.docs.map((doc) => doc.data());
                const localRuns = get().quizRuns;

                const mergedMap = new Map();
                localRuns.forEach((run) => mergedMap.set(run.id, run));

                remoteRuns.forEach((remote) => {
                    const local = mergedMap.get(remote.id);
                    if (!local || remote.updatedAt > local.updatedAt) {
                        mergedMap.set(remote.id, remote);
                        try {
                            localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${remote.id}`, JSON.stringify(remote));
                        } catch (_) {}
                    } else if (local && local.updatedAt > remote.updatedAt) {
                        const docRef = doc(db, `artifacts/${appId}/users/${userId}/categoryGuesserRuns`, local.id);
                        setDoc(docRef, local).catch((err) => console.error('Failed to sync newer local PokéQuiz run:', err));
                    }
                });

                localRuns.forEach((local) => {
                    if (!remoteRuns.some((remote) => remote.id === local.id)) {
                        const docRef = doc(db, `artifacts/${appId}/users/${userId}/categoryGuesserRuns`, local.id);
                        setDoc(docRef, local).catch((err) => console.error('Failed to upload local PokéQuiz run:', err));
                    }
                });

                const mergedRuns = Array.from(mergedMap.values());
                set({ quizRuns: mergedRuns });
            }, (error) => {
                console.error('Error listening to PokéQuiz runs from Firestore:', error);
            });
        },

        cleanupListeners: () => {
            if (runsUnsubscribe) {
                runsUnsubscribe();
                runsUnsubscribe = null;
            }
        },

        getRandomUnplayedListId: (customList = CATEGORY_LISTS) => {
            const { quizRuns, recentListIds, activeRunId } = get();

            // Candidates excluding currently active run
            let candidates = customList.filter((item) => item.id !== activeRunId);

            // Further prioritize lists that have not been completed yet and not in recent 8 plays
            const recentSet = new Set(recentListIds.slice(-8));
            const completedSet = new Set(quizRuns.filter((r) => r.isComplete).map((r) => r.id));

            let freshCandidates = candidates.filter((item) => !recentSet.has(item.id) && !completedSet.has(item.id));
            if (freshCandidates.length === 0) {
                // Next, candidates not in recent plays
                freshCandidates = candidates.filter((item) => !recentSet.has(item.id));
            }
            if (freshCandidates.length === 0) {
                freshCandidates = candidates;
            }

            const picked = freshCandidates[Math.floor(Math.random() * freshCandidates.length)];
            return picked ? picked.id : CATEGORY_LISTS[0].id;
        },

        startNewRun: (listId, fullPokemonNames) => {
            const { quizRuns, recentListIds } = get();
            const existing = quizRuns.find((r) => r.id === listId);

            const bestFound = existing ? existing.bestFound : 0;
            const bestAccuracy = existing ? existing.bestAccuracy : 100;

            // Resolve full pool of pokemon for the category
            let pool = [];
            if (Array.isArray(fullPokemonNames) && fullPokemonNames.length > 0) {
                pool = [...fullPokemonNames];
            } else {
                const categoryObj = CATEGORY_LISTS.find((c) => c.id === listId);
                pool = categoryObj ? [...categoryObj.pokemonNames] : [];
            }

            // Shuffle pool and sample up to 20
            for (let i = pool.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [pool[i], pool[j]] = [pool[j], pool[i]];
            }
            const sampledPokemonNames = pool.slice(0, 20);

            const newRun = {
                id: listId,
                listId,
                sampledPokemonNames,
                foundNames: [],
                foundOrder: [],
                invalidGuesses: 0,
                consecutiveMisses: 0,
                totalCount: sampledPokemonNames.length,
                bestFound,
                bestAccuracy,
                updatedAt: Date.now(),
                isComplete: false,
            };

            const updatedRuns = quizRuns.filter((r) => r.id !== listId);
            updatedRuns.push(newRun);

            const updatedRecent = [...recentListIds.filter((id) => id !== listId), listId].slice(-15);

            set({ quizRuns: updatedRuns, activeRunId: listId, recentListIds: updatedRecent });

            try {
                localStorage.setItem(ACTIVE_RUN_KEY, listId);
                localStorage.setItem(RECENT_LISTS_KEY, JSON.stringify(updatedRecent));
            } catch (_) {}

            get().saveRunToStorage(newRun);
        },

        resumeRun: (listId) => {
            const run = get().quizRuns.find((r) => r.id === listId);
            if (run) {
                set({ activeRunId: listId });
                try {
                    localStorage.setItem(ACTIVE_RUN_KEY, listId);
                } catch (_) {}
            }
        },

        rerunRun: (listId, fullPokemonNames) => {
            const run = get().quizRuns.find((r) => r.id === listId);
            if (run) {
                let pool = [];
                if (Array.isArray(fullPokemonNames) && fullPokemonNames.length > 0) {
                    pool = [...fullPokemonNames];
                } else {
                    const categoryObj = CATEGORY_LISTS.find((c) => c.id === listId);
                    pool = categoryObj ? [...categoryObj.pokemonNames] : [];
                }

                if (pool.length > 0) {
                    for (let i = pool.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [pool[i], pool[j]] = [pool[j], pool[i]];
                    }
                }
                const sampledPokemonNames = pool.length > 0 ? pool.slice(0, 20) : (run.sampledPokemonNames || []);

                const resetRun = {
                    ...run,
                    sampledPokemonNames,
                    totalCount: sampledPokemonNames.length || run.totalCount,
                    foundNames: [],
                    foundOrder: [],
                    invalidGuesses: 0,
                    consecutiveMisses: 0,
                    isComplete: false,
                    updatedAt: Date.now(),
                };
                const updatedRuns = get().quizRuns.map((r) => r.id === listId ? resetRun : r);
                set({ quizRuns: updatedRuns, activeRunId: listId });
                try {
                    localStorage.setItem(ACTIVE_RUN_KEY, listId);
                } catch (_) {}
                get().saveRunToStorage(resetRun);
            }
        },

        saveRunToStorage: async (run) => {
            try {
                localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${run.id}`, JSON.stringify(run));
            } catch (_) {}

            const userId = useAuthStore.getState().userId;
            if (db && userId) {
                const docRef = doc(db, `artifacts/${appId}/users/${userId}/categoryGuesserRuns`, run.id);
                try {
                    await setDoc(docRef, run);
                } catch (e) {
                    console.error('Error saving PokéQuiz run to Firestore:', e);
                }
            }
        },

        updateActiveRunProgress: (foundNamesArray, foundOrderArray, invalidGuesses, consecutiveMisses) => {
            const { activeRunId, quizRuns } = get();
            if (!activeRunId) return;

            const runIndex = quizRuns.findIndex((r) => r.id === activeRunId);
            if (runIndex === -1) return;

            const currentRun = quizRuns[runIndex];
            const foundCount = foundNamesArray.length;
            const isComplete = foundCount === currentRun.totalCount;

            const accuracyPercent = foundCount + invalidGuesses > 0
                ? Math.round((foundCount / (foundCount + invalidGuesses)) * 100)
                : 100;

            const nextBestFound = Math.max(currentRun.bestFound, foundCount);
            let nextBestAccuracy = currentRun.bestAccuracy;
            if (foundCount > currentRun.bestFound) {
                nextBestAccuracy = accuracyPercent;
            } else if (foundCount === currentRun.bestFound) {
                nextBestAccuracy = Math.max(currentRun.bestAccuracy, accuracyPercent);
            }

            const updatedRun = {
                ...currentRun,
                foundNames: foundNamesArray,
                foundOrder: foundOrderArray,
                invalidGuesses,
                consecutiveMisses,
                isComplete,
                bestFound: nextBestFound,
                bestAccuracy: nextBestAccuracy,
                updatedAt: Date.now(),
            };

            const newRuns = [...quizRuns];
            newRuns[runIndex] = updatedRun;

            set({ quizRuns: newRuns });
            get().saveRunToStorage(updatedRun);
        },

        deleteRun: async (listId) => {
            const updatedRuns = get().quizRuns.filter((r) => r.id !== listId);
            set({ quizRuns: updatedRuns });

            if (get().activeRunId === listId) {
                set({ activeRunId: null });
                try {
                    localStorage.removeItem(ACTIVE_RUN_KEY);
                } catch (_) {}
            }

            try {
                localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}${listId}`);
            } catch (_) {}

            const userId = useAuthStore.getState().userId;
            if (db && userId) {
                const docRef = doc(db, `artifacts/${appId}/users/${userId}/categoryGuesserRuns`, listId);
                try {
                    await deleteDoc(docRef);
                } catch (e) {
                    console.error('Error deleting PokéQuiz run from Firestore:', e);
                }
            }
        },

        setActiveRunId: (id) => {
            set({ activeRunId: id });
            try {
                if (id) {
                    localStorage.setItem(ACTIVE_RUN_KEY, id);
                } else {
                    localStorage.removeItem(ACTIVE_RUN_KEY);
                }
            } catch (_) {}
        },
    };
});
