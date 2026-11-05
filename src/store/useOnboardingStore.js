import { create } from 'zustand';

/**
 * Whether the trainer-profile onboarding is on screen, and who asked for it:
 * `landing` (a first visitor left the landing), `auto` (an existing trainer
 * opened Home with no profile yet), `home` / `profile` (the trainer asked to
 * set it up or redo it). AppLayout mounts the dialog lazily while `isOpen`.
 * The answers themselves live in useAuthStore (`trainerProfile`).
 */
export const useOnboardingStore = create((set) => ({
    isOpen: false,
    source: null,
    open: (source = 'manual') => set({ isOpen: true, source }),
    close: () => set({ isOpen: false }),
}));
