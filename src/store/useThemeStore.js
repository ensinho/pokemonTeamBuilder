import { create } from 'zustand';
import { THEMES, applyTheme, applyUiScale } from '../constants/theme';
import { getBackgroundById } from '../assets/backgrounds';
import { normalizeUiScale, DEFAULT_UI_SCALE } from '../utils/uiScale';

const UI_SCALE_KEY = 'ptbUiScale';

const getInitialTheme = () => {
    if (typeof window === 'undefined') return 'dark';
    try {
        const saved = localStorage.getItem('theme');
        return saved && THEMES[saved] ? saved : 'dark';
    } catch (_) {
        return 'dark';
    }
};

const getInitialUiScale = () => {
    if (typeof window === 'undefined') return DEFAULT_UI_SCALE;
    try {
        return normalizeUiScale(localStorage.getItem(UI_SCALE_KEY));
    } catch (_) {
        return DEFAULT_UI_SCALE;
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
    const initialUiScale = getInitialUiScale();
    // Apply initial theme immediately to DOM
    applyTheme(initialTheme);
    // Same for the interface scale — before first paint, so the app never
    // renders at 100% and then jumps to the user's size.
    applyUiScale(initialUiScale);

    return {
        theme: initialTheme,
        colors: THEMES[initialTheme],
        uiScale: initialUiScale,
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

        // Interface scale. Written to localStorage so it survives a reload before
        // auth resolves; the caller also mirrors it to the signed-in profile, so
        // it follows the account across devices exactly like the theme does.
        setUiScale: (scale) => {
            const nextScale = normalizeUiScale(scale);
            applyUiScale(nextScale);
            try {
                localStorage.setItem(UI_SCALE_KEY, String(nextScale));
            } catch (_) {
                /* preference is best-effort */
            }
            set({ uiScale: nextScale });
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
