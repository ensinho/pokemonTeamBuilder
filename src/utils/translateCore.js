import { TRANSLATIONS } from '../constants/translations.js';
import { translateFrom } from './translateResolve.js';

/**
 * Resolve a dotted key against a language's table, falling back to English and
 * finally to the key itself. Extracted from `useTranslation` so that code
 * outside the React tree can translate too — the Zustand stores fire most of
 * this app's toasts, could not call a hook, and therefore shipped ~70
 * hard-coded English strings into a bilingual UI. Lives apart from translate.js
 * (which reads the language store) so Node code — api/render-meta.js — can
 * resolve the same keys.
 *
 * This file holds both languages and is what Node and the tests run. The
 * browser build never sees it: vite.config.js aliases it to translateClient.js,
 * which reads only the language the visitor loaded (src/i18n/catalog.js).
 */
export function translate(language, path, params = {}) {
    return translateFrom(TRANSLATIONS[language], TRANSLATIONS.en, path, params);
}
