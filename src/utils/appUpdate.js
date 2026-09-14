// Detecting "a newer build is live" without a service worker.
//
// The service worker is the *primary* detector (see `src/hooks/useAppUpdate.js`):
// every deploy rewrites `sw.js`, because the precache manifest embeds the hashed
// asset names, so `registration.update()` is a reliable probe. These helpers are
// the fallback for visitors who have no service worker at all — private windows,
// service workers disabled, a registration that failed. There, nothing tells the
// page a deploy happened, so we fetch `index.html` past the HTTP cache and look
// for hashed assets this document never loaded.

// Vite writes every hashed bundle under `<base>/assets/`. Anything else in the
// document (the manifest, icons, a font, an outbound <a href>) is not a build
// fingerprint and must not trigger an update prompt.
const ASSET_URL = /\/assets\/[^"'\s]+\.(?:js|css)(?:\?[^"'\s]*)?$/;

/**
 * Hashed asset URLs referenced by a fetched `index.html`, in document order and
 * de-duplicated. Parsed with a regex rather than DOMParser: this runs on a
 * string fetched from the network, and building a live document out of it would
 * start fetching its subresources.
 */
export function extractAssetUrls(html) {
    if (typeof html !== 'string') return [];
    const urls = [];
    const attrRegex = /(?:src|href)\s*=\s*["']([^"']+)["']/gi;
    let match;
    while ((match = attrRegex.exec(html)) !== null) {
        const url = match[1];
        if (ASSET_URL.test(url) && !urls.includes(url)) urls.push(url);
    }
    return urls;
}

/** The hashed assets the running document actually loaded. */
export function documentAssetUrls(doc = document) {
    const nodes = doc.querySelectorAll('script[src], link[href]');
    return Array.from(nodes)
        .map((node) => node.getAttribute('src') || node.getAttribute('href'))
        .filter((url) => url && ASSET_URL.test(url));
}

/**
 * Assets the fetched HTML points at that the running document never loaded.
 * Empty means "same build" — a deploy always rewrites at least the entry hash.
 */
export function findNewAssetUrls(html, currentUrls) {
    const current = new Set(currentUrls ?? []);
    return extractAssetUrls(html).filter((url) => !current.has(url));
}

/**
 * Stable identity for a detected build, so that dismissing the prompt dismisses
 * *that* build rather than the next five minutes of polling. Order-independent:
 * the same deploy must not read as two different builds because the HTML moved
 * a <link> above a <script>.
 */
export function buildSignature(urls) {
    return [...(urls ?? [])].sort().join('|');
}
