import { useEffect } from 'react';
import { useCategoryGuesserStore } from '../store/useCategoryGuesserStore';
import { useAuthStore } from '../store/useAuthStore';

export function useCategoryGuesser() {
    const userId = useAuthStore((state) => state.userId);
    const quizRuns = useCategoryGuesserStore((state) => state.quizRuns);
    const activeRunId = useCategoryGuesserStore((state) => state.activeRunId);
    const recentListIds = useCategoryGuesserStore((state) => state.recentListIds);
    const initFirestoreListeners = useCategoryGuesserStore((state) => state.initFirestoreListeners);
    const cleanupListeners = useCategoryGuesserStore((state) => state.cleanupListeners);
    const getRandomUnplayedListId = useCategoryGuesserStore((state) => state.getRandomUnplayedListId);
    const startNewRun = useCategoryGuesserStore((state) => state.startNewRun);
    const resumeRun = useCategoryGuesserStore((state) => state.resumeRun);
    const rerunRun = useCategoryGuesserStore((state) => state.rerunRun);
    const updateActiveRunProgress = useCategoryGuesserStore((state) => state.updateActiveRunProgress);
    const deleteRun = useCategoryGuesserStore((state) => state.deleteRun);
    const setActiveRunId = useCategoryGuesserStore((state) => state.setActiveRunId);

    useEffect(() => {
        initFirestoreListeners();
        return () => cleanupListeners();
    }, [userId, initFirestoreListeners, cleanupListeners]);

    const activeRun = quizRuns.find((r) => r.id === activeRunId) || null;

    return {
        quizRuns,
        activeRun,
        activeRunId,
        recentListIds,
        getRandomUnplayedListId,
        startNewRun,
        resumeRun,
        rerunRun,
        updateActiveRunProgress,
        deleteRun,
        setActiveRunId,
    };
}
