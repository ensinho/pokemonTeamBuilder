import { UNSAFE_createBrowserHistory as createBrowserHistory } from 'react-router-dom';
import { localizePath, splitLocalePath } from '../utils/localePath';

/**
 * The one browser history the app routes through (LocaleRouter), kept here so
 * the language store can move the URL between `/x` and `/pt/x` without a
 * reload and without going through `navigate` — `navigate` always resolves
 * inside the current language's basename and cannot leave it.
 */
let history = null;

export const deployBase = () => (import.meta.env.BASE_URL || '/').replace(/\/$/, '');

export function getLocaleHistory() {
    if (!history) history = createBrowserHistory({ v5Compat: true });
    return history;
}

/** The current URL rewritten into `language`, or null when it already is. */
export function localizedCurrentUrl(language, loc = window.location) {
    const base = deployBase();
    const current = splitLocalePath(loc.pathname, base);
    if (current.language === language) return null;
    return `${localizePath(current.appPath, language, base)}${loc.search}${loc.hash}`;
}

/**
 * Put the URL in `language`, replacing the entry (a language switch is not a
 * step the back button should undo). Before the router exists it rewrites the
 * address directly; after, through the history, so the router hears it.
 */
export function mirrorLanguageInUrl(language) {
    if (typeof window === 'undefined') return;
    const target = localizedCurrentUrl(language);
    if (!target) return;
    if (history) history.replace(target, history.location.state);
    else window.history.replaceState(window.history.state, '', target);
}
