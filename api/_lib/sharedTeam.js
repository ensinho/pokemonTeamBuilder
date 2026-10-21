// Shared teams on the server (2026-10-21): the public page /t/:id and its
// link preview. A team someone shares used to unfurl as the generic "Team
// Builder" card, which is the moment a share either earns a click or doesn't;
// render-meta now reads the team from Firestore's REST API (the document is
// world-readable, `public/data/teams`) so the card names the team and its six.
//
// Dependency-free on purpose, like forumMeta.js: render-meta answers every page
// of the site, so nothing here may fail at import time, and any miss at request
// time falls back to the generic card.

const TIMEOUT_MS = 1200;
const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

const projectId = () => process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || '';
const appId = () => process.env.VITE_APP_ID || process.env.APP_ID || 'pokemonTeamBuilder';

/**
 * The shared team a request is about: `/t/:id` (the page) or the legacy
 * `/builder?team=id` link every share produced before it. Null otherwise, and
 * for anything that is not a Firestore id.
 */
export function sharedTeamIdFrom(appPath, search = '') {
    const page = /^\/t\/([^/]+)\/?$/.exec(appPath || '');
    let id = page ? page[1] : null;
    if (!id && (appPath === '/builder' || appPath === '/builder/')) {
        try {
            id = new URLSearchParams(search).get('team');
        } catch {
            id = null;
        }
    }
    if (!id) return null;
    try { id = decodeURIComponent(id); } catch { return null; }
    return ID_PATTERN.test(id) ? id : null;
}

/** A Firestore REST value (`{ stringValue }`, `{ arrayValue }`…) as plain JS. */
export function fromFirestoreValue(value) {
    if (!value || typeof value !== 'object') return null;
    if ('stringValue' in value) return value.stringValue;
    if ('integerValue' in value) return Number(value.integerValue);
    if ('doubleValue' in value) return Number(value.doubleValue);
    if ('booleanValue' in value) return Boolean(value.booleanValue);
    if ('nullValue' in value) return null;
    if ('timestampValue' in value) return value.timestampValue;
    if ('arrayValue' in value) return (value.arrayValue.values || []).map(fromFirestoreValue);
    if ('mapValue' in value) {
        return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([k, v]) => [k, fromFirestoreValue(v)]));
    }
    return null;
}

/**
 * What a preview needs from a shared-team document: its name and, per member,
 * id, display name and types. Null when the document has no usable roster.
 */
export function sharedTeamFromDoc(doc) {
    const fields = doc?.fields;
    if (!fields) return null;
    const name = String(fromFirestoreValue(fields.name) || '').replace(/\s+/g, ' ').trim().slice(0, 100);
    const pokemons = (fromFirestoreValue(fields.pokemons) || [])
        .filter((p) => p && Number.isFinite(Number(p.id)))
        .slice(0, 6)
        .map((p) => ({
            id: Number(p.id),
            name: String(p.name || ''),
            types: Array.isArray(p.types) ? p.types.filter((t) => typeof t === 'string') : [],
            // The art the share was made with (a Mega's own sprite id lives here).
            sprite: typeof p.sprite === 'string' ? p.sprite : null,
        }));
    if (!pokemons.length) return null;
    return { name, pokemons };
}

/** Fetches a shared team; resolves null on any miss, failure or timeout. */
export async function fetchSharedTeam(teamId, { fetchImpl = globalThis.fetch, timeoutMs = TIMEOUT_MS } = {}) {
    const project = projectId();
    if (!teamId || !ID_PATTERN.test(teamId) || !project || typeof fetchImpl !== 'function') return null;
    const docPath = `artifacts/${encodeURIComponent(appId())}/public/data/teams/${encodeURIComponent(teamId)}`;
    const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(project)}/databases/(default)/documents/${docPath}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetchImpl(url, { signal: controller.signal });
        if (!res.ok) return null;
        const team = sharedTeamFromDoc(await res.json());
        return team ? { id: teamId, ...team } : null;
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
}
