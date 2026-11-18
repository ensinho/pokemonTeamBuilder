/**
 * O Ovo Surpresa (2026-11-18, Fase 3 "Fantasminha de Plantão").
 *
 * Franchise device: Pokémon Eggs hatch from steps. Here, each "step" is a
 * completed 4/4 day (`fullDays` from `useRoundStore`, `ptb:mascot:round`).
 *
 * Drive-motivation & Creative Direction rules:
 * - Zero streak guilt: missing days NEVER resets or cracks backward. Any 5
 *   completed days, whenever they happen, finish a cycle.
 * - Zero currency: XP is never spent; outfits are pure milestone unlocks.
 * - Gold only when hatched: step pills and stamp turn gold strictly after
 *   hatching, never while still incubating.
 * - Trainer-scoped storage (`ptb:mascot:egg`, excluded from `DEVICE_KEYS` so
 *   `wipeUserStorage` clears it automatically on sign-out).
 */

export const EGG_STORAGE_KEY = 'ptb:mascot:egg';
export const EGG_CYCLE_DAYS = 5;

/**
 * Surprise hats unlocked across 5-day cycles. Every key is a real entry in
 * `HATS` (`src/utils/mascot/rig.js`), verified by `mascotEgg.test.js`.
 */
export const EGG_HATS = Object.freeze([
    'witch',
    'cap',
    'headphones',
    'party',
    'straw',
    'professor',
    'crown',
]);

/**
 * Maps any hatched hat to a `MASCOT_COSTUME_CHOICES` key accepted by
 * `useMascotStore.setPrefs({ costume })` so equipping persists cleanly on
 * the mascot store as well as in `ptb:mascot:egg`.
 */
export const EGG_COSTUME_MAP = Object.freeze({
    witch: 'detective',
    cap: 'cap',
    headphones: 'headphones',
    party: 'bowtie',
    straw: 'explorer',
    professor: 'mortarboard',
    crown: 'sunglasses',
});

const safeInt = (value, max = 100000) => (
    Number.isInteger(value) && value >= 0 ? Math.min(value, max) : 0
);

/** 1-indexed cycle number → deterministic hat from `EGG_HATS`. */
export function rewardForCycle(cycleNumber = 1) {
    const idx = Math.max(0, Math.floor(Number(cycleNumber) || 1) - 1);
    return EGG_HATS[idx % EGG_HATS.length];
}

/** Normalize persisted trainer egg record (`ptb:mascot:egg`). */
export function normalizeEggState(raw) {
    const v = raw && typeof raw === 'object' ? raw : {};
    const hatchedCycles = safeInt(v.hatchedCycles);
    const seen = new Set();
    const unlocked = [];

    const addHat = (hat) => {
        if (EGG_HATS.includes(hat) && !seen.has(hat)) {
            seen.add(hat);
            unlocked.push(hat);
        }
    };

    for (let c = 1; c <= Math.min(hatchedCycles, EGG_HATS.length); c += 1) {
        addHat(rewardForCycle(c));
    }
    if (Array.isArray(v.unlocked)) {
        v.unlocked.forEach(addHat);
    }

    const equippedHat = EGG_HATS.includes(v.equippedHat) && seen.has(v.equippedHat)
        ? v.equippedHat
        : null;

    return {
        v: 1,
        hatchedCycles,
        unlocked,
        equippedHat,
    };
}

/**
 * Derive current 5-day egg view model from `fullDays` (`useRoundStore`) and
 * persisted `eggState` (`ptb:mascot:egg`).
 *
 * - `cracks`: `0..4` while incubating (`0` = smooth egg, `4` = 4 cracks; when
 *   `readyToHatch` is true all 5 crack paths `0..4` show including the seam).
 * - `stepDays`: `0..5` non-punitive step pills lit for the current cycle.
 * - `readyToHatch`: a 5-day cycle completed and awaits the trainer's tap.
 * - `hatched`: the just-completed 5-day milestone was hatched (stays visible
 *   at `5/5` until the 6th full day starts the next egg at `1/5`).
 */
export function deriveEggProgress(fullDays = 0, rawState = null) {
    const safeDays = safeInt(Number.isFinite(fullDays) ? Math.floor(fullDays) : 0);
    const state = normalizeEggState(rawState);
    const completedCycles = Math.floor(safeDays / EGG_CYCLE_DAYS);
    const readyToHatch = completedCycles > state.hatchedCycles;
    const hatched = !readyToHatch
        && completedCycles > 0
        && completedCycles === state.hatchedCycles
        && safeDays % EGG_CYCLE_DAYS === 0;

    let activeCycle = state.hatchedCycles + 1;
    let stepDays = safeDays % EGG_CYCLE_DAYS;
    let cracks = stepDays;

    if (readyToHatch) {
        activeCycle = state.hatchedCycles + 1;
        stepDays = EGG_CYCLE_DAYS;
        cracks = 4;
    } else if (hatched) {
        activeCycle = state.hatchedCycles;
        stepDays = EGG_CYCLE_DAYS;
        cracks = 4;
    }

    const rewardHat = rewardForCycle(activeCycle);

    return {
        fullDays: safeDays,
        stepDays,
        cracks,
        crackCountVisible: readyToHatch ? 5 : cracks,
        readyToHatch,
        hatched,
        activeCycle,
        rewardHat,
        hatchedCycles: state.hatchedCycles,
        unlocked: state.unlocked,
        equippedHat: state.equippedHat,
    };
}

/** Pure transition when the trainer clicks to hatch a completed 5-day egg. */
export function hatchEggCycle(rawState, fullDays = 0) {
    const state = normalizeEggState(rawState);
    const safeDays = safeInt(Number.isFinite(fullDays) ? Math.floor(fullDays) : 0);
    const completedCycles = Math.floor(safeDays / EGG_CYCLE_DAYS);
    if (completedCycles <= state.hatchedCycles) return state;

    const nextCycle = state.hatchedCycles + 1;
    const reward = rewardForCycle(nextCycle);
    return normalizeEggState({
        ...state,
        hatchedCycles: nextCycle,
        unlocked: [...state.unlocked, reward],
    });
}

/** Pure transition to mark an unlocked hat as worn (or `null` to clear). */
export function withEquippedEggHat(rawState, hat) {
    const state = normalizeEggState(rawState);
    if (hat === null) return { ...state, equippedHat: null };
    if (!state.unlocked.includes(hat)) return state;
    return { ...state, equippedHat: hat };
}

/** Resolve the `useMascotStore` costume key corresponding to an egg hat. */
export function storeCostumeForEggHat(hat) {
    return EGG_COSTUME_MAP[hat] || 'none';
}

export function readEggState(storage = typeof window !== 'undefined' ? window.localStorage : null) {
    try {
        if (!storage) return normalizeEggState(null);
        return normalizeEggState(JSON.parse(storage.getItem(EGG_STORAGE_KEY) || 'null'));
    } catch {
        return normalizeEggState(null);
    }
}

export function writeEggState(state, storage = typeof window !== 'undefined' ? window.localStorage : null) {
    const clean = normalizeEggState(state);
    try {
        if (storage) storage.setItem(EGG_STORAGE_KEY, JSON.stringify(clean));
    } catch { /* private mode: persists for this session */ }
    return clean;
}
