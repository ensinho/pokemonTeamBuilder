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
    {
        slug: 'pokemon-type-chart-guide',
        updated: '2026-11-18',
        en: {
            title: 'Pokémon type chart guide: weaknesses, resistances and dual types',
            description: 'How the Pokémon type chart works: super effective 2× and 4× weaknesses, resistances, immunities and how to check any dual-type combination for your team.',
        },
        pt: {
            title: 'Guia da tabela de tipos Pokémon: fraquezas, resistências e tipos duplos',
            description: 'Como funciona a tabela de tipos Pokémon: fraquezas 2× e 4×, resistências, imunidades e como conferir qualquer combinação de dois tipos para o seu time.',
        },
    },
    {
        slug: 'pokemon-speed-tiers-evs-natures',
        updated: '2026-11-18',
        en: {
            title: 'Pokémon speed tiers, EVs and natures explained for level 50',
            description: 'How Speed works in competitive Pokémon at level 50: compare 0 EVs, 252 EVs, a +Speed nature and Choice Scarf to see which Pokémon moves first in battle.',
        },
        pt: {
            title: 'Speed tiers, EVs e naturezas Pokémon explicados no nível 50',
            description: 'Como funciona a velocidade no competitivo de Pokémon no nível 50: compare 0 EVs, 252 EVs, natureza de Speed e Choice Scarf para ver quem age primeiro.',
        },
    },
    {
        slug: 'pokemon-damage-calculator-guide',
        updated: '2026-11-18',
        en: {
            title: 'How to use a Pokémon damage calculator: rolls, STAB and EVs',
            description: 'How Pokémon damage calculation works in VGC and Smogon: read the 16 damage rolls, STAB, Tera multipliers and KO chances, and tune EVs to survive key hits.',
        },
        pt: {
            title: 'Como usar a calculadora de dano Pokémon: rolagens, STAB e EVs',
            description: 'Como funciona o cálculo de dano Pokémon no VGC e no Smogon: leia as 16 rolagens, o bônus de STAB e Tera e a chance de KO, e ajuste os EVs do seu time.',
        },
    },
    {
        slug: 'daily-pokemon-games',
        updated: '2026-11-18',
        en: {
            title: 'Daily Pokémon games in your browser: puzzle, quiz and battle',
            description: 'Play four free daily Pokémon games in your browser: battle Cynthia in the Champion Challenge, guess the Pokémon in PokéPuzzle, take the quiz and rank tiers.',
        },
        pt: {
            title: 'Jogos diários de Pokémon no navegador: puzzle, quiz e batalha',
            description: 'Jogue quatro jogos diários de Pokémon grátis no navegador: enfrente a Cynthia no Desafio da Campeã, adivinhe o PokéPuzzle, faça o quiz e monte a tier list.',
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
