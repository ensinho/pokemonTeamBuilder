import { TRANSLATIONS } from '../constants/translations';
import { useLanguageStore } from '../store/useLanguageStore';

/**
 * Resolve a dotted key against a language's table, falling back to English and
 * finally to the key itself. Extracted from `useTranslation` so that code
 * outside the React tree can translate too — the Zustand stores fire most of
 * this app's toasts, could not call a hook, and therefore shipped ~70
 * hard-coded English strings into a bilingual UI.
 */
export function translate(language, path, params = {}) {
    const lookup = (table) => {
        let node = table;
        for (const key of path.split('.')) {
            if (node && typeof node === 'object') node = node[key];
            else return undefined;
        }
        return node;
    };

    let value = lookup(TRANSLATIONS[language]);
    if (value === undefined && language !== 'en') value = lookup(TRANSLATIONS.en);
    if (typeof value !== 'string') return path;

    return Object.entries(params).reduce(
        (acc, [key, param]) => acc.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), String(param)),
        value,
    );
}

/**
 * Translate using the language that is active right now.
 *
 * For one-shot strings only — toasts, notification bodies, generated exports.
 * Components must keep using `useTranslation()`, which re-runs when the user
 * switches language; this reads the store once and does not subscribe.
 */
export function t(path, params) {
    return translate(useLanguageStore.getState().language, path, params);
}
