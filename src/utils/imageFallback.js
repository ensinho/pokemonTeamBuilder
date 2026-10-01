/**
 * `onError` handler that swaps a broken <img> for `fallback` — once.
 *
 * The inline `e.currentTarget.src = X` it replaces re-runs whenever X fails
 * too: every failure fires onError again, which assigns the same URL, which
 * the browser fetches again. A sprite host answering 403 (jsDelivr rate
 * limiting) turned one such <img> into ~600 requests a second. Here the swap
 * is skipped when the image is already showing the fallback, so a failing
 * fallback just stays broken.
 */
export const fallbackImage = (fallback) => (event) => {
    const img = event?.currentTarget;
    if (!img || !fallback) return;
    let target = fallback;
    try {
        target = new URL(fallback, img.baseURI || undefined).href;
    } catch (_) {
        // Not resolvable: compare as given.
    }
    if (img.src === target || img.src === fallback) return;
    img.src = fallback;
};
