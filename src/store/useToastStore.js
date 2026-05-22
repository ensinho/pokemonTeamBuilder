import { create } from 'zustand';

export const useToastStore = create((set) => ({
    toasts: [],
    maxToasts: 3,

    showToast: (message, type = 'info', options = {}) => {
        const id = Date.now() + Math.random();
        const { spriteUrl = null, duration = 3000 } = options || {};

        set((state) => ({
            toasts: [...state.toasts, { id, message, type, spriteUrl }]
        }));

        setTimeout(() => {
            set((state) => ({
                toasts: state.toasts.filter((t) => t.id !== id)
            }));
        }, duration);
    }
}));
