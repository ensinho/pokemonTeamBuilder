/**
 * A canonical colour (a type, a stat, a game) as *text* that stays legible in
 * every theme: the tone mixed 45% into the theme's own text colour, the same
 * recipe `.type-chip` uses in index.css. The raw canon colours fail as words —
 * Dark/Ghost/Dragon on the dark surfaces, Electric/Ice/Steel on white — while
 * the mix measures ≥ 4.6:1 for all 18 types on surface and raised, in all ten
 * themes (2026-10-28). Fills, edges and icons keep the raw tone.
 */
export const toneInk = (tone) => `color-mix(in srgb, ${tone} 45%, var(--color-fg))`;

/** The tone as a quiet fill behind that ink (chips, tinted rows). */
export const toneWash = (tone, pct = 14) => `color-mix(in srgb, ${tone} ${pct}%, transparent)`;
