import { create } from 'zustand';
import { collection, doc, limit, onSnapshot, orderBy, query, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../services/firebase';
import { appId } from '../constants/firebase';

/**
 * The Pokégear (2026-11-06, docs/plans/social-heart.md A3): the trainer's
 * inbox — replies, mentions, comments on their posts, reactions, friend
 * requests, a friend passing them on a Champion board. Written only by the
 * server (api/_lib/socialNotify.js); read here with one listener per session
 * (the latest 30). `hasLoaded` separates "none" from "not asked yet" (the
 * 2026-09-21 wound: never diff a listener before it answered).
 */
const LIMIT = 30;
let unsubscribe = null;
let listeningFor = null;

export const useInboxStore = create((set, get) => ({
    entries: [],
    hasLoaded: false,
    isOpen: false,

    start: (uid) => {
        if (!db || !uid || listeningFor === uid) return;
        get().stop();
        listeningFor = uid;
        const q = query(collection(db, `artifacts/${appId}/users/${uid}/inbox`), orderBy('createdAt', 'desc'), limit(LIMIT));
        unsubscribe = onSnapshot(q, (snap) => {
            set({ entries: snap.docs.map((d) => ({ id: d.id, ...d.data() })), hasLoaded: true });
        }, (err) => {
            console.warn('Pokégear unavailable:', err?.code || err);
            set({ hasLoaded: true });
        });
    },

    stop: () => {
        if (unsubscribe) unsubscribe();
        unsubscribe = null;
        listeningFor = null;
        set({ entries: [], hasLoaded: false });
    },

    open: () => set({ isOpen: true }),
    close: () => set({ isOpen: false }),

    markRead: async (id) => {
        if (!db || !listeningFor) return;
        set((s) => ({ entries: s.entries.map((e) => (e.id === id ? { ...e, read: true } : e)) }));
        try {
            await updateDoc(doc(db, `artifacts/${appId}/users/${listeningFor}/inbox`, id), { read: true });
        } catch { /* the dot comes back on the next snapshot; nothing to tell the trainer */ }
    },

    markAllRead: async () => {
        if (!db || !listeningFor) return;
        const unread = get().entries.filter((e) => !e.read);
        if (!unread.length) return;
        set((s) => ({ entries: s.entries.map((e) => ({ ...e, read: true })) }));
        try {
            const batch = writeBatch(db);
            unread.forEach((e) => batch.update(doc(db, `artifacts/${appId}/users/${listeningFor}/inbox`, e.id), { read: true }));
            await batch.commit();
        } catch { /* as above */ }
    },
}));

export const selectUnread = (s) => s.entries.filter((e) => !e.read).length;
