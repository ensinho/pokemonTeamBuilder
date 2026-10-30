/**
 * Copy only the JSON-LD uses (utils/seoPages.js → structuredData, which only
 * api/render-meta.js calls): who makes the site, and what each tool does.
 * Kept out of translations.js so the browser bundle never carries it — the
 * client renders no JSON-LD (2026-10-30).
 *
 * `features` is the WebApplication featureList: only what the page really
 * does (the calculator and speed tiers do not load your team).
 */
export const STRUCTURED_COPY = {
    en: {
        org: 'PokemonBuilder is a free Pokémon team builder for competitive play, in English and Portuguese, made by Enzo Esmeraldo.',
        features: {
            home: ['Team builder with live type coverage and shared weaknesses', 'Pokédex of every Pokémon', 'Damage calculator', 'Speed tiers', 'Meta and usage stats', 'Tournament teams with one-click import', 'Smogon sets', 'Type chart'],
            builder: ['Live type coverage', 'Shared weaknesses and resistances', 'Meta threats to your team', 'Partner suggestions from tournament teams', 'Smogon sets', 'Export to Pokémon Showdown', 'Share by link or image'],
            damageCalculator: ['Damage rolls and KO chances', 'VGC and Smogon formats', 'Items, abilities, natures, EVs and Tera', 'Any two Pokémon'],
            speedTiers: ['Level 50 Speed of every Pokémon', 'No EVs, 252 EVs or a Speed nature', 'Choice Scarf', 'Filter by generation'],
            meta: ['Usage by format and rating', 'Top items, abilities, moves and spreads', 'Teammates and cores', 'Tournament win rates for VGC'],
            pokedex: ['All 1025 Pokémon', 'Filters by type and generation', 'Base stats', 'Weaknesses and resistances', 'Moves', 'Competitive usage'],
            types: ['Type chart of all 18 types', 'Weaknesses, resistances and immunities', 'Two-type combinations', 'Pokémon of each type'],
        },
    },
    pt: {
        org: 'PokemonBuilder é um montador de times Pokémon grátis para o competitivo, em português e inglês, feito por Enzo Esmeraldo.',
        features: {
            home: ['Montador de times com cobertura de tipos e fraquezas em comum ao vivo', 'Pokédex de todos os Pokémon', 'Calculadora de dano', 'Speed tiers', 'Meta e estatísticas de uso', 'Times de torneio com importação em um clique', 'Sets do Smogon', 'Tabela de tipos'],
            builder: ['Cobertura de tipos ao vivo', 'Fraquezas e resistências em comum', 'Ameaças do meta ao seu time', 'Sugestões de parceiros dos times de torneio', 'Sets do Smogon', 'Exportação para o Pokémon Showdown', 'Compartilhamento por link ou imagem'],
            damageCalculator: ['Rolagens de dano e chance de KO', 'Formatos de VGC e Smogon', 'Itens, habilidades, naturezas, EVs e Tera', 'Quaisquer dois Pokémon'],
            speedTiers: ['Velocidade de todos os Pokémon no nível 50', 'Sem EVs, 252 EVs ou natureza de Speed', 'Choice Scarf', 'Filtro por geração'],
            meta: ['Uso por formato e rating', 'Itens, habilidades, golpes e EVs mais usados', 'Parceiros e cores', 'Taxa de vitória em torneios de VGC'],
            pokedex: ['Os 1025 Pokémon', 'Filtros por tipo e geração', 'Status base', 'Fraquezas e resistências', 'Golpes', 'Uso competitivo'],
            types: ['Tabela dos 18 tipos', 'Fraquezas, resistências e imunidades', 'Combinações de dois tipos', 'Pokémon de cada tipo'],
        },
    },
};
