import { translate } from './translateCore';
import { useLanguageStore } from '../store/useLanguageStore';

export { translate };

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
