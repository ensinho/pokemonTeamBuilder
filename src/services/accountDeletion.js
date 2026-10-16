import { collection, doc, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { appId } from '../constants/firebase';
import { challengeApi } from './challengeApi';

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
 * The Champion Challenge keeps the player's runs and stats outside
 * `users/{uid}` (the server writes them; the player may only read and delete —
 * firestore.rules). Returns two waves: each run's rounds and secret state, then
 * the runs and the stats — a round's delete rule reads its run's `uid`, so the
 * run must outlive its children. `aiTraining` rows carry no uid and stay.
 */
const challengeRefs = async (base, uid) => {
    const runs = (await getDocs(query(collection(db, `${base}/challengeRuns`), where('uid', '==', uid)))).docs;
    const children = (await Promise.all(runs.map(async (run) => [
        ...(await refsOf(collection(db, `${run.ref.path}/rounds`))),
        doc(db, `${run.ref.path}/secret/state`),
    ]))).flat();
    return { children, parents: [...runs.map((run) => run.ref), doc(db, `${base}/challengeStats`, uid)] };
};

/**
 * Erase what the user owns before their auth record goes: private data, the
 * public trainer card, friendships and pending friend requests, and their
 * Champion Challenge runs and stats. Must run while still signed in — the
 * security rules only let the owner delete these. Forum posts stay (other
 * people's replies hang off them).
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

    const challenge = await challengeRefs(base, uid);

    // The public ranking is server-written: the endpoint takes the player off it.
    // Best-effort — a challenge endpoint that is down must not hold an account
    // deletion hostage; the rows it leaves carry only a display name.
    try {
        const res = await challengeApi.forget();
        if (!res.ok) console.error('Could not remove the challenge ranking rows:', res.error);
    } catch (error) {
        console.error('Could not remove the challenge ranking rows:', error);
    }

    await deleteRefs([...privateRefs, ...socialRefs, ...challenge.children, doc(db, `${base}/publicProfiles`, uid)]);
    await deleteRefs(challenge.parents);
}
