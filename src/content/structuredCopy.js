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
            bestTeams: ['Top tournament teams of the current VGC regulation', 'Most used Pokémon in top finishes', 'Most common Pokémon pairs', 'One-click import into the team builder'],
            tournaments: ['Real VGC tournament teams', 'Player, placement and event details', 'Full sets with items, abilities, EVs and moves', 'One-click import into the team builder'],
            pokepuzzle: ['Daily Pokémon guessing game', 'Clues by generation, types, base stats, height and weight', 'Free practice mode', 'Shareable result card'],
            challenge: ['Daily DS-style battle against Champion Cynthia or Rival Blue', 'New Champion team every day at midnight', 'Team of the day available to borrow', 'Daily ranking and win streak'],
            quiz: ['Name Pokémon by generation', 'Daily category challenge by official trait', 'Live progress counter and timer', 'Shareable score'],
            tierList: ['Rank Pokémon from S to D tier', 'Templates for starters, legendaries, Eeveelutions and favourites by type', 'Daily tier list theme', 'Export as PNG image or shareable link'],
            games: ['Champion Challenge daily battle', 'Daily PokéPuzzle', 'Daily Pokémon Quiz', 'Daily Pokémon Tier List'],
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
            bestTeams: ['Melhores times do regulamento atual de VGC', 'Pokémon mais usados no topo dos torneios', 'Duplas de Pokémon mais comuns', 'Importação para o montador com um clique'],
            tournaments: ['Times reais de torneios de VGC', 'Jogador, colocação e evento', 'Sets completos com itens, habilidades, EVs e golpes', 'Importação para o montador com um clique'],
            pokepuzzle: ['Jogo diário de adivinhar o Pokémon', 'Dicas por geração, tipos, status base, altura e peso', 'Modo livre de treino', 'Card de resultado para compartilhar'],
            challenge: ['Batalha diária estilo DS contra a Campeã Cynthia ou o Rival Blue', 'Time novo de Campeã todo dia à meia-noite', 'Time do dia pronto para usar', 'Ranking diário e sequência de vitórias'],
            quiz: ['Diga os Pokémon por geração', 'Desafio diário de categorias por característica oficial', 'Contador de progresso e cronômetro', 'Resultado compartilhável'],
            tierList: ['Ranqueie Pokémon do S ao D', 'Listas de iniciais, lendários, evoluções do Eevee e favoritos por tipo', 'Tema de tier list do dia', 'Exportação como imagem PNG ou link'],
            games: ['Batalha diária no Desafio da Campeã', 'PokéPuzzle do dia', 'Quiz Pokémon do dia', 'Tier list Pokémon do dia'],
        },
    },
};
