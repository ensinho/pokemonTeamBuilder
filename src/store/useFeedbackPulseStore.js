import { create } from 'zustand';

/**
 * Controls the once-per-user Mascot Feedback Pulse modal (`FeedbackPulseModal.jsx`).
 * Kept separate so any view (AppLayout auto-trigger, preview flag, or future CTA)
 * can open or dismiss it without prop drilling.
 */
export const useFeedbackPulseStore = create((set) => ({
    isOpen: false,
    reason: 'auto', // 'auto' | 'manual'
    open: (reason = 'auto') => set({ isOpen: true, reason }),
    close: () => set({ isOpen: false }),
}));
