// The picture a shared team's link unfurls with (api/og.js): its name, its six
// on battle platforms, the site, and the one thing to do with it. Built as a
// satori element tree (plain objects, no JSX in api/) so this file stays pure
// and testable; api/og.js does the fetching and the rendering.
//
// The colours are the brand's, not a theme's: this image lives in WhatsApp and
// Discord, where none of the site's themes apply.

import { translate } from '../../src/utils/translateCore.js';
import { formatSlug } from '../../src/utils/seoPages.js';

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
            h('div', { display: 'flex', color: BRAND.accent }, 'Pokémon Team Builder'),
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
