import { create } from 'zustand';
import { collection, documentId, getDocs, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import { appId } from '../constants/firebase';
import { validEquip } from '../utils/rewards';

/**
 * Other trainers' equipped rewards (2026-10-17, docs/modules/rewards.md): the
 * frame and title every avatar of theirs should wear — a forum post from last
 * month included, not only posts made after they equipped it. Read from their
 * `publicProfiles` doc (world-readable), once per trainer per session, and
 * batched: every avatar that asks within the same tick shares one query of up
 * to 30 ids. The trainer's own avatar never comes through here — it reads
 * useRewardsStore, which is live.
 *
 * `byUid[uid]` is `undefined` (not asked yet), `false` (no public profile — a
 * guest, or a lookup that failed: the post's stamped frame is used), or
 * `publicCard(doc)` (`{ frameId, titleId, level, streak, persona, memberSince, battleRecord }`).
 */

const BATCH = 30; // Firestore's limit for an `in` filter

const PERSONA_IDS = new Set(['strategist', 'traveler', 'challenger', 'master']);

/**
 * What a public profile doc says, cleaned: the rewards, plus what the trainer
 * card shows (2026-11-05) — the streak as stored (`liveStreak` judges it on
 * render), the persona, the month they joined and the battle record.
 */
export const publicCard = (data = {}) => ({
    frameId: validEquip(data.frameId, 'frame'),
    titleId: validEquip(data.titleId, 'title'),
    level: Number.isInteger(data.trainerLevel) ? data.trainerLevel : null,
    streak: data.streak && typeof data.streak === 'object' ? data.streak : null,
    persona: PERSONA_IDS.has(data.persona) ? data.persona : null,
    memberSince: typeof data.memberSince === 'string' && /^\d{4}-\d{2}$/.test(data.memberSince) ? data.memberSince : null,
    battleRecord: data.battleRecord && Number.isInteger(data.battleRecord.wins) ? data.battleRecord : null,
});

export const useTrainerCosmeticsStore = create((set, get) => {
    const queued = new Set();
    const inFlight = new Set();
    let timer = null;

    const flush = async () => {
        timer = null;
        const ids = [...queued];
        queued.clear();
        for (let i = 0; i < ids.length; i += BATCH) {
            const chunk = ids.slice(i, i + BATCH);
            chunk.forEach((id) => inFlight.add(id));
            const found = {};
            try {
                const snap = await getDocs(query(
                    collection(db, `artifacts/${appId}/publicProfiles`),
                    where(documentId(), 'in', chunk),
                ));
                snap.forEach((docSnap) => {
                    const data = docSnap.data();
                    found[docSnap.id] = publicCard(data);
                });
            } catch (err) {
                // Cosmetic: fall back to what each post carried, and do not retry this session.
                console.warn('Trainer cosmetics unavailable:', err?.code || err);
            }
            chunk.forEach((id) => inFlight.delete(id));
            set((state) => ({
                byUid: { ...state.byUid, ...Object.fromEntries(chunk.map((id) => [id, found[id] || false])) },
            }));
        }
    };

    return {
        byUid: {},

        /** Ask for a trainer's rewards; cheap to call on every render. */
        request: (uid) => {
            if (!uid || !db || uid === 'system') return;
            if (get().byUid[uid] !== undefined || queued.has(uid) || inFlight.has(uid)) return;
            queued.add(uid);
            if (!timer) timer = setTimeout(flush, 0);
        },

        /** What a profile doc already in hand says (friends list), so it needs no second read. */
        seed: (uid, data) => {
            if (!uid || !data) return;
            set((state) => ({
                byUid: {
                    ...state.byUid,
                    [uid]: publicCard(data),
                },
            }));
        },
    };
});
