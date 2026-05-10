// ============================================================
// THEME — single source of truth for colors.
// Values are mirrored as CSS variables in index.css under
// :root[data-theme="dark"] and :root[data-theme="light"].
// Keep both in sync.
// ============================================================

// Bump this when the patch-notes screen has new content to surface.
export const PATCH_NOTES_VERSION = '1.5.0';
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
    // Eclipse — the darkest theme in the set. True near-black surfaces
    // with bright neon-purple accents that pop (GitHub darkest aesthetic).
    eclipse: {
        primary: '#a78bfa',
        primarySoft: 'rgba(167, 139, 250, 0.18)',
        accent: '#c084fc',
        background: '#0d0d0d',
        card: '#161616',
        cardLight: '#262626',
        text: '#F5F3FF',
        textMuted: '#909090',
        border: '#333333',
        success: '#34D399',
        danger: '#FB7185',
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
    // Daybreak — daytime sibling of Midnight. Keeps the same cool blue
    // family, but shifts the surfaces to airy daylight neutrals.
    daybreak: {
        primary: '#2563EB',
        primarySoft: 'rgba(37, 99, 235, 0.14)',
        accent: '#0EA5E9',
        background: '#EEF5FF',
        card: '#FFFFFF',
        cardLight: '#E4EEFB',
        text: '#0F172A',
        textMuted: '#5B6B84',
        border: '#CBD9EE',
        success: '#047857',
        danger: '#B91C1C',
        warning: '#B45309',
        info: '#1D4ED8',
    },
    // Midnight — deep blue/teal nocturnal theme. Inspired by night routes
    // and lake legendaries (Cresselia / Lugia). Cooler than `dark`, with a
    // teal accent that pops against navy surfaces.
    midnight: {
        primary: '#38BDF8',           // sky-400
        primarySoft: 'rgba(56, 189, 248, 0.16)',
        accent: '#22D3EE',            // cyan-400
        background: '#0B1220',
        card: '#111B2E',
        cardLight: '#1B2742',
        text: '#E2E8F0',
        textMuted: '#94A3B8',
        border: '#1E2A44',
        success: '#34D399',
        danger: '#FB7185',
        warning: '#FBBF24',
        info: '#60A5FA',
    },
    // Solar — soft warm yellow daylight theme. Lighter than amber/mustard,
    // closer to morning sunlight — readable text with a gentle gold accent.
    solar: {
        primary: '#EAB308',           // yellow-500
        primarySoft: 'rgba(234, 179, 8, 0.16)',
        accent: '#F59E0B',            // amber-500
        background: '#FFFDF2',        // warm off-white
        card: '#FFFFFF',
        cardLight: '#FEF9C3',         // yellow-100 — soft cream raised
        text: '#3B2F09',
        textMuted: '#7C6A2A',
        border: '#FEF08A',            // yellow-200
        success: '#047857',
        danger: '#B91C1C',
        warning: '#B45309',
        info: '#1D4ED8',
    },
};

// Display metadata for the theme picker UI. Order here drives render order.
export const THEME_META = [
    { id: 'dark',     label: 'Dark',     hint: 'Default night mode',         swatch: '#7d65e1' },
    { id: 'eclipse',  label: 'Eclipse',  hint: 'Ultra-dark violet neon',     swatch: '#8B5CF6' },
    { id: 'midnight', label: 'Midnight', hint: 'Deep blue, ocean nights',    swatch: '#38BDF8' },
    { id: 'daybreak', label: 'Daybreak', hint: 'Cool blue daylight',         swatch: '#2563EB' },
    { id: 'light',    label: 'Light',    hint: 'Daylight, high contrast',    swatch: '#6353b3' },
    { id: 'solar',    label: 'Solar',    hint: 'Soft yellow daylight',       swatch: '#EAB308' },
];

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
