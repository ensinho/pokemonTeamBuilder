import { useThemeStore } from './useThemeStore';
import { useAuthStore } from './useAuthStore';
import { pairedTheme } from '../constants/theme';

/**
 * The user picked a theme. Every control that offers one — the header's sun ⇄
 * moon, the account menu's swatches, the Profile cards — goes through here, so
 * applying it and remembering it are one act.
 *
 * They used to be separate, and only the account menu did both: a theme chosen
 * on the Profile page or with the header toggle was applied and written to
 * localStorage but never saved to the account, so the next sign-in hydrated the
 * *old* theme from Firestore over the user's choice.
 *
 * `origin` is where the new theme spreads from (see utils/themeTransition.js).
 */
export function chooseTheme(themeId, origin) {
    const { theme, changeTheme } = useThemeStore.getState();
    if (!themeId || themeId === theme) return;
    changeTheme(themeId, origin);
    useAuthStore.getState().savePreferences({ theme: themeId });
}

/** Flip to the current theme's counterpart in the other mode (THEME_PAIRS). */
export function toggleThemeMode(origin) {
    chooseTheme(pairedTheme(useThemeStore.getState().theme), origin);
}
