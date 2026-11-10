/**
 * Whether the beginner's coach (BuilderCoach) was closed on this device, and
 * the event that says it just was — so the verdict (MascotVerdict) can take
 * the mascot's place without the two ever sharing the screen.
 */
export const COACH_DISMISS_KEY = 'ptb:builderCoachDismissed';
export const COACH_DISMISS_EVENT = 'ptb:builder-coach-dismissed';

export const isCoachDismissed = () => {
    try { return localStorage.getItem(COACH_DISMISS_KEY) === '1'; } catch { return false; }
};

export const dismissCoach = () => {
    try { localStorage.setItem(COACH_DISMISS_KEY, '1'); } catch { /* the tip just comes back next visit */ }
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(COACH_DISMISS_EVENT));
};
