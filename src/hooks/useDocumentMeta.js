import { useEffect } from 'react';
import { useLanguageStore } from '../store/useLanguageStore';
import { deployBase } from '../services/localeHistory';
import { LANGUAGES, OG_LOCALE, alternateUrls, localizePath, splitLocalePath } from '../utils/localePath';
import { DEFAULT_IMAGE, SITE_NAME, SITE_URL, pageMeta } from '../utils/seoPages';

export { SITE_NAME, SITE_URL };

function upsert(selector, create, attrs) {
    let el = document.head.querySelector(selector);
    if (!el) {
        el = create();
        document.head.appendChild(el);
    }
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
}

function upsertMeta(attr, key, content) {
    upsert(`meta[${attr}="${key}"]`, () => {
        const el = document.createElement('meta');
        el.setAttribute(attr, key);
        return el;
    }, { content });
}

function upsertLink(selector, attrs) {
    upsert(selector, () => document.createElement('link'), attrs);
}

const currentAppPath = () => {
    const { appPath } = splitLocalePath(window.location.pathname, deployBase());
    return `${appPath}${window.location.search}`;
};

/**
 * Every route utils/seoPages.js knows takes its copy from there — the table
 * the server renders from — so the title a crawler reads in the HTML is the
 * one still there after hydration, in the page's language. `pokemon`, `team`
 * and `name` are the lookups that table can use. A caller's own text is used
 * only for routes the table does not know (battles, profile, a 404), or with
 * `override` (an open forum topic, which the server also titles by itself).
 */
function applyMeta({ title, description, image, path, language, pokemon, team, name, override }) {
    const [appPath, query] = (path ?? currentAppPath()).split('?');
    const search = query ? `?${query}` : '';
    const table = pageMeta(appPath, language, { pokemon, team, name });
    const known = table.key !== 'home' || appPath === '/';
    const fromTable = !title || (known && !override);
    const fullTitle = fromTable ? table.title : `${title} | ${SITE_NAME}`;
    const desc = (fromTable ? table.description : description) || table.description;
    const img = image || table.image || DEFAULT_IMAGE;
    const url = `${SITE_URL}${localizePath(table.canonicalPath, language)}${search}`;

    document.title = fullTitle;
    upsertMeta('name', 'description', desc);
    upsertMeta('property', 'og:site_name', SITE_NAME);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('property', 'og:description', desc);
    upsertMeta('property', 'og:image', img);
    upsertMeta('property', 'og:url', url);
    upsertMeta('property', 'og:locale', OG_LOCALE[language]);
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', fullTitle);
    upsertMeta('name', 'twitter:description', desc);
    upsertMeta('name', 'twitter:image', img);
    upsertLink('link[rel="canonical"]', { rel: 'canonical', href: url });

    const alternates = alternateUrls(SITE_URL, table.canonicalPath, search);
    for (const alt of alternates) {
        upsertLink(`link[rel="alternate"][hreflang="${alt.hreflang}"]`, { rel: 'alternate', hreflang: alt.hreflang, href: alt.href });
    }
    const fallback = alternates.find((a) => a.language === LANGUAGES[0]);
    upsertLink('link[rel="alternate"][hreflang="x-default"]', { rel: 'alternate', hreflang: 'x-default', href: fallback.href });
}

/**
 * Sets the document title, meta description, canonical link, hreflang
 * alternates and Open Graph / Twitter tags for the current route, restoring
 * the route's defaults on unmount. Plain DOM mutation rather than
 * react-helmet: Google renders this app's JS anyway, and api/render-meta.js
 * already wrote the same values into the HTML.
 */
export function useDocumentMeta({ title, description, image, path, pokemon, team, name, override = false } = {}) {
    const language = useLanguageStore((s) => s.language);
    useEffect(() => {
        applyMeta({ title, description, image, path, language, pokemon, team, name, override });
        return () => applyMeta({ language: useLanguageStore.getState().language });
    }, [title, description, image, path, language, pokemon, team, name, override]);
}
