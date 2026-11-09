/**
 * The mascot rig (2026-11-06): the ghost of the app icon, drawn as data.
 *
 * The outline was traced from `public/LogoCuteGengarRounded.png` and fitted
 * to its pixels (93.5% overlap with the original stroke); everything else is
 * composed from parts, so an expression is a pose object, not a drawing:
 * `{ eyes: 'moon', mouth: 'wavy', earL: 14, earR: 14, fxHead: ['sweat'] }`.
 *
 * Rig space: the face centre is (0, 30); the jowl rests on y = 290. The icon
 * itself is this drawing turned 8° (`tilt: 8`, the brand tilt).
 *
 * Pure: strings in, strings out — no DOM, so Vitest, the export script and
 * the component all draw the same thing. Colours are `var(--m-*)` tokens
 * (`styles/mascot.css` maps them from `--mascot-*` in index.css' brand layer)
 * or canon type colours; nothing here knows the theme.
 *
 * Effects take a time `t` (ms). With a number they are drawn at that instant
 * (the motion engine, the GIF export); without one they are drawn at rest
 * with `m-loop` classes, and mascot.css animates them with transform and
 * opacity only — a sleeping mascot costs no JavaScript per frame.
 */
import { typeColors } from '../../constants/typeChart.js';
import { VIEWS } from './constants.js';

export { VIEWS };

export const STROKE = 27.75;            // outline stroke (4.7% of the head's width)
const EYE_W = 24;
const HEAD_PIVOT = [6, 10];             // where the head tilts
export const FOOT = 290;                // squash pivot (bottom of the jowl)
const SPARK_C = [138, -248];            // where the two "!" wedges converge
const T = typeColors;

const BASE = {
    P0: [-281.5, -249.5], a1: [-185.7, -216], P1: [-107.5, -174], P2: [-4.7, -282.5], P3: [14.8, -206.2], a4: [47.8, -232],
    P4: [76.5, -247], P5: [94.5, -166], a6: [179, -210], P6: [279.2, -246], a7: [268, -145.5], JR: [235.7, -49.8],
    j1: [263.2, 5.5], j2: [268.5, 116.2], j3: [190.8, 231], j4: [-1.3, 289], j5: [-192.7, 235.8], j6: [-275.7, 117],
    j7: [-270, 10.5], JL: [-243.5, -46.5], a9: [-272.2, -140], TR: [212.2, -80.2], TL: [-217.3, -81.9],
};

export const f = (n) => Math.round(n * 10) / 10;
const f3 = (n) => Math.round(n * 1000) / 1000;
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const rad = (d) => (d * Math.PI) / 180;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const mix = (a, b, pct) => `color-mix(in srgb, ${a} ${pct}%, ${b})`;

function rot(p, c, deg, s = 1) {
    const a = rad(deg), dx = (p[0] - c[0]) * s, dy = (p[1] - c[1]) * s;
    return [c[0] + dx * Math.cos(a) - dy * Math.sin(a), c[1] + dx * Math.sin(a) + dy * Math.cos(a)];
}

/* ---------- the head ---------- */

/** Ear angle in degrees: + droops the tip outward, − perks it; `crest` stands the spikes up. */
function headPoints(o) {
    const g = {};
    for (const k of Object.keys(BASE)) g[k] = BASE[k].slice();
    const earL = o.earL || 0, earR = o.earR || 0, es = o.earS || 1, half = 1 + (es - 1) * 0.5;
    if (earL || es !== 1) {
        const c = [-208, -148];
        g.P0 = rot(g.P0, c, -earL, es); g.a1 = rot(g.a1, c, -earL * 0.42, half); g.a9 = rot(g.a9, c, -earL * 0.42, half);
    }
    if (earR || es !== 1) {
        const c = [205, -150];
        g.P6 = rot(g.P6, c, earR, es); g.a6 = rot(g.a6, c, earR * 0.42, half); g.a7 = rot(g.a7, c, earR * 0.42, half);
    }
    const cr = o.crest || 0;
    if (cr) { g.P2 = [g.P2[0] - 2 * cr, g.P2[1] - 18 * cr]; g.P4 = [g.P4[0] + 4 * cr, g.P4[1] - 16 * cr]; }
    return g;
}

/** Catmull-Rom through the points, as cubic Béziers (clamped ends). */
function crSegs(P) {
    if (P.length === 2) return `L${f(P[1][0])} ${f(P[1][1])}`;
    const n = P.length;
    const ext = [[2 * P[0][0] - P[1][0], 2 * P[0][1] - P[1][1]], ...P, [2 * P[n - 1][0] - P[n - 2][0], 2 * P[n - 1][1] - P[n - 2][1]]];
    let d = '';
    for (let i = 1; i < ext.length - 2; i += 1) {
        const [p0, p1, p2, p3] = [ext[i - 1], ext[i], ext[i + 1], ext[i + 2]];
        d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
    }
    return d;
}

/** The outline as an SVG path. Same input, same string — the tests pin it. */
export function headPath(o = {}) {
    const g = headPoints(o);
    const runs = [[g.P0, g.a1, g.P1], [g.P1, g.P2], [g.P2, g.P3], [g.P3, g.a4, g.P4], [g.P4, g.P5], [g.P5, g.a6, g.P6], [g.P6, g.a7, g.JR],
        [g.JR, g.j1, g.j2, g.j3, g.j4, g.j5, g.j6, g.j7, g.JL], [g.JL, g.a9, g.P0]];
    let d = `M${f(g.P0[0])} ${f(g.P0[1])}`;
    for (const r of runs) d += crSegs(r);
    return `${d}Z`;
}

function barbPath(base, tip) {
    const dx = tip[0] - base[0], dy = tip[1] - base[1], L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
    return `M${f(base[0] + (nx * STROKE) / 2)} ${f(base[1] + (ny * STROKE) / 2)}L${f(tip[0] + nx * 1.5)} ${f(tip[1] + ny * 1.5)}L${f(tip[0] - nx * 1.5)} ${f(tip[1] - ny * 1.5)}L${f(base[0] - (nx * STROKE) / 2)} ${f(base[1] - (ny * STROKE) / 2)}Z`;
}
const BARBS = barbPath(BASE.JR, BASE.TR) + barbPath(BASE.JL, BASE.TL);

/* ---------- eyes (the LEFT eye around 0,0; the right one is its mirror) ---------- */
const S = (d, w = EYE_W) => `<path d="${d}" fill="none" stroke="var(--m-eye)" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const F = (d) => `<path d="${d}" fill="var(--m-eye)"/>`;
export const STAR = 'M0 -40C6 -10 10 -6 40 0C10 6 6 10 0 40C-6 10 -10 6 -40 0C-10 -6 -6 -10 0 -40Z';
export const HEART = 'M0 34C-44 8-40-28-17-29C-7-29 0-22 0-13C0-22 7-29 17-29C40-28 44 8 0 34Z';
const MOON = 'M-39 4L36 -12C42 12 28 44 0 44C-27 44-43 26-39 4Z';

export const EYES = {
    happy: S('M-45 14Q0 -56 45 16'),
    calm: S('M-40 4Q0 36 40 4', 20),
    flat: S('M-36 10L36 10', 20),
    sleepy: S('M-34 14Q0 32 34 14', 16),
    excited: S('M-30 -16L28 11L-30 38', 20),
    open: '<ellipse cy="8" rx="27" ry="33" fill="var(--m-eye)"/>',
    wide: '<ellipse cy="6" rx="33" ry="41" fill="var(--m-eye)"/>',
    dot: '<circle cy="12" r="13" fill="var(--m-eye)"/>',
    moon: F(MOON),
    angry: F('M-37 -12L39 6C40 28 24 43 1 43C-24 43-41 20-37 -12Z'),
    half: F('M-38 8L38 8C34 34-34 34-38 8Z'),
    heart: `<path d="${HEART}" fill="var(--m-heart)"/>`,
    star: `<path d="${STAR}" fill="var(--m-glint)" transform="translate(0 8)"/>`,
    starGold: `<path d="${STAR}" fill="var(--m-gold)" transform="translate(0 8) scale(1.1)"/>`,
    swirl: S('M2 8C2-3-13-4-13 9C-13 23 9 26 17 11C26-9 4-29-16-19C-36-8-31 26-9 34', 9),
    x: S('M-25 -14L25 32M25 -14L-25 32', 18),
    determined: S('M-44 4Q-4 -48 44 30'),
    sad: S('M-40 30Q0 -14 40 8', 20),
    teary: F(MOON) + '<path d="M8 36C8 36-6 54-6 62C-6 70 0 74 6 74C12 74 18 70 18 62C18 54 8 36 8 36Z" fill="var(--m-tear)"/>',
    none: '',
};
const EYE_C = [115.5, 30];
/** Where the eyes go while a loader loops (mascot.css): reading lines, or following the lens. */
export const GAZES = { none: 1, read: 1, follow: 1 };
function eyesSVG(spec) {
    const l = typeof spec === 'string' ? spec : spec?.l || 'happy';
    const r = typeof spec === 'string' ? spec : spec?.r || l;
    return `<g transform="translate(${-EYE_C[0]} ${EYE_C[1]})">${EYES[l] ?? EYES.happy}</g>`
        + `<g transform="translate(${EYE_C[0]} ${EYE_C[1]}) scale(-1 1)">${EYES[r] ?? EYES.happy}</g>`;
}

/* ---------- mouths (absolute, x centred on 0) ---------- */
const MF = (d) => `<path d="${d}" fill="var(--m-mouth)"/>`;
const MS = (d, w = 16) => `<path d="${d}" fill="none" stroke="var(--m-line)" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const FANG = (x, y, s = 1, flip = false) => {
    const k = flip ? -1 : 1;
    return `<path d="M${f(x - 17.5 * s * k)} ${f(y)}L${f(x + 17.5 * s * k)} ${f(y + 5.5 * s)}L${f(x - 0.5 * s * k)} ${f(y + 28.5 * s)}Z" fill="var(--m-fang)" stroke="var(--m-fang-edge)" stroke-width="4" stroke-linejoin="round"/>`;
};
const FANGS_ICON = FANG(-73, 98) + FANG(73, 98, 1, true);
const GRIN = 'M-89 159Q0 93 89 159C54.5 236-54.5 236-89 159Z';
export const MOUTHS = {
    grin: [MF(GRIN), FANGS_ICON],
    big: [MF('M-112 146Q0 64 112 146C72 268-72 268-112 146Z'), FANG(-88, 80, 1.15) + FANG(88, 80, 1.15, true)],
    smile: [MS('M-58 166Q0 214 58 166', 18), FANG(-40, 176, 0.75) + FANG(40, 176, 0.75, true)],
    tiny: [MS('M-26 172Q0 192 26 172', 14), ''],
    cat: [MS('M-48 160Q-24 196 0 166Q24 196 48 160', 16), FANG(-30, 178, 0.6) + FANG(30, 178, 0.6, true)],
    o: ['<ellipse cy="176" rx="25" ry="31" fill="var(--m-mouth)"/>', ''],
    smallO: ['<ellipse cy="172" rx="13" ry="15" fill="var(--m-mouth)"/>', ''],
    flat: [MS('M-36 176L36 176'), ''],
    frown: [MS('M-46 192Q0 150 46 192'), ''],
    wavy: [MS('M-56 180q14 -14 28 0t28 0t28 0t28 0', 14), FANG(-36, 160, 0.6) + FANG(36, 160, 0.6, true)],
    smirk: [MF('M-104 142Q6 126 114 108C90 214-30 236-104 142Z'), FANG(-66, 103, 1) + FANG(76, 86, 1, true)],
    tongue: [MF(GRIN) + '<path d="M-38 204Q0 176 38 204Q22 224 0 224Q-22 224-38 204Z" fill="var(--m-tongue)"/>', FANGS_ICON],
    shout: [MF('M-70 136Q0 118 70 136C80 236-80 236-70 136Z'), FANG(-46, 96, 0.9) + FANG(46, 96, 0.9, true)],
    yawn: ['<ellipse cy="184" rx="34" ry="48" fill="var(--m-mouth)"/>', ''],
    grit: ['<rect x="-62" y="150" width="124" height="48" rx="18" fill="var(--m-eye)"/><path d="M-60 174H60M-30 152V196M0 152V196M30 152V196" stroke="var(--m-line)" stroke-width="7"/>', ''],
    none: ['', ''],
};
function mouthSVG(name, fangs) {
    const m = MOUTHS[name] || MOUTHS.grin;
    return m[0] + (fangs ? m[1] : '');
}

function blushSVG(kind) {
    if (kind === 'none') return '';
    const e = (x) => `<ellipse cx="${x}" cy="91" rx="31.4" ry="14.6" fill="var(--m-blush)"/>`;
    let s = e(-175) + e(175);
    if (kind === 'strong') {
        const lines = (x) => `<path d="M${x - 18} 104l10 -24M${x - 2} 104l10 -24M${x + 14} 104l10 -24" stroke="var(--m-glint)" stroke-width="5" stroke-linecap="round" opacity=".85"/>`;
        s += lines(-175) + lines(175);
    }
    return s;
}

/* ---------- the "!" wedges ---------- */
function wedge(angle, r0, r1, w0, w1, s = 1) {
    const a = rad(angle), ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
    const R0 = r0 * s, R1 = r0 * s + (r1 - r0) * s;
    const p = (r, w, k) => [SPARK_C[0] + ux * r + (nx * w * k) / 2, SPARK_C[1] + uy * r + (ny * w * k) / 2];
    const q = [p(R0, w0, 1), p(R1, w1, 1), p(R1, w1, -1), p(R0, w0, -1)];
    return `<path d="M${q.map((v) => `${f(v[0])} ${f(v[1])}`).join('L')}Z" fill="var(--m-line)" stroke="var(--m-line)" stroke-width="5" stroke-linejoin="round"/>`;
}
export const SPARKS = {
    default: (s) => wedge(-78, 55, 149, 11, 47, s) + wedge(-36, 48, 146, 3, 41, s),
    triple: (s) => wedge(-80, 55, 152, 11, 48, s) + wedge(-40, 50, 148, 4, 42, s) + wedge(0, 52, 130, 4, 36, s),
    small: (s) => wedge(-70, 60, 120, 10, 34, s),
    none: () => '',
};

/* ---------- paws ---------- */
const PAW_D = 'M-34 30C-44 6-40-22-24-30C-22-46-6-50 0-38C6-52 24-50 26-34C42-36 50-16 42 2C40 26 24 42 0 42C-14 42-28 40-34 30Z';
const paw = (x, y, r = 0, s = 1.3) => `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(r)}) scale(${s})"><path d="${PAW_D}" fill="var(--m-bg)" stroke="var(--m-line)" stroke-width="${f(17 / s)}" stroke-linejoin="round"/><path d="M-10 -34L-6 -20M12 -36L10 -22" stroke="var(--m-line)" stroke-width="${f(7 / s)}" stroke-linecap="round" opacity=".55"/></g>`;
const waveLines = (x, y, side = -1) => `<g fill="none" stroke="var(--m-line)" stroke-width="10" stroke-linecap="round" opacity=".8"><path d="M${x} ${y - 30}q${side * 22} 30 0 60"/><path d="M${x + side * 22} ${y - 44}q${side * 30} 44 0 88"/></g>`;
export const PAWS = {
    none: () => '',
    wave: (p) => paw(-336, 40, -14 + (p.pawA || 0)) + waveLines(-404, 30),
    chin: () => paw(-150, 258, 12),
    cover: () => paw(-112, 40, -6, 1.55) + paw(112, 40, 6, 1.55),
    peek: () => paw(-112, 40, -6, 1.55) + paw(118, 118, 18, 1.55),
    up: (p) => paw(-342, -120 + (p.pawA || 0), -24) + paw(342, -120 + (p.pawA || 0), 24),
    hold: () => paw(-96, 300, -14) + paw(96, 300, 14),
    point: () => paw(348, 118, 78),
    cheeks: () => paw(-268, 126, -32) + paw(268, 126, 32),
    shrug: () => paw(-338, 186, -64) + paw(338, 186, 64),
    edge: () => paw(-156, 248, 0) + paw(156, 248, 0),
    type: (p) => paw(-112, 312 + (p.pawA || 0), -8) + paw(112, 312 - (p.pawA || 0), 8),
    charge: () => paw(-74, 318, -36) + paw(74, 318, 36),
    raise: (p) => paw(330, -40 + (p.pawA || 0), 26),
};

/* ---------- props & hats ---------- */
// At rest (no `t`) a part may loop in CSS: wrapped in its own group, because a
// CSS transform would replace the positioning `transform` attribute it sits in.
const atRest = (p, name, inner) => (p.t == null ? `<g class="m-loop m-${name}">${inner}</g>` : inner);
const LN = (d, w = 16, c = 'var(--m-line)', fill = 'none') => `<path d="${d}" fill="${fill}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
function pokeball(x, y, r = 62, a = 0, cls = '') {
    return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(a)})"${cls ? ` class="${cls}"` : ''}><circle r="${r}" fill="var(--m-bg)"/><path d="M${-r} 0A${r} ${r} 0 0 1 ${r} 0Z" fill="var(--m-line)"/><circle r="${r}" fill="none" stroke="var(--m-line)" stroke-width="13"/><path d="M${-r} 0H${r}" stroke="var(--m-line)" stroke-width="13"/><circle r="${f(r * 0.3)}" fill="var(--m-bg)" stroke="var(--m-line)" stroke-width="11"/><circle r="${f(r * 0.11)}" fill="var(--m-eye)"/></g>`;
}
const DOTS3 = [T.fire, T.water, T.grass];
const BOOK_LINES = '<path d="M24 -36H82M24 -8H82M24 20H66" stroke="var(--m-line)" stroke-width="9" stroke-linecap="round" opacity=".7"/>';
const goldInk = 'var(--m-gold-ink)';
const shadeMix = (c, pct = 55) => mix(c, 'var(--m-shade)', pct);
export const PROPS = {
    none: () => '',
    pokeball: (p) => pokeball(0, 352, 66, p.propA || 0),
    // the loader: a big ball the mascot peeks over; CSS rocks it in three beats
    bigball: (p) => (p.t == null
        ? `<g transform="translate(0 440)"><g class="m-loop m-wobble">${pokeball(0, -186, 186)}</g></g>`
        : `<g transform="translate(0 440) rotate(${f(p.propA || 0)})">${pokeball(0, -186, 186)}</g>`),
    pokeballThrow: (p) => pokeball(392, -60, 52, p.propA || 0),
    // at rest (the search loader) the lens sweeps the ground; gaze 'follow' keeps the eyes on it
    magnifier: (p) => `<g transform="translate(250 230) rotate(${f(p.propA || 0)})">${atRest(p, 'sweep', `${LN('M48 52L104 108', 26)}<circle r="70" fill="var(--m-eye)" fill-opacity=".14" stroke="var(--m-line)" stroke-width="16"/><path d="M-36 -30Q-30 -46 -12 -52" stroke="var(--m-glint)" stroke-width="9" stroke-linecap="round" fill="none" opacity=".8"/>`)}</g>`,
    clipboard: () => `<g transform="translate(0 356) rotate(-4)"><rect x="-92" y="-96" width="184" height="190" rx="18" fill="var(--m-bg)" stroke="var(--m-line)" stroke-width="14"/><rect x="-40" y="-112" width="80" height="34" rx="10" fill="var(--m-line)"/>${DOTS3.map((c, i) => `<circle cx="-50" cy="${-38 + i * 44}" r="12" fill="${c}"/><path d="M-26 ${-38 + i * 44}H58" stroke="var(--m-line)" stroke-width="10" stroke-linecap="round" opacity=".7"/>`).join('')}</g>`,
    laptop: () => `<g transform="translate(0 348)"><path d="M-160 -112H160L146 26H-146Z" fill="var(--m-bg)" stroke="var(--m-line)" stroke-width="14" stroke-linejoin="round"/>${pokeball(0, -44, 34)}<path d="M-196 26H196L180 60H-180Z" fill="var(--m-line)"/></g>`,
    trophy: () => `<g transform="translate(0 340)"><path d="M-70 -110H70C70 -30 44 6 0 10C-44 6-70 -30-70 -110Z" fill="var(--m-gold)" stroke="${goldInk}" stroke-width="10" stroke-linejoin="round"/>${LN('M-70 -90C-118 -90-112 -30-62 -40M70 -90C118 -90 112 -30 62 -40', 12, goldInk)}<path d="M-18 10H18V44H-18Z" fill="var(--m-gold)"/><rect x="-60" y="44" width="120" height="30" rx="8" fill="var(--m-gold)" stroke="${goldInk}" stroke-width="10"/><path d="M-24 -84L-6 -84" stroke="var(--m-glint)" stroke-width="10" stroke-linecap="round" opacity=".7"/></g>`,
    sign: (p) => `<g transform="translate(0 346) rotate(-3)"><rect x="-150" y="-82" width="300" height="150" rx="20" fill="var(--m-bg)" stroke="var(--m-line)" stroke-width="14"/><text x="0" y="18" text-anchor="middle" font-family="Unbounded, 'Space Grotesk', system-ui, sans-serif" font-weight="700" font-size="${clamp(Number(p.signSize) || 62, 20, 110)}" fill="var(--m-line)">${esc(String(p.signText ?? '?').slice(0, 12))}</text></g>`,
    // at rest (the Pokédex loader) the right page turns over the spine: lying on
    // the page it copies, it is invisible between turns, so the loop has no seam
    book: (p) => `<g transform="translate(0 350) rotate(-6)"><rect x="-120" y="-96" width="240" height="184" rx="16" fill="var(--m-line)"/><rect x="-104" y="-80" width="208" height="152" rx="10" fill="var(--m-bg)"/><path d="M0 -80V72" stroke="var(--m-line)" stroke-width="10"/>${pokeball(-52, -8, 26)}${BOOK_LINES}${p.t == null ? `<g class="m-loop m-page"><path d="M0 -80H94Q104 -80 104 -70V62Q104 72 94 72H0Z" fill="var(--m-bg)"/>${BOOK_LINES}</g>` : ''}</g>`,
    flask: () => `<g transform="translate(260 250) rotate(14)"><path d="M-26 -96V-30L-84 70Q-92 96-62 96H62Q92 96 84 70L26 -30V-96" fill="var(--m-bg)" stroke="var(--m-line)" stroke-width="14" stroke-linejoin="round"/><path d="M-62 46L62 46L78 74Q84 88 66 88H-66Q-84 88-78 74Z" fill="${T.psychic}" fill-opacity=".85"/><path d="M-40 -96H40" stroke="var(--m-line)" stroke-width="14" stroke-linecap="round"/><circle cx="-10" cy="22" r="9" fill="${T.psychic}" fill-opacity=".7"/><circle cx="14" cy="-2" r="6" fill="${T.psychic}" fill-opacity=".6"/></g>`,
    controller: () => `<g transform="translate(0 352)"><path d="M-130 -40Q-120 -80-80 -78H80Q120 -80 130 -40L150 40Q156 84 118 84Q92 84 74 52H-74Q-92 84-118 84Q-156 84-150 40Z" fill="var(--m-bg)" stroke="var(--m-line)" stroke-width="14" stroke-linejoin="round"/><path d="M-92 -14V26M-112 6H-72" stroke="var(--m-line)" stroke-width="13" stroke-linecap="round"/><circle cx="84" cy="-8" r="11" fill="${T.psychic}"/><circle cx="110" cy="18" r="11" fill="var(--m-line)"/></g>`,
    mic: () => `<g transform="translate(300 196) rotate(-22)"><rect x="-26" y="-70" width="52" height="84" rx="26" fill="var(--m-line)"/><path d="M-16 -46H16M-16 -26H16" stroke="var(--m-bg)" stroke-width="6" stroke-linecap="round"/>${LN('M0 14V96', 16)}</g>`,
    envelope: () => `<g transform="translate(0 350) rotate(-5)"><rect x="-120" y="-80" width="240" height="160" rx="16" fill="var(--m-bg)" stroke="var(--m-line)" stroke-width="14"/>${LN('M-112 -72L0 14L112 -72', 12)}<circle cx="108" cy="-78" r="22" fill="var(--m-live)"/></g>`,
    cloud: (p) => `<g transform="translate(0 ${f(-470 + (p.propA || 0))})"><path d="M-96 40Q-140 40-140 2Q-140 -36-98 -38Q-86 -86-32 -84Q12 -110 52 -70Q118 -80 128 -18Q156 0 140 30Q130 44 100 40Z" fill="var(--m-bg)" stroke="var(--m-line)" stroke-width="14" stroke-linejoin="round"/>${LN('M0 16V-46M-24 -22L0 -46L24 -22', 13)}</g>`,
    plug: () => `<g transform="translate(320 150) rotate(-30)"><rect x="-40" y="-36" width="80" height="72" rx="16" fill="var(--m-bg)" stroke="var(--m-line)" stroke-width="13"/>${LN('M-16 -36V-70M16 -36V-70', 12)}${LN('M0 36Q0 90-60 120', 13)}</g><g transform="translate(206 230)">${LN('M-14 -14L14 14M14 -14L-14 14', 9, T.electric)}</g>`,
    shield: () => `<g transform="translate(0 342)"><path d="M0 -104L92 -72V-6Q92 64 0 104Q-92 64-92 -6V-72Z" fill="var(--m-bg)" stroke="var(--m-gold)" stroke-width="16" stroke-linejoin="round"/><path d="M0 -56C24 -30 40 -12 40 12C40 36 22 52 0 52C-22 52-40 36-40 12C-40 -8-24 -22-10 -34C-8 -16 2 -8 12 -6C10 -28 4 -42 0 -56Z" fill="var(--m-gold)"/></g>`,
    flame: () => `<g transform="translate(0 344)"><path d="M0 -110C40 -64 74 -30 74 22C74 70 40 100 0 100C-40 100-74 70-74 22C-74 -18-46 -46-18 -74C-14 -36 4 -18 26 -14C20 -54 8 -82 0 -110Z" fill="var(--m-gold)" stroke="${goldInk}" stroke-width="10" stroke-linejoin="round"/><path d="M0 -14C16 6 26 22 26 40C26 58 14 70 0 70C-14 70-26 58-26 40C-26 26-16 10 0 -14Z" fill="var(--m-glint)" fill-opacity=".75"/></g>`,
    badge: () => `<g transform="translate(316 -36) rotate(14)"><path d="M0 -70L20 -24L70 -20L32 12L44 62L0 36L-44 62L-32 12L-70 -20L-20 -24Z" fill="var(--m-gold)" stroke="${goldInk}" stroke-width="9" stroke-linejoin="round"/><circle r="16" fill="var(--m-glint)" fill-opacity=".7"/></g>`,
    gift: () => `<g transform="translate(0 352)"><rect x="-104" y="-56" width="208" height="128" rx="12" fill="var(--m-bg)" stroke="var(--m-line)" stroke-width="14"/><rect x="-120" y="-92" width="240" height="44" rx="10" fill="var(--m-line)"/><path d="M-14 -92H14V72H-14Z" fill="var(--m-live)"/><path d="M0 -92C-30 -150-90 -120-44 -92M0 -92C30 -150 90 -120 44 -92" fill="none" stroke="var(--m-live)" stroke-width="13" stroke-linecap="round"/></g>`,
    clock: (p) => `<g transform="translate(0 350)"><circle r="82" fill="var(--m-bg)" stroke="var(--m-line)" stroke-width="14"/><rect x="-16" y="-110" width="32" height="24" rx="6" fill="var(--m-line)"/>${LN(`M0 0L${f(46 * Math.sin(rad(p.propA || 40)))} ${f(-46 * Math.cos(rad(p.propA || 40)))}`, 12)}${LN('M0 0L-26 -26', 12)}<circle r="9" fill="var(--m-line)"/></g>`,
    puzzle: () => `<g transform="translate(0 348) rotate(-8)"><path d="M-80 -80H-18Q-30 -116 0 -116Q30 -116 18 -80H80V-18Q116 -30 116 0Q116 30 80 18V80H-80Z" fill="var(--m-line)" stroke="var(--m-line)" stroke-width="10" stroke-linejoin="round"/><circle cx="-26" cy="-10" r="12" fill="var(--m-glint)" opacity=".9"/></g>`,
    scroll: () => `<g transform="translate(0 350)"><rect x="-130" y="-66" width="260" height="140" fill="var(--m-bg)" stroke="var(--m-line)" stroke-width="12"/><rect x="-152" y="-82" width="30" height="172" rx="15" fill="var(--m-line)"/><rect x="122" y="-82" width="30" height="172" rx="15" fill="var(--m-line)"/><path d="M-90 -30H90M-90 2H90M-90 34H40" stroke="var(--m-line)" stroke-width="9" stroke-linecap="round" opacity=".7"/></g>`,
    // Shadow Ball: concentric glow instead of a gradient, so no <defs> are needed
    orb: (p) => {
        const s = p.propS ?? 1, g = 0.55 + 0.45 * (p.propG ?? 0.5);
        // at rest (the battle loader) the glow breathes and the swirl turns: a ball still charging
        return `<g transform="translate(${f(p.propX || 0)} ${f(330 + (p.propY || 0))}) scale(${f3(s)})">${atRest(p, 'orb-glow', `<circle r="128" fill="var(--m-line)" opacity="${f3(0.12 * g)}"/><circle r="100" fill="var(--m-line)" opacity="${f3(0.2 * g)}"/>`)}<circle r="70" fill="var(--m-orb)" stroke="var(--m-line)" stroke-width="8"/>${atRest(p, 'orb-swirl', '<path d="M-30 -14Q-10 -40 22 -26M-22 22Q8 36 30 10" stroke="var(--m-line)" stroke-width="8" fill="none" stroke-linecap="round"/>')}<circle cx="-18" cy="-20" r="9" fill="var(--m-glint)" opacity=".55"/></g>`;
    },
    pumpkin: () => `<g transform="translate(0 352)"><path d="M0 -72C-40 -92-130 -78-130 0C-130 70-60 92 0 82C60 92 130 70 130 0C130 -78 40 -92 0 -72Z" fill="${T.fire}" stroke="${shadeMix(T.fire)}" stroke-width="10"/><path d="M0 -72C-26 -40-26 50 0 82M0 -72C26 -40 26 50 0 82" fill="none" stroke="${shadeMix(T.fire)}" stroke-width="8" opacity=".55"/><path d="M-8 -74Q-4 -104 18 -112" stroke="${T.grass}" stroke-width="14" stroke-linecap="round" fill="none"/><path d="M-70 -12L-40 -40L-14 -12ZM70 -12L40 -40L14 -12Z" fill="var(--m-shade)"/><path d="M-74 20Q0 64 74 20Q40 48 18 40L0 56L-18 40Q-40 48-74 20Z" fill="var(--m-shade)"/></g>`,
    cape: () => '<path d="M-200 -40Q-330 160-300 420Q-150 380 0 420Q150 380 300 420Q330 160 200 -40Q100 40 0 40Q-100 40-200 -40Z" fill="var(--m-cape)" stroke="var(--m-line)" stroke-width="12" stroke-linejoin="round"/>',
    pillow: () => '<path d="M-360 300Q-370 196-210 210Q0 192 210 210Q370 196 360 300Q370 392 210 376Q0 396-210 376Q-370 392-360 300Z" fill="var(--m-hat)" stroke="var(--m-line)" stroke-width="10" stroke-opacity=".6"/><path d="M-250 300Q0 330 250 300" stroke="var(--m-line)" stroke-width="8" fill="none" opacity=".3"/>',
    // a card edge the mascot peeks over; stays put while the body moves
    ledge: (p) => `<rect transform="translate(0 ${f(-(p.y || 0))})" x="-460" y="400" width="920" height="200" rx="22" fill="var(--m-ledge)" stroke="var(--m-line)" stroke-opacity=".7" stroke-width="8"/>`,
};
const HELD = new Set(['pokeball', 'clipboard', 'laptop', 'trophy', 'sign', 'book', 'controller', 'envelope', 'gift', 'clock', 'puzzle', 'scroll', 'pumpkin', 'shield', 'flame']);

export const HATS = {
    none: () => '',
    crown: () => `<g transform="translate(10 -300) rotate(4)"><path d="M-110 40L-122 -60L-56 -10L0 -86L56 -10L122 -60L110 40Z" fill="var(--m-gold)" stroke="${goldInk}" stroke-width="10" stroke-linejoin="round"/><circle cx="0" cy="6" r="14" fill="${T.psychic}"/><circle cx="-62" cy="16" r="9" fill="var(--m-glint)" opacity=".8"/><circle cx="62" cy="16" r="9" fill="var(--m-glint)" opacity=".8"/></g>`,
    mortarboard: () => `<g transform="translate(0 -300)"><path d="M-150 -10L0 -70L150 -10L0 50Z" fill="var(--m-hat)" stroke="var(--m-line)" stroke-width="10" stroke-linejoin="round"/><path d="M-80 18V64Q0 100 80 64V18" fill="var(--m-hat)" stroke="var(--m-line)" stroke-width="10"/>${LN('M0 -10L130 30V100', 7, T.electric)}<circle cx="130" cy="108" r="12" fill="${T.electric}"/></g>`,
    cap: () => `<g transform="translate(0 -250) rotate(-8)"><path d="M-176 40Q-176 -104 0 -108Q176 -104 176 40Z" fill="var(--m-hat)" stroke="var(--m-line)" stroke-width="12"/><path d="M-150 34Q-300 26-330 70Q-180 92-40 56Z" fill="var(--m-line)"/><path d="M-170 40Q0 18 170 40" stroke="var(--m-bg)" stroke-width="8" fill="none" opacity=".6"/>${pokeball(0, -36, 34)}</g>`,
    detective: () => '<g transform="translate(0 -270)"><path d="M-160 50Q-160 -90 0 -96Q160 -90 160 50Z" fill="var(--m-hat)" stroke="var(--m-line)" stroke-width="10"/><path d="M-200 50Q0 100 200 50Q0 24-200 50Z" fill="var(--m-hat)" stroke="var(--m-line)" stroke-width="10"/><path d="M-150 10Q0 -12 150 10" stroke="var(--m-line)" stroke-width="18" fill="none"/></g>',
    explorer: () => `<g transform="translate(0 -272) rotate(-4)"><path d="M-140 40Q-140 -90 0 -94Q140 -90 140 40Z" fill="${T.ground}" stroke="${shadeMix(T.ground)}" stroke-width="10"/><path d="M-240 50Q0 104 240 50Q0 10-240 50Z" fill="${T.ground}" stroke="${shadeMix(T.ground)}" stroke-width="10"/><path d="M-138 16Q0 -6 138 16" stroke="${shadeMix(T.ground)}" stroke-width="20" fill="none"/></g>`,
    party: () => `<g transform="translate(-40 -300) rotate(-14)"><path d="M-70 40L0 -170L70 40Z" fill="${T.psychic}" stroke="var(--m-line)" stroke-width="10" stroke-linejoin="round"/><path d="M-46 -30L44 -10M-60 10L58 30" stroke="${T.electric}" stroke-width="12"/><circle cy="-172" r="24" fill="${T.electric}"/></g>`,
    santa: () => `<g transform="translate(-10 -296) rotate(-10)"><path d="M-150 40Q-110 -150 70 -140Q170 -120 210 -30" fill="${T.fighting}"/><circle cx="214" cy="-24" r="30" fill="var(--m-glint)"/><rect x="-170" y="10" width="330" height="56" rx="28" fill="var(--m-glint)"/></g>`,
    straw: () => `<g transform="translate(0 -270) rotate(-5)"><path d="M-150 40Q-150 -86 0 -90Q150 -86 150 40Z" fill="${T.ground}" stroke="${shadeMix(T.ground)}" stroke-width="9"/><path d="M-250 50Q0 96 250 50Q0 18-250 50Z" fill="${T.ground}" stroke="${shadeMix(T.ground)}" stroke-width="9"/><path d="M-148 14Q0 -8 148 14" stroke="${T.fighting}" stroke-width="16" fill="none"/><path d="M-100 -40L-60 -70M-20 -60L20 -84M50 -50L90 -72" stroke="${shadeMix(T.ground)}" stroke-width="6" opacity=".6"/></g>`,
    witch: () => `<g transform="translate(-6 -292) rotate(-10)"><path d="M-210 54Q0 110 210 54Q0 22-210 54Z" fill="var(--m-hat)" stroke="var(--m-line)" stroke-width="10" stroke-linejoin="round"/><path d="M-110 50L-30 -150Q0 -210 70 -200Q20 -170 30 -120L110 50Z" fill="var(--m-hat)" stroke="var(--m-line)" stroke-width="10" stroke-linejoin="round"/><path d="M-100 30Q0 52 100 30L94 6Q0 26-94 6Z" fill="${T.fire}"/></g>`,
    headphones: () => `<g>${LN('M-250 -40Q-250 -330 0 -330Q250 -330 250 -40', 22)}<rect x="-300" y="-80" width="70" height="120" rx="30" fill="var(--m-line)"/><rect x="230" y="-80" width="70" height="120" rx="30" fill="var(--m-line)"/></g>`,
    glasses: () => '<g fill="var(--m-eye)" fill-opacity=".12" stroke="var(--m-line)" stroke-width="13"><circle cx="-115" cy="30" r="62"/><circle cx="115" cy="30" r="62"/><path d="M-53 26Q0 4 53 26" fill="none"/></g>',
    sunglasses: () => '<g><path d="M-196 0H-36Q-36 76-110 76Q-190 76-196 0ZM36 0H196Q190 76 110 76Q36 76 36 0Z" fill="var(--m-shade)" stroke="var(--m-line)" stroke-width="10" stroke-linejoin="round"/><path d="M-36 6Q0 -8 36 6" stroke="var(--m-line)" stroke-width="10" fill="none"/><path d="M-166 16L-140 16M66 16L92 16" stroke="var(--m-glint)" stroke-width="8" stroke-linecap="round" opacity=".7"/></g>',
    bowtie: () => `<g transform="translate(0 300)"><path d="M0 0L-70 -40Q-84 0-70 40ZM0 0L70 -40Q84 0 70 40Z" fill="${T.psychic}" stroke="var(--m-line)" stroke-width="8" stroke-linejoin="round"/><circle r="18" fill="${T.psychic}" stroke="var(--m-line)" stroke-width="8"/></g>`,
    mask: () => `<g><path d="M-220 0Q-200 -40-115 -30Q-40 -24 0 6Q40 -24 115 -30Q200 -40 220 0Q210 80 115 76Q40 74 0 50Q-40 74-115 76Q-210 80-220 0Z" fill="${T.psychic}" stroke="${T.electric}" stroke-width="9"/><ellipse cx="-110" cy="24" rx="44" ry="26" fill="var(--m-bg)"/><ellipse cx="110" cy="24" rx="44" ry="26" fill="var(--m-bg)"/><path d="M200 -10Q260 -120 230 -190" stroke="${T.electric}" stroke-width="14" fill="none" stroke-linecap="round"/></g>`,
};

/* ---------- effects ---------- */
// t == null → drawn at rest with m-loop classes (mascot.css animates them)
const loopAttr = (name, i) => ` class="m-loop m-${name}" style="--i:${i}"`;
export const FX = {
    sweat: (t, o = 1) => `<path d="M300 -60C300 -60 270 -14 270 6C270 26 284 38 300 38C316 38 330 26 330 6C330 -14 300 -60 300 -60Z" fill="var(--m-tear)" stroke="var(--m-eye)" stroke-width="5" opacity="${f3(o)}"/>`,
    tear: () => '<path d="M-104 64C-104 64-118 90-118 102C-118 112-112 118-104 118C-96 118-90 112-90 102C-90 90-104 64-104 64Z" fill="var(--m-tear)"/>',
    tears: () => '<g fill="var(--m-tear)" opacity=".9"><path d="M-150 56Q-170 120-156 210Q-136 214-130 206Q-140 120-118 58Z"/><path d="M150 56Q170 120 156 210Q136 214 130 206Q140 120 118 58Z"/></g>',
    anger: () => '<g transform="translate(196 -126)" stroke="var(--m-anger)" stroke-width="13" stroke-linecap="round" fill="none"><path d="M-30 -10Q-10 -10-10 -30M10 -30Q10 -10 30 -10M30 10Q10 10 10 30M-10 30Q-10 10-30 10"/></g>',
    question: () => '<g transform="translate(-150 -330) scale(.9) rotate(-8)"><path d="M-40 -40Q-40 -92 4 -92Q48 -92 48 -50Q48 -22 16 -6Q4 2 4 26" fill="none" stroke="var(--m-line)" stroke-width="26" stroke-linecap="round"/><circle cx="4" cy="66" r="17" fill="var(--m-line)"/></g>',
    exclaim: () => '<g transform="translate(-150 -350) scale(.9) rotate(-8)"><path d="M0 -90V10" stroke="var(--m-line)" stroke-width="30" stroke-linecap="round"/><circle cy="62" r="18" fill="var(--m-line)"/></g>',
    zzz: (t) => {
        let s = '';
        for (let i = 0; i < 3; i += 1) {
            const font = 'font-family="Unbounded, system-ui, sans-serif" font-weight="700" fill="var(--m-line)"';
            if (t == null) { s += `<text x="${250 + i * 34}" y="${-230 - i * 62}" font-size="${44 + i * 12}" ${font}${loopAttr('z', i)}>Z</text>`; continue; }
            const p = (t / 2600 + i / 3) % 1;
            s += `<text x="${f(250 + p * 90 + i * 6)}" y="${f(-230 - p * 190)}" font-size="${f(40 + p * 40)}" ${font} opacity="${f3(Math.sin(p * Math.PI))}">Z</text>`;
        }
        return s;
    },
    hearts: (t) => {
        let s = '';
        for (let i = 0; i < 3; i += 1) {
            const x = (i % 2 ? 1 : -1) * (150 + i * 40);
            if (t == null) { s += `<path d="${HEART}" fill="var(--m-heart)" transform="translate(${x} -300)"${loopAttr('heart', i)}/>`; continue; }
            const p = (t / 1800 + i / 3) % 1;
            s += `<path d="${HEART}" fill="var(--m-heart)" transform="translate(${f(x + Math.sin(p * 6 + i) * 20)} ${f(-250 - p * 190)}) scale(${f3(0.7 + p * 0.45)})" opacity="${f3(Math.sin(p * Math.PI))}"/>`;
        }
        return s;
    },
    sparkles: (t, gold = false) => {
        const pts = [[-300, -210, 1], [300, -330, 0.8], [-200, -380, 0.6], [330, 140, 0.7], [-340, 120, 0.55]];
        const fill = gold ? 'var(--m-gold)' : 'var(--m-glint)';
        return pts.map(([x, y, sc], i) => {
            if (t == null) return `<g transform="translate(${x} ${y}) scale(${sc})"><path d="${STAR}" fill="${fill}"${loopAttr('spark', i)}/></g>`;
            const p = (t / 1400 + i / pts.length) % 1, k = Math.sin(p * Math.PI);
            return `<path d="${STAR}" fill="${fill}" transform="translate(${x} ${y}) scale(${f3(sc * (0.4 + k * 0.6))}) rotate(${f(p * 90)})" opacity="${f3(k)}"/>`;
        }).join('');
    },
    dizzy: (t = 400) => {
        let s = '';
        for (let i = 0; i < 3; i += 1) {
            const a = (t / 1600) * Math.PI * 2 + (i * Math.PI * 2) / 3;
            s += `<path d="${STAR}" fill="${T.electric}" transform="translate(${f(Math.cos(a) * 230)} ${f(-320 + Math.sin(a) * 40)}) scale(.55)" opacity="${f3(0.55 + 0.45 * Math.sin(a))}"/>`;
        }
        return s;
    },
    smoke: (t = 400) => {
        let s = '';
        for (let i = 0; i < 3; i += 1) {
            const p = (t / 1500 + i / 3) % 1;
            s += `<circle cx="${f(-260 + i * 40 - p * 40)}" cy="${f(-260 - p * 160)}" r="${f(18 + p * 30)}" fill="var(--m-smoke)" opacity="${f3(0.7 * (1 - p))}"/>`;
        }
        return s;
    },
    steam: (t = 300) => {
        let s = '';
        for (const side of [-1, 1]) {
            for (let i = 0; i < 2; i += 1) {
                const p = (t / 900 + i / 2) % 1;
                s += `<circle cx="${f(side * (300 + p * 50))}" cy="${f(-200 - p * 80)}" r="${f(14 + p * 22)}" fill="var(--m-smoke)" opacity="${f3(0.8 * (1 - p))}"/>`;
            }
        }
        return s;
    },
    dots: (t) => {
        let s = '<g transform="translate(300 -330)"><path d="M-80 -60Q-80 -110 0 -110Q80 -110 80 -60Q80 -10 0 -10Q-20 -10-34 -16L-70 6L-58 -30Q-80 -42-80 -60Z" fill="var(--m-bg)" stroke="var(--m-line)" stroke-width="10"/>';
        const n = t == null ? 3 : Math.floor((t / 400) % 4);
        for (let i = 0; i < 3; i += 1) {
            s += t == null
                ? `<circle cx="${-36 + i * 36}" cy="-60" r="11" fill="var(--m-line)"${loopAttr('dot', i)}/>`
                : `<circle cx="${-36 + i * 36}" cy="-60" r="11" fill="var(--m-line)" opacity="${i < n ? 1 : 0.25}"/>`;
        }
        return `${s}</g>`;
    },
    confetti: (t) => {
        if (t == null) return ''; // a celebration is a moment, never a loop
        const cols = [T.fire, T.water, T.grass, T.electric, T.psychic, T.flying, T.ice, T.fairy];
        let s = '';
        for (let i = 0; i < 16; i += 1) {
            const seed = Math.sin(i * 91.7) * 1000, r = seed - Math.floor(seed);
            const p = (t / 2200 + r) % 1, x = -380 + (i / 16) * 760 + Math.sin(p * 8 + i) * 24, y = -460 + p * 820;
            s += `<rect x="${f(x)}" y="${f(y)}" width="20" height="11" rx="3" fill="${cols[i % cols.length]}" transform="rotate(${f(p * 540 + i * 30)} ${f(x + 10)} ${f(y + 5)})" opacity="${f3(Math.min(1, (1 - p) * 3))}"/>`;
        }
        return s;
    },
    motion: () => '<g stroke="var(--m-line)" stroke-width="10" stroke-linecap="round" opacity=".6"><path d="M-220 330H-120M-60 360H60M120 330H220"/></g>',
    shine: (t = 0) => {
        let s = '';
        for (let i = 0; i < 8; i += 1) {
            const a = (i / 8) * Math.PI * 2 + t / 3000;
            s += `<path d="M${f(Math.cos(a) * 380)} ${f(Math.sin(a) * 380 + 20)}L${f(Math.cos(a) * 440)} ${f(Math.sin(a) * 440 + 20)}" stroke="var(--m-gold)" stroke-width="12" stroke-linecap="round" opacity=".8"/>`;
        }
        return s;
    },
    heartPop: () => `<path d="${HEART}" fill="var(--m-heart)" transform="translate(-330 -250) scale(1.25)"/>`,
    freckles: () => `<g fill="var(--m-gold-ink)" opacity=".8">${[-196, -176, -156, 156, 176, 196].map((x, i) => `<circle cx="${x}" cy="${118 + (i % 2) * 10}" r="6"/>`).join('')}</g>`,
};

/* ---------- tone ---------- */
export const TONES = Object.keys(T);
export const SHINY_LINE = 'var(--mascot-shiny, #5CC8FF)';
/** A type colour as the mascot's line, mixed toward the theme's text so it reads on any surface. */
export function toneColor(tone) {
    if (tone === 'shiny') return SHINY_LINE;
    if (T[tone]) return mix(T[tone], 'var(--m-tone-mix)', 78);
    return null;
}

/* ---------- the drawing ---------- */
export const DEFAULT_POSE = Object.freeze({
    x: 0, y: 0, rot: 0, scale: 1, sx: 1, sy: 1, tilt: 8, faceX: 0, faceY: 0, eyes: 'happy', eyeSY: 1, mouth: 'grin', fangs: true,
    blush: 'normal', blushO: 1, earL: 0, earR: 0, earS: 1, crest: 0, sparks: 'default', sparkS: 1, sparkO: 1, paws: 'none', pawA: 0,
    pawX: 0, pawY: 0, pawO: 1, prop: 'none', propA: 0, propS: 1, propG: 0.5, propX: 0, propY: 0, hat: 'none', behind: 'none',
    fx: [], fxHead: [], t: undefined, opacity: 1, silhouette: 0, shadow: false, strokeK: 1, signText: '?', signSize: 62, gaze: 'none',
});
const NUM_KEYS = Object.keys(DEFAULT_POSE).filter((k) => typeof DEFAULT_POSE[k] === 'number');

/** Every number finite (else its default), every enum a known one — never NaN in the markup. */
export function sanitizePose(pose) {
    const p = { ...DEFAULT_POSE, ...(pose || {}) };
    for (const k of NUM_KEYS) { const v = Number(p[k]); p[k] = Number.isFinite(v) ? v : DEFAULT_POSE[k]; }
    if (p.t != null && !Number.isFinite(Number(p.t))) p.t = undefined;
    const pick = (v, dict, dflt) => (typeof v === 'string' && Object.prototype.hasOwnProperty.call(dict, v) ? v : dflt);
    p.mouth = pick(p.mouth, MOUTHS, 'grin');
    p.paws = pick(p.paws, PAWS, 'none');
    p.prop = pick(p.prop, PROPS, 'none');
    p.behind = pick(p.behind, PROPS, 'none');
    p.hat = pick(p.hat, HATS, 'none');
    p.sparks = pick(p.sparks, SPARKS, 'default');
    p.gaze = pick(p.gaze, GAZES, 'none');
    if (typeof p.eyes === 'string') p.eyes = pick(p.eyes, EYES, 'happy');
    else if (p.eyes && typeof p.eyes === 'object') p.eyes = { l: pick(p.eyes.l, EYES, 'happy'), r: pick(p.eyes.r, EYES, pick(p.eyes.l, EYES, 'happy')) };
    else p.eyes = 'happy';
    p.fx = Array.isArray(p.fx) ? p.fx : [];
    p.fxHead = Array.isArray(p.fxHead) ? p.fxHead : [];
    p.tone = toneColor(p.tone) ? p.tone : undefined;
    p.scale = clamp(p.scale, 0, 4);
    p.strokeK = clamp(p.strokeK, 0.5, 4);
    return p;
}

function fxList(list, t) {
    return list.map((k) => {
        if (typeof k === 'function') return k(t);
        const [name, ...args] = Array.isArray(k) ? k : [k];
        return Object.prototype.hasOwnProperty.call(FX, name) ? FX[name](t, ...args) : '';
    }).join('');
}
const scaleStroke = (html, K) => (K === 1 ? html : html.replace(/stroke-width="([\d.]+)"/g, (m, v) => `stroke-width="${f(v * K)}"`));

/** The rig's markup (no <svg> wrapper), for a pose. */
export function mascotInner(pose) {
    const p = sanitizePose(pose);
    const K = p.strokeK;
    const head = headPath(p);
    const bodyT = `translate(0 ${FOOT}) scale(${f3(p.sx)} ${f3(p.sy)}) translate(0 ${-FOOT})`;
    const eyesT = `translate(0 ${EYE_C[1]}) scale(1 ${f3(p.eyeSY)}) translate(0 ${-EYE_C[1]})`;
    const held = HELD.has(p.prop) ? ' transform="translate(0 350) scale(1.22) translate(0 -350)"' : '';
    // a tone recolours the line, the mouth and the blush from inside the drawing,
    // so a pose can change it mid-sequence (the shiny easter egg)
    const tone = toneColor(p.tone);
    const toneAttr = tone ? ` style="--m-line:${tone};--m-mouth:${tone};--m-blush:${tone}"` : '';
    const sil = p.silhouette > 0
        ? `<g opacity="${f3(p.silhouette)}"><path d="${head}" fill="var(--m-sil)" stroke="var(--m-sil)" stroke-width="${f(STROKE * K + 6)}" stroke-linejoin="miter" stroke-miterlimit="10"/><path d="${BARBS}" fill="var(--m-sil)"/></g>`
        : '';
    return (p.shadow ? `<ellipse cx="${f(p.x)}" cy="${FOOT + 70}" rx="${f(210 * p.scale * clamp(1 + p.y / 600, 0.45, 1.1))}" ry="${f(26 * p.scale)}" fill="var(--m-shadow)" opacity="${f3(p.opacity)}"/>` : '')
        + `<g class="m-root" transform="translate(${f(p.x)} ${f(p.y)}) rotate(${f(p.rot)}) scale(${f3(p.scale)})" opacity="${f3(p.opacity)}"${toneAttr}>`
        + `<g transform="${bodyT}">`
        + `<g>${PROPS[p.behind](p)}</g>`
        + `<g transform="rotate(${f(p.tilt)} ${HEAD_PIVOT[0]} ${HEAD_PIVOT[1]})">`
        + `<path d="${head}" fill="var(--m-fill)"/>`
        + `<path d="${head}" fill="none" stroke="var(--m-line)" stroke-width="${f(STROKE * K)}" stroke-linejoin="miter" stroke-miterlimit="10"/>`
        + `<path d="${BARBS}" fill="var(--m-line)"/>`
        + `<g transform="translate(${f(p.faceX)} ${f(p.faceY)})">`
        + `<g opacity="${f3(p.blushO)}">${blushSVG(p.blush)}</g>`
        + `<g transform="${eyesT}" class="m-eyes">${p.gaze === 'none' ? scaleStroke(eyesSVG(p.eyes), K) : atRest(p, `gaze-${p.gaze}`, scaleStroke(eyesSVG(p.eyes), K))}</g>`
        + `<g>${scaleStroke(mouthSVG(p.mouth, p.fangs), K)}</g>`
        + '</g>'
        + `<g opacity="${f3(p.sparkO)}" class="m-sparks">${SPARKS[p.sparks](p.sparkS)}</g>`
        + `<g>${HATS[p.hat](p)}</g>`
        + `<g>${fxList(p.fxHead, p.t)}</g>`
        + sil
        + '</g>'
        + `<g transform="translate(${f(p.pawX)} ${f(p.pawY)})" opacity="${f3(p.pawO)}">${PAWS[p.paws](p)}</g>`
        + `<g${held}>${PROPS[p.prop](p)}</g>`
        + '</g>'
        + `<g>${fxList(p.fx, p.t)}</g>`
        + '</g>';
}

/** A complete standalone <svg> (the export script, OG images, tests). */
export function mascotSvg(pose, { view = VIEWS.body, width, height, title } = {}) {
    const p = sanitizePose(pose);
    const size = `${width ? ` width="${width}"` : ''}${height ? ` height="${height}"` : ''}`;
    const label = title ? ` role="img" aria-label="${esc(title)}"` : ' aria-hidden="true"';
    return `<svg xmlns="http://www.w3.org/2000/svg" class="mascot-svg" viewBox="${view}"${size}${label}>${mascotInner(p)}</svg>`;
}
