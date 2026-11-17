// Every link-preview picture the site draws (api/og.js) — one frame, many
// scenes (the OG pass, 2026-11-16). Built as satori element trees (plain
// objects, no JSX in api/) so this file stays pure and testable; api/og.js
// does the fetching and the rendering.
//
// The frame is the brand's night, not a theme's: the image lives in Google,
// WhatsApp and Discord, where none of the site's themes apply. The design
// follows docs/modules/creative_direction.md: official artwork is the
// protagonist, standing on a platform; a type colour is a lamp behind it; a
// silhouette is "not known yet"; gold is only for something earned. The
// wordmark (public/logo-wordmark.svg) heads every card, so a preview reads as
// PokemonBuilder before a word of it is read.
//
// `assets` ({ wordmark, mascot, typeIcons }) are data URIs api/og.js reads
// from disk; every tree draws without them (a test renders with none).

import { translate } from '../../src/utils/translateCore.js';
import { formatSlug, resultShareMeta } from '../../src/utils/seoPages.js';
import { decodeChallengeResult, decodePuzzleResult } from '../../src/utils/resultShareCode.js';
import { TIER_BALLS, TIER_KEYS, decodeTierList, keepFittingCells } from '../../src/utils/tierList.js';

// api/og.js may import only node: builtins and _lib/ statically (og.test.js).
import { guideMeta } from '../../src/content/guideIndex.js';
export { decodeTierList, keepFittingCells, guideMeta };
import { typeColors } from '../../src/constants/typeChart.js';
import { immunitiesOf, resistancesOf, strongAgainst, weaknessesOf } from '../../src/utils/typeMatchups.js';

export const OG_SIZE = { width: 1200, height: 630 };
/** The home card's square cut, for search results that crop to a square. */
export const OG_SQUARE = { width: 1200, height: 1200 };

const BRAND = {
    ink: '#f6f4fb',
    muted: '#aaa3bf',
    faint: 'rgba(246, 244, 251, 0.5)',
    violet: '#9b7bff',
    button: '#7c5cf5',
    gold: '#f2c230',
    win: '#3fb950',
    night: '#0d0a17',
    ground: 'linear-gradient(140deg, #1d1533 0%, #110d1e 46%, #0b0913 100%)',
    platform: 'rgba(255, 255, 255, 0.08)',
};

const h = (type, style, children) => ({ type, props: { style, children } });
const img = (src, width, height, style = {}) => ({ type: 'img', props: { src, width, height, style } });

/** `#rrggbb` + alpha → `rgba()`, which every renderer reads. */
const rgba = (hex, alpha) => {
    const n = Number.parseInt(String(hex || '#9b7bff').slice(1), 16);
    return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
};

/** Light chips (Electric, Ice, Ground…) take dark ink; the rest white. */
const inkOn = (hex) => {
    const n = Number.parseInt(String(hex).slice(1), 16);
    const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255];
    return (0.299 * r + 0.587 * g + 0.114 * b) > 160 ? '#15131f' : '#ffffff';
};

const toneOf = (tone) => typeColors[tone] || (tone === 'gold' ? BRAND.gold : tone === 'win' ? BRAND.win : BRAND.violet);

// ── The frame's pieces ──────────────────────────────────────────────────────

const wordmark = (assets, height = 46) => (assets?.wordmark
    ? img(assets.wordmark, Math.round(height * (2022 / 483)), height)
    : h('div', { display: 'flex', fontSize: Math.round(height * 0.62), fontWeight: 700, color: BRAND.ink }, 'PokemonBuilder'));

const domain = (size = 24) => h('div', { display: 'flex', fontSize: size, fontWeight: 500, color: BRAND.muted }, 'pokemonbuilder.app');

const ctaPill = (text, tone = BRAND.button) => h('div', {
    display: 'flex',
    alignSelf: 'flex-start',
    padding: '12px 28px',
    borderRadius: 999,
    background: tone,
    color: inkOn(tone),
    fontSize: 26,
    fontWeight: 700,
}, text);

const kickerChip = (text, tone) => h('div', {
    display: 'flex',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 10,
    padding: '6px 16px 6px 12px',
    borderRadius: 999,
    background: rgba(tone, 0.16),
    color: tone,
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: 1,
}, [
    h('div', { display: 'flex', width: 12, height: 12, borderRadius: 999, background: tone }, []),
    text,
]);

/** A type as a chip in its own colour, with its icon when the asset loaded. */
const typeChip = (type, language, assets, { size = 'md', suffix = '' } = {}) => {
    const scale = { sm: [22, 6, 16, 26], md: [26, 8, 20, 32], lg: [32, 10, 26, 40], xl: [54, 12, 34, 64] }[size];
    const [font, padY, padX, icon] = scale;
    const tone = typeColors[type] || '#555555';
    const glyph = assets?.typeIcons?.[type];
    return h('div', {
        display: 'flex',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: Math.round(icon / 4),
        padding: `${padY}px ${padX}px ${padY}px ${glyph ? Math.round(padY * 0.9) : padX}px`,
        borderRadius: 999,
        background: tone,
        color: inkOn(tone),
        fontSize: font,
        fontWeight: 700,
    }, [
        ...(glyph ? [img(glyph, icon, icon)] : []),
        `${translate(language, `types.${type}`)}${suffix}`,
    ]);
};

const chipRow = (label, chips) => h('div', { display: 'flex', flexDirection: 'column', gap: 10 }, [
    h('div', { display: 'flex', fontSize: 22, color: BRAND.muted }, label),
    h('div', { display: 'flex', flexWrap: 'wrap', gap: 10 }, chips),
]);

/** A bold figure over a muted word — the trainer card's stat device. */
const figure = (value, label, tone = BRAND.ink) => h('div', { display: 'flex', flexDirection: 'column' }, [
    h('div', { display: 'flex', fontSize: 52, fontWeight: 700, lineHeight: 1, color: tone }, String(value)),
    h('div', { display: 'flex', marginTop: 6, fontSize: 22, color: BRAND.muted }, label),
]);

// ── Scenes: absolute layers behind the copy ────────────────────────────────
// A scene is a list of pieces in card coordinates: a lamp (a type colour as
// light), a platform (the battle pad under a Pokémon), an artwork, a ball,
// a mark. `on()` stands a Pokémon on its pad.

const layer = (style, children = []) => h('div', { display: 'flex', position: 'absolute', ...style }, children);

const lamp = (tone, x, y, r, alpha = 0.55) => layer({
    left: x - r, top: y - r, width: r * 2, height: r * 2,
    backgroundImage: `radial-gradient(circle at 50% 50%, ${rgba(toneOf(tone), alpha)} 0%, ${rgba(toneOf(tone), alpha * 0.35)} 38%, ${rgba(toneOf(tone), 0)} 70%)`,
});

const platform = (cx, y, w, tone) => layer({
    left: cx - w / 2, top: y - w * 0.09, width: w, height: w * 0.18, borderRadius: '50%',
    backgroundImage: tone
        ? `radial-gradient(ellipse at 50% 50%, ${rgba(toneOf(tone), 0.45)} 0%, ${rgba(toneOf(tone), 0.12)} 60%, rgba(255,255,255,0.05) 100%)`
        : 'radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.05) 100%)',
});

/** An artwork (or its silhouette) whose feet rest at (cx, baseY). */
const art = (src, cx, baseY, size, { flip = false, silhouette = false, opacity = 1 } = {}) => (src
    ? layer({ left: cx - size / 2, top: baseY - size * 0.94, width: size, height: size, opacity }, [
        img(src, size, size, {
            ...(flip ? { transform: 'scaleX(-1)' } : {}),
            ...(silhouette ? { filter: 'brightness(0) invert(1)', opacity: 0.16 } : {}),
        }),
    ])
    : silhouette
        ? layer({ left: cx - size / 2, top: baseY - size * 0.94, width: size, height: size, alignItems: 'center', justifyContent: 'center', fontSize: size * 0.6, fontWeight: 700, color: 'rgba(255,255,255,0.14)' }, '?')
        : null);

/** A Pokémon on its pad: the platform, then the artwork over it. */
const on = (src, cx, baseY, size, opts = {}) => [platform(cx, baseY, size * 0.78, opts.tone), art(src, cx, baseY, size, opts)];

/** A Poké Ball drawn in CSS: top, seam, bottom, button. */
const ball = (cx, cy, d, { top = '#e8443a', bottom = '#f4f1fa', dim = false } = {}) => layer({
    left: cx - d / 2, top: cy - d / 2, width: d, height: d, borderRadius: 999,
    alignItems: 'center', justifyContent: 'center', opacity: dim ? 0.32 : 1,
    backgroundImage: `linear-gradient(180deg, ${top} 0%, ${top} 45%, #1b1426 45%, #1b1426 55%, ${bottom} 55%, ${bottom} 100%)`,
}, [h('div', { display: 'flex', width: d * 0.34, height: d * 0.34, borderRadius: 999, background: '#f4f1fa', border: `${Math.max(3, Math.round(d * 0.07))}px solid #1b1426` }, [])]);

/** A big "?" over a silhouette — "Quem é esse Pokémon?". */
const mark = (text, x, y, size, color) => layer({ left: x, top: y, fontSize: size, fontWeight: 700, color, lineHeight: 1 }, text);

/**
 * The frame every card shares: the brand's night, the scene behind, the
 * wordmark and the domain on top, the copy on the left, one action below.
 */
function frame({ tone, scene = [], kicker, headline, headlineSize = 64, sub, body, cta, ctaTone, assets, copyWidth = 600 }) {
    const copy = [
        kicker ? kickerChip(kicker, toneOf(tone)) : null,
        headline ? h('div', {
            display: 'flex',
            marginTop: kicker ? 18 : 0,
            fontSize: headlineSize,
            fontWeight: 700,
            lineHeight: 1.04,
            letterSpacing: -1,
            color: BRAND.ink,
        }, headline) : null,
        sub ? h('div', { display: 'flex', marginTop: 16, fontSize: 28, lineHeight: 1.3, color: BRAND.muted }, sub) : null,
        body || null,
    ].filter(Boolean);
    return h('div', {
        display: 'flex',
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundImage: BRAND.ground,
        backgroundColor: BRAND.night,
        color: BRAND.ink,
        fontFamily: 'Space Grotesk',
    }, [
        ...scene.flat().filter(Boolean),
        h('div', { display: 'flex', flexDirection: 'column', width: '100%', height: '100%', padding: '44px 56px 48px' }, [
            h('div', { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, [wordmark(assets), domain()]),
            h('div', { display: 'flex', flexDirection: 'column', marginTop: 34, maxWidth: copyWidth }, copy),
            h('div', { display: 'flex', marginTop: 'auto' }, cta ? [ctaPill(cta, ctaTone)] : []),
        ]),
    ]);
}

// ── Section pages (`/api/og?page=<key>`) ────────────────────────────────────
// The art each page stands on, as dex ids. Pure data: the stage is the right
// half of the card (x 640–1160), the copy lives on the left.

const OFFICIAL_ART = (id) => `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/other/official-artwork/${id}.png`;

/** A front Pokémon with two behind it — the party device. */
const trio = (front, left, right, tone, { frontSize = 330, backSize = 210 } = {}) => (art) => [
    lamp(tone, 905, 330, 330),
    ...on(art(left), 740, 430, backSize, { tone }),
    ...on(art(right), 1075, 410, backSize, { tone }),
    ...on(art(front), 905, 560, frontSize, { tone }),
];

/** Two Pokémon facing each other — a matchup. */
const duel = (left, right, leftTone, rightTone) => (art) => [
    lamp(leftTone, 770, 360, 260, 0.5),
    lamp(rightTone, 1050, 330, 260, 0.5),
    ...on(art(left), 775, 540, 300, { tone: leftTone, flip: true }),
    ...on(art(right), 1050, 470, 260, { tone: rightTone }),
];

/** One Pokémon, big, on its pad. */
const solo = (id, tone, size = 400) => (art) => [
    lamp(tone, 905, 330, 360),
    ...on(art(id), 905, 575, size, { tone }),
];

/** A line of Pokémon left to right, growing — the evolution device. */
const line = (ids, tone) => (art) => [
    lamp(tone, 930, 360, 340),
    ...ids.flatMap((id, i) => on(art(id), 710 + i * 165, 520, 130 + i * 60, { tone })),
    mark('›', 768, 380, 60, rgba(toneOf(tone), 0.8)),
    mark('›', 935, 350, 60, rgba(toneOf(tone), 0.8)),
];

/** Pokémon not known yet, light silhouettes with a "?". */
const riddle = (ids, tone) => (art) => [
    lamp(tone, 905, 330, 340),
    ...on(art(ids[1]), 740, 430, 200, { tone, silhouette: true }),
    ...on(art(ids[2]), 1075, 410, 200, { tone, silhouette: true }),
    ...on(art(ids[0]), 905, 560, 320, { tone, silhouette: true }),
    mark('?', 868, 230, 150, rgba(toneOf(tone), 0.95)),
];

/** The brand's own ghost, as the scene. */
const mascotScene = (tone = 'violet') => (art, assets) => [
    lamp(tone, 905, 320, 330, 0.6),
    platform(905, 520, 330),
    assets?.mascot ? layer({ left: 905 - 150, top: 170, width: 300, height: 300, borderRadius: 72, overflow: 'hidden' }, [img(assets.mascot, 300, 300)]) : null,
];

export const PAGE_CARDS = {
    home: { tone: 'violet' },
    builder: { tone: 'dragon', ids: [445, 248, 6], scene: trio(445, 248, 6, 'dragon') },
    pokedex: { tone: 'electric', ids: [25, 1, 7], scene: trio(25, 1, 7, 'electric', { frontSize: 300 }) },
    meta: { tone: 'psychic', ids: [727, 1017, 892], scene: trio(727, 1017, 892, 'psychic') },
    tournaments: { tone: 'fighting', ids: [812, 645, 1000], scene: trio(812, 645, 1000, 'fighting') },
    bestTeams: { tone: 'gold', ids: [727, 987, 1003], scene: trio(727, 987, 1003, 'gold') },
    damageCalculator: { tone: 'fighting', ids: [445, 149], scene: duel(445, 149, 'ground', 'dragon') },
    speedTiers: { tone: 'electric', ids: [894, 887, 987], scene: trio(894, 887, 987, 'electric', { frontSize: 300 }) },
    moves: { tone: 'fire', ids: [6], scene: solo(6, 'fire') },
    abilities: { tone: 'psychic', ids: [65], scene: solo(65, 'psychic', 380) },
    items: { tone: 'normal', ids: [143], scene: solo(143, 'normal', 380) },
    gyms: { tone: 'rock', ids: [95, 121, 26], scene: trio(95, 121, 26, 'rock') },
    journeys: { tone: 'grass', ids: [1, 2, 3], scene: line([1, 2, 3], 'grass') },
    quiz: { tone: 'ghost', ids: [25, 133, 94], scene: riddle([25, 133, 94], 'ghost') },
    pokepuzzle: { tone: 'win', ids: [25, 4, 7], scene: riddle([25, 4, 7], 'win') },
    challenge: { tone: 'gold', ids: [445], scene: solo(445, 'gold', 420) },
    tierList: { tone: 'dragon', ids: [6, 9, 3, 25, 150], scene: (art) => tierStage(art, [[150, 6], [9, 25], [3]]) },
    games: { tone: 'gold', ids: [445, 25, 133, 1], scene: (art) => gamesStage(art) },
    feed: { tone: 'fairy', ids: [113, 25, 133], scene: trio(113, 25, 133, 'fairy', { frontSize: 300 }) },
    types: { tone: 'fire', ids: [6, 9, 3], scene: (art) => [
        lamp('water', 760, 330, 230, 0.5), lamp('grass', 1070, 330, 230, 0.5), lamp('fire', 915, 400, 260, 0.5),
        ...on(art(9), 760, 440, 220, { tone: 'water' }),
        ...on(art(3), 1075, 440, 220, { tone: 'grass' }),
        ...on(art(6), 915, 575, 300, { tone: 'fire' }),
    ] },
    guides: { tone: 'fighting', ids: [448], scene: solo(448, 'fighting', 380) },
    about: { tone: 'violet', scene: mascotScene() },
    methodology: { tone: 'violet', scene: mascotScene() },
    privacy: { tone: 'violet', scene: mascotScene() },
    terms: { tone: 'violet', scene: mascotScene() },
};

/** Three tier rows on the stage, each a ball-coloured letter and its Pokémon. */
function tierStage(art, rows) {
    return [
        lamp('dragon', 905, 330, 330, 0.45),
        ...rows.map((ids, i) => {
            const key = TIER_KEYS[i];
            const tone = TIER_BALLS[key];
            return layer({ left: 660, top: 150 + i * 128, width: 490, height: 110, alignItems: 'center', gap: 14, paddingRight: 14, borderRadius: 22, background: 'rgba(255,255,255,0.07)' }, [
                h('div', {
                    display: 'flex', alignItems: 'center', justifyContent: 'center', width: 104, height: 110, borderRadius: 22,
                    background: tone.ball === 'ultra' ? tone.band : tone.top, color: '#ffffff', fontSize: 52, fontWeight: 700,
                }, key),
                ...ids.map((id) => (art(id) ? img(art(id), 104, 104) : null)).filter(Boolean),
            ]);
        }),
    ];
}

/** The day's four: a belt of Poké Balls under four Pokémon, one a riddle. */
function gamesStage(art) {
    const slots = [
        { id: 445, tone: 'gold' },
        { id: 25, tone: 'win', silhouette: true },
        { id: 133, tone: 'ghost' },
        { id: 1, tone: 'dragon' },
    ];
    return [
        lamp('gold', 905, 330, 340, 0.4),
        ...slots.flatMap((slot, i) => on(art(slot.id), 718 + i * 125, 430, 170, slot)),
        ...slots.map((slot, i) => ball(718 + i * 125, 505, 54, i === 1 ? {} : { top: toneOf(slot.tone) })),
    ];
}

/** Headline and sub from a page title: "A: B" reads as A over B. */
function splitTitle(title) {
    const at = title.indexOf(': ');
    if (at <= 0) return [title, null];
    const sub = title.slice(at + 2);
    return [title.slice(0, at), sub.charAt(0).toUpperCase() + sub.slice(1)];
}

/** The artwork URLs a page card draws, in fetch order. */
export const pageCardIds = (key) => PAGE_CARDS[key]?.ids || [];

/**
 * A section page's card (`/api/og?page=<key>`).
 * @param {string} key  a STATIC_PAGES copy key
 * @param {Map<number, string|null>} images  dex id → artwork data URI
 */
export function pageCardTree(key, images, language = 'en', assets = {}) {
    if (key === 'home') return homeCardTree(images, language, assets);
    const card = PAGE_CARDS[key] || PAGE_CARDS.about;
    const t = (k) => translate(language, k);
    const [headline, sub] = splitTitle(t(`seo.${key}.title`));
    const ctaKey = `seo.ogImage.pageCta.${key}`;
    const cta = t(ctaKey) !== ctaKey ? t(ctaKey) : t('seo.ogImage.free');
    const artOf = (id) => images.get(id) || null;
    return frame({
        tone: card.tone,
        scene: card.scene ? card.scene(artOf, assets) : [],
        headline,
        headlineSize: headline.length > 30 ? 56 : 66,
        sub,
        cta,
        assets,
        copyWidth: 560,
    });
}

/**
 * The home card — and the site's default (public/og-image.png is this card,
 * `npm run og:images`). Centred, so a search result that crops it to a
 * square keeps the mascot and the wordmark.
 */
export function homeCardTree(images, language = 'en', assets = {}, size = OG_SIZE) {
    const square = size.height > size.width * 0.8;
    const W = size.width;
    const H = size.height;
    const cx = W / 2;
    const artOf = (id) => images.get(id) || null;
    const art1 = square ? 330 : 270;
    const baseY = square ? 1130 : 590;
    const mascotSize = square ? 270 : 180;
    const mascotTop = square ? 130 : 50;
    const scene = [
        lamp('violet', cx, mascotTop + mascotSize / 2 + 30, square ? 520 : 360, 0.55),
        lamp('dragon', square ? 230 : 180, baseY - 170, 260, 0.45),
        lamp('ghost', W - (square ? 230 : 180), baseY - 170, 260, 0.45),
        ...on(artOf(445), square ? 250 : 150, baseY, art1, { tone: 'dragon', flip: true }),
        ...on(artOf(94), W - (square ? 250 : 150), baseY, art1, { tone: 'ghost' }),
        ...(square ? on(artOf(25), cx, 1160, 220, { tone: 'electric' }) : []),
    ];
    return h('div', {
        display: 'flex',
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundImage: BRAND.ground,
        backgroundColor: BRAND.night,
        color: BRAND.ink,
        fontFamily: 'Space Grotesk',
    }, [
        ...scene.flat().filter(Boolean),
        h('div', { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', height: '100%', paddingTop: mascotTop }, [
            assets?.mascot
                ? h('div', { display: 'flex', width: mascotSize, height: mascotSize, borderRadius: mascotSize * 0.24, overflow: 'hidden' }, [img(assets.mascot, mascotSize, mascotSize)])
                : h('div', { display: 'flex', width: mascotSize, height: mascotSize }, []),
            h('div', { display: 'flex', marginTop: square ? 40 : 22 }, [wordmark(assets, square ? 150 : 104)]),
            h('div', { display: 'flex', marginTop: square ? 30 : 16, fontSize: square ? 36 : 26, fontWeight: 500, color: BRAND.muted, textAlign: 'center' }, translate(language, 'seo.ogImage.tagline')),
            h('div', { display: 'flex', marginTop: square ? 36 : 22 }, [ctaPill('pokemonbuilder.app')]),
        ]),
    ]);
}

export const HOME_CARD_IDS = [445, 94, 25];

// ── A shared team (`/t/:id`) and a tournament team ─────────────────────────

/**
 * @param {{ name: string, pokemons: { name: string, types?: string[] }[] }} team
 * @param {string[]} images  data URIs, index-aligned with team.pokemons (null = skip)
 * @param {{ kicker?: string, cta?: string }} [options]  a tournament team's placement and action
 */
export function teamCardTree(team, images, language = 'en', assets = {}, options = {}) {
    const title = team.name || translate(language, 'seo.sharedTeamPage.untitled');
    const members = team.pokemons.map((p) => formatSlug(p.name)).join(' · ');
    const leadTone = (team.pokemons[0]?.types || []).find((type) => typeColors[type]) || (options.kicker ? 'gold' : 'violet');
    const count = team.pokemons.length;
    const step = Math.min(185, Math.floor(1090 / Math.max(count, 1)));
    const size = Math.min(172, step);
    const start = 600 - (step * (count - 1)) / 2;
    const scene = [
        lamp(leadTone, 600, 470, 520, 0.38),
        ...team.pokemons.flatMap((p, i) => {
            const tone = (p.types || []).find((type) => typeColors[type]);
            return on(images[i] || null, start + i * step, 492, size, { tone });
        }),
    ];
    return frame({
        tone: leadTone,
        scene,
        kicker: options.kicker || null,
        headline: title,
        headlineSize: title.length > 26 ? 52 : 64,
        sub: members,
        cta: options.cta || translate(language, 'seo.ogImage.cta'),
        assets,
        copyWidth: 1090,
    });
}

/** A tournament team as a team card: its placement as the kicker. */
export function tournamentTeamCardTree(team, images, language = 'en', assets = {}) {
    const placement = [team.placement, team.tournament, team.format].filter(Boolean).join(' · ');
    return teamCardTree(
        { name: team.player ? `${team.player}` : team.title, pokemons: team.pokemons || [] },
        images,
        language,
        assets,
        { kicker: placement.slice(0, 60), cta: translate(language, 'seo.ogImage.tournamentCta') },
    );
}

/** The artwork to draw for a member: the art the share stored (a Mega's own), else by id. */
export const artworkUrl = (member) => (typeof member.sprite === 'string' && /^https:\/\//.test(member.sprite)
    ? member.sprite
    : OFFICIAL_ART(member.id));

// ── Daily results (`/pokepuzzle?r=…`, `/challenge?r=…`) ─────────────────────
// The words come from resultShareMeta (src/utils/seoPages.js), the same the
// link's title and description use. Everything drawn is a decoded number or
// a c/p/a status (utils/resultShareCode.js) — never text a sharer typed.

const TILE = { c: '#3fb950', p: '#d4a72c', a: '#3a3446' };

/** @param {{ won, attempts, maxAttempts, puzzleNumber, rows: string[] }} result  decoded puzzle code */
export function puzzleCardTree(result, meta, _language = 'en', assets = {}) {
    const cols = result.rows[0].length;
    const tile = Math.max(18, Math.min(56, Math.floor(420 / result.rows.length) - 10, Math.floor(470 / cols) - 10));
    const gridW = cols * tile + (cols - 1) * 10;
    const gridH = result.rows.length * tile + (result.rows.length - 1) * 10;
    const grid = layer({ left: 1150 - gridW, top: 315 - gridH / 2 + 20, flexDirection: 'column', gap: 10 }, result.rows.map((row) => h(
        'div',
        { display: 'flex', gap: 10 },
        [...row].map((status) => h('div', { display: 'flex', width: tile, height: tile, borderRadius: 10, background: TILE[status] || TILE.a }, [])),
    )));
    const tone = result.won ? 'win' : 'ghost';
    const kicker = result.puzzleNumber ? `PokéPuzzle · #${result.puzzleNumber}` : 'PokéPuzzle';
    return frame({
        tone,
        scene: [lamp(tone, 1150 - gridW / 2, 335, 340, 0.4), grid],
        kicker,
        body: h('div', { display: 'flex', flexDirection: 'column', marginTop: 10 }, [
            h('div', { display: 'flex', fontSize: 150, fontWeight: 700, lineHeight: 1, letterSpacing: -4, color: result.won ? TILE.c : BRAND.ink }, meta.score),
            h('div', { display: 'flex', marginTop: 18, fontSize: 30, lineHeight: 1.3, color: BRAND.muted, maxWidth: 560 }, meta.description),
        ]),
        cta: meta.cta,
        assets,
        copyWidth: 600,
    });
}

/** @param {{ won, turns, curve: number[] }} result  decoded challenge code */
export function challengeCardTree(result, meta, language = 'en', assets = {}, ace = null) {
    const kicker = `${translate(language, 'challenge.title')} · ${meta.date}`;
    const tone = result.won ? 'gold' : 'dragon';
    const bars = result.curve.length ? h('div', { display: 'flex', alignItems: 'flex-end', gap: 8, height: 70, marginTop: 24 }, result.curve.map((value) => h('div', {
        display: 'flex',
        width: 26,
        height: Math.max(6, Math.round(value * 70)),
        borderRadius: 6,
        background: result.won ? BRAND.gold : BRAND.violet,
    }, []))) : null;
    return frame({
        tone,
        // Her ace stands on the pad; beaten, it is only her silhouette's.
        scene: [
            lamp(tone, 960, 320, 330, result.won ? 0.5 : 0.35),
            ...on(ace, 960, 570, 380, { tone, silhouette: !result.won && !ace ? true : false, opacity: result.won ? 1 : 0.55 }),
            layer({ left: 790, top: 120, width: 340, justifyContent: 'center' }, [kickerChip(translate(language, 'seo.ogImage.champion'), result.won ? BRAND.gold : BRAND.muted)]),
        ],
        kicker,
        body: h('div', { display: 'flex', flexDirection: 'column', marginTop: 4 }, [
            h('div', { display: 'flex', fontSize: 60, fontWeight: 700, lineHeight: 1.05, letterSpacing: -1 }, meta.title),
            h('div', { display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 20 }, meta.facts.map((fact) => h('div', {
                display: 'flex',
                padding: '6px 16px',
                borderRadius: 999,
                background: BRAND.platform,
                fontSize: 22,
                fontWeight: 500,
            }, fact))),
            ...(bars ? [bars] : []),
        ]),
        cta: meta.cta,
        ctaTone: result.won ? BRAND.gold : BRAND.button,
        assets,
        copyWidth: 640,
    });
}

// ── A shared tier list (`/tier-list?r=…`, 2026-11-15) ──────────────────────
// Ids only: each rank's ball colour and letter, the Pokémon as artwork, the
// theme's name. A chart is its cells in a grid, each labelled by its type or
// generation from the translations — never a word the sharer typed.

/** The dex ids the card draws, in the order the images are fetched. */
export function tierListCardIds(data, perRow = 13) {
    if (data.kind === 'chart') return Object.values(data.cells).filter(Boolean);
    return TIER_KEYS.flatMap((key) => data.tiers[key].slice(0, perRow));
}

/**
 * @param {object} data  a decoded tier list (utils/tierList.js decodeTierList)
 * @param {Map<number, string|null>} images  id → artwork data URI
 */
export function tierListCardTree(data, images, language = 'en', assets = {}) {
    const meta = resultShareMeta({ kind: 'tierlist', data }, language);
    const pic = (id, size) => (images.get(id)
        ? img(images.get(id), size, size)
        : h('div', { display: 'flex', width: size, height: size }, []));
    let body;
    if (data.kind === 'chart') {
        const keys = Object.keys(data.cells);
        const columns = keys.length <= 9 ? 5 : 6;
        const cell = Math.floor((1088 - (columns - 1) * 12) / columns);
        body = h('div', { display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 16, width: 1088 }, keys.map((key) => {
            const id = data.cells[key];
            const tone = typeColors[key];
            const label = key.startsWith('gen') ? `Gen ${key.slice(3)}` : translate(language, `types.${key}`);
            return h('div', {
                display: 'flex', flexDirection: 'column', alignItems: 'center', width: cell, height: keys.length <= 9 ? 160 : 108,
                padding: '6px 4px', borderRadius: 16, background: tone ? rgba(tone, 0.18) : BRAND.platform,
            }, [
                h('div', { display: 'flex', fontSize: 18, fontWeight: 700, color: tone || BRAND.violet }, label),
                id ? pic(id, keys.length <= 9 ? 112 : 74) : h('div', { display: 'flex', fontSize: 52, fontWeight: 700, color: 'rgba(255,255,255,0.18)' }, '?'),
            ]);
        }));
    } else {
        body = h('div', { display: 'flex', flexDirection: 'column', gap: 6, marginTop: 14, width: 1088 }, TIER_KEYS.map((key) => {
            const ids = data.tiers[key];
            const shown = ids.slice(0, 13);
            const ball = TIER_BALLS[key];
            return h('div', { display: 'flex', alignItems: 'center', gap: 10, height: 54, paddingRight: 10, borderRadius: 14, background: 'rgba(255,255,255,0.06)' }, [
                h('div', {
                    display: 'flex', alignItems: 'center', justifyContent: 'center', width: 72, height: 54, borderRadius: 14,
                    background: ball.ball === 'ultra' ? ball.band : ball.top, color: ball.ball === 'premier' ? '#1b1426' : '#ffffff',
                    fontSize: 30, fontWeight: 700,
                }, key),
                ...shown.map((id) => pic(id, 50)),
                ...(ids.length > shown.length ? [h('div', { display: 'flex', fontSize: 24, color: BRAND.muted }, `+${ids.length - shown.length}`)] : []),
            ]);
        }));
    }
    return frame({
        tone: 'dragon',
        scene: [lamp('dragon', 1000, 120, 300, 0.3)],
        kicker: `Tier list · ${meta.name}`,
        body,
        cta: meta.cta,
        assets,
        copyWidth: 1088,
    });
}

/** `?puzzle=` / `?challenge=` → the decoder for that code. */
export const RESULT_DECODERS = { puzzle: decodePuzzleResult, challenge: decodeChallengeResult };

/** The card for a decoded result, with the words the link's meta uses. */
export function resultCardTree(kind, data, language = 'en', assets = {}, images = new Map()) {
    const meta = resultShareMeta({ kind, data }, language);
    return kind === 'puzzle'
        ? puzzleCardTree(data, meta, language, assets)
        : challengeCardTree(data, meta, language, assets, images.get(CHAMPION_ACE) || null);
}

/** Cynthia's ace, who stands on a Champion result's pad. */
export const CHAMPION_ACE = 445;

// ── Reference pages (`/pokemon/:name`, `/types/:type`, 2026-10-24) ──────────
// The answer the page gives, in the card: a Pokémon's weaknesses and
// resistances, a type's matchups. Built from the type chart and the baked
// index only — nothing a visitor typed reaches the picture.

const STAT_KEYS = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];

/**
 * @param {{ id, name, types: string[], baseStats? }} pokemon  an index entry
 * @param {string|null} image  its artwork as a data URI
 */
export function pokemonCardTree(pokemon, image, language = 'en', assets = {}) {
    const t = (key, params) => translate(language, `seo.ogImage.${key}`, params);
    const types = (pokemon.types || []).filter((type) => typeColors[type]);
    const tone = types[0] || 'violet';
    const weak = weaknessesOf(types);
    const resisted = resistancesOf(types).length;
    const immune = immunitiesOf(types);
    const bst = pokemon.baseStats ? STAT_KEYS.reduce((sum, key) => sum + (Number(pokemon.baseStats[key]) || 0), 0) : 0;
    const facts = [
        resisted ? t('resists', { n: resisted }) : null,
        immune.length ? t('immuneTo', { types: immune.map((type) => translate(language, `types.${type}`)).join(', ') }) : null,
        bst ? t('bst', { n: bst }) : null,
    ].filter(Boolean);
    const name = formatSlug(pokemon.name);

    return frame({
        tone,
        scene: [
            lamp(tone, 930, 320, 360, 0.55),
            ...(types[1] ? [lamp(types[1], 1080, 470, 220, 0.35)] : []),
            ...on(image, 930, 585, 430, { tone }),
        ],
        kicker: `Nº ${String(pokemon.id).padStart(4, '0')}`,
        headline: name,
        headlineSize: name.length > 14 ? 60 : 76,
        body: h('div', { display: 'flex', flexDirection: 'column', gap: 20, marginTop: 18 }, [
            h('div', { display: 'flex', gap: 12 }, types.map((type) => typeChip(type, language, assets, { size: 'md' }))),
            weak.length ? chipRow(t('weakTo'), weak.map((w) => typeChip(w.type, language, assets, { size: 'sm', suffix: w.multiplier === 4 ? ' 4×' : '' }))) : null,
            facts.length ? h('div', { display: 'flex', fontSize: 20, color: BRAND.muted }, facts.join(' · ')) : null,
        ].filter(Boolean)),
        cta: t('pokemonCta'),
        assets,
        copyWidth: 580,
    });
}

/**
 * @param {string} type  a type id
 * @param {{ id, name }[]} top  its strongest Pokémon, index-aligned with `images`
 */
export function typeCardTree(type, top, images, language = 'en', assets = {}) {
    const t = (key, params) => translate(language, `seo.ogImage.${key}`, params);
    const weak = weaknessesOf([type]).map((w) => w.type);
    const strong = strongAgainst(type);
    const [front, left, right] = [images[0], images[1], images[2]];
    return frame({
        tone: type,
        scene: [
            lamp(type, 920, 330, 360, 0.55),
            ...on(left || null, 760, 430, 210, { tone: type }),
            ...on(right || null, 1080, 410, 210, { tone: type }),
            ...on(front || null, 920, 575, 320, { tone: type }),
        ],
        body: h('div', { display: 'flex', flexDirection: 'column', gap: 22 }, [
            typeChip(type, language, assets, { size: 'xl' }),
            strong.length ? chipRow(t('strongAgainst'), strong.map((x) => typeChip(x, language, assets, { size: 'sm' }))) : null,
            weak.length ? chipRow(t('weakTo'), weak.map((x) => typeChip(x, language, assets, { size: 'sm' }))) : null,
        ].filter(Boolean)),
        cta: t('typeCta'),
        assets,
        copyWidth: 600,
    });
}

/** A type's three strongest Pokémon by base stat total (base forms only). */
export function strongestOfType(pokemons, type, limit = 3) {
    const bst = (p) => STAT_KEYS.reduce((sum, key) => sum + (Number(p.baseStats?.[key]) || 0), 0);
    return pokemons
        .filter((p) => p.id <= 1025 && (p.types || []).includes(type))
        .sort((a, b) => bst(b) - bst(a) || a.id - b.id)
        .slice(0, limit);
}

// ── Moves, abilities, items (`/moves/:id` …, 2026-11-16) ───────────────────
// From the baked dex (battle-dex.json, seo-dex.json): a name, numbers, a
// type. The dex's effect text is English, so only the English card says it.

/** @param {[name, type, category, power, accuracy, pp, short]} move  a battle-dex row */
export function moveCardTree(move, language = 'en', assets = {}) {
    const t = (key) => translate(language, `seo.ogImage.${key}`);
    const [name, rawType, category, power, accuracy, pp, short] = move;
    const type = typeColors[rawType] ? rawType : 'normal';
    const figures = [
        power ? figure(power, t('power')) : null,
        figure(accuracy === true || !accuracy ? '—' : `${accuracy}%`, t('accuracy')),
        pp ? figure(pp, t('pp')) : null,
    ].filter(Boolean);
    const glyph = assets?.typeIcons?.[type];
    return frame({
        tone: type,
        scene: [
            lamp(type, 940, 330, 360, 0.6),
            platform(940, 520, 340, type),
            glyph ? layer({ left: 940 - 105, top: 250, width: 210, height: 210 }, [img(glyph, 210, 210)]) : null,
        ],
        kicker: t('moveKicker'),
        headline: name,
        headlineSize: name.length > 16 ? 58 : 72,
        body: h('div', { display: 'flex', flexDirection: 'column', gap: 24, marginTop: 20 }, [
            h('div', { display: 'flex', gap: 12 }, [
                typeChip(type, language, assets, { size: 'md' }),
                h('div', { display: 'flex', alignItems: 'center', padding: '8px 20px', borderRadius: 999, background: BRAND.platform, fontSize: 26, fontWeight: 700 }, translate(language, `seo.ogImage.category.${category}`) || category),
            ]),
            h('div', { display: 'flex', gap: 44 }, figures),
            language === 'en' && short ? h('div', { display: 'flex', fontSize: 24, lineHeight: 1.3, color: BRAND.muted, maxWidth: 560 }, String(short).slice(0, 110)) : null,
        ].filter(Boolean)),
        cta: t('detailCta'),
        assets,
        copyWidth: 600,
    });
}

/** @param {[name, desc, holders: number[]|null]} ability  a seo-dex row */
export function abilityCardTree(ability, images, language = 'en', assets = {}) {
    const t = (key) => translate(language, `seo.ogImage.${key}`);
    const [name, desc] = ability;
    const [front, left, right] = images;
    return frame({
        tone: 'violet',
        scene: [
            lamp('violet', 920, 330, 360, 0.5),
            ...on(left || null, 760, 430, 210, { tone: 'violet' }),
            ...on(right || null, 1080, 410, 210, { tone: 'violet' }),
            ...on(front || null, 920, 575, 320, { tone: 'violet' }),
        ],
        kicker: t('abilityKicker'),
        headline: name,
        headlineSize: name.length > 16 ? 58 : 72,
        sub: language === 'en' && desc ? String(desc).slice(0, 120) : null,
        cta: t('detailCta'),
        assets,
        copyWidth: 580,
    });
}

/** @param {[name, desc]} item  a seo-dex row; `sprite` its bag icon as a data URI */
export function itemCardTree(item, sprite, language = 'en', assets = {}) {
    const t = (key) => translate(language, `seo.ogImage.${key}`);
    const [name, desc] = item;
    return frame({
        tone: 'gold',
        scene: [
            lamp('gold', 930, 320, 340, 0.4),
            platform(930, 500, 320, 'gold'),
            sprite ? layer({ left: 930 - 120, top: 240, width: 240, height: 240 }, [img(sprite, 240, 240, { imageRendering: 'pixelated' })]) : ball(930, 380, 200, { top: BRAND.gold }),
        ],
        kicker: t('itemKicker'),
        headline: name,
        headlineSize: name.length > 16 ? 58 : 72,
        sub: language === 'en' && desc ? String(desc).slice(0, 120) : null,
        cta: t('detailCta'),
        assets,
        copyWidth: 580,
    });
}

// ── Guides (`/guides/:slug`) ───────────────────────────────────────────────

/** Each guide's scene: the Pokémon its subject is about. */
export const GUIDE_ART = {
    'first-vgc-team': { tone: 'dragon', ids: [445, 248, 6] },
    'team-from-tournament-data': { tone: 'gold', ids: [727, 987, 1003] },
    'pokemon-team-builders-compared': { tone: 'violet', ids: [137, 474, 233] },
};

/** @param {{ slug, title }} guide  guideMeta() for one language */
export function guideCardTree(guide, images, language = 'en', assets = {}) {
    const look = GUIDE_ART[guide.slug] || { tone: 'fighting', ids: [448] };
    const artOf = (id) => images.get(id) || null;
    const scene = look.ids.length >= 3
        ? trio(look.ids[0], look.ids[1], look.ids[2], look.tone, { frontSize: 300, backSize: 190 })(artOf)
        : solo(look.ids[0], look.tone, 380)(artOf);
    return frame({
        tone: look.tone,
        scene,
        kicker: translate(language, 'seo.ogImage.guideKicker'),
        headline: guide.title,
        headlineSize: guide.title.length > 60 ? 44 : 52,
        cta: translate(language, 'seo.ogImage.pageCta.guides'),
        assets,
        copyWidth: 560,
    });
}
