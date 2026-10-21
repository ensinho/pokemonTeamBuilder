/**
 * The language half of a URL. English lives at the root (`/pokemon/charizard`),
 * Portuguese under one prefix (`/pt/pokemon/charizard`), so a search engine can
 * index both versions and a person can share either. The app itself never sees
 * the prefix: the router's basename absorbs it (`LocaleRouter`), so every
 * `navigate('/builder')` keeps the visitor in their language.
 *
 * Pure and dependency-free on purpose — `api/render-meta.js` imports it too, so
 * the server and the client can never disagree about what a URL means.
 */

export const LANGUAGES = ['en', 'pt'];
export const DEFAULT_LANGUAGE = 'en';

/** URL prefix per language. The default language has none. */
export const LOCALE_PREFIX = { en: '', pt: '/pt' };

/** BCP 47 tag for `<html lang>`, hreflang and og:locale. */
export const LOCALE_TAG = { en: 'en', pt: 'pt-BR' };
export const OG_LOCALE = { en: 'en_US', pt: 'pt_BR' };

const trimSlash = (base) => (base || '').replace(/\/+$/, '');

/**
 * Splits a full pathname into its language and the app path the router sees.
 * `base` is the deploy base without a trailing slash ('' on Vercel,
 * '/pokemonTeamBuilder' on GitHub Pages). A path outside the base is returned
 * as English and untouched.
 */
export function splitLocalePath(pathname, base = '') {
    const root = trimSlash(base);
    const path = pathname || '/';
    if (root && !(path === root || path.startsWith(`${root}/`))) {
        return { language: DEFAULT_LANGUAGE, appPath: path, hasPrefix: false };
    }
    const inner = path.slice(root.length) || '/';
    for (const language of LANGUAGES) {
        const prefix = LOCALE_PREFIX[language];
        if (!prefix) continue;
        if (inner === prefix || inner.startsWith(`${prefix}/`)) {
            return { language, appPath: inner.slice(prefix.length) || '/', hasPrefix: true };
        }
    }
    return { language: DEFAULT_LANGUAGE, appPath: inner, hasPrefix: false };
}

/** The app path (`/builder`) as a full pathname in `language` (`/pt/builder`). */
export function localizePath(appPath, language, base = '') {
    const prefix = LOCALE_PREFIX[language] ?? '';
    const path = appPath && appPath.startsWith('/') ? appPath : `/${appPath || ''}`;
    const joined = prefix && path === '/' ? prefix : `${prefix}${path}`;
    return `${trimSlash(base)}${joined}` || '/';
}

/** The router basename for a full pathname: the deploy base plus its prefix. */
export function routerBasename(pathname, base = '') {
    const { language, hasPrefix } = splitLocalePath(pathname, base);
    return `${trimSlash(base)}${hasPrefix ? LOCALE_PREFIX[language] : ''}`;
}

/**
 * Which language a visitor sees on arrival. An explicit choice (saved by the
 * language switch or the account) wins; then the URL, so a crawler or a shared
 * `/pt/...` link gets what it asked for; then the browser, which is only ever
 * consulted for an unprefixed URL — that is how a Brazilian visitor opening
 * `/` lands on `/pt` while a crawler (en-US, no storage) still indexes English.
 */
export function resolveArrivalLanguage({ saved, urlLanguage, urlHasPrefix, browserLanguage } = {}) {
    if (LANGUAGES.includes(saved)) return saved;
    if (urlHasPrefix && LANGUAGES.includes(urlLanguage)) return urlLanguage;
    if (typeof browserLanguage === 'string' && browserLanguage.toLowerCase().startsWith('pt')) return 'pt';
    return DEFAULT_LANGUAGE;
}

/** Every language's absolute URL for one app path — the hreflang set. */
export function alternateUrls(siteUrl, appPath, search = '') {
    return LANGUAGES.map((language) => ({
        language,
        hreflang: LOCALE_TAG[language],
        href: `${siteUrl}${localizePath(appPath, language)}${search}`,
    }));
}
