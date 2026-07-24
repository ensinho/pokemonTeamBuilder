import { create } from 'zustand';
import {
    collection,
    doc,
    documentId,
    getDoc,
    getDocs,
    limit,
    onSnapshot,
    orderBy,
    query,
    setDoc,
    updateDoc,
    deleteDoc,
    where,
    writeBatch,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { appId } from '../constants/firebase';
import { useAuthStore } from './useAuthStore';
import { useToastStore } from './useToastStore';

const profilesPath = () => `artifacts/${appId}/publicProfiles`;
const requestsPath = () => `artifacts/${appId}/friendRequests`;
const friendshipsPath = () => `artifacts/${appId}/friendships`;

/** Deterministic ids, mirrored by the security rules. */
export const requestId = (from, to) => `${from}_${to}`;
export const pairId = (a, b) => [a, b].sort().join('_');

let incomingUnsub = null;
let outgoingUnsub = null;
let friendshipsUnsub = null;
// Reference-counted so several components can hold the same listeners (the app
// shell needs them for the sidebar badge, the view needs them for the list)
// without the first unmount tearing them out from under the others.
let subscriberCount = 0;
let boundUserId = null;

// Public profiles change rarely; cache them for the session so re-rendering the
// friend list doesn't re-read every doc.
const profileCache = new Map();

const fetchProfiles = async (userIds) => {
    const missing = userIds.filter((id) => id && !profileCache.has(id));

    // `in` takes at most 30 values per query.
    for (let i = 0; i < missing.length; i += 30) {
        const chunk = missing.slice(i, i + 30);
        try {
            const snap = await getDocs(query(
                collection(db, profilesPath()),
                where(documentId(), 'in', chunk),
            ));
            snap.docs.forEach((docSnap) => profileCache.set(docSnap.id, { userId: docSnap.id, ...docSnap.data() }));
        } catch (err) {
            console.error('Failed to load public profiles:', err);
        }
        // A uid with no public profile (never upgraded, or deleted) still needs a
        // cache entry, or every render retries the same failed lookup.
        chunk.forEach((id) => {
            if (!profileCache.has(id)) profileCache.set(id, { userId: id, displayName: null });
        });
    }

    return userIds.map((id) => profileCache.get(id)).filter(Boolean);
};

const unbind = () => {
    [incomingUnsub, outgoingUnsub, friendshipsUnsub].forEach((unsub) => unsub && unsub());
    incomingUnsub = null;
    outgoingUnsub = null;
    friendshipsUnsub = null;
    boundUserId = null;
};

export const useFriendsStore = create((set, get) => ({
    friends: [],              // [{ userId, displayName, avatar…, pairId, since }]
    incomingRequests: [],     // [{ id, from, createdAt, profile }]
    outgoingRequests: [],     // [{ id, to, createdAt, profile }]
    isLoadingFriends: false,
    searchResults: [],
    isSearching: false,

    /**
     * Listen to friendships and pending requests in both directions.
     *
     * Deliberately queries on a single field each (`members` array-contains,
     * `to`, `from`) and sorts/filters the rest client-side: those are covered by
     * Firestore's automatic single-field indexes, so this needs no composite
     * index deployed. The volumes are tiny.
     */
    initListeners: () => {
        if (!db) return;
        const { userId, isAnonymous } = useAuthStore.getState();
        // Social features require a real account — an anonymous uid is discarded
        // on sign-out, so any friendship built on it would dangle.
        if (!userId || isAnonymous) return;

        subscriberCount += 1;
        // Already listening for this account: the extra subscriber just shares it.
        if (boundUserId === userId && friendshipsUnsub) return;
        // A different account (sign-in / account switch) needs a rebind.
        if (friendshipsUnsub) unbind();
        boundUserId = userId;

        set({ isLoadingFriends: true });

        friendshipsUnsub = onSnapshot(
            query(collection(db, friendshipsPath()), where('members', 'array-contains', userId)),
            async (snapshot) => {
                const rows = snapshot.docs.map((docSnap) => {
                    const data = docSnap.data();
                    return {
                        pairId: docSnap.id,
                        since: data.createdAt || null,
                        otherId: (data.members || []).find((id) => id !== userId) || null,
                    };
                }).filter((row) => row.otherId);

                const profiles = await fetchProfiles(rows.map((row) => row.otherId));
                const byId = new Map(profiles.map((profile) => [profile.userId, profile]));

                set({
                    friends: rows
                        .map((row) => ({ ...(byId.get(row.otherId) || { userId: row.otherId }), pairId: row.pairId, since: row.since }))
                        .sort((a, b) => (a.displayName || '').localeCompare(b.displayName || '')),
                    isLoadingFriends: false,
                });
            },
            (error) => {
                console.error('Error loading friendships:', error);
                set({ isLoadingFriends: false });
            },
        );

        const watchRequests = (field, stateKey) => onSnapshot(
            query(collection(db, requestsPath()), where(field, '==', userId)),
            async (snapshot) => {
                const rows = snapshot.docs
                    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
                    .filter((row) => row.status === 'pending')
                    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

                const otherKey = field === 'to' ? 'from' : 'to';
                const profiles = await fetchProfiles(rows.map((row) => row[otherKey]));
                const byId = new Map(profiles.map((profile) => [profile.userId, profile]));

                set({ [stateKey]: rows.map((row) => ({ ...row, profile: byId.get(row[otherKey]) || null })) });
            },
            (error) => console.error(`Error loading ${stateKey}:`, error),
        );

        incomingUnsub = watchRequests('to', 'incomingRequests');
        outgoingUnsub = watchRequests('from', 'outgoingRequests');
    },

    // Releases one subscriber. The listeners only actually detach once nobody
    // holds them any more.
    cleanupListeners: () => {
        subscriberCount = Math.max(0, subscriberCount - 1);
        if (subscriberCount > 0) return;
        unbind();
        set({ friends: [], incomingRequests: [], outgoingRequests: [] });
    },

    /** Prefix search over the public directory by display name. */
    searchTrainers: async (term) => {
        const cleaned = (term || '').trim().toLowerCase();
        if (!db || cleaned.length < 2) {
            set({ searchResults: [], isSearching: false });
            return;
        }

        set({ isSearching: true });
        const { userId } = useAuthStore.getState();
        try {
            const snap = await getDocs(query(
                collection(db, profilesPath()),
                orderBy('displayNameLower'),
                where('displayNameLower', '>=', cleaned),
                // U+F8FF sorts above any regular character, so this bounds the
                // range to "starts with `cleaned`".
                where('displayNameLower', '<=', `${cleaned}\uf8ff`),
                limit(20),
            ));
            set({
                searchResults: snap.docs
                    .map((docSnap) => ({ userId: docSnap.id, ...docSnap.data() }))
                    .filter((profile) => profile.userId !== userId),
                isSearching: false,
            });
        } catch (err) {
            console.error('Trainer search failed:', err);
            useToastStore.getState().showToast('Could not search trainers.', 'error');
            set({ searchResults: [], isSearching: false });
        }
    },

    clearSearch: () => set({ searchResults: [], isSearching: false }),

    /** Relationship with another trainer, for rendering the right button. */
    relationshipWith: (otherId) => {
        if (!otherId) return 'none';
        if (get().friends.some((friend) => friend.userId === otherId)) return 'friends';
        if (get().outgoingRequests.some((row) => row.to === otherId)) return 'outgoing';
        if (get().incomingRequests.some((row) => row.from === otherId)) return 'incoming';
        return 'none';
    },

    sendRequest: async (toUserId) => {
        const { userId, isAnonymous } = useAuthStore.getState();
        const showToast = useToastStore.getState().showToast;

        if (!db || !userId) return false;
        if (isAnonymous) {
            showToast('Create an account to add friends.', 'warning');
            return false;
        }
        if (!toUserId || toUserId === userId) return false;

        try {
            await setDoc(doc(db, requestsPath(), requestId(userId, toUserId)), {
                from: userId,
                to: toUserId,
                status: 'pending',
                createdAt: new Date().toISOString(),
            });
            showToast('Friend request sent.', 'success');
            return true;
        } catch (err) {
            console.error('Failed to send friend request:', err);
            // The deterministic id means a leftover declined request blocks a new
            // one; say so rather than failing silently.
            showToast('Could not send the request. You may already have one pending.', 'error');
            return false;
        }
    },

    /**
     * Accept an incoming request.
     *
     * Order matters: the rules only allow creating the friendship while a
     * *pending* request exists, so the friendship is written first and the
     * request(s) removed in the same batch. Rules evaluate each write in a batch
     * against the pre-batch state, so both pass — and the batch is atomic, so we
     * never end up with a friendship and a stale request (or neither).
     */
    acceptRequest: async (fromUserId) => {
        const { userId } = useAuthStore.getState();
        const showToast = useToastStore.getState().showToast;
        if (!db || !userId || !fromUserId) return false;

        const members = [userId, fromUserId].sort();
        try {
            const batch = writeBatch(db);
            batch.set(doc(db, friendshipsPath(), pairId(userId, fromUserId)), {
                members,
                createdAt: new Date().toISOString(),
            });
            // Clear both directions: if each trainer had requested the other, the
            // mirror request would otherwise dangle as pending forever.
            batch.delete(doc(db, requestsPath(), requestId(fromUserId, userId)));
            batch.delete(doc(db, requestsPath(), requestId(userId, fromUserId)));
            await batch.commit();

            showToast('You are now friends!', 'success');
            return true;
        } catch (err) {
            console.error('Failed to accept friend request:', err);
            showToast('Could not accept the request.', 'error');
            return false;
        }
    },

    /**
     * Decline: kept as a `declined` doc rather than deleted, so the deterministic
     * id stops the same trainer from immediately re-asking. Either party can
     * delete it later (`removeRequest`) to unblock.
     */
    declineRequest: async (fromUserId) => {
        const { userId } = useAuthStore.getState();
        const showToast = useToastStore.getState().showToast;
        if (!db || !userId || !fromUserId) return false;

        try {
            await updateDoc(doc(db, requestsPath(), requestId(fromUserId, userId)), {
                status: 'declined',
                respondedAt: new Date().toISOString(),
            });
            return true;
        } catch (err) {
            console.error('Failed to decline friend request:', err);
            showToast('Could not decline the request.', 'error');
            return false;
        }
    },

    /** Cancel one you sent (or clear a declined one). */
    removeRequest: async (fromUserId, toUserId) => {
        const showToast = useToastStore.getState().showToast;
        if (!db) return false;
        try {
            await deleteDoc(doc(db, requestsPath(), requestId(fromUserId, toUserId)));
            return true;
        } catch (err) {
            console.error('Failed to remove friend request:', err);
            showToast('Could not cancel the request.', 'error');
            return false;
        }
    },

    removeFriend: async (otherUserId) => {
        const { userId } = useAuthStore.getState();
        const showToast = useToastStore.getState().showToast;
        if (!db || !userId || !otherUserId) return false;

        try {
            await deleteDoc(doc(db, friendshipsPath(), pairId(userId, otherUserId)));
            // Also clear any leftover request docs so a future request isn't
            // blocked by the deterministic id.
            await Promise.allSettled([
                deleteDoc(doc(db, requestsPath(), requestId(userId, otherUserId))),
                deleteDoc(doc(db, requestsPath(), requestId(otherUserId, userId))),
            ]);
            showToast('Friend removed.', 'info');
            return true;
        } catch (err) {
            console.error('Failed to remove friend:', err);
            showToast('Could not remove the friend.', 'error');
            return false;
        }
    },

    /** One-off profile read, for the invite-link flow. */
    loadProfile: async (userId) => {
        if (!db || !userId) return null;
        if (profileCache.has(userId)) return profileCache.get(userId);
        try {
            const snap = await getDoc(doc(db, profilesPath(), userId));
            if (!snap.exists()) return null;
            const profile = { userId: snap.id, ...snap.data() };
            profileCache.set(userId, profile);
            return profile;
        } catch (err) {
            console.error('Failed to load trainer profile:', err);
            return null;
        }
    },
}));
