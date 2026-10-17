import { create } from 'zustand';

/**
 * The mission the trainer asked to be guided through (JourneyCoach). Only the
 * id: whether it is done is always re-derived from the live facts
 * (utils/journeys.js), never stored. Kept in sessionStorage so a reload in the
 * middle of a mission keeps the guide on screen, and a new visit starts clean.
 */
const COACH_KEY = 'ptb:journeyCoach';

const readMission = () => {
    try {
        return sessionStorage.getItem(COACH_KEY) || null;
    } catch (_) {
        return null;
    }
};

const writeMission = (missionId) => {
    try {
        if (missionId) sessionStorage.setItem(COACH_KEY, missionId);
        else sessionStorage.removeItem(COACH_KEY);
    } catch (_) { /* the guide just won't survive a reload */ }
};

export const useJourneyCoachStore = create((set) => ({
    missionId: typeof window !== 'undefined' ? readMission() : null,

    startMission: (missionId) => {
        writeMission(missionId);
        set({ missionId });
    },

    stopMission: () => {
        writeMission(null);
        set({ missionId: null });
    },
}));
