// A Firestore write lands in the local cache — and in every listener — the
// moment it is made, but its promise only resolves when the *server*
// acknowledges it. Offline that is never, so `await setDoc(...)` before a
// "Saved" toast left the user staring at a save that had in fact already
// happened, and would sync on its own once the connection returned.
//
// `settleWrite` answers the question the UI actually has — "is it safe to say
// this is saved?" — without waiting for the network:
//   'synced'  the server acknowledged it within the grace window;
//   'queued'  it is committed on this device and will sync when back online.
// A rejection inside the window rejects (the caller's catch runs as before).
// One that arrives later — the server refusing a queued write — can no longer
// reach that catch, so it goes to `onLateError` instead of vanishing.

export const WRITE_GRACE_MS = 4000;

export const isBrowserOffline = () =>
    typeof navigator !== 'undefined' && navigator.onLine === false;

export function settleWrite(write, {
    onLateError = () => {},
    graceMs = WRITE_GRACE_MS,
    offline = isBrowserOffline(),
} = {}) {
    return new Promise((resolve, reject) => {
        let answered = false;
        // Offline, don't wait at all: nothing will answer. A 0ms timer still
        // lets a write that fails locally (bad data) reject first.
        const timer = setTimeout(() => {
            answered = true;
            resolve('queued');
        }, offline ? 0 : graceMs);

        Promise.resolve(write).then(
            () => {
                if (answered) return;
                answered = true;
                clearTimeout(timer);
                resolve('synced');
            },
            (error) => {
                if (answered) {
                    onLateError(error);
                    return;
                }
                answered = true;
                clearTimeout(timer);
                reject(error);
            },
        );
    });
}
