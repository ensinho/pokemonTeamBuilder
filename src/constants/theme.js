// ============================================================
// THEME — single source of truth for colors.
// Values are mirrored as CSS variables in index.css under
// :root[data-theme="dark"] and :root[data-theme="light"].
// Keep both in sync.
// ============================================================

export const PATCH_NOTES_VERSION = '1.3.0';
export const POKEBALL_PLACEHOLDER_URL = 'https://art.pixilart.com/sr2a947c8f967b8.png';

// JS-side mirror of the CSS variables. Components that still
// pass a `colors` prop read from here. Prefer the Tailwind
// semantic tokens (bg-surface, text-fg, text-muted, ...) for
// new code so theme switching is purely CSS-driven.
export const THEMES = {
    dark: {
        primary: '#7d65e1',
        primarySoft: 'rgba(125, 101, 225, 0.18)',
        accent: '#FBBF24',
        background: '#111827',
        card: '#1F2937',
        cardLight: '#374151',
        text: '#FFFFFF',
        textMuted: '#9CA3AF',
        border: '#374151',
        success: '#34D399', // green-400 — readable on dark
        danger: '#F87171',  // red-400
        warning: '#FBBF24',
        info: '#60A5FA',
    },
    light: {
        primary: '#6353b3',
        primarySoft: 'rgba(99, 83, 179, 0.14)',
        accent: '#B45309',
        background: '#E8EAF0',
        card: '#FFFFFF',
        cardLight: '#F3F4F6',
        text: '#111827',
        textMuted: '#4B5563',
        border: '#E5E7EB',
        success: '#047857', // green-700 — passes 4.5:1 on light surfaces
        danger: '#B91C1C',  // red-700
        warning: '#B45309', // amber-700
        info: '#1D4ED8',    // blue-700
    },
};

// Apply a theme to the document. Sets data-theme + CSS vars so
// Tailwind tokens (bg-surface, text-fg, etc.) resolve correctly.
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
