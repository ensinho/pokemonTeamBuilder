/**
 * Last-resort process guards for the serverless functions.
 *
 * ## Why this exists
 *
 * A Vercel function is a Node process the platform keeps warm between
 * invocations. Node's default reaction to an **unhandled promise rejection** is
 * to kill that process — and a process that dies mid-request has no response to
 * return, so the caller gets `FUNCTION_INVOCATION_FAILED`: a 96-byte platform
 * error page with no body, no stack, and a handler `catch` block that never ran.
 * It is the single hardest failure in this codebase to diagnose, because every
 * piece of error reporting we own is downstream of a process that no longer
 * exists.
 *
 * And it is reachable from library code we don't control:
 *
 *  - `@pkmn/streams` deliberately discards the promises its writes return
 *    (`void stream.write(data)` in `getPlayerStreams`). Anything that rejects in
 *    there lands nowhere.
 *  - firebase-admin's gRPC transport keeps sockets open across invocations. When
 *    the platform freezes a function and thaws it later, that socket is often
 *    dead, and the error can surface with no listener attached. (`preferRest` in
 *    `serverAuth.js` closes off most of this one at the source.)
 *
 * ## Why swallowing them is right *here*
 *
 * Suppressing `uncaughtException` is normally the wrong instinct — the process
 * may be in an undefined state and the honest move is to let it die. That
 * reasoning assumes a supervisor that will restart it and a log someone reads.
 * In a serverless function the trade is inverted: the request fails either way,
 * but without the guard it fails *silently and anonymously*. So we log loudly,
 * keep the last one so a response can name it, and let the handler's own
 * try/catch return a real error body.
 *
 * These are a safety net, not a licence to leave rejections unhandled. Anything
 * that shows up in `getLastRuntimeError()` is a bug to fix at its source.
 */

let installed = false;
let lastError = null;

/**
 * The most recent error the guards caught, or null. Surfaced by the diagnostics
 * route so a crash that happened on an *earlier* invocation of this same warm
 * process is still visible — otherwise it leaves no trace a caller can see.
 */
export const getLastRuntimeError = () => lastError;

const record = (kind, err) => {
    lastError = {
        kind,
        message: err?.message || String(err),
        stack: String(err?.stack || '').split('\n').slice(0, 12).join('\n'),
        at: new Date().toISOString(),
    };
    console.error(`[runtimeGuard] ${kind} — this would otherwise have killed the function:`, err);
};

/**
 * Idempotent: the module is shared by every route in a warm process, and adding
 * a duplicate listener on each invocation would leak them until Node warns about
 * a possible memory leak.
 */
export const installRuntimeGuards = () => {
    if (installed) return;
    installed = true;

    process.on('unhandledRejection', (reason) => record('unhandledRejection', reason));
    process.on('uncaughtException', (err) => record('uncaughtException', err));
};

/**
 * Race a promise against a deadline, always clearing the timer.
 *
 * The naked `Promise.race([work, new Promise(r => setTimeout(r, ms))])` idiom
 * leaks its timer: when `work` wins, the timeout is still pending and keeps the
 * event loop busy, which delays the platform freezing the function and bills for
 * the wait. It also never rejects — a timeout resolves to `undefined`, because
 * every caller here treats "took too long" as "give up on it", not as an error.
 */
export const withTimeout = async (promise, ms) => {
    let timer = null;
    try {
        return await Promise.race([
            promise,
            new Promise((resolve) => { timer = setTimeout(resolve, ms); }),
        ]);
    } finally {
        if (timer) clearTimeout(timer);
    }
};
