import { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useQuizRunsStore } from '../store/useQuizRunsStore';

export function useQuizRuns() {
    const userId = useAuthStore((state) => state.userId);
    const initFirestoreListeners = useQuizRunsStore((state) => state.initFirestoreListeners);
    const cleanupListeners = useQuizRunsStore((state) => state.cleanupListeners);

    const quizRuns = useQuizRunsStore((state) => state.quizRuns);
    const activeRunId = useQuizRunsStore((state) => state.activeRunId);
    const startNewRun = useQuizRunsStore((state) => state.startNewRun);
    const resumeRun = useQuizRunsStore((state) => state.resumeRun);
    const rerunRun = useQuizRunsStore((state) => state.rerunRun);
    const updateActiveRunProgress = useQuizRunsStore((state) => state.updateActiveRunProgress);
    const deleteRun = useQuizRunsStore((state) => state.deleteRun);
    const setActiveRunId = useQuizRunsStore((state) => state.setActiveRunId);

    useEffect(() => {
        if (userId) {
            initFirestoreListeners();
        } else {
            cleanupListeners();
        }
        return () => cleanupListeners();
    }, [userId, initFirestoreListeners, cleanupListeners]);

    const activeRun = quizRuns.find((r) => r.id === activeRunId) || null;

    return {
        quizRuns,
        activeRun,
        startNewRun,
        resumeRun,
        rerunRun,
        updateActiveRunProgress,
        deleteRun,
        setActiveRunId,
    };
}
