import { create } from 'zustand';

/**
 * Whether the Primeira Jornada (the onboarding + the account,
 * components/onboarding/FirstJourney.jsx) is on screen, who asked for it and
 * where it starts:
 * - `source`: `landing` (a first visitor left the landing), `auto` (an
 *   existing trainer opened Home with no profile yet), `home` / `profile`
 *   (the trainer asked to set it up or redo it);
 * - `entry`: `welcome` (the whole journey), `redo` (straight to the
 *   questions) or `signIn` (the account screen — "Já tem conta? Entrar").
 *   Left null, the journey picks: a trainer with answers redoes, anyone else
 *   is welcomed.
 * AppLayout mounts it lazily while `isOpen`. The answers themselves live in
 * useAuthStore (`trainerProfile`).
 */
export const useOnboardingStore = create((set) => ({
    isOpen: false,
    source: null,
    entry: null,
    open: (source = 'manual', { entry = null } = {}) => set({ isOpen: true, source, entry }),
    close: () => set({ isOpen: false, entry: null }),
}));
