import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Writes the English home into `dist/index.html` at build time, and the
 * untouched shell beside it as `dist/shell.html` (2026-10-30).
 *
 * Why: Vercel serves a file that exists before it applies a rewrite, so `/`
 * is answered by `dist/index.html` itself and never reaches
 * api/render-meta.js. Every other page got its title, JSON-LD and
 * prerendered text from that function; the English home — the root and the
 * `x-default` of every hreflang set — reached crawlers with 0 words, no H1
 * and no JSON-LD. Rendering it here gives `/` the same page the function
 * would have written.
 *
 * - render-meta reads `shell.html` as its template (an already rendered page
 *   would get its head extras twice and no snapshot).
 * - The service worker keeps answering navigations from the precached
 *   `index.html`; the prerendered text sits in #root, visually hidden, until
 *   React replaces it, and useDocumentMeta rewrites the head per route —
 *   the same as every page served by the function.
 * - Only for a deploy at the domain root (Vercel, base "/"): the prerender's
 *   links are root-relative, which a GitHub Pages subpath would break.
 */
export function prerenderHome() {
    let base = '/';
    let root = process.cwd();
    let shell = null;
    let rendered = null;

    return {
        name: 'ptb-prerender-home',
        apply: 'build',
        configResolved(config) {
            base = config.base;
            root = config.root;
        },
        transformIndexHtml: {
            order: 'post',
            async handler(html) {
                if (base !== '/') return html;
                const { buildPage } = await import(pathToFileURL(path.join(root, 'api', 'render-meta.js')).href);
                shell = html;
                rendered = buildPage(html, { urlPath: '/' }).html;
                return rendered;
            },
        },
        writeBundle(options) {
            if (!shell) return;
            fs.writeFileSync(path.join(options.dir, 'shell.html'), shell);
        },
    };
}
