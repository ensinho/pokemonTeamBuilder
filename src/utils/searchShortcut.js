/**
 * The global search's keyboard shortcut, as a user-chosen preference.
 *
 * Stored as a canonical string — modifiers in a fixed order, then the key:
 * "Mod+K", "Alt+Shift+F", "F2". `Mod` is Ctrl on Windows/Linux and ⌘ on a Mac;
 * matching accepts either, as the hard-coded ⌘K/Ctrl+K always did.
 *
 * Pure on purpose: the store, the header hint and the profile recorder all go
 * through these few functions, and they are what the tests pin down.
 */

export const DEFAULT_SEARCH_SHORTCUT = 'Mod+K';

const MODIFIER_ORDER = ['Mod', 'Alt', 'Shift'];

// Keys the browser keeps for itself (it never hands us the event) or that
// every text field needs (copy, paste, undo, select all). Binding search to
// one would either do nothing or break typing.
const RESERVED = new Set([
    'Mod+A', 'Mod+C', 'Mod+V', 'Mod+X', 'Mod+Z', 'Mod+Y', 'Mod+Shift+Z',
    'Mod+W', 'Mod+T', 'Mod+N', 'Mod+Q', 'Mod+R', 'Mod+L',
    'Mod+Shift+T', 'Mod+Shift+N', 'Mod+Shift+W', 'Mod+Shift+R',
    'Alt+F4',
]);

const NAMED_KEYS = {
    ' ': 'Space',
    ArrowUp: 'Up',
    ArrowDown: 'Down',
    ArrowLeft: 'Left',
    ArrowRight: 'Right',
};

const FUNCTION_KEY = /^F([1-9]|1[0-2])$/;

/**
 * The key part of a keyboard event, layout-aware for letters (an AZERTY "A" is
 * "A") but falling back to the physical key when a modifier turned the letter
 * into a symbol — on a Mac, Alt+K reports "˚".
 */
export function keyFromEvent(event) {
    const raw = event?.key;
    if (!raw || raw === 'Dead' || raw === 'Unidentified') return keyFromCode(event?.code);
    if (['Control', 'Meta', 'Alt', 'Shift', 'AltGraph', 'CapsLock', 'OS'].includes(raw)) return null;
    if (/^[a-z0-9]$/i.test(raw)) return raw.toUpperCase();
    if (FUNCTION_KEY.test(raw)) return raw;
    if (NAMED_KEYS[raw]) return NAMED_KEYS[raw];
    return keyFromCode(event?.code) || (raw.length === 1 ? raw : null);
}

function keyFromCode(code) {
    if (!code) return null;
    const letter = /^Key([A-Z])$/.exec(code);
    if (letter) return letter[1];
    const digit = /^Digit([0-9])$/.exec(code);
    if (digit) return digit[1];
    const named = { Slash: '/', Period: '.', Comma: ',', Semicolon: ';', Quote: "'", Backquote: '`', BracketLeft: '[', BracketRight: ']', Backslash: '\\', Minus: '-', Equal: '=', Space: 'Space' };
    return named[code] || null;
}

/** Canonical string for an event, or null when the event is only a modifier. */
export function shortcutFromEvent(event) {
    const key = keyFromEvent(event);
    if (!key) return null;
    const parts = [];
    if (event.metaKey || event.ctrlKey) parts.push('Mod');
    if (event.altKey) parts.push('Alt');
    if (event.shiftKey) parts.push('Shift');
    parts.push(key);
    return parts.join('+');
}

function split(shortcut) {
    const parts = String(shortcut || '').split('+').filter(Boolean);
    // "Mod++" — the key itself is a plus.
    if (String(shortcut).endsWith('++')) parts.push('+');
    const key = parts.pop() || '';
    const mods = new Set(parts);
    return { key, mods };
}

/**
 * Why a combination can't be the search shortcut, or null when it can.
 * - 'modifier': a bare key (or Shift+key) would fire while typing.
 * - 'reserved': the browser keeps it, or text fields need it.
 */
export function validateShortcut(shortcut) {
    const { key, mods } = split(shortcut);
    if (!key) return 'modifier';
    if (RESERVED.has(normalizeShortcut(shortcut))) return 'reserved';
    if (FUNCTION_KEY.test(key)) return null;
    if (!mods.has('Mod') && !mods.has('Alt')) return 'modifier';
    return null;
}

/** Canonical form, or the default when the input isn't a usable shortcut. */
export function normalizeShortcut(shortcut) {
    if (typeof shortcut !== 'string' || !shortcut) return DEFAULT_SEARCH_SHORTCUT;
    const { key, mods } = split(shortcut);
    if (!key) return DEFAULT_SEARCH_SHORTCUT;
    const ordered = MODIFIER_ORDER.filter((m) => mods.has(m));
    const normalKey = key.length === 1 ? key.toUpperCase() : key;
    return [...ordered, normalKey].join('+');
}

/** A stored value made safe to bind: canonical and valid, else the default. */
export function sanitizeShortcut(shortcut) {
    const normal = normalizeShortcut(shortcut);
    return validateShortcut(normal) ? DEFAULT_SEARCH_SHORTCUT : normal;
}

export function matchesShortcut(event, shortcut) {
    if (!event || event.repeat) return false;
    const fromEvent = shortcutFromEvent(event);
    return fromEvent !== null && fromEvent === normalizeShortcut(shortcut);
}

const APPLE_SYMBOLS = { Mod: '⌘', Alt: '⌥', Shift: '⇧' };
const PC_LABELS = { Mod: 'Ctrl', Alt: 'Alt', Shift: 'Shift' };

/** What the user reads: "⌘K" on a Mac, "Ctrl K" elsewhere. */
export function formatShortcut(shortcut, isApple = false) {
    const { key, mods } = split(normalizeShortcut(shortcut));
    const ordered = MODIFIER_ORDER.filter((m) => mods.has(m));
    if (isApple) return ordered.map((m) => APPLE_SYMBOLS[m]).join('') + key;
    return [...ordered.map((m) => PC_LABELS[m]), key].join(' ');
}

/** The `aria-keyshortcuts` value: "Meta+K Control+K" for "Mod+K". */
export function ariaKeyShortcuts(shortcut) {
    const { key, mods } = split(normalizeShortcut(shortcut));
    const rest = MODIFIER_ORDER.filter((m) => m !== 'Mod' && mods.has(m));
    const tail = [...rest, key].join('+');
    if (!mods.has('Mod')) return tail;
    return `Meta+${tail} Control+${tail}`;
}
