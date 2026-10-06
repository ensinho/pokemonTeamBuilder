import { describe, expect, it } from 'vitest';
import {
    DEFAULT_SEARCH_SHORTCUT,
    ariaKeyShortcuts,
    formatShortcut,
    matchesShortcut,
    normalizeShortcut,
    sanitizeShortcut,
    shortcutFromEvent,
    validateShortcut,
} from './searchShortcut';

const ev = (key, mods = {}, code) => ({ key, code, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...mods });

describe('searchShortcut', () => {
    it('reads events into canonical strings', () => {
        expect(shortcutFromEvent(ev('k', { ctrlKey: true }))).toBe('Mod+K');
        expect(shortcutFromEvent(ev('k', { metaKey: true }))).toBe('Mod+K');
        expect(shortcutFromEvent(ev('F', { shiftKey: true, altKey: true }))).toBe('Alt+Shift+F');
        expect(shortcutFromEvent(ev('F2'))).toBe('F2');
        expect(shortcutFromEvent(ev('Control', { ctrlKey: true }))).toBeNull();
    });

    it('falls back to the physical key when a modifier turns a letter into a symbol', () => {
        // macOS: Option+K reports "˚".
        expect(shortcutFromEvent(ev('˚', { altKey: true }, 'KeyK'))).toBe('Alt+K');
        expect(shortcutFromEvent(ev('Dead', { altKey: true }, 'KeyE'))).toBe('Alt+E');
    });

    it('matches either Ctrl or ⌘ for Mod, and nothing looser', () => {
        expect(matchesShortcut(ev('k', { ctrlKey: true }), 'Mod+K')).toBe(true);
        expect(matchesShortcut(ev('k', { metaKey: true }), 'Mod+K')).toBe(true);
        expect(matchesShortcut(ev('k', { ctrlKey: true, shiftKey: true }), 'Mod+K')).toBe(false);
        expect(matchesShortcut(ev('k'), 'Mod+K')).toBe(false);
        expect(matchesShortcut({ ...ev('k', { ctrlKey: true }), repeat: true }, 'Mod+K')).toBe(false);
    });

    it('rejects bare keys and combinations the browser or text fields own', () => {
        expect(validateShortcut('K')).toBe('modifier');
        expect(validateShortcut('Shift+K')).toBe('modifier');
        expect(validateShortcut('Mod+C')).toBe('reserved');
        expect(validateShortcut('Mod+W')).toBe('reserved');
        expect(validateShortcut('Mod+K')).toBeNull();
        expect(validateShortcut('Alt+S')).toBeNull();
        expect(validateShortcut('F2')).toBeNull();
    });

    it('normalizes modifier order and case, and sanitizes bad stored values', () => {
        expect(normalizeShortcut('Shift+Mod+p')).toBe('Mod+Shift+P');
        expect(sanitizeShortcut('Mod+C')).toBe(DEFAULT_SEARCH_SHORTCUT);
        expect(sanitizeShortcut(42)).toBe(DEFAULT_SEARCH_SHORTCUT);
        expect(sanitizeShortcut('Alt+Shift+F')).toBe('Alt+Shift+F');
    });

    it('formats per platform', () => {
        expect(formatShortcut('Mod+K', false)).toBe('Ctrl K');
        expect(formatShortcut('Mod+K', true)).toBe('⌘K');
        expect(formatShortcut('Mod+Shift+P', true)).toBe('⌘⇧P');
        expect(formatShortcut('Alt+Shift+F', false)).toBe('Alt Shift F');
    });

    it('builds aria-keyshortcuts', () => {
        expect(ariaKeyShortcuts('Mod+K')).toBe('Meta+K Control+K');
        expect(ariaKeyShortcuts('Alt+S')).toBe('Alt+S');
    });
});
