/**
 * The guides (`/guides/:slug`, 2026-10-30): slug, date and what each is
 * called in both languages. Small on purpose — utils/seoPages.js reads it on
 * every route, so it rides the main bundle; the guides' text is
 * content/guides.js, which only the guide view and the server load.
 *
 * Node-safe: api/render-meta.js imports it through seoPages.js.
 */

export const GUIDE_INDEX = [
    {
        slug: 'first-vgc-team',
        updated: '2026-10-30',
        en: {
            title: 'How to build a competitive Pokémon VGC team, step by step',
            description: 'A step-by-step guide to your first competitive Pokémon VGC team: start from the meta, cover your weaknesses, plan speed, test damage and export it.',
        },
        pt: {
            title: 'Como montar um time competitivo de Pokémon VGC, passo a passo',
            description: 'Guia passo a passo para o seu primeiro time competitivo de Pokémon VGC: parta do meta, cubra as fraquezas, planeje a velocidade, teste o dano e exporte.',
        },
    },
    {
        slug: 'team-from-tournament-data',
        updated: '2026-10-30',
        en: {
            title: 'How to choose a Pokémon team using tournament data',
            description: 'How to use tournament results to choose a competitive Pokémon team: find the teams on top, read the patterns, import a team in one click and adapt it.',
        },
        pt: {
            title: 'Como escolher um time Pokémon com dados de torneio',
            description: 'Como usar resultados de torneio para escolher um time Pokémon competitivo: ache os times do topo, leia os padrões, importe um time em um clique e adapte.',
        },
    },
    {
        slug: 'pokemon-team-builders-compared',
        updated: '2026-10-30',
        en: {
            title: 'Pokémon team builders compared: PokemonBuilder, Showdown and Pikalytics',
            description: 'Which Pokémon team builder to use, and for what: Pokémon Showdown to battle, Pikalytics for usage stats, PokemonBuilder to build with full analysis.',
        },
        pt: {
            title: 'Team builders de Pokémon comparados: PokemonBuilder, Showdown e Pikalytics',
            description: 'Qual team builder de Pokémon usar, e para quê: o Pokémon Showdown para batalhar, o Pikalytics para estatísticas e o PokemonBuilder para montar com análise.',
        },
    },
];

export const GUIDE_SLUGS = GUIDE_INDEX.map((g) => g.slug);

/** `{ slug, updated, title, description }` for one guide in one language, or null. */
export function guideMeta(slug, language) {
    const guide = GUIDE_INDEX.find((g) => g.slug === slug);
    if (!guide) return null;
    const copy = guide[language] || guide.en;
    return { slug: guide.slug, updated: guide.updated, title: copy.title, description: copy.description };
}
