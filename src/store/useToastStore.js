import { create } from 'zustand';

/* ============================================================================
   Toasts

   A toast is the app's one channel for "something happened, and here is what
   you can do about it". The second half is the point: a message with no next
   step makes the user go find the thing themselves, which is the flow break
   this module exists to close. Prefer `actions` over a bare string.

   Shape of a toast:
     { id, severity, title, description, spriteUrl, actions, duration,
       closable, phase }

     severity  'success' | 'error' | 'warning' | 'info'
     title     the one line that must be readable at a glance
     description  optional second line — context, never the message itself
     actions   [{ label, onClick, variant, keepOpen }] — max 2, see below
     duration  ms visible; 0 or Infinity pins it until dismissed
     phase     'entering' | 'visible' | 'leaving' — drives the CSS, see below

   Three behaviours that the previous implementation got wrong and that are the
   reason this file is not just a setTimeout:

   1. The dismiss timer must be *pausable*. A toast that expires while the user
      is reading it — or worse, while they are reaching for its button — is a
      broken promise. Hovering or focusing the stack freezes every timer.
   2. `duration` must actually be honoured. The old toast animated on a CSS
      keyframe hardcoded to 3s while the store dismissed on the caller's
      duration, so a `duration: 15000` toast faded out at 3s and then held its
      slot in the stack, invisible, for twelve more seconds.
   3. Exit has to be a state, not a keyframe end. Removing the node the instant
      the timer fires makes the rest of the stack jump; `phase: 'leaving'`
      gives the list time to collapse smoothly.
   ========================================================================== */

/** Default lifetime by severity. Errors get longer because they usually carry
 *  an action, and a failure the user cannot re-attempt is just noise. */
const DEFAULT_DURATION = {
    success: 3500,
    info: 3500,
    warning: 5000,
    error: 6000,
};

/** How long the leave animation runs. Must match `--toast-exit` in toast.css. */
export const TOAST_EXIT_MS = 200;

/** Toasts with an action are read, not glanced at — give them room to be used. */
const ACTION_MIN_DURATION = 6000;

/** Anything past this waits in the queue rather than being dropped. */
const MAX_VISIBLE = 3;

const timers = new Map();   // id -> { handle, endsAt, remaining }

const clearTimer = (id) => {
    const timer = timers.get(id);
    if (timer?.handle) clearTimeout(timer.handle);
    timers.delete(id);
};

const startTimer = (id, ms, onExpire) => {
    if (!Number.isFinite(ms) || ms <= 0) return;   // sticky
    clearTimer(id);
    timers.set(id, {
        handle: setTimeout(() => { timers.delete(id); onExpire(id); }, ms),
        endsAt: Date.now() + ms,
        remaining: ms,
    });
};

let seq = 0;
const nextId = () => `t${Date.now().toString(36)}${(seq += 1).toString(36)}`;

/** Normalises the two call styles this app uses. The legacy positional form
 *  (`showToast(message, type, options)`) is what all 130 existing call sites
 *  speak; the object form is what new code should use. A bare number in the
 *  options slot is a duration — callers did that, and treating it as an object
 *  silently fell through to the default. */
const normalize = (message, type, options) => {
    const opts = typeof options === 'number'
        ? { duration: options }
        : (options || {});

    const severity = ['success', 'error', 'warning', 'info'].includes(type) ? type : 'info';

    const actions = (opts.actions || (opts.action ? [opts.action] : []))
        .filter((a) => a && a.label)
        .slice(0, 2);   // a third button is a dialog, not a toast

    let duration = opts.duration;
    if (!Number.isFinite(duration)) duration = DEFAULT_DURATION[severity];
    if (actions.length && duration > 0) duration = Math.max(duration, ACTION_MIN_DURATION);
    if (opts.sticky) duration = 0;

    return {
        severity,
        title: opts.title ?? message ?? '',
        description: opts.description ?? null,
        spriteUrl: opts.spriteUrl ?? null,
        actions,
        duration,
        closable: opts.closable !== false,
        // Dedupe key. Repeating the same failure five times says nothing the
        // first one didn't; same key refreshes the existing toast in place.
        dedupeKey: opts.key ?? `${severity}:${opts.title ?? message ?? ''}`,
    };
};

export const useToastStore = create((set, get) => ({
    toasts: [],        // currently mounted (includes ones in their leave phase)
    queue: [],         // waiting for a slot
    maxToasts: MAX_VISIBLE,
    paused: false,

    showToast: (message, type = 'info', options = {}) => {
        const spec = normalize(message, type, options);
        const state = get();

        // Same message already on screen: restart its clock instead of stacking.
        const existing = state.toasts.find(
            (t) => t.dedupeKey === spec.dedupeKey && t.phase !== 'leaving'
        );
        if (existing) {
            set({
                toasts: state.toasts.map((t) =>
                    t.id === existing.id ? { ...t, ...spec, id: t.id, phase: 'visible' } : t
                ),
            });
            if (!state.paused) startTimer(existing.id, spec.duration, get().dismissToast);
            return existing.id;
        }

        const toast = { ...spec, id: nextId(), phase: 'entering' };

        const live = state.toasts.filter((t) => t.phase !== 'leaving');
        if (live.length >= state.maxToasts) {
            set({ queue: [...state.queue, toast] });
            return toast.id;
        }

        set({ toasts: [...state.toasts, toast] });
        if (!state.paused) startTimer(toast.id, toast.duration, get().dismissToast);
        return toast.id;
    },

    /** Marks the toast as leaving; `removeToast` takes it out once the
     *  animation has run. Callers (and the timer) only ever use this one. */
    dismissToast: (id) => {
        clearTimer(id);
        const { toasts, queue } = get();
        if (queue.some((t) => t.id === id)) {
            set({ queue: queue.filter((t) => t.id !== id) });
            return;
        }
        if (!toasts.some((t) => t.id === id)) return;
        set({ toasts: toasts.map((t) => (t.id === id ? { ...t, phase: 'leaving' } : t)) });
        setTimeout(() => get().removeToast(id), TOAST_EXIT_MS);
    },

    removeToast: (id) => {
        clearTimer(id);
        const { toasts, queue, maxToasts, paused } = get();
        const remaining = toasts.filter((t) => t.id !== id);

        // Promote the next queued toast into the freed slot.
        const live = remaining.filter((t) => t.phase !== 'leaving');
        if (queue.length && live.length < maxToasts) {
            const [next, ...rest] = queue;
            set({ toasts: [...remaining, next], queue: rest });
            if (!paused) startTimer(next.id, next.duration, get().dismissToast);
            return;
        }
        set({ toasts: remaining });
    },

    /** Marks a toast as settled once its enter animation has played, so the
     *  stack's shared transition can take over from the entrance keyframe. */
    settleToast: (id) => set((state) => ({
        toasts: state.toasts.map((t) => (t.id === id && t.phase === 'entering' ? { ...t, phase: 'visible' } : t)),
    })),

    /** Freeze every dismiss timer — the stack is hovered or focused. */
    pauseToasts: () => {
        if (get().paused) return;
        const now = Date.now();
        timers.forEach((timer, id) => {
            clearTimeout(timer.handle);
            timers.set(id, { ...timer, handle: null, remaining: Math.max(0, timer.endsAt - now) });
        });
        set({ paused: true });
    },

    resumeToasts: () => {
        if (!get().paused) return;
        const dismiss = get().dismissToast;
        timers.forEach((timer, id) => {
            if (timer.handle) return;
            startTimer(id, timer.remaining, dismiss);
        });
        set({ paused: false });
    },

    clearToasts: () => {
        timers.forEach((t) => t.handle && clearTimeout(t.handle));
        timers.clear();
        set({ toasts: [], queue: [] });
    },
}));

/* Severity-named helpers. `showToast(msg, 'error')` works and always will, but
   new code should say what it means and pass the next step:

     toast.success('Team saved', {
         description: 'Charizard and 5 others.',
         actions: [{ label: 'View', onClick: () => navigate('/teams') }],
     });                                                                      */
const emit = (severity) => (title, options = {}) =>
    useToastStore.getState().showToast(title, severity, options);

export const toast = {
    success: emit('success'),
    error: emit('error'),
    warning: emit('warning'),
    info: emit('info'),
    dismiss: (id) => useToastStore.getState().dismissToast(id),
    clear: () => useToastStore.getState().clearToasts(),
};
