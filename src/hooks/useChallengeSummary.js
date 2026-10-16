import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';

import { appId } from '../constants/firebase';
import { db } from '../services/firebase';
import { challengeSummaryState, dayKeyAt, effectiveStreak, nextResetAt } from '../utils/challengeDay';

const CACHE_KEY = 'ptb:challenge:summary';

const readCache = (userId) => {
    try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
        // Only today's summary for this account; anything else would show a stale state.
        return cached && cached.uid === userId && cached.dayKey === dayKeyAt(Date.now()) ? cached : null;
    } catch (_) {
        return null;
    }
};

const writeCache = (summary) => {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(summary));
    } catch (_) { /* a convenience: the card still loads without it */ }
};

/**
 * Today's Champion Challenge as the Home card sees it — a status card, not a
 * launcher (wound 2026-09-04). Reads at most three documents (the public day,
 * and for an account its run and stats), never the route, the sim or
 * `@pkmn/img`; a small localStorage summary paints the card at once.
 *
 * `state`: 'guest' | 'new' (nobody has opened today's day yet) | 'ready' |
 * 'active' | 'won' | 'lost' (lost or expired — a practice rematch is open).
 */
export function useChallengeSummary(userId, isAnonymous) {
    const [summary, setSummary] = useState(() => readCache(userId));

    useEffect(() => {
        if (!db || !userId) return undefined;
        let cancelled = false;
        const load = async () => {
            const now = Date.now();
            const dayKey = dayKeyAt(now);
            const base = `artifacts/${appId}`;
            try {
                const [day, run, stats] = await Promise.all([
                    getDoc(doc(db, `${base}/public/data/challengeDays/${dayKey}`)),
                    // A run that doesn't exist yet is a denied read, not an empty one
                    // (its rule checks resource.data.uid): either way, not played today.
                    isAnonymous ? null : getDoc(doc(db, `${base}/challengeRuns/${userId}_${dayKey}`)).catch(() => null),
                    isAnonymous ? null : getDoc(doc(db, `${base}/challengeStats/${userId}`)).catch(() => null),
                ]);
                const dayData = day.exists() ? day.data() : null;
                const status = run?.exists() ? run.data().status : null;
                const lead = dayData?.lineup?.[0]?.wildcard ? null : dayData?.lineup?.[0] || null;
                const state = challengeSummaryState({ hasDay: Boolean(dayData), runStatus: status, isGuest: isAnonymous });
                const next = {
                    uid: userId,
                    dayKey,
                    state,
                    difficulty: dayData?.difficulty || null,
                    leadDex: lead?.dexNum || null,
                    // Her six for the Home card's silhouettes; null is the wildcard.
                    lineup: (dayData?.lineup || []).map((mon) => (mon.wildcard ? null : mon.dexNum || null)),
                    streak: stats?.exists() ? effectiveStreak(stats.data(), dayKey) : 0,
                    nextResetAt: nextResetAt(now),
                };
                if (!cancelled) {
                    setSummary(next);
                    writeCache(next);
                }
            } catch (_) { /* offline: keep whatever the cache painted */ }
        };
        load();
        return () => { cancelled = true; };
    }, [userId, isAnonymous]);

    return summary;
}
