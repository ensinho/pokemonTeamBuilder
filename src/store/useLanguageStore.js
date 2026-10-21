import { create } from 'zustand';
import { LANGUAGES, LOCALE_TAG, resolveArrivalLanguage, splitLocalePath } from '../utils/localePath';
import { deployBase, mirrorLanguageInUrl } from '../services/localeHistory';

/**
 * The visitor's language. Since 2026-10-21 it also lives in the URL — English
 * at the root, Portuguese under `/pt` — so search engines can index both
 * (utils/localePath.js). On arrival an explicit choice wins, then the URL,
 * then the browser; after that this store is the authority and the URL
 * follows it (LocaleRouter, mirrorLanguageInUrl).
 */
const getInitialLanguage = () => {
    if (typeof window === 'undefined') return 'en';
    let saved = null;
    try {
        saved = localStorage.getItem('language');
    } catch (_) {
        /* storage blocked: fall through to the URL and the browser */
    }
    const url = splitLocalePath(window.location.pathname, deployBase());
    return resolveArrivalLanguage({
        saved,
        urlLanguage: url.language,
        urlHasPrefix: url.hasPrefix,
        browserLanguage: navigator.language || navigator.userLanguage,
    });
};

export const useLanguageStore = create((set) => {
    const initialLang = getInitialLanguage();
    if (typeof document !== 'undefined') {
        document.documentElement.lang = LOCALE_TAG[initialLang];
    }

    return {
        language: initialLang,
        setLanguage: (lang) => {
            if (!LANGUAGES.includes(lang)) return;
            try {
                localStorage.setItem('language', lang);
            } catch (_) {
                /* ignore */
            }
            if (typeof document !== 'undefined') {
                document.documentElement.lang = LOCALE_TAG[lang];
            }
            set({ language: lang });
            mirrorLanguageInUrl(lang);
        }
    };
});
