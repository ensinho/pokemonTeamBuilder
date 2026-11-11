import { create } from 'zustand';
import { sameLook } from '../utils/quickLook';

// How many looks the panel remembers for its back button.
const MAX_STACK = 8;

/**
 * Quick look: while a battle is on screen, the global search opens a Pokémon,
 * move, ability or item in a docked panel (QuickLookPanel) instead of leaving
 * the battle for its page.
 *
 * `holds` counts the battle screens asking for it (useQuickLookMode) — a
 * counter, not a boolean, so a screen unmounting never switches off a screen
 * that is still there. `stack` is what the panel shows, newest last; following
 * a link inside the panel (an ability of the Pokémon on view) pushes onto it
 * and the panel's back button pops it.
 */
export const useQuickLookStore = create((set) => ({
    holds: 0,
    stack: [],
    hold: () => set((state) => ({ holds: state.holds + 1 })),
    // The last battle screen leaving takes the panel with it.
    release: () => set((state) => {
        const holds = Math.max(0, state.holds - 1);
        return holds > 0 ? { holds } : { holds, stack: [] };
    }),
    open: (look) => set((state) => ({
        stack: [...state.stack.filter((entry) => !sameLook(entry, look)), look].slice(-MAX_STACK),
    })),
    back: () => set((state) => ({ stack: state.stack.slice(0, -1) })),
    close: () => set({ stack: [] }),
}));

/** Whether the global search should open entries in the panel right now. */
export const isQuickLookActive = () => useQuickLookStore.getState().holds > 0;
