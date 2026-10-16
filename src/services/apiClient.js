import { auth } from './firebase';

/**
 * POST to one of the app's serverless endpoints with the caller's Firebase ID
 * token. Shared by the PvP battles and the Champion Challenge.
 *
 * Three things here are easy to get subtly wrong: a fresh token, a response
 * that may not be JSON at all (Vercel serves an HTML page for a platform-level
 * failure), and an error that says what actually went wrong rather than
 * "undefined".
 *
 * ## The stale anonymous token
 *
 * A guest who creates an account keeps their uid (`linkWithCredential`), but
 * the ID token already cached still says `sign_in_provider: anonymous` until it
 * refreshes. An endpoint that refuses guests (`403 signInRequired`) would then
 * refuse a player who has just signed up. So when the server says
 * `signInRequired` but this browser's user is no longer anonymous, the token is
 * force-refreshed and the call retried — once, never in a loop.
 *
 * A network failure (offline, DNS, CORS) rejects, as `fetch` does — callers
 * already have a `catch` for it.
 *
 * @returns {Promise<{ok: boolean, status: number, payload: object, error: string|null}>}
 */
export const callAuthedApi = async (endpoint, body, { serverErrorMessage = 'Server error (500).', forceRefresh = false } = {}) => {
    // On a return visit the app paints from the saved identity (useAuthStore's
    // boot snapshot: isAuthReady is true at once) before Firebase has restored
    // the session, so a call made on mount can find no currentUser yet. Wait
    // for Firebase's first answer before deciding nobody is signed in.
    let user = auth?.currentUser;
    if (!user && auth?.authStateReady) {
        await auth.authStateReady();
        user = auth.currentUser;
    }
    const token = await user?.getIdToken?.(forceRefresh);
    if (!token) return { ok: false, status: 0, payload: {}, error: 'signedOut' };

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
    });

    const text = await response.text();
    let payload = {};
    try {
        payload = JSON.parse(text);
    } catch (_) { /* non-JSON response (HTML error page) */ }

    if (!response.ok) {
        if (response.status === 403 && payload.error === 'signInRequired' && !forceRefresh && user && !user.isAnonymous) {
            return callAuthedApi(endpoint, body, { serverErrorMessage, forceRefresh: true });
        }
        return {
            ok: false,
            status: response.status,
            payload,
            error: payload.error
                || (response.status === 500 ? serverErrorMessage : `HTTP ${response.status} error`),
        };
    }
    return { ok: true, status: response.status, payload, error: null };
};
