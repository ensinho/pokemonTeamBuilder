/**
 * Mascot Feedback Pulse (2026-11-19).
 *
 * Shows once per user (per campaign version) with the 3D Mascot asking if
 * they are enjoying PokemonBuilder, offering 4 tactile sentiment reactions
 * (`love`, `like`, `neutral`, `dislike`) + an optional comment box, and a
 * clean skip option.
 *
 * Persistence:
 * - Local trainer-scoped key (`ptb:feedbackPulse`, wiped on sign-out).
 * - Mirrored to Firestore `users/{uid}/profile/preferences.feedbackPulse` via
 *   `useAuthStore` so signed-in trainers never see the modal twice across
 *   browsers or devices.
 * - Submissions write to `artifacts/${appId}/suggestions` (`source: 'pulse'`)
 *   so every reaction and comment lands directly in the Admin Dashboard.
 */

export const FEEDBACK_PULSE_VERSION = '2026-11-v4';
export const FEEDBACK_PULSE_STORAGE_KEY = 'ptb:feedbackPulse';
export const FEEDBACK_PULSE_SYNC_EVENT = 'ptb:feedback-pulse';
export const FEEDBACK_COMMENT_MAX = 600;

/**
 * Canonical sentiment options and their corresponding live mascot states
 * (verified against `MOODS` and `POSES` in `src/utils/mascot/catalog.js`).
 */
export const FEEDBACK_REACTIONS = Object.freeze([
    {
        id: 'love',
        mood: 'apaixonado',
        pose: 'comemorando',
        play: 'celebrate',
        scene: 'morning',
        tone: 'var(--brand-live)',
    },
    {
        id: 'like',
        mood: 'feliz',
        pose: 'pulando',
        play: 'hop',
        scene: 'morning',
        tone: 'var(--color-success)',
    },
    {
        id: 'neutral',
        mood: 'pensando',
        pose: 'pataNoQueixo',
        play: undefined,
        scene: 'dusk',
        tone: 'var(--color-warning)',
    },
    {
        id: 'dislike',
        mood: 'preocupado',
        pose: 'dandoDeOmbros',
        play: 'shake',
        scene: 'night',
        tone: 'var(--color-danger)',
    },
]);

export const FEEDBACK_REACTION_IDS = Object.freeze(FEEDBACK_REACTIONS.map((r) => r.id));

export const FEEDBACK_REACTION_BY_ID = Object.freeze(
    Object.fromEntries(FEEDBACK_REACTIONS.map((r) => [r.id, r]))
);

let toAccount = null;
export const setFeedbackPulseToAccount = (push) => { toAccount = push; };

/** Normalize persisted feedback pulse record. */
export function normalizeFeedbackPulse(raw) {
    const v = raw && typeof raw === 'object' ? raw : {};
    const version = typeof v.version === 'string' && v.version.length <= 32 ? v.version : null;
    const status = v.status === 'submitted' || v.status === 'skipped' ? v.status : null;
    const reaction = FEEDBACK_REACTION_IDS.includes(v.reaction) ? v.reaction : null;
    const at = Number.isFinite(v.at) && v.at > 0 ? v.at : 0;
    return {
        v: 1,
        version: status ? version : null,
        status: version ? status : null,
        reaction: status === 'submitted' ? reaction : null,
        at: status && version ? at : 0,
    };
}

/** True when the trainer has neither answered nor skipped this campaign version. */
export function shouldShowFeedbackPulse(raw, version = FEEDBACK_PULSE_VERSION) {
    const state = normalizeFeedbackPulse(raw);
    return !(state.version === version && (state.status === 'submitted' || state.status === 'skipped'));
}

/**
 * Merge local and account copies:
 * - Prefer whichever copy matches the current `version` (or has the latest timestamp).
 * - For the same version, `'submitted'` always beats `'skipped'`.
 */
export function mergeFeedbackPulse(local, remote, currentVersion = FEEDBACK_PULSE_VERSION) {
    const a = normalizeFeedbackPulse(local);
    const b = normalizeFeedbackPulse(remote);
    if (!a.status) return b;
    if (!b.status) return a;

    const aCurrent = a.version === currentVersion;
    const bCurrent = b.version === currentVersion;
    if (aCurrent && !bCurrent) return a;
    if (bCurrent && !aCurrent) return b;

    if (a.version === b.version) {
        if (a.status === 'submitted' && b.status !== 'submitted') return a;
        if (b.status === 'submitted' && a.status !== 'submitted') return b;
    }

    return b.at >= a.at ? b : a;
}

export function readFeedbackPulse(storage = typeof window !== 'undefined' ? window.localStorage : null) {
    try {
        if (!storage) return normalizeFeedbackPulse(null);
        return normalizeFeedbackPulse(JSON.parse(storage.getItem(FEEDBACK_PULSE_STORAGE_KEY) || 'null'));
    } catch {
        return normalizeFeedbackPulse(null);
    }
}

export function writeFeedbackPulse(
    state,
    storage = typeof window !== 'undefined' ? window.localStorage : null,
    { syncAccount = true } = {}
) {
    const clean = normalizeFeedbackPulse(state);
    try {
        if (storage) storage.setItem(FEEDBACK_PULSE_STORAGE_KEY, JSON.stringify(clean));
    } catch { /* private mode */ }
    const isBrowserDefault = typeof window !== 'undefined' && storage === window.localStorage;
    if (isBrowserDefault) {
        window.dispatchEvent(new Event(FEEDBACK_PULSE_SYNC_EVENT));
        if (syncAccount) {
            Promise.resolve(toAccount?.(clean)).catch(() => {});
        }
    }
    return clean;
}

/** Merge account copy into local storage without echoing a write back. */
export function applyAccountFeedbackPulse(
    remote,
    storage = typeof window !== 'undefined' ? window.localStorage : null
) {
    const local = readFeedbackPulse(storage);
    const merged = mergeFeedbackPulse(local, remote);
    if (JSON.stringify(merged) === JSON.stringify(local)) return merged;
    return writeFeedbackPulse(merged, storage, { syncAccount: false });
}

/**
 * Aggregate reaction counts and percentages for the Admin Dashboard sentiment bar.
 */
export function summarizeFeedbackReactions(items = []) {
    const counts = { love: 0, like: 0, neutral: 0, dislike: 0 };
    let withReaction = 0;
    let withComment = 0;
    let pulseCount = 0;

    for (const item of items) {
        if (!item || typeof item !== 'object') continue;
        if (item.source === 'pulse') pulseCount += 1;
        if (typeof item.text === 'string' && item.text.trim().length > 0) withComment += 1;
        if (FEEDBACK_REACTION_IDS.includes(item.reaction)) {
            counts[item.reaction] += 1;
            withReaction += 1;
        }
    }

    const positive = counts.love + counts.like;
    const positivePct = withReaction > 0 ? Math.round((positive / withReaction) * 100) : 0;

    const breakdown = FEEDBACK_REACTIONS.map((r) => ({
        id: r.id,
        count: counts[r.id],
        pct: withReaction > 0 ? Math.round((counts[r.id] / withReaction) * 100) : 0,
    }));

    return {
        counts,
        breakdown,
        withReaction,
        withComment,
        pulseCount,
        positive,
        positivePct,
    };
}
