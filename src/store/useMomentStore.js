import { create } from 'zustand';

/**
 * The living moments' queue (utils/livingMoments.js, components/moments/):
 * a place emits a moment when the trainer's own act earned it — the check-in
 * that crossed a level, the game that completed the day — and `<MomentLayer>`
 * plays them one at a time. A place that is playing its own scene (the
 * Champion's Hall of Fame) holds the queue until it has handed over.
 *
 * One of each kind at a time: a second level-up while the first is queued
 * replaces its payload instead of stacking another evolution.
 */
export const useMomentStore = create((set, get) => ({
    queue: [],
    holdUntil: 0,
    play: (kind, payload = {}) => set((s) => {
        const at = s.queue.findIndex((m) => m.kind === kind);
        if (at >= 0) {
            const queue = s.queue.slice();
            queue[at] = { ...queue[at], payload };
            return { queue };
        }
        return { queue: [...s.queue, { id: `${kind}-${Date.now()}`, kind, payload }] };
    }),
    finish: (id) => set((s) => ({ queue: s.queue.filter((m) => m.id !== id) })),
    hold: (ms) => set({ holdUntil: Math.max(get().holdUntil, Date.now() + ms) }),
}));

export const playMoment = (kind, payload) => useMomentStore.getState().play(kind, payload);
export const holdMoments = (ms) => useMomentStore.getState().hold(ms);
