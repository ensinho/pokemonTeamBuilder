/**
 * The text of the guides (2026-10-30), written for the questions players ask
 * search engines and AI assistants — "how do I build a VGC team with speed
 * tiers and a damage calculator", "how do I choose a team from tournament
 * data", "which team builder should I use". Section headings are those
 * questions; every answer leads to the tool on this site that does it.
 *
 * GuideView draws it and api/_lib/seoSnapshot.js writes the same text into
 * the page's HTML, with the FAQ as FAQPage JSON-LD — so a crawler reads
 * exactly what a visitor sees. Rules for editing:
 *   - Only claim what the site does today, and only what the source checked
 *     says about another tool (Pikalytics: its own pages, 2026-10-30).
 *   - Both languages carry the same sections in the same order
 *     (guides.test.js checks).
 *
 * Node-safe and dependency-free. Titles and descriptions live in
 * guideIndex.js.
 *
 * Shape, per language: { lede, sections: [{ heading, paragraphs?, steps?,
 * links?: [{ to, label }] }], faq: [{ q, a }] }
 */

export const GUIDES = {
    'first-vgc-team': {
        en: {
            lede: 'VGC is the format of the official Pokémon tournaments: double battles where you bring six Pokémon and choose four for each game. This guide takes you from an empty team to one you can play, with the free tools on PokemonBuilder.',
            sections: [
                {
                    heading: 'What is VGC, and which format should you build for?',
                    paragraphs: [
                        'VGC (Video Game Championships) is the format of the official Pokémon tournaments: double battles at level 50, where each player brings six Pokémon and picks four for every game. Each season is played under a regulation, a ruleset that says which Pokémon and items are allowed.',
                        'Meta & usage opens on the current VGC regulation, so the numbers you see there are already for the format you are building for. The Smogon singles tiers, such as OU, are in the same format menu if you play those instead.',
                    ],
                    links: [{ to: '/meta', label: 'Open Meta & usage' }],
                },
                {
                    heading: 'Where do you start a team?',
                    paragraphs: [
                        'Start from two or three Pokémon that work well together, not from six favorites. Best teams shows the teams that finished on top of recent tournaments, the Pokémon they use most and the pairs that keep coming back; any of those pairs is a tested starting point.',
                        'Avoid simply taking the six most used Pokémon: popularity tells you what is strong, not what works together. Pick a core, then build around it.',
                    ],
                    links: [{ to: '/best-teams', label: 'See the best teams' }, { to: '/tournaments', label: 'Tournament teams' }],
                },
                {
                    heading: "How do you cover your team's weaknesses?",
                    paragraphs: [
                        'Add your core to the team builder and fill the open slots. The analysis updates with every Pokémon you add: which types your team is weak to, which it resists, and which threats from the current meta it struggles against.',
                        'A useful rule: if three or more of your Pokémon share a weakness, change one of them or add a Pokémon that resists that type. The type chart shows every matchup when you need to check one.',
                    ],
                    links: [{ to: '/builder', label: 'Open the team builder' }, { to: '/types', label: 'Type chart' }],
                },
                {
                    heading: 'Why does speed matter so much in doubles?',
                    paragraphs: [
                        "In doubles, moving first often decides the game, so most teams have a plan for speed: Tailwind doubles your side's Speed, Trick Room makes the slowest Pokémon move first, and moves like Icy Wind lower the opponents' Speed.",
                        'Speed tiers ranks the level 50 Speed of every Pokémon with no EVs, 252 EVs, a +Speed nature or a Choice Scarf. Use it to decide whether your team wants to be fast or slow, and which Pokémon your attackers need to outspeed; under Tailwind, double the number.',
                    ],
                    links: [{ to: '/speed-tiers', label: 'Open Speed tiers' }],
                },
                {
                    heading: 'How do you test your key matchups?',
                    paragraphs: [
                        'Open the damage calculator and check the matchups that worry you: whether your attackers knock out the common threats, and whether your Pokémon survive their strongest attacks. When a result is close, adjust the EV spread and try again.',
                    ],
                    links: [{ to: '/damage-calculator', label: 'Open the damage calculator' }],
                },
                {
                    heading: 'Which items, abilities and moves should each Pokémon use?',
                    paragraphs: [
                        'Every Pokémon page shows its most used build in the current format (item, ability, nature and EVs, Tera type and moves, each with its share) and its Smogon sets. Start from one of them and change what your team needs.',
                        "VGC rules have long required each Pokémon to hold a different item (the Item Clause), so plan the items as a team and check your regulation's rules.",
                    ],
                    links: [{ to: '/pokedex', label: 'Find a Pokémon' }],
                },
                {
                    heading: 'How do you take the team to the game?',
                    paragraphs: [
                        "Export to Showdown copies your team in the text format Pokémon Showdown reads. Paste it into Showdown's teambuilder to test the team in battles before you train it in the game.",
                        'PokemonBuilder does not connect to your console: to play the team on Nintendo Switch, enter the same sets in the game by hand. Keep the team saved here, or share it by link or image, to have every set at hand.',
                    ],
                    links: [{ to: '/builder', label: 'Build your team' }],
                },
            ],
            faq: [
                { q: 'Is PokemonBuilder free?', a: 'Yes. Every tool on the site is free and works in the browser, on a phone or a computer, with nothing to install. You can save teams without an account; an account keeps them across your devices.' },
                { q: 'Does it work on a phone?', a: "Yes. The whole site works in a phone's browser, and it can be installed as an app from the browser menu." },
                { q: 'Can I use it for the games on Nintendo Switch?', a: 'Yes, to plan the team: build and check it here, test it on Pokémon Showdown with the export, then enter the sets in the game by hand. The site does not connect to the console.' },
                { q: 'Where does the usage data come from?', a: "From Smogon's monthly statistics of Pokémon Showdown battles, merged with results from Limitless tournaments for VGC. Tournament teams come from VGCPastes. The datasets are refreshed every day." },
                { q: 'Is the site in Portuguese?', a: 'Yes. Every page exists in English and in Portuguese, and you can switch the language at any time.' },
            ],
        },
        pt: {
            lede: 'VGC é o formato dos torneios oficiais de Pokémon: batalhas em dupla em que você leva seis Pokémon e escolhe quatro para cada partida. Este guia leva você de um time vazio a um time pronto para jogar, com as ferramentas grátis do PokemonBuilder.',
            sections: [
                {
                    heading: 'O que é VGC, e para qual formato montar?',
                    paragraphs: [
                        'VGC (Video Game Championships) é o formato dos torneios oficiais de Pokémon: batalhas em dupla no nível 50, em que cada jogador leva seis Pokémon e escolhe quatro para cada partida. Cada temporada segue um regulamento, que diz quais Pokémon e itens são permitidos.',
                        'O Meta e uso abre no regulamento atual de VGC, então os números que você vê ali já são do formato para o qual está montando. As tiers de singles do Smogon, como a OU, estão no mesmo menu de formatos se for o que você joga.',
                    ],
                    links: [{ to: '/meta', label: 'Abrir o Meta e uso' }],
                },
                {
                    heading: 'Por onde começar um time?',
                    paragraphs: [
                        'Comece por dois ou três Pokémon que funcionam bem juntos, não por seis favoritos. Melhores times mostra os times que chegaram ao topo dos torneios recentes, os Pokémon que eles mais usam e as duplas que se repetem; qualquer uma dessas duplas é um ponto de partida testado.',
                        'Evite só pegar os seis Pokémon mais usados: popularidade mostra o que é forte, não o que funciona junto. Escolha um núcleo e monte em volta dele.',
                    ],
                    links: [{ to: '/best-teams', label: 'Ver os melhores times' }, { to: '/tournaments', label: 'Times de torneio' }],
                },
                {
                    heading: 'Como cobrir as fraquezas do time?',
                    paragraphs: [
                        'Coloque o seu núcleo no montador e preencha as vagas. A análise se atualiza a cada Pokémon que entra: contra quais tipos o time é fraco, quais ele resiste e quais ameaças do meta atual ele tem dificuldade de enfrentar.',
                        'Uma regra útil: se três ou mais Pokémon do time têm a mesma fraqueza, troque um deles ou acrescente um Pokémon que resista àquele tipo. A tabela de tipos mostra todos os confrontos quando você precisar conferir um.',
                    ],
                    links: [{ to: '/builder', label: 'Abrir o montador' }, { to: '/types', label: 'Tabela de tipos' }],
                },
                {
                    heading: 'Por que a velocidade importa tanto nas duplas?',
                    paragraphs: [
                        'Nas duplas, atacar primeiro muitas vezes decide a partida, então a maioria dos times tem um plano de velocidade: Tailwind dobra a velocidade do seu lado, Trick Room faz os Pokémon mais lentos agirem primeiro e golpes como Icy Wind reduzem a velocidade dos adversários.',
                        'O Speed tiers ordena a velocidade no nível 50 de todos os Pokémon, sem EVs, com 252 EVs, com natureza de Speed ou com Choice Scarf. Use para decidir se o seu time quer ser rápido ou lento, e quais Pokémon os seus atacantes precisam ultrapassar; com Tailwind, dobre o número.',
                    ],
                    links: [{ to: '/speed-tiers', label: 'Abrir o Speed tiers' }],
                },
                {
                    heading: 'Como testar os confrontos importantes?',
                    paragraphs: [
                        'Abra a calculadora de dano e confira os confrontos que preocupam: se os seus atacantes derrubam as ameaças mais comuns e se os seus Pokémon aguentam os ataques mais fortes delas. Quando o resultado ficar no limite, ajuste os EVs e teste de novo.',
                    ],
                    links: [{ to: '/damage-calculator', label: 'Abrir a calculadora de dano' }],
                },
                {
                    heading: 'Quais itens, habilidades e golpes cada Pokémon deve usar?',
                    paragraphs: [
                        'A página de cada Pokémon mostra a build mais usada no formato atual (item, habilidade, natureza e EVs, tipo Tera e golpes, cada um com a porcentagem) e os sets do Smogon. Parta de um deles e mude o que o seu time precisa.',
                        'As regras do VGC exigem há muito tempo que cada Pokémon segure um item diferente (a Item Clause), então planeje os itens pensando no time todo e confira as regras do seu regulamento.',
                    ],
                    links: [{ to: '/pokedex', label: 'Procurar um Pokémon' }],
                },
                {
                    heading: 'Como levar o time para o jogo?',
                    paragraphs: [
                        'Exportar para o Showdown copia o seu time no formato de texto que o Pokémon Showdown lê. Cole no montador do Showdown para testar o time em batalhas antes de treiná-lo no jogo.',
                        'O PokemonBuilder não se conecta ao console: para jogar o time no Nintendo Switch, cadastre os mesmos sets no jogo à mão. Deixe o time salvo aqui, ou compartilhe por link ou imagem, para ter todos os sets à mão.',
                    ],
                    links: [{ to: '/builder', label: 'Montar o seu time' }],
                },
            ],
            faq: [
                { q: 'O PokemonBuilder é grátis?', a: 'Sim. Todas as ferramentas do site são grátis e funcionam no navegador, no celular ou no computador, sem instalar nada. Dá para salvar times sem conta; com uma conta eles ficam em todos os seus aparelhos.' },
                { q: 'Funciona no celular?', a: 'Sim. O site inteiro funciona no navegador do celular e pode ser instalado como aplicativo pelo menu do navegador.' },
                { q: 'Dá para usar com os jogos do Nintendo Switch?', a: 'Sim, para planejar o time: monte e confira aqui, teste no Pokémon Showdown com a exportação e depois cadastre os sets no jogo à mão. O site não se conecta ao console.' },
                { q: 'De onde vêm os dados de uso?', a: 'Das estatísticas mensais do Smogon sobre as batalhas do Pokémon Showdown, junto com os resultados dos torneios do Limitless no VGC. Os times de torneio vêm do VGCPastes. Os dados são atualizados todo dia.' },
                { q: 'O site é em português?', a: 'Sim. Todas as páginas existem em português e em inglês, e você pode trocar o idioma a qualquer momento.' },
            ],
        },
    },

    'team-from-tournament-data': {
        en: {
            lede: 'Tournament results show which teams win when the best players play. This guide shows how to read them, and how to turn a winning team into yours.',
            sections: [
                {
                    heading: 'How is tournament data different from ladder data?',
                    paragraphs: [
                        'Ladder data comes from a very large number of games on Pokémon Showdown, played by people of every level; the rating filter on Meta & usage keeps only the stronger players. Tournament data covers far fewer teams, but they are the teams top players registered and brought to events.',
                        'The two complement each other: the ladder shows what is popular and how it is built, and tournaments show what wins when it matters.',
                    ],
                    links: [{ to: '/meta', label: 'Open Meta & usage' }],
                },
                {
                    heading: 'Where do you find the teams that finished on top?',
                    paragraphs: [
                        'Best teams lists the top finishes of the current regulation, the Pokémon those teams use most and the pairs that keep coming back. Each card shows the player, the placing, the event and the six Pokémon; Tournament teams has the full list.',
                    ],
                    links: [{ to: '/best-teams', label: 'See the best teams' }, { to: '/tournaments', label: 'All tournament teams' }],
                },
                {
                    heading: 'What should you look for in the results?',
                    paragraphs: [
                        'Read the patterns before the winner. A Pokémon on a large share of the top teams, or a pair that appears again and again, is solid; a single winning team can depend on its player and on the matchups of one event.',
                        'Look at how the top teams answer the most used Pokémon: that is what your team will face.',
                    ],
                },
                {
                    heading: 'How do you import a tournament team and make it yours?',
                    steps: [
                        'Open a team from Best teams or Tournament teams.',
                        'Import it into the builder in one click: every set comes with it, with item, ability, moves and spread.',
                        'Check the analysis for shared weaknesses and threats from the meta.',
                        'Change one Pokémon at a time, and keep the core that made the team work.',
                    ],
                    links: [{ to: '/tournaments', label: 'Pick a tournament team' }],
                },
                {
                    heading: 'How do you check that your version still works?',
                    paragraphs: [
                        'After each change, test the matchups that matter in the damage calculator and compare speeds in Speed tiers. If the new Pokémon breaks your speed plan or loses a key knockout, try another option for that slot.',
                    ],
                    links: [{ to: '/damage-calculator', label: 'Damage calculator' }, { to: '/speed-tiers', label: 'Speed tiers' }],
                },
                {
                    heading: 'How current is the data?',
                    paragraphs: [
                        'The tournament teams and the usage data are refreshed every day, and the pages say which regulation they count. When a new regulation starts the meta changes, so check that a team was built for the regulation you will play.',
                    ],
                },
            ],
            faq: [
                { q: 'Where do the tournament teams come from?', a: 'From VGCPastes, a community-maintained repository of the teams players used at VGC tournaments, with their full sets. PokemonBuilder refreshes its copy every day.' },
                { q: 'Can I use a team that someone else won with?', a: 'Yes. Many players start from a published team and adapt it, and the one-click import is made for that. Check the rules of your event for anything specific.' },
                { q: 'Can I take an imported team to Pokémon Showdown?', a: "Yes. Import it into the builder, make your changes and use Export to Showdown to copy it in Showdown's format." },
            ],
        },
        pt: {
            lede: 'Resultados de torneio mostram quais times vencem quando os melhores jogadores jogam. Este guia mostra como ler esses resultados e como transformar um time vencedor no seu.',
            sections: [
                {
                    heading: 'Qual a diferença entre dados de torneio e dados de ladder?',
                    paragraphs: [
                        'Os dados de ladder vêm de um número muito grande de partidas no Pokémon Showdown, jogadas por pessoas de todos os níveis; o filtro de rating do Meta e uso mantém só os jogadores mais fortes. Os dados de torneio cobrem bem menos times, mas são os times que os melhores jogadores registraram e levaram aos eventos.',
                        'Os dois se completam: o ladder mostra o que é popular e como é montado, e os torneios mostram o que vence quando importa.',
                    ],
                    links: [{ to: '/meta', label: 'Abrir o Meta e uso' }],
                },
                {
                    heading: 'Onde encontrar os times que chegaram ao topo?',
                    paragraphs: [
                        'Melhores times lista as melhores colocações do regulamento atual, os Pokémon que esses times mais usam e as duplas que se repetem. Cada card mostra o jogador, a colocação, o evento e os seis Pokémon; Times de torneio tem a lista completa.',
                    ],
                    links: [{ to: '/best-teams', label: 'Ver os melhores times' }, { to: '/tournaments', label: 'Todos os times de torneio' }],
                },
                {
                    heading: 'O que observar nos resultados?',
                    paragraphs: [
                        'Leia os padrões antes do campeão. Um Pokémon presente em boa parte dos times do topo, ou uma dupla que aparece várias vezes, é sólido; um único time vencedor pode depender do jogador e dos confrontos de um evento.',
                        'Veja como os times do topo respondem aos Pokémon mais usados: é isso que o seu time vai enfrentar.',
                    ],
                },
                {
                    heading: 'Como importar um time de torneio e deixá-lo com a sua cara?',
                    steps: [
                        'Abra um time em Melhores times ou em Times de torneio.',
                        'Importe para o montador com um clique: todos os sets vêm junto, com item, habilidade, golpes e EVs.',
                        'Confira na análise as fraquezas em comum e as ameaças do meta.',
                        'Troque um Pokémon de cada vez e mantenha o núcleo que fazia o time funcionar.',
                    ],
                    links: [{ to: '/tournaments', label: 'Escolher um time de torneio' }],
                },
                {
                    heading: 'Como conferir se a sua versão ainda funciona?',
                    paragraphs: [
                        'Depois de cada troca, teste os confrontos importantes na calculadora de dano e compare as velocidades no Speed tiers. Se o Pokémon novo quebra o seu plano de velocidade ou perde um KO importante, tente outra opção para aquela vaga.',
                    ],
                    links: [{ to: '/damage-calculator', label: 'Calculadora de dano' }, { to: '/speed-tiers', label: 'Speed tiers' }],
                },
                {
                    heading: 'Os dados estão atualizados?',
                    paragraphs: [
                        'Os times de torneio e os dados de uso são atualizados todo dia, e as páginas dizem qual regulamento contam. Quando começa um regulamento novo o meta muda, então confira se o time foi montado para o regulamento que você vai jogar.',
                    ],
                },
            ],
            faq: [
                { q: 'De onde vêm os times de torneio?', a: 'Do VGCPastes, um repositório mantido pela comunidade com os times usados em torneios de VGC, com os sets completos. O PokemonBuilder atualiza a sua cópia todo dia.' },
                { q: 'Posso usar um time com que outra pessoa venceu?', a: 'Sim. Muitos jogadores partem de um time publicado e adaptam, e a importação em um clique existe para isso. Confira as regras do seu evento para qualquer detalhe específico.' },
                { q: 'Posso levar um time importado para o Pokémon Showdown?', a: 'Sim. Importe para o montador, faça as suas mudanças e use Exportar Showdown para copiar o time no formato do Showdown.' },
            ],
        },
    },

    'pokemon-team-builders-compared': {
        en: {
            lede: 'Most competitive players use more than one tool. This guide says what each popular option is for, so you can pick the right one for each job.',
            sections: [
                {
                    heading: 'Which Pokémon team builder should you use?',
                    paragraphs: [
                        "It depends on what you want to do. To battle, use Pokémon Showdown. To study usage statistics, Pikalytics and Smogon's monthly statistics are the references. To build a team and check it in one place, with type coverage, speed tiers, damage and tournament data together, use PokemonBuilder.",
                    ],
                },
                {
                    heading: "What is Pokémon Showdown's teambuilder for?",
                    paragraphs: [
                        "Pokémon Showdown is the online battle simulator most competitive players use, and its teambuilder is part of it. You create teams for any format, the simulator checks them against the format's rules, and you can import and export teams as text. It is where you test a team in real battles on the ladder.",
                    ],
                },
                {
                    heading: 'What is Pikalytics for?',
                    paragraphs: [
                        'Pikalytics is a usage statistics site for VGC and Smogon formats, with Pokémon Showdown ladder data filtered by rating and tournament data. For each Pokémon it lists usage, teammates, items, abilities and spreads. Its free team builder suggests sets based on tournament usage, imports and exports Showdown teams, and shares teams by link.',
                    ],
                },
                {
                    heading: 'What is PokemonBuilder for?',
                    paragraphs: [
                        'PokemonBuilder is a free team builder that analyses the team while you build it: type coverage, shared weaknesses and threats from the meta, with a damage calculator and speed tiers one click away. Every Pokémon page shows its most used build and its Smogon sets, and tournament teams import into the builder in one click.',
                        "It also has a full Pokédex, a type chart and the best teams of the current regulation, and the whole site is in English and Portuguese. It exports teams in Showdown's format; there is no ladder here, and pasting a Showdown team in is not supported yet.",
                    ],
                    links: [{ to: '/builder', label: 'Open the team builder' }, { to: '/best-teams', label: 'Best teams' }],
                },
                {
                    heading: 'Can you move a team between them?',
                    paragraphs: [
                        "Yes, through Showdown's text format. Export a team from PokemonBuilder and paste it into Pokémon Showdown, or into any tool that imports Showdown teams, such as Pikalytics.",
                    ],
                },
            ],
            faq: [
                { q: 'Is there a free Pokémon team builder in Portuguese?', a: 'Yes. PokemonBuilder is free, and every page, from the team builder to the damage calculator, exists in Portuguese and in English.' },
                { q: 'Does PokemonBuilder work on a phone?', a: "Yes. It works in a phone's browser and can be installed as an app; the damage calculator and the speed tiers work there too." },
                { q: 'Do I need an account?', a: 'Not to use the tools. PokemonBuilder saves your teams without an email address; an account keeps them across your devices.' },
            ],
        },
        pt: {
            lede: 'A maioria dos jogadores competitivos usa mais de uma ferramenta. Este guia diz para que serve cada opção popular, para você escolher a certa para cada tarefa.',
            sections: [
                {
                    heading: 'Qual team builder de Pokémon usar?',
                    paragraphs: [
                        'Depende do que você quer fazer. Para batalhar, use o Pokémon Showdown. Para estudar estatísticas de uso, o Pikalytics e as estatísticas mensais do Smogon são as referências. Para montar um time e conferir tudo num lugar só, com cobertura de tipos, speed tiers, dano e dados de torneio juntos, use o PokemonBuilder.',
                    ],
                },
                {
                    heading: 'Para que serve o montador do Pokémon Showdown?',
                    paragraphs: [
                        'O Pokémon Showdown é o simulador de batalhas online que a maioria dos jogadores competitivos usa, e o montador de times faz parte dele. Você cria times para qualquer formato, o simulador confere se eles seguem as regras do formato, e dá para importar e exportar times em texto. É onde você testa um time em batalhas de verdade no ladder.',
                    ],
                },
                {
                    heading: 'Para que serve o Pikalytics?',
                    paragraphs: [
                        'O Pikalytics é um site de estatísticas de uso para formatos de VGC e do Smogon, com dados do ladder do Pokémon Showdown filtrados por rating e dados de torneio. Para cada Pokémon ele lista uso, parceiros, itens, habilidades e EVs. O montador grátis dele sugere sets com base no uso em torneios, importa e exporta times do Showdown e compartilha times por link.',
                    ],
                },
                {
                    heading: 'Para que serve o PokemonBuilder?',
                    paragraphs: [
                        'O PokemonBuilder é um montador de times grátis que analisa o time enquanto você monta: cobertura de tipos, fraquezas em comum e ameaças do meta, com a calculadora de dano e o speed tiers a um clique. A página de cada Pokémon mostra a build mais usada e os sets do Smogon, e os times de torneio entram no montador com um clique.',
                        'Ele também tem uma Pokédex completa, a tabela de tipos e os melhores times do regulamento atual, e o site inteiro está em português e em inglês. Ele exporta times no formato do Showdown; não há ladder aqui, e ainda não dá para colar um time do Showdown.',
                    ],
                    links: [{ to: '/builder', label: 'Abrir o montador' }, { to: '/best-teams', label: 'Melhores times' }],
                },
                {
                    heading: 'Dá para levar um time de um para o outro?',
                    paragraphs: [
                        'Sim, pelo formato de texto do Showdown. Exporte um time do PokemonBuilder e cole no Pokémon Showdown, ou em qualquer ferramenta que importe times do Showdown, como o Pikalytics.',
                    ],
                },
            ],
            faq: [
                { q: 'Existe um team builder de Pokémon grátis em português?', a: 'Sim. O PokemonBuilder é grátis, e todas as páginas, do montador de times à calculadora de dano, existem em português e em inglês.' },
                { q: 'O PokemonBuilder funciona no celular?', a: 'Sim. Ele funciona no navegador do celular e pode ser instalado como aplicativo; a calculadora de dano e o speed tiers funcionam lá também.' },
                { q: 'Preciso de uma conta?', a: 'Não para usar as ferramentas. O PokemonBuilder salva os seus times sem e-mail; com uma conta eles ficam em todos os seus aparelhos.' },
            ],
        },
    },
};

/** One guide's text in one language (English when the language is missing), or null. */
export function guideContent(slug, language) {
    const guide = GUIDES[slug];
    if (!guide) return null;
    return guide[language] || guide.en;
}
