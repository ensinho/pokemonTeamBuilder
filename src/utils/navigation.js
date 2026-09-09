/**
 * Handles into the app shell for code that lives outside the React tree.
 *
 * The Zustand stores raise most of this app's toasts, and a toast whose whole
 * job is to offer the next step ("Team saved" → *My teams*, "Sign in to
 * continue" → *Sign in*) needs to be able to take it. `useNavigate` and the
 * shell's modal state are both React-only, so AppLayout registers them here
 * once and everyone else borrows them.
 *
 * Deliberately not `location.assign` — that would full-page reload the SPA and
 * throw away every store, which is exactly the flow break these actions exist
 * to avoid.
 */
let navigator = null;
let signInPrompt = null;

export function setNavigator(fn) {
    navigator = fn;
}

/** Navigate if the router is mounted. No-op before first render, by design:
 *  a toast firing during boot has nowhere to send anyone yet. */
export function navigateTo(path, options) {
    if (typeof navigator === 'function') navigator(path, options);
}

export function canNavigate() {
    return typeof navigator === 'function';
}

export function setSignInPrompt(fn) {
    signInPrompt = fn;
}

/** Open the auth modal. `mode` is 'signIn' or 'signUp'. */
export function promptSignIn(mode = 'signIn') {
    if (typeof signInPrompt === 'function') signInPrompt(mode);
}
