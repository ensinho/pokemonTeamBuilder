/**
 * CORS and the HTTP error type — deliberately with **zero imports**.
 *
 * These live apart from `serverAuth.js` because of what importing that module
 * costs: it pulls in `jose` and three firebase-admin entry points at load time.
 * A route that wants to answer a request *without* loading its dependencies —
 * to report that loading them is exactly what failed — can't reach into
 * `serverAuth.js` for a CORS header without dragging all of that along.
 *
 * `api/battle-turn.js` depends on that property. Everything it imports
 * statically is either a Node builtin or dependency-free, so evaluating that
 * module cannot fail; the heavy work is a dynamic import inside the handler,
 * where a failure is catchable and can be returned as JSON. `serverAuth.js`
 * re-exports both of these, so nothing else had to change.
 */

export class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

const splitList = (value) => String(value || '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

export const getAllowedOrigins = () => splitList(process.env.API_ALLOWED_ORIGINS || '')
    .concat([
        'https://pokemonbuilder.app',
        'http://localhost:5173',
        'http://localhost:4173',
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
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return isAllowed;
};
