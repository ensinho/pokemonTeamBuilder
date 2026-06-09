import { create } from 'zustand';
import { db } from '../services/firebase';
import { collection, doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';
import { appId } from '../constants/firebase';
import { useAuthStore } from './useAuthStore';
import { GENERATION_RANGES } from '../constants/pokemon';

const QUIZ_GENERATION_KEYS = Object.keys(GENERATION_RANGES).filter((key) => key !== 'all');

const buildSelectionSignature = (generationKeys) => {
    if (!generationKeys.length) return 'empty';
    return generationKeys.length === QUIZ_GENERATION_KEYS.length
        ? 'all'
        : generationKeys.join('|');
};

const loadLegacyRuns = () => {
    const runs = [];
    if (typeof window === 'undefined') return runs;
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('generationQuizBest:')) {
                const signature = key.replace('generationQuizBest:', '');
                const rawValue = localStorage.getItem(key);
                if (rawValue) {
                    const legacy = JSON.parse(rawValue);
                    const genKeys = signature === 'all' 
                        ? [...QUIZ_GENERATION_KEYS] 
                        : signature.split('|');

                    runs.push({
                        id: signature,
                        generationKeys: genKeys,
                        foundIds: [],
                        foundOrder: [],
                        invalidGuesses: 0,
                        consecutiveMisses: 0,
                        totalCount: legacy.totalCount || 0,
                        bestFound: legacy.bestFound || 0,
                        bestAccuracy: legacy.accuracyPercent || 100,
                        updatedAt: legacy.updatedAt || Date.now(),
                        isComplete: (legacy.bestFound || 0) === (legacy.totalCount || 0)
                    });
                }
            }
        }
    } catch (e) {
        console.error('Error loading legacy quiz runs:', e);
    }
    return runs;
};

const loadLocalRuns = () => {
    const runs = [];
    if (typeof window === 'undefined') return runs;
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('generationQuizRun:')) {
                const rawValue = localStorage.getItem(key);
                if (rawValue) {
                    runs.push(JSON.parse(rawValue));
                }
            }
        }
    } catch (e) {
        console.error('Error loading local quiz runs:', e);
    }

    if (runs.length === 0) {
        const legacyRuns = loadLegacyRuns();
        legacyRuns.forEach((run) => {
            try {
                localStorage.setItem(`generationQuizRun:${run.id}`, JSON.stringify(run));
            } catch (_) {}
        });
        return legacyRuns;
    }
    return runs;
};

export const useQuizRunsStore = create((set, get) => {
    let runsUnsubscribe = null;

    return {
        quizRuns: loadLocalRuns(),
        activeRunId: null,

        initFirestoreListeners: () => {
            const userId = useAuthStore.getState().userId;
            if (!db || !userId) return;

            if (runsUnsubscribe) {
                runsUnsubscribe();
            }

            const runsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/quizRuns`);
            runsUnsubscribe = onSnapshot(runsCollectionRef, (snapshot) => {
                const remoteRuns = snapshot.docs.map((doc) => doc.data());
                const localRuns = get().quizRuns;
                
                // Merge remote runs and local runs by updatedAt timestamp
                const mergedMap = new Map();

                // Load local first
                localRuns.forEach((run) => mergedMap.set(run.id, run));

                // Merge remote, choosing the newer one
                remoteRuns.forEach((remote) => {
                    const local = mergedMap.get(remote.id);
                    if (!local || remote.updatedAt > local.updatedAt) {
                        mergedMap.set(remote.id, remote);
                        try {
                            localStorage.setItem(`generationQuizRun:${remote.id}`, JSON.stringify(remote));
                        } catch (_) {}
                    } else if (local && local.updatedAt > remote.updatedAt) {
                        // Local is newer, upload to Firestore
                        const docRef = doc(db, `artifacts/${appId}/users/${userId}/quizRuns`, local.id);
                        setDoc(docRef, local).catch((err) => console.error('Failed to sync newer local run:', err));
                    }
                });

                // Upload any local-only runs to Firestore on connection/load
                localRuns.forEach((local) => {
                    if (!remoteRuns.some((remote) => remote.id === local.id)) {
                        const docRef = doc(db, `artifacts/${appId}/users/${userId}/quizRuns`, local.id);
                        setDoc(docRef, local).catch((err) => console.error('Failed to upload local run:', err));
                    }
                });

                const mergedRuns = Array.from(mergedMap.values());
                set({ quizRuns: mergedRuns });
            }, (error) => {
                console.error('Error listening to quiz runs from Firestore:', error);
            });
        },

        cleanupListeners: () => {
            if (runsUnsubscribe) {
                runsUnsubscribe();
                runsUnsubscribe = null;
            }
        },

        startNewRun: (generationKeys, totalCount) => {
            const signature = buildSelectionSignature(generationKeys);
            const existing = get().quizRuns.find((r) => r.id === signature);
            
            const bestFound = existing ? existing.bestFound : 0;
            const bestAccuracy = existing ? existing.bestAccuracy : 100;

            const newRun = {
                id: signature,
                generationKeys,
                foundIds: [],
                foundOrder: [],
                invalidGuesses: 0,
                consecutiveMisses: 0,
                totalCount,
                bestFound,
                bestAccuracy,
                updatedAt: Date.now(),
                isComplete: false,
            };

            const updatedRuns = get().quizRuns.filter((r) => r.id !== signature);
            updatedRuns.push(newRun);

            set({ quizRuns: updatedRuns, activeRunId: signature });
            get().saveRunToStorage(newRun);
        },

        resumeRun: (runId) => {
            const run = get().quizRuns.find((r) => r.id === runId);
            if (run) {
                set({ activeRunId: runId });
            }
        },

        rerunRun: (runId) => {
            const run = get().quizRuns.find((r) => r.id === runId);
            if (run) {
                const resetRun = {
                    ...run,
                    foundIds: [],
                    foundOrder: [],
                    invalidGuesses: 0,
                    consecutiveMisses: 0,
                    isComplete: false,
                    updatedAt: Date.now(),
                };
                const updatedRuns = get().quizRuns.map((r) => r.id === runId ? resetRun : r);
                set({ quizRuns: updatedRuns, activeRunId: runId });
                get().saveRunToStorage(resetRun);
            }
        },

        saveRunToStorage: async (run) => {
            try {
                localStorage.setItem(`generationQuizRun:${run.id}`, JSON.stringify(run));
            } catch (_) {}

            const userId = useAuthStore.getState().userId;
            if (db && userId) {
                const docRef = doc(db, `artifacts/${appId}/users/${userId}/quizRuns`, run.id);
                try {
                    await setDoc(docRef, run);
                } catch (e) {
                    console.error('Error saving run to Firestore:', e);
                }
            }
        },

        updateActiveRunProgress: (foundIdsArray, foundOrderArray, invalidGuesses, consecutiveMisses) => {
            const { activeRunId, quizRuns } = get();
            if (!activeRunId) return;

            const runIndex = quizRuns.findIndex((r) => r.id === activeRunId);
            if (runIndex === -1) return;

            const currentRun = quizRuns[runIndex];
            const foundCount = foundIdsArray.length;
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
                foundIds: foundIdsArray,
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

        deleteRun: async (runId) => {
            const updatedRuns = get().quizRuns.filter((r) => r.id !== runId);
            set({ quizRuns: updatedRuns });
            
            if (get().activeRunId === runId) {
                set({ activeRunId: null });
            }

            try {
                localStorage.removeItem(`generationQuizRun:${runId}`);
                localStorage.removeItem(`generationQuizBest:${runId}`);
            } catch (_) {}

            const userId = useAuthStore.getState().userId;
            if (db && userId) {
                const docRef = doc(db, `artifacts/${appId}/users/${userId}/quizRuns`, runId);
                try {
                    await deleteDoc(docRef);
                } catch (e) {
                    console.error('Error deleting run from Firestore:', e);
                }
            }
        },

        setActiveRunId: (id) => set({ activeRunId: id }),
    };
});
