import { useCallback } from 'react';
import { useLanguageStore } from '../store/useLanguageStore';
import { translate } from '../utils/translate';

export function useTranslation() {
    const language = useLanguageStore((state) => state.language);
    const setLanguage = useLanguageStore((state) => state.setLanguage);

    // The resolver itself lives in utils/translate.js so non-React callers
    // (the stores, which raise most of the app's toasts) can share it.
    const t = useCallback((path, params = {}) => translate(language, path, params), [language]);

    return { t, language, setLanguage };
}
