import { TRANSLATIONS } from '../constants/translations.js';

/**
 * Resolve a dotted key against a language's table, falling back to English and
 * finally to the key itself. Extracted from `useTranslation` so that code
 * outside the React tree can translate too — the Zustand stores fire most of
 * this app's toasts, could not call a hook, and therefore shipped ~70
 * hard-coded English strings into a bilingual UI. Lives apart from translate.js
 * (which reads the language store) so Node code — api/render-meta.js — can
 * resolve the same keys.
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
