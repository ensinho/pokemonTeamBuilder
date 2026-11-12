/** Minimal hex color handling for the renderer. Only #rgb / #rrggbb are accepted. */
export function parseHex(input) {
    if (typeof input !== 'string')
        return null;
    const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(input.trim());
    if (!m)
        return null;
    let h = m[1];
    if (h.length === 3)
        h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
export function toHex([r, g, b]) {
    const c = (v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0');
    return `#${c(r)}${c(g)}${c(b)}`;
}
export function mix(a, b, t) {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
/**
 * Darken while keeping the hue rich: blend toward a deeper, slightly
 * saturated version of the color rather than toward gray-black.
 */
export function shade(c, t) {
    const max = Math.max(...c);
    const deep = [c[0] * 0.35 - (max - c[0]) * 0.1, c[1] * 0.35 - (max - c[1]) * 0.1, c[2] * 0.35 - (max - c[2]) * 0.1];
    return mix(c, deep, t);
}
export function tint(c, t) {
    return mix(c, [255, 255, 255], t);
}
/** WCAG relative luminance. */
export function luminance([r, g, b]) {
    const ch = (v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
}
export function contrast(a, b) {
    const la = luminance(a), lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
export const DARK_INK = [20, 22, 34];
export const LIGHT_INK = [250, 250, 255];
/** Pick the eye ink with the best contrast against the body color. */
export function autoEyeColor(body) {
    return contrast(body, DARK_INK) >= contrast(body, LIGHT_INK) ? DARK_INK : LIGHT_INK;
}
