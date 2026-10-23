/**
 * Whether a user agent is a crawler, a link-preview fetcher or a headless
 * browser — something that renders the site but is nobody's visit. Analytics
 * never counts them, and auth never signs them up (each Googlebot render used
 * to leave an anonymous account behind).
 */
const CRAWLER = /bot|crawl|spider|slurp|lighthouse|headless|preview|facebookexternalhit|whatsapp|discord|embedly|bingpreview/i;

export function isCrawler(userAgent) {
    const ua = userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '');
    return CRAWLER.test(String(ua || ''));
}
