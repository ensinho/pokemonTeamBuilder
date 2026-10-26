// The picture a shared team's link unfurls with (api/og.js): its name, its six
// on battle platforms, the site, and the one thing to do with it. Built as a
// satori element tree (plain objects, no JSX in api/) so this file stays pure
// and testable; api/og.js does the fetching and the rendering.
//
// The colours are the brand's, not a theme's: this image lives in WhatsApp and
// Discord, where none of the site's themes apply.

import { translate } from '../../src/utils/translateCore.js';
import { formatSlug, resultShareMeta } from '../../src/utils/seoPages.js';
import { decodeChallengeResult, decodePuzzleResult } from '../../src/utils/resultShareCode.js';
import { typeColors } from '../../src/constants/typeChart.js';
import { immunitiesOf, resistancesOf, strongAgainst, weaknessesOf } from '../../src/utils/typeMatchups.js';

export const OG_SIZE = { width: 1200, height: 630 };

const BRAND = {
    ink: '#f4f4f5',
    muted: '#a1a1aa',
    accent: '#a59bf2',
    button: '#8b7cee',
    ground: 'linear-gradient(135deg, #221a3d 0%, #0d0d14 62%)',
    platform: 'rgba(255, 255, 255, 0.09)',
};

const h = (type, style, children) => ({ type, props: { style, children } });

/**
 * @param {{ name: string, pokemons: { name: string }[] }} team
 * @param {string[]} images  data URIs, index-aligned with team.pokemons (null = skip)
 */
export function teamCardTree(team, images, language = 'en') {
    const title = team.name || translate(language, 'seo.sharedTeamPage.untitled');
    const members = team.pokemons.map((p) => formatSlug(p.name)).join(' · ');
    const slots = team.pokemons.map((p, i) => h('div', {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-end',
        width: 170,
        height: 200,
    }, [
        images[i]
            ? { type: 'img', props: { src: images[i], width: 160, height: 160, style: { marginBottom: -14 } } }
            : h('div', { display: 'flex', width: 160, height: 160 }, []),
        h('div', { display: 'flex', width: 120, height: 18, borderRadius: 60, background: BRAND.platform }, []),
    ]));

    return h('div', {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        padding: '52px 60px',
        background: BRAND.ground,
        color: BRAND.ink,
        fontFamily: 'Space Grotesk',
    }, [
        h('div', { display: 'flex', justifyContent: 'space-between', fontSize: 26, fontWeight: 500 }, [
            h('div', { display: 'flex', color: BRAND.accent }, 'PokemonBuilder'),
            h('div', { display: 'flex', color: BRAND.muted }, 'pokemonbuilder.app'),
        ]),
        h('div', {
            display: 'flex',
            marginTop: 26,
            fontSize: 66,
            fontWeight: 700,
            lineHeight: 1.05,
            maxWidth: 1080,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
        }, title),
        h('div', { display: 'flex', marginTop: 12, fontSize: 28, color: BRAND.muted, maxWidth: 1080 }, members),
        h('div', { display: 'flex', justifyContent: 'center', gap: 8, marginTop: 'auto' }, slots),
        h('div', { display: 'flex', justifyContent: 'center', marginTop: 18 }, [
            h('div', {
                display: 'flex',
                padding: '10px 26px',
                borderRadius: 999,
                background: BRAND.button,
                color: '#ffffff',
                fontSize: 26,
                fontWeight: 700,
            }, translate(language, 'seo.ogImage.cta')),
        ]),
    ]);
}

/** The artwork to draw for a member: the art the share stored (a Mega's own), else by id. */
export const artworkUrl = (member) => (typeof member.sprite === 'string' && /^https:\/\//.test(member.sprite)
    ? member.sprite
    : `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/other/official-artwork/${member.id}.png`);

// ── Daily results (`/pokepuzzle?r=…`, `/challenge?r=…`) ─────────────────────
// The words come from resultShareMeta (src/utils/seoPages.js), the same the
// link's title and description use. Everything drawn is a decoded number or
// a c/p/a status (utils/resultShareCode.js) — never text a sharer typed.

const TILE = { c: '#3fb950', p: '#d4a72c', a: '#3a3a44' };

const resultFrame = (language, kicker, body, cta) => h('div', {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    padding: '52px 60px',
    background: BRAND.ground,
    color: BRAND.ink,
    fontFamily: 'Space Grotesk',
}, [
    h('div', { display: 'flex', justifyContent: 'space-between', fontSize: 26, fontWeight: 500 }, [
        h('div', { display: 'flex', color: BRAND.accent }, kicker),
        h('div', { display: 'flex', color: BRAND.muted }, 'pokemonbuilder.app'),
    ]),
    body,
    h('div', { display: 'flex', marginTop: 'auto' }, [
        h('div', {
            display: 'flex',
            padding: '10px 26px',
            borderRadius: 999,
            background: BRAND.button,
            color: '#ffffff',
            fontSize: 26,
            fontWeight: 700,
        }, cta),
    ]),
]);

/** @param {{ won, attempts, maxAttempts, puzzleNumber, rows: string[] }} result  decoded puzzle code */
export function puzzleCardTree(result, meta, language = 'en') {
    const cols = result.rows[0].length;
    const tile = Math.max(18, Math.min(52, Math.floor(400 / result.rows.length) - 8, Math.floor(500 / cols) - 8));
    const grid = h('div', { display: 'flex', flexDirection: 'column', gap: 8 }, result.rows.map((row) => h(
        'div',
        { display: 'flex', gap: 8 },
        [...row].map((status) => h('div', { display: 'flex', width: tile, height: tile, borderRadius: 8, background: TILE[status] || TILE.a }, [])),
    )));
    const body = h('div', { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 30, gap: 48 }, [
        h('div', { display: 'flex', flexDirection: 'column', maxWidth: 520 }, [
            h('div', { display: 'flex', fontSize: 150, fontWeight: 700, lineHeight: 1, color: result.won ? TILE.c : BRAND.ink }, meta.score),
            h('div', { display: 'flex', marginTop: 22, fontSize: 32, lineHeight: 1.3, color: BRAND.muted }, meta.description),
        ]),
        grid,
    ]);
    const kicker = result.puzzleNumber ? `PokéPuzzle · #${result.puzzleNumber}` : 'PokéPuzzle';
    return resultFrame(language, kicker, body, meta.cta);
}

/** @param {{ won, turns, curve: number[] }} result  decoded challenge code */
export function challengeCardTree(result, meta, language = 'en') {
    const kicker = `${translate(language, 'challenge.title')} · ${meta.date}`;
    const bars = result.curve.length ? h('div', { display: 'flex', alignItems: 'flex-end', gap: 8, height: 120, marginTop: 34 }, result.curve.map((value) => h('div', {
        display: 'flex',
        width: 34,
        height: Math.max(8, Math.round(value * 120)),
        borderRadius: 6,
        background: BRAND.accent,
    }, []))) : null;
    const body = h('div', { display: 'flex', flexDirection: 'column', marginTop: 30 }, [
        h('div', { display: 'flex', fontSize: 76, fontWeight: 700, lineHeight: 1.05, maxWidth: 1080 }, meta.title),
        h('div', { display: 'flex', gap: 14, marginTop: 24 }, meta.facts.map((fact) => h('div', {
            display: 'flex',
            padding: '8px 20px',
            borderRadius: 999,
            background: BRAND.platform,
            fontSize: 28,
            fontWeight: 500,
        }, fact))),
        ...(bars ? [bars] : []),
    ]);
    return resultFrame(language, kicker, body, meta.cta);
}

/** `?puzzle=` / `?challenge=` → the decoder for that code. */
export const RESULT_DECODERS = { puzzle: decodePuzzleResult, challenge: decodeChallengeResult };

/** The card for a decoded result, with the words the link's meta uses. */
export function resultCardTree(kind, data, language = 'en') {
    const meta = resultShareMeta({ kind, data }, language);
    return kind === 'puzzle' ? puzzleCardTree(data, meta, language) : challengeCardTree(data, meta, language);
}

// ── Reference pages (`/pokemon/:name`, `/types/:type`, 2026-10-24) ──────────
// The answer the page gives, in the card: a Pokémon's weaknesses and
// resistances, a type's matchups. Built from the type chart and the baked
// index only — nothing a visitor typed reaches the picture.

const STAT_KEYS = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];

/** Light chips (Electric, Ice, Ground…) take dark ink; the rest white. */
const inkOn = (hex) => {
    const n = Number.parseInt(String(hex).slice(1), 16);
    const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255];
    return (0.299 * r + 0.587 * g + 0.114 * b) > 160 ? '#15131f' : '#ffffff';
};

const typeChip = (type, language, { big = false, title = false, suffix = '' } = {}) => h('div', {
    display: 'flex',
    alignSelf: 'flex-start',
    padding: title ? '12px 34px' : big ? '10px 24px' : '6px 16px',
    borderRadius: 999,
    background: typeColors[type] || BRAND.platform,
    color: inkOn(typeColors[type] || '#444444'),
    fontSize: title ? 56 : big ? 30 : 24,
    fontWeight: 700,
}, `${translate(language, `types.${type}`)}${suffix}`);

const chipRow = (label, chips) => h('div', { display: 'flex', flexDirection: 'column', gap: 10 }, [
    h('div', { display: 'flex', fontSize: 22, color: BRAND.muted }, label),
    h('div', { display: 'flex', flexWrap: 'wrap', gap: 10 }, chips),
]);

const referenceFrame = (body, cta) => h('div', {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    padding: '48px 60px',
    background: BRAND.ground,
    color: BRAND.ink,
    fontFamily: 'Space Grotesk',
}, [
    h('div', { display: 'flex', justifyContent: 'space-between', fontSize: 26, fontWeight: 500 }, [
        h('div', { display: 'flex', color: BRAND.accent }, 'PokemonBuilder'),
        h('div', { display: 'flex', color: BRAND.muted }, 'pokemonbuilder.app'),
    ]),
    body,
    h('div', { display: 'flex', marginTop: 'auto' }, [
        h('div', { display: 'flex', padding: '10px 26px', borderRadius: 999, background: BRAND.button, color: '#ffffff', fontSize: 26, fontWeight: 700 }, cta),
    ]),
]);

/**
 * @param {{ id, name, types: string[], baseStats? }} pokemon  an index entry
 * @param {string|null} image  its artwork as a data URI
 */
export function pokemonCardTree(pokemon, image, language = 'en') {
    const t = (key, params) => translate(language, `seo.ogImage.${key}`, params);
    const types = (pokemon.types || []).filter((type) => typeColors[type]);
    const weak = weaknessesOf(types);
    const resisted = resistancesOf(types).length;
    const immune = immunitiesOf(types);
    const bst = pokemon.baseStats ? STAT_KEYS.reduce((sum, key) => sum + (Number(pokemon.baseStats[key]) || 0), 0) : 0;
    const facts = [
        resisted ? t('resists', { n: resisted }) : null,
        immune.length ? t('immuneTo', { types: immune.map((type) => translate(language, `types.${type}`)).join(', ') }) : null,
        bst ? t('bst', { n: bst }) : null,
    ].filter(Boolean);

    const body = h('div', { display: 'flex', alignItems: 'center', gap: 40, marginTop: 20 }, [
        image
            ? { type: 'img', props: { src: image, width: 360, height: 360 } }
            : h('div', { display: 'flex', width: 360, height: 360 }, []),
        h('div', { display: 'flex', flexDirection: 'column', gap: 20, flex: 1 }, [
            h('div', { display: 'flex', fontSize: 72, fontWeight: 700, lineHeight: 1 }, formatSlug(pokemon.name)),
            h('div', { display: 'flex', gap: 12 }, types.map((type) => typeChip(type, language, { big: true }))),
            weak.length ? chipRow(t('weakTo'), weak.map((w) => typeChip(w.type, language, { suffix: w.multiplier === 4 ? ' 4×' : '' }))) : null,
            facts.length ? h('div', { display: 'flex', fontSize: 22, color: BRAND.muted }, facts.join(' · ')) : null,
        ].filter(Boolean)),
    ]);
    return referenceFrame(body, t('pokemonCta'));
}

/**
 * @param {string} type  a type id
 * @param {{ id, name }[]} top  its strongest Pokémon, index-aligned with `images`
 */
export function typeCardTree(type, top, images, language = 'en') {
    const t = (key, params) => translate(language, `seo.ogImage.${key}`, params);
    const weak = weaknessesOf([type]).map((w) => w.type);
    const strong = strongAgainst(type);
    const body = h('div', { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 30, marginTop: 24 }, [
        h('div', { display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 640 }, [
            typeChip(type, language, { title: true }),
            strong.length ? chipRow(t('strongAgainst'), strong.map((x) => typeChip(x, language))) : null,
            weak.length ? chipRow(t('weakTo'), weak.map((x) => typeChip(x, language))) : null,
        ].filter(Boolean)),
        h('div', { display: 'flex', alignItems: 'flex-end' }, top.map((p, i) => (images[i]
            ? { type: 'img', props: { src: images[i], width: 170, height: 170, style: { marginLeft: -24 } } }
            : h('div', { display: 'flex', width: 0 }, [])))),
    ]);
    return referenceFrame(body, t('typeCta'));
}

/** A type's three strongest Pokémon by base stat total (base forms only). */
export function strongestOfType(pokemons, type, limit = 3) {
    const bst = (p) => STAT_KEYS.reduce((sum, key) => sum + (Number(p.baseStats?.[key]) || 0), 0);
    return pokemons
        .filter((p) => p.id <= 1025 && (p.types || []).includes(type))
        .sort((a, b) => bst(b) - bst(a) || a.id - b.id)
        .slice(0, limit);
}
