import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { firebaseConfig } from '../constants/firebase';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// IndexedDB-backed cache: saved teams and favorites open with no network, and
// writes made offline survive a reload and sync when the connection returns.
// Where IndexedDB is unavailable (some private windows) the SDK falls back to
// its memory cache on its own. Two consequences to respect:
//  • a listener's FIRST snapshot may now be stale cache — anything that diffs
//    snapshots must wait for `!snapshot.metadata.fromCache` (useBattlesStore);
//  • a write's promise still resolves only on server ack — never offline — so
//    UI feedback goes through `settleWrite` (src/utils/firestoreWrite.js).
export const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
