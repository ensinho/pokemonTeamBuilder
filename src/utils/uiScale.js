// Interface scale — the "make everything smaller/bigger" control.
//
// It multiplies the root font size, and the whole shell is sized in rem, so a
// step scales type *and* the spacing around it. That is what the request asked
// for: on a small monitor the point is to fit more on screen, not just to read
// larger text.

export const UI_SCALE_STEPS = [0.8,0.9, 1, 1.1, 1.25];
export const DEFAULT_UI_SCALE = 1;

const EPSILON = 0.001;

const closestStep = (value) => UI_SCALE_STEPS.reduce(
    (best, step) => (Math.abs(step - value) < Math.abs(best - value) ? step : best),
    UI_SCALE_STEPS[0],
);

/** Any stored/incoming value mapped onto a supported step. */
export function normalizeUiScale(value) {
    const numeric = typeof value === 'string' ? Number.parseFloat(value) : value;
    if (typeof numeric !== 'number' || !Number.isFinite(numeric)) return DEFAULT_UI_SCALE;
    return closestStep(numeric);
}

/** Move one step up (+1) or down (-1); clamps at the ends. */
export function stepUiScale(current, direction) {
    const index = UI_SCALE_STEPS.indexOf(normalizeUiScale(current));
    const next = index + Math.sign(direction);
    if (next < 0 || next >= UI_SCALE_STEPS.length) return UI_SCALE_STEPS[index];
    return UI_SCALE_STEPS[next];
}

export const isMinUiScale = (value) => Math.abs(normalizeUiScale(value) - UI_SCALE_STEPS[0]) < EPSILON;
export const isMaxUiScale = (value) =>
    Math.abs(normalizeUiScale(value) - UI_SCALE_STEPS[UI_SCALE_STEPS.length - 1]) < EPSILON;

/** "100%" / "125%" — the label on the control. */
export const formatUiScale = (value) => `${Math.round(normalizeUiScale(value) * 100)}%`;
