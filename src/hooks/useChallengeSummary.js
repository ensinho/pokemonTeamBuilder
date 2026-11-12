import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';

import { appId } from '../constants/firebase';
import { db } from '../services/firebase';
import { challengeSummaryState, dayKeyAt, effectiveStreak, nextResetAt } from '../utils/challengeDay';
import { CHAMPION_IDS, DEFAULT_CHAMPION } from '../utils/challengeChampions';

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
 * launcher (wound 2026-09-04). Reads three documents per champion (the public
 * day, and for an account its two runs) plus the stats, never the route, the sim or
 * `@pkmn/img`; a small localStorage summary paints the card at once.
 *
 * `state`: 'guest' | 'new' (nobody has opened today's day yet) | 'ready' |
 * 'active' | 'won' | 'lost' (lost or expired — a practice rematch is open).
 * `boards`: `{ daily, free }`, each official run's stored status (null: not played).
 * `champions`: the same for every champion (`[{ id, state, difficulty, lineup, streak, boards }]`).
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
                // Per champion (2026-11-12): their public day and, for an account,
                // their two officials — the Time do dia's and your own team's (`_free`).
                // A run that doesn't exist yet is a denied read, not an empty one
                // (its rule checks resource.data.uid): either way, not played today.
                const readChampion = async (id) => {
                    const suffix = id === DEFAULT_CHAMPION ? '' : `_${id}`;
                    const [day, run, freeRun] = await Promise.all([
                        getDoc(doc(db, `${base}/public/data/challengeDays/${dayKey}${suffix}`)),
                        isAnonymous ? null : getDoc(doc(db, `${base}/challengeRuns/${userId}_${dayKey}${suffix}`)).catch(() => null),
                        isAnonymous ? null : getDoc(doc(db, `${base}/challengeRuns/${userId}_${dayKey}${suffix}_free`)).catch(() => null),
                    ]);
                    return { id, day: day.exists() ? day.data() : null, statuses: [run, freeRun].map((snap) => (snap?.exists() ? snap.data().status : null)) };
                };
                const [stats, ...read] = await Promise.all([
                    isAnonymous ? null : getDoc(doc(db, `${base}/challengeStats/${userId}`)).catch(() => null),
                    // A public day that fails to load is offline: the whole read fails and the cache stays.
                    ...CHAMPION_IDS.map(readChampion),
                ]);
                const statsDoc = stats?.exists() ? stats.data() : null;
                const champions = read.map(({ id, day: dayData, statuses }) => {
                    // A battle on either board in progress, else a win on either, else whichever was played.
                    const status = ['active', 'won'].find((x) => statuses.includes(x)) || statuses.find(Boolean) || null;
                    const championStats = id === DEFAULT_CHAMPION ? statsDoc : statsDoc?.champions?.[id];
                    return {
                        id,
                        state: challengeSummaryState({ hasDay: Boolean(dayData), runStatus: status, isGuest: isAnonymous }),
                        difficulty: dayData?.difficulty || null,
                        // Their six for the Home's silhouettes; null is the wildcard.
                        lineup: (dayData?.lineup || []).map((mon) => (mon.wildcard ? null : mon.dexNum || null)),
                        streak: championStats ? effectiveStreak(championStats, dayKey) : 0,
                        // Each board on its own (utils/challengeBoards.js): 0/2 · 1/2 · 2/2.
                        boards: { daily: statuses[0], free: statuses[1] },
                    };
                });
                const cynthia = champions.find((c) => c.id === DEFAULT_CHAMPION) || champions[0];
                const next = {
                    uid: userId,
                    dayKey,
                    // Cynthia's day at the top level, as before, for every older reader.
                    state: cynthia.state,
                    difficulty: cynthia.difficulty,
                    leadDex: cynthia.lineup[0] || null,
                    lineup: cynthia.lineup,
                    streak: cynthia.streak,
                    boards: cynthia.boards,
                    champions,
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
