import { create } from 'zustand';
import { useEffect } from 'react';
import { collection, doc, documentId, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import { appId } from '../constants/firebase';
import { CHAMPIONS } from '../utils/friendActivity';
import { dayKeyAt, previousDayKey } from '../utils/challengeDay';
import { localDayKey } from '../utils/dailyCheckin';
import { diaryTopicId } from '../utils/forumDiary';

/**
 * "Hoje no Centro" and "Atividade dos amigos" (2026-11-09): the day's crowd
 * and the friends' doings, read from documents that are already public —
 * nothing new is stored. One store so Home and the Friends page share one
 * set of reads.
 *
 * Polled, not listened to: a listener on a counter every finished run moves
 * would bill one read per run per open Home. A poll every two minutes while
 * the tab is visible (and on coming back to it) is live enough for "N
 * trainers played today", and never re-reads within 30 s. Yesterday's
 * documents are closed, so they are read once per session.
 *
 * Never imports useAuthStore (the caller passes the uid): a store a test
 * imports must not pull Firebase Auth in CI.
 */

export const CENTER_REFRESH_MS = 120000;
const MIN_GAP_MS = 30000;
const IN_LIMIT = 30;

const base = () => `artifacts/${appId}/public/data`;
const suffix = (champion) => (champion === 'cynthia' ? '' : `_${champion}`);

const readDoc = async (path) => {
    try {
        const snap = await getDoc(doc(db, path));
        return snap.exists() ? snap.data() : null;
    } catch {
        return null;
    }
};

/** Docs of a collection whose id (or a field) is one of the friends, 30 at a time. */
const readFriendsIn = async (path, uids, field = null) => {
    const out = [];
    for (let i = 0; i < uids.length; i += IN_LIMIT) {
        const chunk = uids.slice(i, i + IN_LIMIT);
        try {
            const snap = await getDocs(query(collection(db, path), where(field || documentId(), 'in', chunk)));
            snap.docs.forEach((d) => out.push({ id: d.id, uid: d.id, ...d.data() }));
        } catch {
            /* a friend list the rules or the network refuse just shows less */
        }
    }
    return out;
};

// Closed days, read once per session per friend list.
const closedCache = new Map();

const readDay = async ({ braDay, localDay, uids, withCounters }) => {
    const [rankDocs, puzzleDay, puzzleRows, diaryMessages] = await Promise.all([
        Promise.all(CHAMPIONS.map((c) => readDoc(`${base()}/challengeRanks/${braDay}${suffix(c)}`))),
        withCounters ? readDoc(`${base()}/puzzleDays/${localDay}`) : null,
        uids.length ? readFriendsIn(`${base()}/puzzleDays/${localDay}/players`, uids) : [],
        uids.length ? readFriendsIn(`${base()}/forumTopics/${diaryTopicId(braDay)}/messages`, uids, 'createdBy') : [],
    ]);
    return {
        ranks: Object.fromEntries(CHAMPIONS.map((c, i) => [`${c}-${braDay}`, rankDocs[i] ? { dayKey: braDay, ...rankDocs[i] } : null]).filter(([, v]) => v)),
        puzzleDay,
        puzzles: [{ dayKey: localDay, rows: puzzleRows }],
        posts: [{ topicId: diaryTopicId(braDay), dayKey: braDay, messages: diaryMessages }],
    };
};

export const useCenterStore = create((set, get) => ({
    // Today's ranks (both champions) feed the counts; every loaded day feeds the timeline.
    todayRanks: {},
    puzzleDay: null,
    ranks: {},
    puzzles: [],
    posts: [],
    loadedAt: 0,
    loadedFor: null,
    isLoaded: false,
    inFlight: false,
    queued: null,

    refresh: async ({ uid = null, friendIds = [], force = false } = {}) => {
        if (!db) return;
        const uids = uid ? friendIds.filter((id) => id && id !== uid) : [];
        const forKey = `${uid || ''}|${uids.join(',')}`;
        const state = get();
        // A different trainer or friend list always reads; the same one waits 30 s.
        if (state.inFlight) {
            if (state.loadedFor !== forKey) set({ queued: { uid, friendIds } });
            return;
        }
        if (!force && state.loadedFor === forKey && Date.now() - state.loadedAt < MIN_GAP_MS) return;
        set({ inFlight: true });

        const now = Date.now();
        const braDay = dayKeyAt(now);
        const localDay = localDayKey(new Date(now));

        const yesterdayKey = `${braDay}|${uids.join(',')}`;
        const yesterday = closedCache.get(yesterdayKey) || readDay({
            braDay: previousDayKey(braDay),
            localDay: localDayKey(new Date(now - 86400000)),
            uids,
            withCounters: false,
        });
        closedCache.set(yesterdayKey, yesterday);

        const [today, before] = await Promise.all([
            readDay({ braDay, localDay, uids, withCounters: true }),
            yesterday,
        ]);

        set({
            todayRanks: today.ranks,
            puzzleDay: today.puzzleDay,
            ranks: { ...before.ranks, ...today.ranks },
            puzzles: [...today.puzzles, ...before.puzzles],
            posts: [...today.posts, ...before.posts],
            loadedAt: Date.now(),
            loadedFor: forKey,
            isLoaded: true,
            inFlight: false,
        });
        const { queued } = get();
        if (queued) {
            set({ queued: null });
            get().refresh(queued);
        }
    },
}));

/**
 * Keeps the Center's numbers fresh while a component that shows them is on
 * screen: a read on mount, then every two minutes while the tab is visible
 * and once on coming back to it.
 */
export function useCenterPolling(uid, friendIds) {
    const refresh = useCenterStore((s) => s.refresh);
    const key = friendIds.join(',');
    useEffect(() => {
        const ids = key ? key.split(',') : [];
        const run = () => {
            if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
            refresh({ uid, friendIds: ids });
        };
        run();
        const timer = setInterval(run, CENTER_REFRESH_MS);
        const onVisible = () => { if (document.visibilityState === 'visible') run(); };
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            clearInterval(timer);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [uid, key, refresh]);
}
