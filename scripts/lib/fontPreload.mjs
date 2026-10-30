/**
 * Preloads the fonts the first paint needs (2026-10-30).
 *
 * The faces are bundled assets (src/styles/fonts.css), so the browser only
 * learns their hashed URLs after it has downloaded and parsed the CSS — one
 * round trip late for the landing's H1, the page's Largest Contentful Paint.
 * This writes a `<link rel="preload">` for each into index.html, with the
 * hashed name the build gave it.
 *
 * Only the two the landing paints with: Unbounded (headings) and Space
 * Grotesk (body). A preload is a promise to use the file; preloading a face
 * the first screen does not use costs bandwidth and earns a console warning.
 * `crossorigin` is required — fonts are always fetched in CORS mode, and a
 * preload without it is fetched twice.
 */
export function fontPreload(faces = ['unbounded-latin-normal', 'space-grotesk-latin-normal']) {
    let base = '/';
    return {
        name: 'font-preload',
        apply: 'build',
        configResolved(config) {
            base = config.base;
        },
        transformIndexHtml: {
            order: 'post',
            handler(html, ctx) {
                const files = Object.keys(ctx.bundle || {});
                const links = faces.map((face) => {
                    const file = files.find((f) => f.endsWith('.woff2') && f.split('/').pop().startsWith(`${face}-`));
                    if (!file) throw new Error(`fontPreload: no bundled font for "${face}" — was it renamed in src/assets/fonts?`);
                    return `<link rel="preload" href="${base}${file}" as="font" type="font/woff2" crossorigin />`;
                });
                return html.replace('</head>', `    ${links.join('\n    ')}\n  </head>`);
            },
        },
    };
}
