import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJourneyCoachStore } from '../store/useJourneyCoachStore';
import { openPartnerPicker, promptSignIn } from '../utils/navigation';
import { useTrainerBadges } from './useTrainerBadges';

/**
 * The journeys as the views read them (utils/journeys.js, evaluated inside
 * useTrainerBadges so badges and missions never disagree).
 */
export function useJourneys() {
    const { journeys, badges, unlockedCount, totalBadgesCount, toggleEquip, selectedBadgeId, celebrateBadge } = useTrainerBadges();
    return { journeys, badges, unlockedCount, totalBadgesCount, toggleEquip, selectedBadgeId, celebrateBadge };
}

/**
 * "Go" on a mission: start the guide for it (unless it is already done) and
 * take the trainer where it happens — a route, or a step the shell performs
 * (the partner picker, the sign-up dialog).
 */
export function useMissionLauncher() {
    const navigate = useNavigate();
    const startMission = useJourneyCoachStore((s) => s.startMission);

    return useCallback((mission) => {
        if (!mission) return;
        if (!mission.done) startMission(mission.id);
        if (mission.action === 'partner') {
            openPartnerPicker();
            return;
        }
        if (mission.action === 'signUp' && !mission.done) {
            promptSignIn('signUp');
            return;
        }
        navigate(mission.to);
    }, [navigate, startMission]);
}
