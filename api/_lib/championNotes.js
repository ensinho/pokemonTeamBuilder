// The champions comment on the day (2026-11-06, docs/plans/social-heart.md
// C6), and the Diário do dia opens itself (B1): both ride the daily cron
// (api/daily-puzzle.js GET — the Hobby plan has two crons, both used).
// A note is data, not prose: the client words it in the reader's language
// (forum/ChampionNote.jsx), so one document serves both.

import { CHAMPION_IDS } from './challenge/constants.js';
import { dayKeyAt, isoWeekOf, previousDayKey } from './challenge/day.js';

const CHAMPION_AVATAR = { cynthia: 445, blue: 6 };
const CHAMPION_NAME = { cynthia: 'Cynthia', blue: 'Blue' };

/** What a champion says about a day's ranking — numbers only, or null with nobody playing. */
export function championNoteOf(ranks, championId) {
    const played = (ranks?.played?.daily || 0) + (ranks?.played?.free || 0);
    if (!played) return null;
    const wins = (ranks?.wins?.daily || 0) + (ranks?.wins?.free || 0);
    const fastest = [...(ranks?.boards?.daily || []), ...(ranks?.boards?.free || [])]
        .sort((a, b) => a.turns - b.turns || b.score - a.score)[0] || null;
    return {
        champion: championId,
        played,
        wins,
        fastest: fastest ? { name: String(fastest.name || 'Trainer').slice(0, 40), turns: fastest.turns } : null,
    };
}

/** The diary topic document the cron writes when nobody opened the day yet. */
export const diaryDoc = (dayKey, nowIso) => ({
    title: `Daily log ${dayKey}`,
    category: 'diary',
    dayKey,
    createdAt: nowIso,
    createdBy: 'system',
    creatorName: 'Professor Oak',
    creatorAvatar: 94,
    creatorAvatarIsShiny: false,
    lastActivityAt: nowIso,
    messageCount: 0,
    lastMessageText: '',
});

/** Open today's diary and leave yesterday's champion notes. Best-effort, idempotent. */
export async function runDiaryCron({ db, appId, now = Date.now() }) {
    const base = `artifacts/${appId}/public/data`;
    const today = dayKeyAt(now);
    const yesterday = previousDayKey(today);
    const nowIso = new Date(now).toISOString();
    // The week's tournament opens with the week (the same doc clients write).
    const week = isoWeekOf(today);
    const weekRef = db.doc(`${base}/forumTopics/weekly-${week}`);
    if (!(await weekRef.get()).exists) {
        const themes = ['kanto', 'monoFire', 'noLegends', 'gymLeader', 'unevolved', 'monoWater', 'starter', 'slow'];
        const n = Number(week.split('-W')[1]) + Number(week.slice(0, 4));
        const { dayKey: _unused, ...shape } = diaryDoc(today, nowIso);
        await weekRef.set({ ...shape, title: `Weekly tournament ${week}`, category: 'teams', weekKey: week, theme: themes[n % themes.length] });
    }
    const todayRef = db.doc(`${base}/forumTopics/diary-${today}`);
    const todaySnap = await todayRef.get();
    if (!todaySnap.exists) await todayRef.set(diaryDoc(today, nowIso));

    const yRef = db.doc(`${base}/forumTopics/diary-${yesterday}`);
    let notes = 0;
    for (const championId of CHAMPION_IDS) {
        const suffix = championId === CHAMPION_IDS[0] ? '' : `_${championId}`;
        const ranks = await db.doc(`${base}/challengeRanks/${yesterday}${suffix}`).get();
        const note = championNoteOf(ranks.exists ? ranks.data() : null, championId);
        if (!note) continue;
        const ySnap = await yRef.get();
        if (!ySnap.exists) await yRef.set(diaryDoc(yesterday, nowIso));
        await yRef.collection('messages').doc(`note-${championId}`).set({
            text: '',
            createdAt: nowIso,
            createdBy: 'system',
            creatorName: CHAMPION_NAME[championId] || championId,
            creatorAvatar: CHAMPION_AVATAR[championId] || 445,
            creatorAvatarIsShiny: false,
            championNote: note,
        });
        notes += 1;
    }
    return { today, notes };
}
