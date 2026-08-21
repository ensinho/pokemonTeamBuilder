import { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { appId } from '../constants/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { useQuizRunsStore } from '../store/useQuizRunsStore';
import { useCategoryGuesserStore } from '../store/useCategoryGuesserStore';
import { BADGES_LIST, BADGES_BY_ID, getBadgeById } from '../constants/badges';

const CELEBRATED_BADGES_KEY = 'ptb:celebratedBadges';

const getCelebratedBadges = () => {
    if (typeof window === 'undefined') return new Set();
    try {
        const raw = localStorage.getItem(CELEBRATED_BADGES_KEY);
        if (raw) return new Set(JSON.parse(raw));
    } catch (_) { /* ignore */ }
    return new Set();
};

const markBadgeCelebrated = (badgeId) => {
    if (typeof window === 'undefined') return;
    try {
        const set = getCelebratedBadges();
        set.add(badgeId);
        localStorage.setItem(CELEBRATED_BADGES_KEY, JSON.stringify(Array.from(set)));
    } catch (_) { /* ignore */ }
};

/**
 * Normalizes a puzzle key/docId to a consistent date/session identifier.
 */
const normalizePuzzleKey = (keyOrId) => {
    if (!keyOrId) return null;
    let clean = keyOrId;
    if (clean.includes(':')) {
        const parts = clean.split(':');
        clean = parts[parts.length - 1]; // e.g. "2026-6-18" or "ongoing"
    }
    if (clean.startsWith('daily_')) {
        clean = clean.slice('daily_'.length);
    }
    return clean;
};

/**
 * Scans localStorage for all won PokePuzzle sessions across all user/guest namespaces.
 */
export const getLocalWonPuzzleKeys = () => {
    const wonKeys = new Set();
    if (typeof window === 'undefined') return wonKeys;
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('ptb:pokepuzzle:') || key.startsWith('pokepuzzle:'))) {
                try {
                    const raw = localStorage.getItem(key);
                    if (raw) {
                        const data = JSON.parse(raw);
                        if (data && data.gameStatus === 'WON') {
                            const normalized = normalizePuzzleKey(key);
                            if (normalized) wonKeys.add(normalized);
                        }
                    }
                } catch (_) { /* ignore */ }
            }
        }
    } catch (_) { /* ignore */ }
    return wonKeys;
};

/**
 * useTrainerBadges - Hook to inspect, calculate, and manage trainer achievements and badges.
 * Automatically accounts for all past historical records from Firestore and localStorage.
 */
export function useTrainerBadges(extraStats = {}) {
    const userId = useAuthStore((s) => s.userId);
    const streak = useAuthStore((s) => s.streak);
    const selectedBadgeId = useAuthStore((s) => s.selectedBadgeId);
    const setSelectedBadgeId = useAuthStore((s) => s.setSelectedBadgeId);
    const setNewlyUnlockedBadge = useAuthStore((s) => s.setNewlyUnlockedBadge);

    // Generation Quiz & Category Guesser stores
    const genQuizRuns = useQuizRunsStore((s) => s.quizRuns) || [];
    const catQuizRuns = useCategoryGuesserStore((s) => s.quizRuns) || [];

    // State for Firestore PokéPuzzle won records
    const [firestoreWonPuzzles, setFirestoreWonPuzzles] = useState(() => new Set());

    // Ensure Firestore listeners are active for quiz stores if not already initiated
    useEffect(() => {
        if (db && userId) {
            useQuizRunsStore.getState().initFirestoreListeners?.();
            useCategoryGuesserStore.getState().initFirestoreListeners?.();
        }
    }, [userId]);

    // Real-time listener for user's past PokéPuzzles in Firestore
    useEffect(() => {
        if (!db || !userId) {
            setFirestoreWonPuzzles(new Set());
            return;
        }

        const colRef = collection(db, `artifacts/${appId}/users/${userId}/pokepuzzle`);
        const unsub = onSnapshot(
            colRef,
            (snap) => {
                const wonSet = new Set();
                snap.forEach((docSnap) => {
                    const data = docSnap.data();
                    if (data && data.gameStatus === 'WON') {
                        const norm = normalizePuzzleKey(docSnap.id);
                        if (norm) wonSet.add(norm);
                    }
                });
                setFirestoreWonPuzzles(wonSet);
            },
            (err) => console.error('Error fetching past PokéPuzzle wins from Firestore:', err)
        );

        return () => unsub();
    }, [userId]);

    // Aggregate all won PokéPuzzles (Firestore + LocalStorage deduplicated by puzzle day/id)
    const totalPokepuzzleWins = useMemo(() => {
        const localWon = getLocalWonPuzzleKeys();
        const combined = new Set([...firestoreWonPuzzles, ...localWon]);
        return Math.max(combined.size, extraStats.pokepuzzleWins || 0);
    }, [firestoreWonPuzzles, extraStats.pokepuzzleWins]);

    // Calculate Quiz completions across both Generation Quizzes and Category Quizzes
    const completedQuizzesCount = useMemo(() => {
        const genCompleted = genQuizRuns.filter(
            (r) => r.isComplete || (r.totalCount > 0 && r.bestFound >= r.totalCount)
        ).length;
        const catCompleted = catQuizRuns.filter(
            (r) => r.isComplete || (r.totalCount > 0 && r.bestFound >= r.totalCount)
        ).length;
        return genCompleted + catCompleted;
    }, [genQuizRuns, catQuizRuns]);

    const perfectQuizzesCount = useMemo(() => {
        const genPerfect = genQuizRuns.filter(
            (r) => (r.isComplete || (r.totalCount > 0 && r.bestFound >= r.totalCount)) && r.bestAccuracy === 100
        ).length;
        const catPerfect = catQuizRuns.filter(
            (r) => (r.isComplete || (r.totalCount > 0 && r.bestFound >= r.totalCount)) && r.bestAccuracy === 100
        ).length;
        return genPerfect + catPerfect;
    }, [genQuizRuns, catQuizRuns]);

    // Aggregate all trainer stats
    const stats = useMemo(() => ({
        pokepuzzleWins: totalPokepuzzleWins,
        completedQuizzesCount,
        perfectQuizzesCount,
        currentStreak: streak?.count || 0,
        bestStreak: Math.max(streak?.longest || 0, streak?.count || 0),
        ...extraStats,
    }), [totalPokepuzzleWins, completedQuizzesCount, perfectQuizzesCount, streak, extraStats]);

    // Badges mapped with current progress and unlock status
    const badges = useMemo(() => {
        return BADGES_LIST.map((badge) => {
            const isUnlocked = badge.checkUnlocked(stats);
            const progress = badge.getProgress(stats);
            const isEquipped = selectedBadgeId === badge.id;
            return {
                ...badge,
                isUnlocked,
                progress,
                isEquipped,
            };
        });
    }, [stats, selectedBadgeId]);

    const equippedBadge = useMemo(() => {
        return selectedBadgeId ? getBadgeById(selectedBadgeId) : null;
    }, [selectedBadgeId]);

    const unlockedCount = useMemo(() => {
        return badges.filter((b) => b.isUnlocked).length;
    }, [badges]);

    const totalBadgesCount = BADGES_LIST.length;

    const equipBadge = useCallback((badgeId) => {
        const badge = getBadgeById(badgeId);
        if (!badge) return;
        // Verify that the badge is unlocked before equipping
        if (badge.checkUnlocked(stats)) {
            setSelectedBadgeId(badgeId);
        }
    }, [stats, setSelectedBadgeId]);

    const unequipBadge = useCallback(() => {
        setSelectedBadgeId(null);
    }, [setSelectedBadgeId]);

    const toggleEquip = useCallback((badgeId) => {
        if (selectedBadgeId === badgeId) {
            unequipBadge();
        } else {
            equipBadge(badgeId);
        }
    }, [selectedBadgeId, equipBadge, unequipBadge]);

    /**
     * Check if a newly completed action unlocked a badge that was never celebrated,
     * and triggers the celebration modal.
     */
    const checkBadgeCelebration = useCallback((customStats = null) => {
        const currentStats = customStats || stats;
        const celebrated = getCelebratedBadges();

        for (const badge of BADGES_LIST) {
            if (badge.checkUnlocked(currentStats) && !celebrated.has(badge.id)) {
                markBadgeCelebrated(badge.id);
                setNewlyUnlockedBadge(badge);
                break; // Show one celebration modal at a time
            }
        }
    }, [stats, setNewlyUnlockedBadge]);

    return {
        stats,
        badges,
        equippedBadge,
        selectedBadgeId,
        unlockedCount,
        totalBadgesCount,
        equipBadge,
        unequipBadge,
        toggleEquip,
        checkBadgeCelebration,
    };
}

export default useTrainerBadges;
