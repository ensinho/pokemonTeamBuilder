// Links into the forum and the one way to share them: the system share sheet
// where there is one to thumb through (phones), the clipboard everywhere else
// (Reddit's "Copy link" on desktop).

/** In-app path of a topic, optionally pointing at one comment (`&c=`). */
export function topicPath(topicId, commentId = null) {
    const params = new URLSearchParams({ topic: topicId });
    if (commentId) params.set('c', commentId);
    return `/feed?${params.toString()}`;
}

/**
 * Absolute URL of a topic. `base` is the app's base path (Vite's BASE_URL:
 * `/` on Vercel, `/pokemonTeamBuilder/` on GitHub Pages).
 */
export function topicUrl(topicId, { commentId = null, origin = '', base = '/' } = {}) {
    const cleanBase = `/${String(base || '/').replace(/^\/+|\/+$/g, '')}`.replace(/\/$/, '');
    return `${origin}${cleanBase}${topicPath(topicId, commentId)}`;
}

/** The current page's absolute topic URL. */
export function currentTopicUrl(topicId, commentId = null) {
    if (typeof window === 'undefined') return topicPath(topicId, commentId);
    return topicUrl(topicId, {
        commentId,
        origin: window.location.origin,
        base: import.meta.env.BASE_URL || '/',
    });
}

const prefersShareSheet = () =>
    typeof navigator !== 'undefined'
    && typeof navigator.share === 'function'
    && typeof window !== 'undefined'
    && !!window.matchMedia?.('(pointer: coarse)').matches;

/**
 * Shares a link. Resolves to 'shared' (the share sheet completed), 'copied'
 * (the link is on the clipboard), 'cancelled' (the user closed the sheet —
 * not an error, say nothing) or 'failed'.
 */
export async function shareLink({ title = '', text = '', url }) {
    if (prefersShareSheet()) {
        try {
            await navigator.share({ title, text, url });
            return 'shared';
        } catch (err) {
            if (err?.name === 'AbortError') return 'cancelled';
            // Not allowed here (iframe, permissions): fall through to the copy.
        }
    }
    try {
        await navigator.clipboard.writeText(url);
        return 'copied';
    } catch (_) {
        return 'failed';
    }
}
