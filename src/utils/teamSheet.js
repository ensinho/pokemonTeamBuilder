/**
 * The team sheet (2026-11-05): the share image's "Ficha" layout, after the
 * regional-champion team posters Enzo referenced — the trainer's face and
 * "<name>'s team" as a headline, then six cards (art, item, name, ability,
 * nature, four moves) on one colour. No stats: the card says what the team
 * is, not its spreads. Pure helpers here; the canvas drawing lives in
 * components/modals/share/drawTeamSheet.js.
 */

/** Sheet colours: `auto` follows the lead's first type; the rest are fixed. */
export const SHEET_TONES = ['auto', 'champion', 'dragon', 'water', 'grass', 'ghost', 'dark'];

const FIXED_TONES = {
    // The regional poster's red.
    champion: '#c8102e',
};

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

const toRgb = (hex) => {
    const m = HEX.exec(String(hex || '').trim());
    if (!m) return null;
    let h = m[1];
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const toHex = (rgb) => `#${rgb.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')}`;

/** `a` mixed toward `b` by `t` (0 = a, 1 = b). Bad input gives `a` (or black). */
export function mixHex(a, b, t) {
    const ra = toRgb(a) || [0, 0, 0];
    const rb = toRgb(b) || ra;
    return toHex(ra.map((v, i) => v + (rb[i] - v) * t));
}

/** Relative luminance (WCAG), 0–1. */
export function luminance(hex) {
    const rgb = toRgb(hex);
    if (!rgb) return 0;
    const [r, g, b] = rgb.map((v) => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * The sheet's base colour for a tone id: deep enough that white text always
 * reads on it (a yellow Electric lead is darkened until it does).
 */
export function sheetBase(toneId, pokemons = [], typeColors = {}) {
    let raw = FIXED_TONES[toneId] || typeColors[toneId];
    if (toneId === 'auto' || !raw) {
        const lead = (pokemons.find(Boolean)?.types || [])[0];
        raw = typeColors[String(lead || '').toLowerCase()] || FIXED_TONES.champion;
    }
    let base = raw;
    // White on the base needs about 4.5:1 → luminance at most ~0.18.
    for (let i = 0; i < 8 && luminance(base) > 0.18; i += 1) base = mixHex(base, '#000000', 0.18);
    return base;
}

/** What a member's card shows, cleaned. */
export function sheetMember(pokemon, moveTypes = {}) {
    if (!pokemon) return null;
    const c = pokemon.customization || {};
    const moves = (Array.isArray(c.moves) ? c.moves : []).slice(0, 4).map((mv) => {
        const name = typeof mv === 'string' ? mv : mv?.name || '';
        const id = String(name).toLowerCase().replace(/[^a-z0-9]/g, '');
        const type = (typeof mv === 'object' && mv?.type) || moveTypes[id] || null;
        return name ? { name, type } : null;
    });
    while (moves.length < 4) moves.push(null);
    const ability = c.ability && c.ability !== 'unknown' ? c.ability : (pokemon.abilities?.[0]?.name || pokemon.abilities?.[0]?.ability?.name || null);
    return {
        name: pokemon.name || '',
        item: c.item || null,
        ability,
        nature: c.nature || null,
        teraType: c.teraType || null,
        moves,
    };
}
