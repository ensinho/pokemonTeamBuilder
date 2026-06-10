import { create } from 'zustand';

const getInitialLanguage = () => {
    if (typeof window === 'undefined') return 'en';
    try {
        const saved = localStorage.getItem('language');
        if (saved === 'en' || saved === 'pt') return saved;
        
        // Detect browser default
        const lang = navigator.language || navigator.userLanguage;
        if (lang && lang.toLowerCase().startsWith('pt')) {
            return 'pt';
        }
    } catch (_) {
        /* ignore */
    }
    return 'en';
};

export const useLanguageStore = create((set) => {
    const initialLang = getInitialLanguage();
    if (typeof document !== 'undefined') {
        document.documentElement.lang = initialLang === 'pt' ? 'pt-BR' : 'en';
    }

    return {
        language: initialLang,
        setLanguage: (lang) => {
            if (lang !== 'en' && lang !== 'pt') return;
            try {
                localStorage.setItem('language', lang);
            } catch (_) {
                /* ignore */
            }
            if (typeof document !== 'undefined') {
                document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en';
            }
            set({ language: lang });
        }
    };
});
