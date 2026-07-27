import { createRemoteJWKSet, jwtVerify } from 'jose';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

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

const splitList = (value) => String(value || '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

const getAllowedOrigins = () => splitList(process.env.API_ALLOWED_ORIGINS || '')
    .concat([
        'https://pokemonbuilder.app',
        'https://ensinho.github.io',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:4173',
        'http://127.0.0.1:4173',
    ]);

export const setCorsHeaders = (req, res) => {
    const origin = req.headers.origin || '';
    const normalized = origin.toLowerCase();
    const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}`.toLowerCase() : '';
    const allowed = getAllowedOrigins();
    const isAllowed = !origin
        || allowed.includes('*')
        || allowed.includes(normalized)
        || (vercelUrl && normalized === vercelUrl);

    if (isAllowed && origin) res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return isAllowed;
};

class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}
export { HttpError };

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

const formatPrivateKey = (raw) => {
    if (!raw) return '';
    let key = String(raw).trim();
    key = key.replace(/^["']|["']$/g, '').trim();
    key = key.replace(/\\n/g, '\n');
    key = key.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    if (!key.includes('BEGIN PRIVATE KEY')) {
        key = `-----BEGIN PRIVATE KEY-----\n${key}\n-----END PRIVATE KEY-----`;
    }
    return key;
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
