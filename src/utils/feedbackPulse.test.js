import { describe, expect, it } from 'vitest';
import { MOODS, POSES, resolvePose } from './mascot/catalog.js';
import { mascotInner } from './mascot/rig.js';
import { isDeviceKey, wipeUserStorage } from './sessionWipe.js';
import {
    FEEDBACK_PULSE_STORAGE_KEY,
    FEEDBACK_PULSE_VERSION,
    FEEDBACK_REACTIONS,
    applyAccountFeedbackPulse,
    mergeFeedbackPulse,
    normalizeFeedbackPulse,
    readFeedbackPulse,
    shouldShowFeedbackPulse,
    summarizeFeedbackReactions,
    writeFeedbackPulse,
} from './feedbackPulse.js';

const makeMemoryStorage = () => {
    const map = new Map();
    return {
        get length() { return map.size; },
        key: (i) => Array.from(map.keys())[i] ?? null,
        getItem: (k) => (map.has(k) ? map.get(k) : null),
        setItem: (k, v) => { map.set(k, String(v)); },
        removeItem: (k) => { map.delete(k); },
    };
};

describe('feedbackPulse', () => {
    it('keeps every reaction mapped to valid catalog MOODS, POSES, and renderable mascot SVG', () => {
        expect(FEEDBACK_REACTIONS.map((r) => r.id)).toEqual(['love', 'like', 'neutral', 'dislike']);
        for (const r of FEEDBACK_REACTIONS) {
            expect(MOODS[r.mood], `mood ${r.mood}`).toBeDefined();
            expect(POSES[r.pose], `pose ${r.pose}`).toBeDefined();
            const svg = mascotInner(resolvePose({ mood: r.mood, pose: r.pose }));
            expect(/NaN|undefined|Infinity/.test(svg)).toBe(false);
        }
    });

    it('shows once per campaign version and hides after submitted or skipped', () => {
        expect(shouldShowFeedbackPulse(null)).toBe(true);
        expect(shouldShowFeedbackPulse({ version: 'old-version', status: 'submitted', reaction: 'love', at: 1 })).toBe(true);
        expect(shouldShowFeedbackPulse({ version: FEEDBACK_PULSE_VERSION, status: 'skipped', at: 10 })).toBe(false);
        expect(shouldShowFeedbackPulse({ version: FEEDBACK_PULSE_VERSION, status: 'submitted', reaction: 'like', at: 20 })).toBe(false);
    });

    it('merges local and account state so submitted beats skipped and current version wins', () => {
        const skipped = normalizeFeedbackPulse({ version: FEEDBACK_PULSE_VERSION, status: 'skipped', at: 100 });
        const submitted = normalizeFeedbackPulse({ version: FEEDBACK_PULSE_VERSION, status: 'submitted', reaction: 'love', at: 50 });
        expect(mergeFeedbackPulse(skipped, submitted)).toEqual(submitted);
        expect(mergeFeedbackPulse(submitted, skipped)).toEqual(submitted);

        const storage = makeMemoryStorage();
        writeFeedbackPulse(skipped, storage);
        const applied = applyAccountFeedbackPulse(submitted, storage);
        expect(applied.status).toBe('submitted');
        expect(readFeedbackPulse(storage).reaction).toBe('love');
    });

    it('uses a trainer-scoped storage key wiped on sign-out', () => {
        expect(isDeviceKey(FEEDBACK_PULSE_STORAGE_KEY)).toBe(false);
        const local = makeMemoryStorage();
        writeFeedbackPulse({ version: FEEDBACK_PULSE_VERSION, status: 'submitted', reaction: 'love', at: 10 }, local);
        const removed = wipeUserStorage({ local });
        expect(removed).toContain(FEEDBACK_PULSE_STORAGE_KEY);
        expect(shouldShowFeedbackPulse(readFeedbackPulse(local))).toBe(true);
    });

    it('summarizes reaction breakdown and positive percentage for Admin Dashboard', () => {
        const summary = summarizeFeedbackReactions([
            { source: 'pulse', reaction: 'love', text: 'Amei o novo perfil!' },
            { source: 'pulse', reaction: 'love', text: '' },
            { source: 'pulse', reaction: 'like', text: 'Muito bom' },
            { source: 'pulse', reaction: 'neutral', text: 'Falta modo escuro no guia' },
            { source: 'pulse', reaction: 'dislike', text: 'Travou no celular' },
            { source: 'footer', text: 'Sugestão clássica sem reação' },
        ]);
        expect(summary.withReaction).toBe(5);
        expect(summary.pulseCount).toBe(5);
        expect(summary.withComment).toBe(5);
        expect(summary.positive).toBe(3);
        expect(summary.positivePct).toBe(60);
        expect(summary.counts).toEqual({ love: 2, like: 1, neutral: 1, dislike: 1 });
    });
});
