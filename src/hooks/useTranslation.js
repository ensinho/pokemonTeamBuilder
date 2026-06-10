import { useCallback } from 'react';
import { useLanguageStore } from '../store/useLanguageStore';
import { TRANSLATIONS } from '../constants/translations';

export function useTranslation() {
    const language = useLanguageStore((state) => state.language);
    const setLanguage = useLanguageStore((state) => state.setLanguage);

    const t = useCallback((path, params = {}) => {
        const keys = path.split('.');
        let translation = TRANSLATIONS[language];

        for (const key of keys) {
            if (translation && typeof translation === 'object') {
                translation = translation[key];
            } else {
                translation = undefined;
                break;
            }
        }

        // Fallback to English if translation is missing in the current language
        if (translation === undefined && language !== 'en') {
            translation = TRANSLATIONS['en'];
            for (const key of keys) {
                if (translation && typeof translation === 'object') {
                    translation = translation[key];
                } else {
                    translation = undefined;
                    break;
                }
            }
        }

        if (translation === undefined) {
            return path; // Fallback to key itself
        }

        if (typeof translation !== 'string') {
            return path;
        }

        // Interpolate parameters, e.g. {{count}} or {{name}}
        let result = translation;
        Object.entries(params).forEach(([key, value]) => {
            result = result.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), String(value));
        });

        return result;
    }, [language]);

    return { t, language, setLanguage };
}
