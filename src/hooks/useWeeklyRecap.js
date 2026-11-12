import { useCallback, useEffect, useMemo, useState } from 'react';
import { lastWeekKey, loadSeasonDocs } from '../services/weeklyRecap';
import { CHAMPION_IDS } from '../utils/challengeChampions';
import { seasonRecap, shouldOpenRecap } from '../utils/weeklyRecap';

/**
 * Last week's Champion seasons for the trainer looking (2026-11-12), and
 * whether the recap still owes them its one automatic opening.
 *
 * The "seen" week is the trainer's (it goes with them on sign-out — not a
 * DEVICE_KEYS entry), so the next account on the device gets its own recap.
 */
const SEEN_KEY = 'ptb:challenge:recapSeen';

const readSeen = () => {
    try { return localStorage.getItem(SEEN_KEY); } catch { return null; }
};

export function useWeeklyRecap(uid) {
    const weekKey = useMemo(() => lastWeekKey(), []);
    const [docs, setDocs] = useState(null);
    const [seenWeekKey, setSeenWeekKey] = useState(readSeen);

    useEffect(() => {
        let alive = true;
        loadSeasonDocs(weekKey).then((result) => { if (alive) setDocs(result); }).catch(() => {});
        return () => { alive = false; };
    }, [weekKey]);

    const recaps = useMemo(() => (docs
        ? Object.fromEntries(CHAMPION_IDS.map((id) => [id, seasonRecap(docs[id], uid)]))
        : null), [docs, uid]);

    const markSeen = useCallback(() => {
        try { localStorage.setItem(SEEN_KEY, weekKey); } catch { /* private mode: it may open again */ }
        setSeenWeekKey(weekKey);
    }, [weekKey]);

    return {
        weekKey,
        recaps,
        hasRecap: Boolean(recaps && Object.values(recaps).some(Boolean)),
        isDue: Boolean(recaps) && shouldOpenRecap({ weekKey, seenWeekKey, recaps }),
        markSeen,
    };
}
