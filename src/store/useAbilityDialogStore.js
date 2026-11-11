import { create } from 'zustand';

/**
 * The ability dialog: an ability named anywhere a Pokémon is shown (the
 * Pokédex detail, its modal, the phone's detail) opens over the page instead
 * of replacing it — the reader was looking at a Pokémon, and still is when the
 * dialog closes. AppLayout mounts it (lazy) while a name is set.
 *
 * `onLeave` runs when the reader follows a link out of the dialog (the full
 * page, a Pokémon that has the ability), so a surface under it — the Pokédex
 * modal — can close with it.
 */
export const useAbilityDialogStore = create((set) => ({
    name: '',
    onLeave: null,
    open: (name, onLeave = null) => {
        if (!name) return;
        set({ name: String(name).toLowerCase(), onLeave });
    },
    close: () => set({ name: '', onLeave: null }),
}));

export const openAbilityDialog = (name, onLeave) => useAbilityDialogStore.getState().open(name, onLeave);
