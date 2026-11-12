import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { appId } from '../constants/firebase';
import { CHAMPION_IDS } from '../utils/challengeChampions';
import { currentWeekKey, previousWeekKey } from '../utils/forumWeekly';

/**
 * Last week's Champion seasons, read once per session (2026-11-12). The docs
 * are world-readable (`public/data/challengeRanks/week-{weekKey}[_blue]`,
 * firestore.rules) and final once the week is over, so the recap needs no
 * endpoint and no server read — two client reads, shared by every caller.
 */
const suffix = (championId) => (championId === 'cynthia' ? '' : `_${championId}`);

/** The week that has just closed. */
export const lastWeekKey = (now = Date.now()) => previousWeekKey(currentWeekKey(now));

const cache = new Map();

/** @returns {Promise<Record<string, ?object>>} the season doc per champion (null: nobody won) */
export function loadSeasonDocs(weekKey) {
    if (!db || !weekKey) return Promise.resolve({});
    if (!cache.has(weekKey)) {
        const base = `artifacts/${appId}/public/data/challengeRanks`;
        const request = Promise.all(CHAMPION_IDS.map(async (id) => {
            const snap = await getDoc(doc(db, `${base}/week-${weekKey}${suffix(id)}`));
            return [id, snap.exists() ? snap.data() : null];
        })).then(Object.fromEntries);
        // A failed read tries again next time it is asked for.
        request.catch(() => cache.delete(weekKey));
        cache.set(weekKey, request);
    }
    return cache.get(weekKey);
}
