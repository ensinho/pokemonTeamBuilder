import { create } from 'zustand';

/**
 * The trainer card (2026-11-05): one dialog for every place that shows
 * another trainer — a forum author, a friend. AppLayout mounts it (lazy) while
 * a profile is open, so callers only say who.
 *
 * `profile`: `{ userId, name, avatar, isShiny, trainerSprite, selectedBadgeId,
 * frameId, titleId }` — what the caller already has; the card asks the public
 * profile for the rest. `extras.sharedTeams` / `extras.onImport`: the forum
 * passes the teams this trainer shared in the thread on screen.
 */
export const useTrainerCardStore = create((set) => ({
    profile: null,
    extras: null,
    open: (profile, extras = null) => {
        if (!profile?.userId) return;
        set({ profile, extras });
    },
    close: () => set({ profile: null, extras: null }),
}));

export const openTrainerCard = (profile, extras) => useTrainerCardStore.getState().open(profile, extras);
