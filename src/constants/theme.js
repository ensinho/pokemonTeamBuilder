// ============================================================
// THEME — single source of truth for colors.
// Values are mirrored as CSS variables in index.css under
// :root[data-theme="dark"] and :root[data-theme="light"].
// Keep both in sync.
// ============================================================

// Bump this when the patch-notes screen has new content to surface.
export const PATCH_NOTES_VERSION = '1.6.1';
export const POKEBALL_PLACEHOLDER_URL = 'https://art.pixilart.com/sr2a947c8f967b8.png';

// JS-side mirror of the CSS variables. Components that still
// pass a `colors` prop read from here.
export const THEMES = {
    dark: {
        primary: '#7c6ae8',
        primarySoft: 'rgba(124, 106, 232, 0.12)',
        accent: '#FBBF24',
        background: '#09090b',
        card: '#111113',
        cardLight: '#1a1a1e',
        text: '#fafafa',
        textMuted: '#a1a1aa',
        border: '#27272a',
        success: '#34D399',
        danger: '#F87171',
        warning: '#FBBF24',
        info: '#60A5FA',
    },
    eclipse: {
        primary: '#a78bfa',
        primarySoft: 'rgba(167, 139, 250, 0.12)',
        accent: '#c084fc',
        background: '#050505',
        card: '#0a0a0a',
        cardLight: '#171717',
        text: '#fafafa',
        textMuted: '#737373',
        border: '#262626',
        success: '#34D399',
        danger: '#FB7185',
        warning: '#FBBF24',
        info: '#60A5FA',
    },
    light: {
        primary: '#6353b3',
        primarySoft: 'rgba(99, 83, 179, 0.1)',
        accent: '#B45309',
        background: '#f4f4f5',
        card: '#FFFFFF',
        cardLight: '#f4f4f5',
        text: '#09090b',
        textMuted: '#71717a',
        border: '#e4e4e7',
        success: '#047857',
        danger: '#B91C1C',
        warning: '#B45309',
        info: '#1D4ED8',
    },
    daybreak: {
        primary: '#2563EB',
        primarySoft: 'rgba(37, 99, 235, 0.1)',
        accent: '#0EA5E9',
        background: '#f0f4ff',
        card: '#FFFFFF',
        cardLight: '#eef2fb',
        text: '#0f172a',
        textMuted: '#64748b',
        border: '#cbd5e1',
        success: '#047857',
        danger: '#B91C1C',
        warning: '#B45309',
        info: '#1D4ED8',
    },
    midnight: {
        primary: '#38BDF8',
        primarySoft: 'rgba(56, 189, 248, 0.1)',
        accent: '#22D3EE',
        background: '#0a0f1a',
        card: '#0f1629',
        cardLight: '#172036',
        text: '#e2e8f0',
        textMuted: '#94a3b8',
        border: '#1e293b',
        success: '#34D399',
        danger: '#FB7185',
        warning: '#FBBF24',
        info: '#60A5FA',
    },
    solar: {
        primary: '#ca8a04',
        primarySoft: 'rgba(202, 138, 4, 0.1)',
        accent: '#d97706',
        background: '#fefdf5',
        card: '#FFFFFF',
        cardLight: '#fef9e7',
        text: '#1c1917',
        textMuted: '#78716c',
        border: '#e7e5e4',
        success: '#047857',
        danger: '#B91C1C',
        warning: '#B45309',
        info: '#1D4ED8',
    },
};

// Display metadata for the theme picker UI. Order here drives render order.
export const THEME_META = [
    { id: 'dark',     label: 'Dark',     hint: 'Default night mode',         swatch: '#7c6ae8' },
    { id: 'eclipse',  label: 'Eclipse',  hint: 'Ultra-dark violet neon',     swatch: '#8B5CF6' },
    { id: 'midnight', label: 'Midnight', hint: 'Deep blue, ocean nights',    swatch: '#38BDF8' },
    { id: 'daybreak', label: 'Daybreak', hint: 'Cool blue daylight',         swatch: '#2563EB' },
    { id: 'light',    label: 'Light',    hint: 'Daylight, high contrast',    swatch: '#6353b3' },
    { id: 'solar',    label: 'Solar',    hint: 'Soft yellow daylight',       swatch: '#ca8a04' },
];

// Apply a theme to the document.
export function applyTheme(theme) {
    const t = THEMES[theme];
    if (!t || typeof document === 'undefined') return;
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.style.setProperty('--color-primary', t.primary);
    root.style.setProperty('--color-primary-soft', t.primarySoft);
    root.style.setProperty('--color-accent', t.accent);
    root.style.setProperty('--color-bg', t.background);
    root.style.setProperty('--color-surface', t.card);
    root.style.setProperty('--color-surface-raised', t.cardLight);
    root.style.setProperty('--color-fg', t.text);
    root.style.setProperty('--color-muted', t.textMuted);
    root.style.setProperty('--color-border', t.border);
    root.style.setProperty('--color-success', t.success);
    root.style.setProperty('--color-danger', t.danger);
    root.style.setProperty('--color-warning', t.warning);
    root.style.setProperty('--color-info', t.info);
}
