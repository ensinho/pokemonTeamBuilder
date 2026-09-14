import { describe, it, expect } from 'vitest';
import { buildSignature, documentAssetUrls, extractAssetUrls, findNewAssetUrls } from './appUpdate';

const htmlFor = (assets) => `<!doctype html><html><head>
    <link rel="icon" href="/pokemonTeamBuilder/favicon.ico">
    <link rel="manifest" href="/pokemonTeamBuilder/site.webmanifest">
    ${assets.map((a) => (a.endsWith('.css')
        ? `<link rel="stylesheet" crossorigin href="${a}">`
        : `<script type="module" crossorigin src="${a}"></script>`)).join('\n')}
</head><body><div id="root"></div>
    <a href="/pokemonTeamBuilder/assets/not-a-bundle.png">nope</a>
</body></html>`;

const ENTRY = '/pokemonTeamBuilder/assets/index-D_ipmWuI.js';
const STYLE = '/pokemonTeamBuilder/assets/index-Bq1m2x0a.css';

describe('extractAssetUrls', () => {
    it('picks up hashed scripts and stylesheets, ignoring everything else', () => {
        expect(extractAssetUrls(htmlFor([ENTRY, STYLE]))).toEqual([ENTRY, STYLE]);
    });

    it('accepts single-quoted attributes and de-duplicates', () => {
        const html = `<script src='${ENTRY}'></script><link rel=modulepreload href='${ENTRY}'>`;
        expect(extractAssetUrls(html)).toEqual([ENTRY]);
    });

    it('ignores non-bundle assets under /assets/', () => {
        const html = '<img src="/pokemonTeamBuilder/assets/logo-abc123.png">';
        expect(extractAssetUrls(html)).toEqual([]);
    });

    it('survives a non-string body', () => {
        expect(extractAssetUrls(undefined)).toEqual([]);
        expect(extractAssetUrls(null)).toEqual([]);
    });
});

describe('findNewAssetUrls', () => {
    it('is empty when the deployed HTML matches the running document', () => {
        expect(findNewAssetUrls(htmlFor([ENTRY, STYLE]), [ENTRY, STYLE])).toEqual([]);
    });

    it('reports the assets a new deploy introduced', () => {
        const next = '/pokemonTeamBuilder/assets/index-NEWHASH1.js';
        expect(findNewAssetUrls(htmlFor([next, STYLE]), [ENTRY, STYLE])).toEqual([next]);
    });

    it('does not fire when the document merely loaded extra lazy chunks', () => {
        const lazy = '/pokemonTeamBuilder/assets/BattleView-Cj1kd0.js';
        expect(findNewAssetUrls(htmlFor([ENTRY]), [ENTRY, lazy])).toEqual([]);
    });

    it('treats a missing current list as "nothing loaded yet"', () => {
        expect(findNewAssetUrls(htmlFor([ENTRY]), undefined)).toEqual([ENTRY]);
    });
});

describe('documentAssetUrls', () => {
    it('reads the hashed assets out of a document', () => {
        const nodes = [
            { getAttribute: (a) => (a === 'src' ? ENTRY : null) },
            { getAttribute: (a) => (a === 'href' ? STYLE : null) },
            { getAttribute: (a) => (a === 'href' ? '/pokemonTeamBuilder/site.webmanifest' : null) },
        ];
        const fakeDoc = { querySelectorAll: () => nodes };
        expect(documentAssetUrls(fakeDoc)).toEqual([ENTRY, STYLE]);
    });
});

describe('buildSignature', () => {
    it('is stable regardless of the order the assets appear in', () => {
        expect(buildSignature([ENTRY, STYLE])).toBe(buildSignature([STYLE, ENTRY]));
    });

    it('differs between builds', () => {
        expect(buildSignature([ENTRY])).not.toBe(buildSignature(['/pokemonTeamBuilder/assets/index-OTHER.js']));
    });

    it('survives a missing list', () => {
        expect(buildSignature(undefined)).toBe('');
    });
});
