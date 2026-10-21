import { create } from 'zustand';

/**
 * Whether the first-visit landing is on screen (HomeEntry sets it). The shell
 * reads it to drop the phone dock — the landing's way forward is its CTAs —
 * and the stores read it to keep account noise (a teams listener that failed
 * for an account with no teams yet) off a visitor's first impression.
 */
export const useLandingStore = create((set) => ({
    isOpen: false,
    setOpen: (isOpen) => set({ isOpen }),
}));
