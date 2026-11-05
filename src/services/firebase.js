import { initializeApp } from 'firebase/app';
import {
    browserLocalPersistence,
    browserSessionPersistence,
    indexedDBLocalPersistence,
    initializeAuth,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from '../constants/firebase';

const app = initializeApp(firebaseConfig);
/** The app instance, for modules loaded later (services/analytics.js). */
export const firebaseApp = app;

// What getAuth() does, minus `browserPopupRedirectResolver` (2026-10-30).
// That resolver loads apis.google.com, gapi and the firebaseapp.com auth
// iframe (~135 KB, two more origins) on every boot, and it is only needed by
// signInWithPopup / signInWithRedirect / linkWithPopup — none of which this
// app calls (anonymous, email link and email + password only). Same
// persistence chain as getAuth(), so existing sessions keep signing in.
// Adding a popup or redirect sign-in later: pass browserPopupRedirectResolver
// as that call's third argument, not here.
export const auth = initializeAuth(app, {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence],
});
export const db = getFirestore(app);
