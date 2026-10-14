import { collection, doc, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { appId } from '../constants/firebase';

// Every private collection under artifacts/{appId}/users/{uid}. A new one
// must be added here, or deleting an account leaves it behind.
export const USER_COLLECTIONS = [
    'teams',
    'favorites',
    'quizRuns',
    'categoryGuesserRuns',
    'pokepuzzle',
    'profile',
    'pushSubscriptions',
];

// Firestore caps a batch at 500 writes.
const BATCH_LIMIT = 450;

const deleteRefs = async (refs) => {
    for (let i = 0; i < refs.length; i += BATCH_LIMIT) {
        const batch = writeBatch(db);
        refs.slice(i, i + BATCH_LIMIT).forEach((ref) => batch.delete(ref));
        await batch.commit();
    }
};

const refsOf = async (q) => (await getDocs(q)).docs.map((d) => d.ref);

/**
 * Erase what the user owns before their auth record goes: private data, the
 * public trainer card, friendships and pending friend requests. Must run while
 * still signed in — the security rules only let the owner delete these.
 * Forum posts stay (other people's replies hang off them).
 */
export async function deleteUserData(uid) {
    if (!db || !uid) return;
    const base = `artifacts/${appId}`;

    const privateRefs = (await Promise.all(
        USER_COLLECTIONS.map((name) => refsOf(collection(db, `${base}/users/${uid}/${name}`))),
    )).flat();

    const socialRefs = (await Promise.all([
        refsOf(query(collection(db, `${base}/friendships`), where('members', 'array-contains', uid))),
        refsOf(query(collection(db, `${base}/friendRequests`), where('from', '==', uid))),
        refsOf(query(collection(db, `${base}/friendRequests`), where('to', '==', uid))),
    ])).flat();

    await deleteRefs([...privateRefs, ...socialRefs, doc(db, `${base}/publicProfiles`, uid)]);
}
