import { create } from 'zustand';
import { THEMES, applyTheme } from '../constants/theme';
import { getBackgroundById } from '../assets/backgrounds';

const getInitialTheme = () => {
    if (typeof window === 'undefined') return 'dark';
    try {
        const saved = localStorage.getItem('theme');
        return saved && THEMES[saved] ? saved : 'dark';
    } catch (_) {
        return 'dark';
    }
};

const getInitialWallpaper = () => {
    if (typeof window === 'undefined') return null;
    try {
        const saved = localStorage.getItem('homeWallpaperId');
        return saved && getBackgroundById(saved).id === saved ? saved : null;
    } catch (_) {
        return null;
    }
};

export const useThemeStore = create((set) => {
    const initialTheme = getInitialTheme();
    // Apply initial theme immediately to DOM
    applyTheme(initialTheme);

    return {
        theme: initialTheme,
        colors: THEMES[initialTheme],
        homeWallpaperId: getInitialWallpaper(),

        changeTheme: (nextTheme) => {
            if (!THEMES[nextTheme]) return;
            applyTheme(nextTheme);
            try {
                localStorage.setItem('theme', nextTheme);
            } catch (_) {
                /* ignore */
            }
            set({ theme: nextTheme, colors: THEMES[nextTheme] });
        },

        toggleTheme: () => {
            set((state) => {
                const ids = Object.keys(THEMES);
                const idx = ids.indexOf(state.theme);
                const nextTheme = ids[(idx + 1) % ids.length] || 'dark';
                applyTheme(nextTheme);
                try {
                    localStorage.setItem('theme', nextTheme);
                } catch (_) {
                    /* ignore */
                }
                return { theme: nextTheme, colors: THEMES[nextTheme] };
            });
        },

        setHomeWallpaperPreference: (backgroundId) => {
            const nextBackgroundId =
                typeof backgroundId === 'string' &&
                getBackgroundById(backgroundId).id === backgroundId
                    ? backgroundId
                    : null;
            try {
                if (nextBackgroundId) {
                    localStorage.setItem('homeWallpaperId', nextBackgroundId);
                } else {
                    localStorage.removeItem('homeWallpaperId');
                }
            } catch (_) {
                /* ignore */
            }
            set({ homeWallpaperId: nextBackgroundId });
        }
    };
});
