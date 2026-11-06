import { collection, doc, getCountFromServer, getDoc, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { appId } from '../constants/firebase';
import { markJourney, useAuthStore } from '../store/useAuthStore';
import { currentWeekKey, previousWeekKey, weeklyStandings, weeklyTopicId } from '../utils/forumWeekly';

/**
 * What the community granted, read once per session (2026-11-06,
 * docs/plans/social-heart.md): the last week's tournament winner, the last
 * Champion week's podium, an accepted answer. Each becomes a journey mark —
 * kept for good (localStorage + preferences), so the badges, titles and the
 * chapter 2 missions read them without asking again. Best-effort and quiet:
 * a failed read just tries again next session.
 */
let checkedFor = null;

const has = (mark) => Boolean(useAuthStore.getState().journeyMarks?.[mark]);

export async function checkSocialRecord(uid) {
    if (!db || !uid || checkedFor === uid) return;
    checkedFor = uid;
    const base = `artifacts/${appId}/public/data`;
    const lastWeek = previousWeekKey(currentWeekKey());

    const tasks = [];
    if (!has('weeklyChampion')) {
        tasks.push((async () => {
            const snap = await getDocs(query(collection(db, `${base}/forumTopics/${weeklyTopicId(lastWeek)}/messages`), limit(100)));
            const [top] = weeklyStandings(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
            if (top && top.score > 0 && top.message.createdBy === uid) markJourney('weeklyChampion');
        })());
    }
    if (!has('seasonPodium')) {
        tasks.push((async () => {
            for (const suffix of ['', '_blue']) {
                const snap = await getDoc(doc(db, `${base}/challengeRanks/week-${lastWeek}${suffix}`));
                const podium = (snap.exists() ? snap.data().entries || [] : []).slice(0, 3).map((e) => e.uid);
                if (podium.includes(uid)) {
                    markJourney('seasonPodium');
                    return;
                }
            }
        })());
    }
    if (!has('acceptedAnswer')) {
        tasks.push((async () => {
            const count = await getCountFromServer(query(collection(db, `${base}/forumTopics`), where('acceptedAuthorId', '==', uid)));
            if (count.data().count > 0) markJourney('acceptedAnswer');
        })());
    }
    await Promise.allSettled(tasks);
}
