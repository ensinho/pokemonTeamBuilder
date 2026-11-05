/**
 * The coffee nudge (2026-11-04, Enzo): a light toast after a Champion battle, a PokéPuzzle or
 * a finished quiz, asking for a coffee. Pure, so how often it may ask is tested
 * apart from the browser.
 *
 * Rules: never on the first finish (the visitor has not had a reason yet),
 * then at most once a week, and never again once they have clicked through.
 */
export const SUPPORT_NUDGE_KEY = 'ptb:supportNudge';

export const SUPPORT_NUDGE_MIN_FINISHES = 2;
export const SUPPORT_NUDGE_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

const EMPTY = Object.freeze({ finishes: 0, lastShownAt: 0, supported: false });

export function shouldNudgeSupport({ finishes = 0, lastShownAt = 0, supported = false } = {}, now = Date.now()) {
    if (supported) return false;
    if (finishes < SUPPORT_NUDGE_MIN_FINISHES) return false;
    return now - lastShownAt >= SUPPORT_NUDGE_INTERVAL_MS;
}

export function readSupportNudge(storage) {
    try {
        const parsed = JSON.parse(storage?.getItem(SUPPORT_NUDGE_KEY) || 'null');
        if (!parsed || typeof parsed !== 'object') return { ...EMPTY };
        return {
            finishes: Number(parsed.finishes) || 0,
            lastShownAt: Number(parsed.lastShownAt) || 0,
            supported: parsed.supported === true,
        };
    } catch {
        return { ...EMPTY };
    }
}

export function writeSupportNudge(storage, state) {
    try {
        storage?.setItem(SUPPORT_NUDGE_KEY, JSON.stringify(state));
    } catch {
        /* blocked storage: the nudge just never reaches its second finish */
    }
}

/** Counts one finish and says whether this one should ask. */
export function recordFinish(state, now = Date.now()) {
    const next = { ...state, finishes: (state?.finishes || 0) + 1 };
    const show = shouldNudgeSupport(next, now);
    return { state: show ? { ...next, lastShownAt: now } : next, show };
}
