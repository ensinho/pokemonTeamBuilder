/**
 * Sign in with Google (2026-11-12), in a popup.
 *
 * - The popup resolver is passed HERE, at the call, never to initializeAuth:
 *   it loads apis.google.com, gapi and the auth iframe, which the boot must
 *   not pay for (services/firebase.js, firebase.guard.test.js). This module is
 *   itself loaded only when someone presses the button (useAuthStore).
 * - A guest is upgraded IN PLACE (`linkWithPopup`): same uid, so their teams,
 *   favourites and progress stay exactly where they are.
 * - If that Google account already has a PokemonBuilder account, linking is
 *   refused (`auth/credential-already-in-use`); we sign into it with the
 *   credential the error carries, and the caller migrates what can move
 *   (the PokéPuzzle progress, like an email sign-in does).
 */
import {
    GoogleAuthProvider,
    browserPopupRedirectResolver,
    getAdditionalUserInfo,
    linkWithPopup,
    signInWithCredential,
    signInWithPopup,
} from 'firebase/auth';
import { auth } from './firebase';

/** The provider, always asking which Google account (people share computers). */
const provider = () => {
    const p = new GoogleAuthProvider();
    p.setCustomParameters({ prompt: 'select_account' });
    return p;
};

/**
 * Resolves `{ user, linked, isNewUser, previousUid }`:
 * `linked` — a guest became this Google account (same uid);
 * `previousUid` — the guest's uid when we moved to an existing account instead.
 */
export async function googleSignIn() {
    const current = auth.currentUser;
    if (current?.isAnonymous) {
        try {
            const result = await linkWithPopup(current, provider(), browserPopupRedirectResolver);
            return { user: result.user, linked: true, isNewUser: true, previousUid: null };
        } catch (err) {
            if (err?.code !== 'auth/credential-already-in-use') throw err;
            const credential = GoogleAuthProvider.credentialFromError(err);
            if (!credential) throw err;
            const result = await signInWithCredential(auth, credential);
            return { user: result.user, linked: false, isNewUser: false, previousUid: current.uid };
        }
    }
    const result = await signInWithPopup(auth, provider(), browserPopupRedirectResolver);
    return { user: result.user, linked: false, isNewUser: Boolean(getAdditionalUserInfo(result)?.isNewUser), previousUid: null };
}
