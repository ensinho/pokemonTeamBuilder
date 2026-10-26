// Link previews for shared forum posts (2026-10-17). A link to
// /feed?topic=<id> pasted into WhatsApp or Discord used to unfurl as the
// generic "Community Feed"; render-meta now asks Firestore for the topic's
// title and opening text. Dependency-free on purpose: render-meta answers
// every page of the site, so nothing here may fail at import time, and any
// failure at request time just falls back to the generic card.

const TIMEOUT_MS = 1200;

const projectId = () => process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || '';
const appId = () => process.env.VITE_APP_ID || process.env.APP_ID || 'pokemonTeamBuilder';

/** Escapes text for HTML content and double-quoted attributes. */
export function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/** The topic id of a /feed?topic=… request URL, or null. */
export function topicIdFromUrl(url) {
    try {
        const parsed = new URL(url, 'https://pokemonbuilder.app');
        if (parsed.pathname.replace(/\/+$/, '') !== '/feed') return null;
        const id = parsed.searchParams.get('topic');
        // Firestore ids are url-safe; anything else is not ours.
        return id && /^[A-Za-z0-9_-]{1,128}$/.test(id) ? id : null;
    } catch (_) {
        return null;
    }
}

const clip = (text, max) => {
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
};

/**
 * Title and description for a topic document in Firestore's REST shape
 * (`{ fields: { title: { stringValue } } }`). Null when it has no title.
 * Raw text — the caller escapes it.
 */
export function topicMetaFromDoc(doc) {
    const f = doc?.fields || {};
    const str = (k) => f[k]?.stringValue || '';
    const title = clip(str('title'), 90);
    if (!title) return null;
    const body = clip(str('bodyPreview') || str('lastMessageText'), 180);
    const by = str('creatorName');
    return {
        title: `${title} | PokeBuilder Forum`,
        description: body || (by ? `A discussion by @${by} on the PokeBuilder forum.` : 'A discussion on the PokeBuilder forum.'),
    };
}

/** Fetches a topic's preview text; resolves null on any miss or failure. */
export async function fetchTopicMeta(topicId, { fetchImpl = globalThis.fetch, timeoutMs = TIMEOUT_MS } = {}) {
    const project = projectId();
    if (!topicId || !project || typeof fetchImpl !== 'function') return null;
    const docPath = `artifacts/${encodeURIComponent(appId())}/public/data/forumTopics/${encodeURIComponent(topicId)}`;
    const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(project)}/databases/(default)/documents/${docPath}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetchImpl(url, { signal: controller.signal });
        if (!res.ok) return null;
        return topicMetaFromDoc(await res.json());
    } catch (_) {
        return null;
    } finally {
        clearTimeout(timer);
    }
}
