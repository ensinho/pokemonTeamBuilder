import { createPrivateKey } from 'node:crypto';

import { createRemoteJWKSet, jwtVerify } from 'jose';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

import { HttpError, setCorsHeaders, getAllowedOrigins } from './httpBasics.js';

/**
 * Shared server-side auth for the API routes: verify a caller's Firebase ID
 * token, and hand out an admin-SDK Firestore handle.
 *
 * NOTE: `api/send-admin-reply.js` predates this module and still carries its own
 * copy of the JWKS verification and CORS allowlist. It was left alone rather than
 * refactored — it's a working production endpoint and this change didn't need to
 * touch it. Worth migrating onto these helpers in a dedicated pass.
 */

const FIREBASE_CERTS = createRemoteJWKSet(
    new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
);

export const getFirebaseProjectId = () => process.env.FIREBASE_PROJECT_ID
    || process.env.VITE_FIREBASE_PROJECT_ID
    || 'pokemonbuilder-8f80d';

// Re-exported so callers keep importing these from here as before. They live in
// a dependency-free module because `api/battle-turn.js` needs them *without*
// loading this file — see `./httpBasics.js`.
export { HttpError, setCorsHeaders, getAllowedOrigins };

const getBearerToken = (req) => {
    const header = req.headers.authorization || req.headers.Authorization || '';
    const match = /^Bearer\s+(.+)$/i.exec(String(header).trim());
    return match ? match[1] : null;
};

/**
 * Verify the caller's Firebase ID token against Google's public keys.
 *
 * @returns {Promise<{uid: string, email: string|null, isAnonymous: boolean}>}
 */
export const verifyCaller = async (req) => {
    const token = getBearerToken(req);
    if (!token) throw new HttpError(401, 'Missing Firebase ID token.');

    const projectId = getFirebaseProjectId();
    let payload;
    try {
        ({ payload } = await jwtVerify(token, FIREBASE_CERTS, {
            issuer: `https://securetoken.google.com/${projectId}`,
            audience: projectId,
        }));
    } catch (_) {
        throw new HttpError(401, 'Invalid Firebase ID token.');
    }

    const uid = String(payload.user_id || payload.sub || '').trim();
    if (!uid) throw new HttpError(401, 'Token carries no user id.');

    return {
        uid,
        email: payload.email ? String(payload.email).toLowerCase() : null,
        isAnonymous: payload.firebase?.sign_in_provider === 'anonymous',
    };
};

/**
 * Coax whatever the environment variable actually holds into a PEM that
 * `crypto` will accept.
 *
 * A service-account key is the one secret here that is multi-line, and every
 * way of getting it into a deployment mangles it differently. The cases below
 * are the ones that have really turned up, in the order they're handled:
 *
 *  1. Wrapping quotes, from copying the value out of a `.env` file.
 *  2. Literal backslash-n instead of newlines — how Vercel's UI stores it.
 *  3. Base64 of the whole PEM, which people reach for precisely to dodge (2).
 *  4. Header and footer run together with the body on one line, from anything
 *     that collapses whitespace. `openssl` requires them on their own lines.
 *  5. A bare body with no header/footer at all.
 *
 * Getting this wrong used to fail deep inside firebase-admin with a message that
 * named neither the variable nor what was wrong with it, so `validatePrivateKey`
 * below checks the result and says so plainly.
 */
const formatPrivateKey = (raw) => {
    if (!raw) return '';
    let key = String(raw).trim().replace(/^["']|["']$/g, '').trim();

    key = key.replace(/\\n/g, '\n').replace(/\r\n?/g, '\n');

    if (!key.includes('BEGIN') && /^[A-Za-z0-9+/=\s]+$/.test(key) && key.length > 100) {
        const decoded = Buffer.from(key, 'base64').toString('utf8');
        if (decoded.includes('BEGIN')) key = decoded.replace(/\r\n?/g, '\n');
    }

    if (!key.includes('BEGIN')) {
        key = `-----BEGIN PRIVATE KEY-----\n${key}\n-----END PRIVATE KEY-----`;
    }

    key = key
        .replace(/\s*-----BEGIN ([A-Z ]+)-----\s*/g, '-----BEGIN $1-----\n')
        .replace(/\s*-----END ([A-Z ]+)-----\s*/g, '\n-----END $1-----\n');

    // Whitespace *inside* the base64 body — the signature of a value that went
    // through something that treated newlines as spaces.
    const [, header, body, footer] = /^(-----BEGIN [A-Z ]+-----)\n([\s\S]*?)\n(-----END [A-Z ]+-----)/.exec(key) || [];
    if (body) {
        const compact = body.replace(/\s+/g, '');
        const wrapped = compact.match(/.{1,64}/g)?.join('\n') || compact;
        key = `${header}\n${wrapped}\n${footer}`;
    }

    return `${key.trim()}\n`;
};

/**
 * Why a key is unusable, or null if it's fine. Kept separate from the formatting
 * so the diagnostics route can report on the credentials without initialising
 * the admin app as a side effect.
 */
export const validatePrivateKey = (pem) => {
    if (!pem) return 'FIREBASE_PRIVATE_KEY is not set.';
    if (!pem.includes('BEGIN')) return 'FIREBASE_PRIVATE_KEY has no PEM header.';
    try {
        createPrivateKey(pem);
        return null;
    } catch (err) {
        // Node's message here ("error:1E08010C:DECODER routines::unsupported")
        // is not something anyone can act on, so lead with the likely cause.
        return `FIREBASE_PRIVATE_KEY is not a readable PEM key — check that its newlines survived being pasted (${err.message}).`;
    }
};

/**
 * Initialise the admin app once. Credentials come from three env vars rather
 * than a JSON blob so the private key can be pasted into Vercel's UI. Vercel
 * stores it with literal `\n`, hence the unescape.
 */
const ensureAdminApp = () => {
    if (getApps().length > 0) return;

    const projectId = getFirebaseProjectId();
    const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL || '').trim();
    const rawKey = process.env.FIREBASE_PRIVATE_KEY || '';
    const privateKey = formatPrivateKey(rawKey);

    if (!clientEmail || !privateKey) {
        throw new HttpError(
            503,
            'Server is not configured for battles: FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY are missing.',
        );
    }

    // Fail here, where the message can name the variable, rather than several
    // frames deeper inside firebase-admin where it can't.
    const keyProblem = validatePrivateKey(privateKey);
    if (keyProblem) throw new HttpError(503, keyProblem);

    try {
        initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
    } catch (err) {
        console.error('Firebase Admin initializeApp failed:', err);
        throw new HttpError(
            503,
            `Firebase Admin config error: ${err.message || 'Invalid service account credentials.'}`,
        );
    }
};

let firestore = null;

/**
 * Admin-SDK Firestore. Bypasses security rules by design — this is what makes the
 * resolver authoritative over fields (seed, turn, log, winner) that no client is
 * allowed to write.
 */
export const getAdminFirestore = () => {
    if (firestore) return firestore;
    ensureAdminApp();
    firestore = getFirestore();

    // REST rather than the default gRPC transport, which matters specifically
    // because this runs in a serverless function.
    //
    // gRPC holds a long-lived HTTP/2 channel open. The platform freezes the
    // whole process between invocations, so that channel routinely thaws onto a
    // socket the other end closed minutes ago — and the resulting error can
    // arrive with no listener attached, which takes the process down and returns
    // an opaque FUNCTION_INVOCATION_FAILED instead of anything this code could
    // report (see ./runtimeGuards.js). It also costs a handshake on every cold
    // start.
    //
    // Nothing server-side needs streaming: the resolver only does document gets,
    // one batch commit and two increments, all of which REST covers. Real-time
    // listeners are a client concern and go through the web SDK.
    try {
        firestore.settings({ preferRest: true });
    } catch (err) {
        // `settings()` throws once the instance has been used. Only reachable if
        // something read from Firestore before this ran — not fatal, gRPC still
        // works, so log it and carry on rather than failing the request.
        console.warn('Could not put Firestore on the REST transport:', err.message);
    }

    return firestore;
};

let auth = null;

/**
 * Admin-SDK Auth — the only way to resolve a uid to an email server-side (the
 * public profile deliberately never stores one). Same service-account
 * credentials as Firestore; no extra secret needed.
 */
export const getAdminAuth = () => {
    if (auth) return auth;
    ensureAdminApp();
    auth = getAuth();
    return auth;
};

/** `artifacts/{appId}` prefix, mirroring the client's namespacing. */
export const getAppId = () => process.env.VITE_APP_ID || process.env.APP_ID || 'pokemonTeamBuilder';

/** Mask an address to `en•••@gmail.com` — enough to tell *which* account is
 *  configured without printing it into a response anyone can fetch. */
const maskEmail = (value) => {
    const [user, domain] = String(value || '').split('@');
    if (!user || !domain) return null;
    return `${user.slice(0, 2)}${'•'.repeat(Math.max(1, user.length - 2))}@${domain}`;
};

/**
 * A safe-to-return summary of the server's credential state, for the
 * diagnostics route. Deliberately reports *shape*, never contents: whether each
 * variable is set, whether the key parses, and a masked client email.
 */
export const describeCredentials = () => {
    const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL || '').trim();
    const rawKey = process.env.FIREBASE_PRIVATE_KEY || '';
    const privateKey = formatPrivateKey(rawKey);

    return {
        projectId: getFirebaseProjectId(),
        appId: getAppId(),
        clientEmail: clientEmail ? maskEmail(clientEmail) : null,
        clientEmailSet: Boolean(clientEmail),
        privateKeySet: Boolean(rawKey),
        privateKeyLooksEscaped: rawKey.includes('\\n'),
        privateKeyProblem: validatePrivateKey(privateKey),
        mailerConfigured: Boolean(process.env.ADMIN_EMAIL_APP_PASSWORD),
    };
};
