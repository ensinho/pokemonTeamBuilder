import { create } from 'zustand';

/**
 * One confirmation dialog for the whole app, asked for the way window.confirm
 * is — `if (await confirmAction({...}))` — but answered by the app's own
 * ConfirmDialog (mounted once, via ConfirmHost in AppLayout).
 *
 * window.confirm was the last browser-drawn dialog in the app: an unstyled grey
 * box in the OS's theme, not the app's, that froze the page while open and on
 * an installed iPhone PWA read as a crash of the app rather than a question
 * from it. Six destructive actions used it.
 */
export const useConfirmStore = create((set, get) => ({
    request: null,

    open: (options) => new Promise((resolve) => {
        // A second question while one is open answers the first with "no" —
        // nothing may be left awaiting a dialog that no longer exists.
        get().request?.resolve(false);
        set({ request: { ...options, resolve } });
    }),

    settle: (answer) => {
        const { request } = get();
        if (!request) return;
        set({ request: null });
        request.resolve(Boolean(answer));
    },
}));

/**
 * Ask before something that cannot be taken back. Resolves true on confirm,
 * false on cancel, Escape, the scrim or a drag-to-dismiss.
 * Options: { title, message, confirmText }.
 */
export function confirmAction(options) {
    return useConfirmStore.getState().open(options);
}
