import { create } from 'zustand';

export const useToastStore = create((set) => ({
    toasts: [],
    maxToasts: 3,

    // `options.action` = { label, onClick } renders a button inside the toast and
    // dismisses it once pressed — used for invites, where the toast is the only
    // place the room code ever appears.
    // A bare number is accepted for `options` because callers passed a duration
    // there; treating it as an object silently fell back to the 3s default.
    showToast: (message, type = 'info', options = {}) => {
        const id = Date.now() + Math.random();
        const normalized = typeof options === 'number' ? { duration: options } : (options || {});
        const { spriteUrl = null, duration = 3000, action = null } = normalized;

        set((state) => ({
            toasts: [...state.toasts, { id, message, type, spriteUrl, action }]
        }));

        setTimeout(() => {
            set((state) => ({
                toasts: state.toasts.filter((t) => t.id !== id)
            }));
        }, duration);
    },

    dismissToast: (id) => set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id)
    }))
}));
