/**
 * The site's own pages (2026-10-30): About, How it works, Privacy and Terms.
 * An SEO audit scored the site's credibility at 38% — no policies, no
 * contact, no explanation of how the team score is computed — and answer
 * engines weigh exactly those. Same shape as content/guides.js, so the same
 * view (InfoPageView) and the same prerender (api/_lib/seoSnapshot.js) draw
 * them; titles and descriptions are `seo.<key>` in translations.js.
 *
 * Rules for editing:
 *   - Say only what the code does. The privacy page lists what is stored
 *     (services/accountDeletion.js USER_COLLECTIONS, firestore.rules
 *     publicProfiles, services/analytics.js); the methodology quotes
 *     utils/teamAnalysis.js, utils/teamThreats.js, utils/damageCalc.js and
 *     SpeedTiersView. Change the code, change the page.
 *   - Both languages carry the same sections in the same order
 *     (sitePages.test.js checks), and bump `updated` when a policy changes.
 *
 * Node-safe (api/render-meta.js imports it).
 *
 * Shape: { updated, en|pt: { lede, sections: [{ heading, paragraphs?, steps?,
 * links?: [{ to | href, label }], consent? }] } } — `consent` puts the analytics
 * cookie switch (InfoPageView) in that section.
 */

import { SITE_CONTACT_EMAIL as CONTACT_EMAIL, SITE_PAGE_PATHS } from '../utils/seoPages.js';

export { CONTACT_EMAIL, SITE_PAGE_PATHS };
const MAILTO = `mailto:${CONTACT_EMAIL}`;
const GITHUB = 'https://github.com/ensinho/pokemonTeamBuilder';

export const SITE_PAGES = {
    about: {
        updated: '2026-10-30',
        en: {
            lede: 'PokemonBuilder is a free Pokémon team builder for competitive play, in English and Portuguese. It is an independent fan project, made and maintained by Enzo Esmeraldo.',
            sections: [
                {
                    heading: 'What is PokemonBuilder?',
                    paragraphs: [
                        'A set of free tools for building competitive Pokémon teams in the browser: a team builder that analyses the team while you build it, a full Pokédex, a damage calculator, speed tiers, usage statistics and real tournament teams that import into the builder in one click.',
                        'It works on a phone or a computer with nothing to install, and your teams are saved without an account. With an account they follow you to every device.',
                    ],
                    links: [{ to: '/builder', label: 'Open the team builder' }, { to: '/guides', label: 'Read the guides' }],
                },
                {
                    heading: 'Who makes it?',
                    paragraphs: [
                        'Enzo Esmeraldo, an independent developer, designs, writes and runs the site. There is no company or advertiser behind it, and the source code is public on GitHub under the MIT license.',
                    ],
                    links: [{ href: GITHUB, label: 'Source code on GitHub' }, { href: 'https://www.linkedin.com/in/enzoesmeraldo/', label: 'Enzo on LinkedIn' }],
                },
                {
                    heading: 'Where does the data come from?',
                    paragraphs: [
                        'Pokémon, moves, abilities and items come from PokéAPI and from Pokémon Showdown\'s own data. Ladder usage comes from Smogon\'s monthly statistics of Pokémon Showdown battles; for VGC regulations, results from Limitless tournaments are merged in. Tournament teams come from VGCPastes, a community-maintained repository. Sets come from Smogon.',
                        'The datasets are refreshed every day, and the pages that show them say where their numbers come from and when they were last updated.',
                    ],
                    links: [{ to: '/methodology', label: 'How the analysis works' }, { to: '/meta', label: 'Meta & usage' }],
                },
                {
                    heading: 'Is it official?',
                    paragraphs: [
                        'No. PokemonBuilder is not affiliated with, endorsed or sponsored by Nintendo, Game Freak, Creatures or The Pokémon Company. Pokémon and the names of its characters are trademarks of their owners.',
                    ],
                },
                {
                    heading: 'How do I get in touch?',
                    paragraphs: [
                        `Write to ${CONTACT_EMAIL} for questions, data requests or a mistake you found. The feedback button at the bottom of every page reaches the same inbox.`,
                    ],
                    links: [{ href: MAILTO, label: CONTACT_EMAIL }],
                },
            ],
        },
        pt: {
            lede: 'O PokemonBuilder é um montador de times Pokémon grátis para o competitivo, em português e inglês. É um projeto independente de fã, feito e mantido por Enzo Esmeraldo.',
            sections: [
                {
                    heading: 'O que é o PokemonBuilder?',
                    paragraphs: [
                        'Um conjunto de ferramentas grátis para montar times competitivos de Pokémon no navegador: um montador que analisa o time enquanto você monta, uma Pokédex completa, a calculadora de dano, o speed tiers, estatísticas de uso e times reais de torneio que entram no montador em um clique.',
                        'Funciona no celular ou no computador sem instalar nada, e os seus times ficam salvos sem conta. Com uma conta, eles vão com você para todos os aparelhos.',
                    ],
                    links: [{ to: '/builder', label: 'Abrir o montador' }, { to: '/guides', label: 'Ler os guias' }],
                },
                {
                    heading: 'Quem faz o site?',
                    paragraphs: [
                        'Enzo Esmeraldo, um desenvolvedor independente, projeta, escreve e mantém o site. Não há empresa nem anunciante por trás dele, e o código-fonte é público no GitHub, sob a licença MIT.',
                    ],
                    links: [{ href: GITHUB, label: 'Código-fonte no GitHub' }, { href: 'https://www.linkedin.com/in/enzoesmeraldo/', label: 'Enzo no LinkedIn' }],
                },
                {
                    heading: 'De onde vêm os dados?',
                    paragraphs: [
                        'Pokémon, golpes, habilidades e itens vêm da PokéAPI e dos dados do próprio Pokémon Showdown. O uso no ladder vem das estatísticas mensais do Smogon sobre as batalhas do Pokémon Showdown; nos regulamentos de VGC entram também os resultados dos torneios do Limitless. Os times de torneio vêm do VGCPastes, um repositório mantido pela comunidade. Os sets vêm do Smogon.',
                        'Os dados são atualizados todo dia, e as páginas que os mostram dizem de onde vêm os números e quando foram atualizados.',
                    ],
                    links: [{ to: '/methodology', label: 'Como a análise funciona' }, { to: '/meta', label: 'Meta e uso' }],
                },
                {
                    heading: 'É oficial?',
                    paragraphs: [
                        'Não. O PokemonBuilder não é afiliado, endossado nem patrocinado pela Nintendo, Game Freak, Creatures ou The Pokémon Company. Pokémon e os nomes dos personagens são marcas dos seus donos.',
                    ],
                },
                {
                    heading: 'Como entro em contato?',
                    paragraphs: [
                        `Escreva para ${CONTACT_EMAIL} com dúvidas, pedidos sobre os seus dados ou um erro que você encontrou. O botão de feedback no rodapé de todas as páginas chega na mesma caixa.`,
                    ],
                    links: [{ href: MAILTO, label: CONTACT_EMAIL }],
                },
            ],
        },
    },

    methodology: {
        updated: '2026-10-30',
        en: {
            lede: 'How the team builder grades a team, how it finds the meta threats to it, and how the damage calculator and speed tiers get their numbers. Everything here is the formula the site runs, so you can check any result by hand.',
            sections: [
                {
                    heading: 'How are a team\'s weaknesses found?',
                    paragraphs: [
                        'For each of the 18 attacking types, the builder multiplies the type chart\'s values across each member\'s types (Fire against Grass/Steel is 2 × 2 = 4×). A member is weak to the type above 1×, resists it below 1×, and an immunity is 0×.',
                        'A type counts as a team weakness when at least half of the team is weak to it and more members are weak than resist it. One weak member is normal; three members weak to Ground with nothing resisting it is the kind of hole the analysis points out.',
                        'Offensive coverage is the set of types the team\'s own types hit super effectively. It reads types, not moves, so it is the coverage of your Pokémon\'s STAB attacks.',
                    ],
                    links: [{ to: '/types', label: 'Type chart' }],
                },
                {
                    heading: 'How is the team score computed?',
                    paragraphs: [
                        'The score starts at 50 and adds 2 for each type the team hits super effectively, 1.5 for each type at least one member resists, and 5 for a full team of six; it subtracts 7.5 for each team weakness. The result is rounded and kept between 5 and 100.',
                        'The grades follow the score: Weak below 44, Fair from 44, Solid from 66 and Excellent from 82. The same formula grades a team everywhere it is shown, on the phone, on the computer and on a saved team.',
                    ],
                    steps: [
                        'Score = 50 + 2 × (types covered) + 1.5 × (types resisted) − 7.5 × (team weaknesses) + 5 (if six members)',
                        'Kept between 5 and 100, then rounded',
                    ],
                },
                {
                    heading: 'What does the score not see?',
                    paragraphs: [
                        'It reads types only. Moves, abilities (Levitate, for instance, removes a Ground weakness), items, stats and Tera types do not change it, and neither does how well the six play together. Use it to spot holes in type coverage, then check the matchups that matter with the damage calculator.',
                    ],
                    links: [{ to: '/damage-calculator', label: 'Damage calculator' }],
                },
                {
                    heading: 'How are partner suggestions and meta threats chosen?',
                    paragraphs: [
                        'Suggestions are Pokémon that resist at least one of the team\'s weaknesses, up to ten of them.',
                        'A meta threat is a Pokémon of the selected format whose types hit at least one of your members super effectively. Threats are ranked by how much they are used (usage share, weighted by tournament win rate around 50%) times the pressure they put on your team (the share of members they hit super effectively, times the strongest multiplier, up to 4×).',
                    ],
                    links: [{ to: '/builder', label: 'Open the team builder' }],
                },
                {
                    heading: 'How does the damage calculator work?',
                    paragraphs: [
                        'It uses the main-series stat and damage formulas, with 31 IVs and level 50 unless you change them. It accounts for natures, EVs, weather, terrain, burns, items, abilities, Terastallization, screens, spread moves in doubles, Helping Hand and critical hits, and shows all 16 damage rolls, from 85% to 100%.',
                        'Not every ability or item in the games is modelled. For an exotic interaction, confirm the result in Pokémon Showdown\'s calculator.',
                    ],
                    links: [{ to: '/damage-calculator', label: 'Open the damage calculator' }],
                },
                {
                    heading: 'How are speed tiers computed?',
                    paragraphs: [
                        'Every Pokémon\'s Speed at level 50 with 31 IVs, under four investments: no EVs, 252 EVs with a neutral nature, 252 EVs with a +Speed nature, and that spread holding a Choice Scarf (×1.5, rounded down). Pokémon with the same Speed share a tier.',
                    ],
                    links: [{ to: '/speed-tiers', label: 'Open Speed tiers' }],
                },
                {
                    heading: 'Where do the usage and tournament numbers come from?',
                    paragraphs: [
                        'Usage comes from Smogon\'s monthly statistics of Pokémon Showdown battles, merged with Limitless tournament results for VGC; tournament teams come from VGCPastes. The Meta & usage and Best teams pages state the sample and the date of their data under their lists.',
                        'Found a number that looks wrong? Write to ' + CONTACT_EMAIL + '.',
                    ],
                    links: [{ to: '/meta', label: 'Meta & usage' }, { to: '/best-teams', label: 'Best teams' }],
                },
            ],
        },
        pt: {
            lede: 'Como o montador avalia um time, como encontra as ameaças do meta a ele e de onde a calculadora de dano e o speed tiers tiram os números. Tudo aqui é a fórmula que o site roda, então dá para conferir qualquer resultado à mão.',
            sections: [
                {
                    heading: 'Como as fraquezas do time são encontradas?',
                    paragraphs: [
                        'Para cada um dos 18 tipos de ataque, o montador multiplica os valores da tabela de tipos entre os tipos de cada membro (Fogo contra Planta/Aço é 2 × 2 = 4×). Um membro é fraco ao tipo acima de 1×, resiste abaixo de 1×, e imunidade é 0×.',
                        'Um tipo conta como fraqueza do time quando pelo menos metade do time é fraca a ele e mais membros são fracos do que resistem. Um membro fraco é normal; três membros fracos a Terra e nenhum resistindo é o tipo de buraco que a análise aponta.',
                        'A cobertura ofensiva é o conjunto de tipos que os tipos do próprio time acertam com super efetividade. Ela lê tipos, não golpes, então é a cobertura dos ataques STAB dos seus Pokémon.',
                    ],
                    links: [{ to: '/types', label: 'Tabela de tipos' }],
                },
                {
                    heading: 'Como a nota do time é calculada?',
                    paragraphs: [
                        'A nota começa em 50 e soma 2 por tipo que o time acerta com super efetividade, 1,5 por tipo que pelo menos um membro resiste e 5 por um time completo de seis; subtrai 7,5 por fraqueza do time. O resultado é arredondado e fica entre 5 e 100.',
                        'As faixas seguem a nota: Frágil abaixo de 44, Ajustar a partir de 44, Sólido a partir de 66 e Excelente a partir de 82. A mesma fórmula avalia o time em todo lugar em que ele aparece, no celular, no computador e num time salvo.',
                    ],
                    steps: [
                        'Nota = 50 + 2 × (tipos cobertos) + 1,5 × (tipos resistidos) − 7,5 × (fraquezas do time) + 5 (se tiver seis membros)',
                        'Mantida entre 5 e 100 e arredondada',
                    ],
                },
                {
                    heading: 'O que a nota não enxerga?',
                    paragraphs: [
                        'Ela lê só os tipos. Golpes, habilidades (Levitate, por exemplo, anula a fraqueza a Terra), itens, status e Tera não mudam a nota, e nem o quanto os seis jogam bem juntos. Use a nota para achar buracos na cobertura de tipos e depois confira os confrontos que importam na calculadora de dano.',
                    ],
                    links: [{ to: '/damage-calculator', label: 'Calculadora de dano' }],
                },
                {
                    heading: 'Como são escolhidas as sugestões e as ameaças do meta?',
                    paragraphs: [
                        'As sugestões são Pokémon que resistem a pelo menos uma das fraquezas do time, até dez deles.',
                        'Uma ameaça do meta é um Pokémon do formato escolhido cujos tipos acertam pelo menos um dos seus membros com super efetividade. As ameaças são ordenadas pelo quanto são usadas (a taxa de uso, pesada pela taxa de vitória em torneios em torno de 50%) vezes a pressão que fazem no seu time (a parcela de membros que acertam com super efetividade, vezes o maior multiplicador, até 4×).',
                    ],
                    links: [{ to: '/builder', label: 'Abrir o montador' }],
                },
                {
                    heading: 'Como a calculadora de dano funciona?',
                    paragraphs: [
                        'Ela usa as fórmulas de status e de dano dos jogos principais, com IVs 31 e nível 50, a não ser que você mude. Ela considera naturezas, EVs, clima, terreno, queimadura, itens, habilidades, Terastalização, telas, golpes em área nas duplas, Helping Hand e acertos críticos, e mostra as 16 rolagens de dano, de 85% a 100%.',
                        'Nem toda habilidade ou item dos jogos está modelado. Para uma interação incomum, confirme o resultado na calculadora do Pokémon Showdown.',
                    ],
                    links: [{ to: '/damage-calculator', label: 'Abrir a calculadora de dano' }],
                },
                {
                    heading: 'Como o speed tiers é calculado?',
                    paragraphs: [
                        'A velocidade de cada Pokémon no nível 50 com IVs 31, em quatro investimentos: sem EVs, 252 EVs com natureza neutra, 252 EVs com natureza de Speed, e esse mesmo spread segurando uma Choice Scarf (×1,5, arredondado para baixo). Pokémon com a mesma velocidade dividem a mesma faixa.',
                    ],
                    links: [{ to: '/speed-tiers', label: 'Abrir o Speed tiers' }],
                },
                {
                    heading: 'De onde vêm os números de uso e de torneio?',
                    paragraphs: [
                        'O uso vem das estatísticas mensais do Smogon sobre as batalhas do Pokémon Showdown, junto com os resultados de torneios do Limitless no VGC; os times de torneio vêm do VGCPastes. As páginas Meta e uso e Melhores times dizem a amostra e a data dos dados embaixo das listas.',
                        'Achou um número que parece errado? Escreva para ' + CONTACT_EMAIL + '.',
                    ],
                    links: [{ to: '/meta', label: 'Meta e uso' }, { to: '/best-teams', label: 'Melhores times' }],
                },
            ],
        },
    },

    privacy: {
        updated: '2026-10-30',
        en: {
            lede: 'What PokemonBuilder stores about you, why, who else handles it, and how to delete it. In short: your teams and progress, the profile you choose to make public, and, only if you allow it, usage statistics. No ads, and your data is never sold.',
            sections: [
                {
                    heading: 'What is stored when you use the site without an account?',
                    paragraphs: [
                        'On your first visit the site creates an anonymous account for you: a random identifier, with no name or email. Under it, Firebase stores what you save: teams, favorites, quiz, PokéPuzzle and Champion Challenge results, and your progress.',
                        'Your browser also keeps preferences (language, theme, text size) and a copy of public game data in its own storage, so pages open faster. Clearing the site\'s data in your browser removes them.',
                    ],
                },
                {
                    heading: 'What is stored when you create an account?',
                    paragraphs: [
                        'Your email address and the display name you choose. Your password is handled by Firebase Authentication and is never visible to us.',
                        'An account has a public profile, visible to other players: your display name, avatar Pokémon, trainer sprite, badge, frame, title, trainer level and battle record. Your email is never shown on it.',
                    ],
                },
                {
                    heading: 'What becomes public?',
                    paragraphs: [
                        'What you publish on purpose: forum posts and comments, teams you share by link (anyone with the link can open them), and your name and score on the Champion Challenge ranking. Friend requests and battles are seen by the players involved.',
                    ],
                },
                {
                    heading: 'Notifications and email',
                    paragraphs: [
                        'If you turn on push notifications, your browser\'s push subscription is stored so the site can send them; turning notifications off or deleting your account removes it. If you turn on turn reminders for friend battles, they are sent to your account\'s email.',
                        'If you send feedback, the message and the email you type are stored so we can reply.',
                    ],
                },
                {
                    heading: 'Analytics and cookies',
                    consent: true,
                    paragraphs: [
                        'Only if you accept it on the banner, the site uses Google Analytics, through Firebase, to count visits and a few actions (opening the builder, saving or sharing a team). It records the pages you open, your device and browser, and your approximate country, and it sets cookies to tell a returning visit from a new one. It is not used for advertising.',
                        'Until you answer, and if you refuse, Google Analytics does not load and sets no cookies. Everything else the site keeps in your browser is what it needs to work: your preferences, your anonymous sign-in and a cache of game data. You can change your answer here at any time.',
                    ],
                },
                {
                    heading: 'Who else handles your data?',
                    paragraphs: [
                        'Google Firebase (authentication, database and analytics) and Google Cloud Storage (images), Vercel (hosting and the site\'s server functions), and Gmail (the email the site sends). Some Pokémon images load from GitHub, jsDelivr and Pokémon Showdown, which see your IP address like any website you load an image from. These providers may process data outside your country.',
                    ],
                },
                {
                    heading: 'How do you delete your data?',
                    paragraphs: [
                        'In Profile → Account → Delete account. It erases your teams, favorites, results, profile, friendships, push subscriptions and Champion Challenge ranking, then the account itself. Forum posts are not erased automatically: delete them before, or write to us and we remove them.',
                        'Under Brazil\'s LGPD and similar laws you can ask to see, correct or delete your data at any time by writing to ' + CONTACT_EMAIL + '.',
                    ],
                    links: [{ href: MAILTO, label: CONTACT_EMAIL }],
                },
                {
                    heading: 'Changes to this policy',
                    paragraphs: [
                        'When this policy changes, the date at the top of the page changes with it. The previous versions are in the site\'s public source code on GitHub.',
                    ],
                    links: [{ href: GITHUB, label: 'Source code on GitHub' }],
                },
            ],
        },
        pt: {
            lede: 'O que o PokemonBuilder guarda sobre você, para quê, quem mais lida com esses dados e como apagá-los. Em resumo: os seus times e o seu progresso, o perfil que você escolhe tornar público e, só se você permitir, estatísticas de uso. Sem anúncios, e os seus dados nunca são vendidos.',
            sections: [
                {
                    heading: 'O que é guardado quando você usa o site sem conta?',
                    paragraphs: [
                        'Na primeira visita o site cria uma conta anônima para você: um identificador aleatório, sem nome nem e-mail. Nele, o Firebase guarda o que você salva: times, favoritos, resultados do quiz, do PokéPuzzle e do Desafio do Campeão, e o seu progresso.',
                        'O seu navegador também guarda preferências (idioma, tema, tamanho do texto) e uma cópia de dados públicos do jogo no próprio armazenamento, para as páginas abrirem mais rápido. Apagar os dados do site no navegador os remove.',
                    ],
                },
                {
                    heading: 'O que é guardado quando você cria uma conta?',
                    paragraphs: [
                        'O seu e-mail e o nome de exibição que você escolher. A senha fica com o Firebase Authentication e nunca fica visível para nós.',
                        'Uma conta tem um perfil público, visível para outros jogadores: nome de exibição, Pokémon de avatar, sprite de treinador, insígnia, moldura, título, nível de treinador e histórico de batalhas. O seu e-mail nunca aparece nele.',
                    ],
                },
                {
                    heading: 'O que fica público?',
                    paragraphs: [
                        'O que você publica de propósito: posts e comentários no fórum, times que você compartilha por link (quem tiver o link consegue abrir) e o seu nome e pontuação no ranking do Desafio do Campeão. Pedidos de amizade e batalhas são vistos pelos jogadores envolvidos.',
                    ],
                },
                {
                    heading: 'Notificações e e-mail',
                    paragraphs: [
                        'Se você ativar as notificações push, a inscrição push do seu navegador é guardada para o site poder enviá-las; desligar as notificações ou excluir a conta a remove. Se você ativar os lembretes de vez nas batalhas entre amigos, eles vão para o e-mail da sua conta.',
                        'Se você mandar um feedback, a mensagem e o e-mail que você digitar ficam guardados para podermos responder.',
                    ],
                },
                {
                    heading: 'Estatísticas e cookies',
                    consent: true,
                    paragraphs: [
                        'Só se você aceitar no aviso, o site usa o Google Analytics, pelo Firebase, para contar visitas e algumas ações (abrir o montador, salvar ou compartilhar um time). Ele registra as páginas que você abre, o seu aparelho e navegador e o seu país aproximado, e usa cookies para distinguir uma visita de volta de uma nova. Ele não é usado para publicidade.',
                        'Até você responder, e se você recusar, o Google Analytics não carrega e não grava cookies. O resto que o site guarda no seu navegador é o que ele precisa para funcionar: as suas preferências, o seu login anônimo e um cache de dados do jogo. Você pode mudar a sua resposta aqui a qualquer momento.',
                    ],
                },
                {
                    heading: 'Quem mais lida com os seus dados?',
                    paragraphs: [
                        'O Google Firebase (autenticação, banco de dados e estatísticas) e o Google Cloud Storage (imagens), a Vercel (hospedagem e as funções de servidor do site) e o Gmail (os e-mails que o site envia). Algumas imagens de Pokémon carregam do GitHub, do jsDelivr e do Pokémon Showdown, que veem o seu endereço IP como qualquer site de onde você carrega uma imagem. Esses serviços podem tratar dados fora do seu país.',
                    ],
                },
                {
                    heading: 'Como apagar os seus dados?',
                    paragraphs: [
                        'Em Perfil → Conta → Excluir conta. Isso apaga os seus times, favoritos, resultados, perfil, amizades, inscrições push e posição no ranking do Desafio do Campeão, e depois a própria conta. Posts no fórum não são apagados automaticamente: apague-os antes, ou escreva para nós e nós os removemos.',
                        'Pela LGPD você pode pedir para ver, corrigir ou apagar os seus dados a qualquer momento, escrevendo para ' + CONTACT_EMAIL + '.',
                    ],
                    links: [{ href: MAILTO, label: CONTACT_EMAIL }],
                },
                {
                    heading: 'Mudanças nesta política',
                    paragraphs: [
                        'Quando esta política mudar, a data no topo da página muda junto. As versões anteriores estão no código-fonte público do site, no GitHub.',
                    ],
                    links: [{ href: GITHUB, label: 'Código-fonte no GitHub' }],
                },
            ],
        },
    },

    terms: {
        updated: '2026-10-30',
        en: {
            lede: 'The rules for using PokemonBuilder. They are short because the site is simple: it is free, it is a fan project, and the community spaces have to stay friendly.',
            sections: [
                {
                    heading: 'Using the site',
                    paragraphs: [
                        'PokemonBuilder is free to use, with or without an account. By using it you agree to these terms; if you do not, please do not use the site.',
                    ],
                },
                {
                    heading: 'An unofficial fan project',
                    paragraphs: [
                        'PokemonBuilder is not affiliated with, endorsed or sponsored by Nintendo, Game Freak, Creatures or The Pokémon Company. Pokémon, its names and its images are trademarks and copyrighted works of their owners, used here to describe the games.',
                    ],
                },
                {
                    heading: 'Your account',
                    paragraphs: [
                        'Keep your password to yourself; what is done with your account is your responsibility. You can delete your account at any time in Profile → Account.',
                    ],
                    links: [{ to: '/privacy', label: 'Privacy policy' }],
                },
                {
                    heading: 'What you post',
                    paragraphs: [
                        'Forum posts, comments, display names and shared teams are yours, and you are responsible for them. By posting you allow the site to show them to other players.',
                        'Not allowed: harassment, hate, sexual content, spam, impersonation, other people\'s private information, and anything illegal. Moderators may remove content that breaks these rules, and suspend or delete the accounts that post it.',
                    ],
                },
                {
                    heading: 'No guarantees',
                    paragraphs: [
                        'The site is provided as it is. Calculations and data are checked with care but may contain mistakes, and the site may change, be unavailable or stop. To the extent the law allows, PokemonBuilder is not liable for losses from using it, including lost teams or progress.',
                    ],
                    links: [{ to: '/methodology', label: 'How the analysis works' }],
                },
                {
                    heading: 'Source code',
                    paragraphs: [
                        'The site\'s code is open source under the MIT license. The license covers the code, not Pokémon names and images, which belong to their owners.',
                    ],
                    links: [{ href: GITHUB, label: 'Source code on GitHub' }],
                },
                {
                    heading: 'Changes and contact',
                    paragraphs: [
                        `These terms may change; the date at the top of the page says when they last did. Questions go to ${CONTACT_EMAIL}.`,
                    ],
                    links: [{ href: MAILTO, label: CONTACT_EMAIL }],
                },
            ],
        },
        pt: {
            lede: 'As regras para usar o PokemonBuilder. Elas são curtas porque o site é simples: ele é grátis, é um projeto de fã, e os espaços da comunidade precisam continuar amigáveis.',
            sections: [
                {
                    heading: 'Uso do site',
                    paragraphs: [
                        'O PokemonBuilder é grátis, com ou sem conta. Ao usá-lo você concorda com estes termos; se não concordar, por favor não use o site.',
                    ],
                },
                {
                    heading: 'Um projeto de fã, não oficial',
                    paragraphs: [
                        'O PokemonBuilder não é afiliado, endossado nem patrocinado pela Nintendo, Game Freak, Creatures ou The Pokémon Company. Pokémon, os nomes e as imagens são marcas e obras protegidas dos seus donos, usadas aqui para descrever os jogos.',
                    ],
                },
                {
                    heading: 'A sua conta',
                    paragraphs: [
                        'Guarde a sua senha só para você; o que é feito com a sua conta é responsabilidade sua. Você pode excluir a conta a qualquer momento em Perfil → Conta.',
                    ],
                    links: [{ to: '/privacy', label: 'Política de privacidade' }],
                },
                {
                    heading: 'O que você publica',
                    paragraphs: [
                        'Posts no fórum, comentários, nomes de exibição e times compartilhados são seus, e você responde por eles. Ao publicar, você permite que o site os mostre para outros jogadores.',
                        'Não é permitido: assédio, discurso de ódio, conteúdo sexual, spam, se passar por outra pessoa, expor informações privadas de outras pessoas e qualquer coisa ilegal. Os moderadores podem remover o conteúdo que quebrar estas regras e suspender ou excluir as contas que o publicarem.',
                    ],
                },
                {
                    heading: 'Sem garantias',
                    paragraphs: [
                        'O site é oferecido como está. Os cálculos e os dados são conferidos com cuidado, mas podem ter erros, e o site pode mudar, ficar fora do ar ou ser encerrado. Na medida em que a lei permite, o PokemonBuilder não responde por perdas causadas pelo uso, incluindo times ou progresso perdidos.',
                    ],
                    links: [{ to: '/methodology', label: 'Como a análise funciona' }],
                },
                {
                    heading: 'Código-fonte',
                    paragraphs: [
                        'O código do site é aberto, sob a licença MIT. A licença cobre o código, não os nomes e as imagens de Pokémon, que pertencem aos seus donos.',
                    ],
                    links: [{ href: GITHUB, label: 'Código-fonte no GitHub' }],
                },
                {
                    heading: 'Mudanças e contato',
                    paragraphs: [
                        `Estes termos podem mudar; a data no topo da página diz quando mudaram pela última vez. Dúvidas vão para ${CONTACT_EMAIL}.`,
                    ],
                    links: [{ href: MAILTO, label: CONTACT_EMAIL }],
                },
            ],
        },
    },
};

/** `{ updated, lede, sections }` for one page in one language, or null. */
export function sitePageContent(key, language) {
    const page = SITE_PAGES[key];
    if (!page) return null;
    return { updated: page.updated, ...(page[language] || page.en) };
}
