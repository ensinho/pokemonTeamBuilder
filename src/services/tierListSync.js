import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { appId } from '../constants/firebase';
import { normalizeStore } from '../utils/tierList';

/**
 * The tier lists in the account (2026-11-17, Enzo: a list made in one browser
 * read "Aberto hoje" in another, and its board was empty there). One private
 * document, `users/{uid}/tierLists/boards` — owner-only (the users rule),
 * erased with the account (`accountDeletion` USER_COLLECTIONS). It holds what
 * the device keeps (`normalizeStore`: boards, their stamps, ids and titles
 * only); the view merges it with the device's copy (`mergeTierStores`).
 */
const boardsRef = (uid) => doc(db, `artifacts/${appId}/users/${uid}/tierLists`, 'boards');

/** The account's store, normalised, or null (none yet, or the read failed). */
export async function loadAccountTierLists(uid) {
    if (!db || !uid) return null;
    try {
        const snap = await getDoc(boardsRef(uid));
        return snap.exists() ? normalizeStore(snap.data()?.store) : null;
    } catch (_) {
        return null;
    }
}

/** Save this device's store to the account; false when it could not. */
export async function saveAccountTierLists(uid, store) {
    if (!db || !uid) return false;
    try {
        const { boards, stamps } = normalizeStore(store);
        await setDoc(boardsRef(uid), { store: { boards, stamps }, updatedAt: Date.now() });
        return true;
    } catch (_) {
        return false;
    }
}
