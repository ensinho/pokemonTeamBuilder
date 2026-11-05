/**
 * The browser's translation tables, one chunk per language (2026-11-04). Both
 * languages in the entry were ~90 KB gz that every first visit downloaded and
 * parsed, half of it in a language the visitor never reads. main.jsx loads the
 * arrival language before the first render (the i18nPreload plugin has already
 * asked for its chunk in index.html); setLanguage loads the other before it
 * switches. Node code and tests use src/constants/translations.js instead.
 */
const loaders = {
    en: () => import('../constants/translations/en.js'),
    pt: () => import('../constants/translations/pt.js'),
};

const tables = {};
const pending = {};

export function getTable(language) {
    return tables[language];
}

export function loadLanguage(language) {
    if (tables[language]) return Promise.resolve(tables[language]);
    if (!loaders[language]) return Promise.reject(new Error(`No translations for "${language}"`));
    pending[language] ||= loaders[language]()
        .then((module) => {
            tables[language] = module.default;
            return module.default;
        })
        .finally(() => { delete pending[language]; });
    return pending[language];
}
