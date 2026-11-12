/** Length of a mood change, ms. */
export const MOOD_MS = 420;
const smooth = (t) => {
    const x = Math.min(1, Math.max(0, t));
    return x * x * (3 - 2 * x);
};
/** Eased progress of a mood change from elapsed time (smoothstep, clamped). */
export function moodProgress(elapsedMs) {
    return smooth(elapsedMs / MOOD_MS);
}
/**
 * What a new mood change eases in from: the mood on screen with any change
 * still under way frozen at its progress, so the pose continues from exactly
 * where it is. Older changes whose share has all but faded (or beyond a few
 * levels) are dropped, so rapid clicking never grows the chain.
 */
export function settleMood(state, share = 1, depth = 0) {
    const b = state.blend;
    if (!b)
        return state;
    const rest = share * (1 - b.t);
    if (rest < 0.02 || depth >= 3)
        return { motion: state.motion };
    return { motion: state.motion, blend: { from: typeof b.from === 'string' ? b.from : settleMood(b.from, rest, depth + 1), t: b.t } };
}
