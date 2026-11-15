import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';

import { db } from '../services/firebase';
import { appId } from '../constants/firebase';
import { dayKeyAt } from '../utils/challengeDay';
import { localDayKey } from '../utils/dailyCheckin';
import { centerCounts } from '../utils/friendActivity';

const CHAMPION_SUFFIXES = ['', '_blue'];

const readDoc = async (path) => {
    try {
        const snap = await getDoc(doc(db, path));
        return snap.exists() ? snap.data() : null;
    } catch {
        return null;
    }
};

/**
 * How many played today — the PokéPuzzle's day counter and both champions'
 * ranks, the same public documents the Home's "Hoje no Centro" sums
 * (`centerCounts`). Read once, after the page is idle, so the landing's first
 * paint never waits on Firestore. `null` until it answers (the band shows no
 * line rather than a zero that is only "not loaded yet").
 */
export function useTodayCrowd() {
    const [counts, setCounts] = useState(null);
    useEffect(() => {
        if (!db) return undefined;
        let alive = true;
        const run = async () => {
            const base = `artifacts/${appId}/public/data`;
            const now = Date.now();
            const braDay = dayKeyAt(now);
            const [puzzleDay, ...ranks] = await Promise.all([
                readDoc(`${base}/puzzleDays/${localDayKey(new Date(now))}`),
                ...CHAMPION_SUFFIXES.map((suffix) => readDoc(`${base}/challengeRanks/${braDay}${suffix}`)),
            ]);
            if (!alive) return;
            setCounts(centerCounts({ puzzleDay, ranks: Object.fromEntries(ranks.map((r, i) => [i, r])) }));
        };
        const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 1200));
        const cancel = window.cancelIdleCallback || clearTimeout;
        const handle = idle(() => { run(); }, { timeout: 3000 });
        return () => { alive = false; cancel(handle); };
    }, []);
    return counts;
}
