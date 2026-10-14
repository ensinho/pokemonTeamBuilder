# Plano — Desafio da Campeã (batalha diária contra a Cynthia)

> Status: **proposta, aguardando alinhamento** (fluxo `/feature`, etapa 2). Nenhum código
> produtivo foi alterado. As decisões em aberto estão na seção 14.
> Data: 2026-10-14.

## 0. Resumo

Uma rota nova, `/challenge`, com visual de Pokémon Platinum no formato de um Nintendo DS:

1. O jogador anda pela sala da Campeã até a Cynthia.
2. Escolhe um time: um dos seus times salvos ou o **Time do dia**.
3. Enfrenta o time da Cynthia, que muda todo dia.
4. A Cynthia é uma IA que decide cada turno no servidor e reage ao que o jogador faz.

Os layouts são:
- **Desktop:** horizontal, como um emulador (cena grande ao lado da tela de toque).
- **Celular:** vertical, como o DS (cena em cima, Pokétch e comandos embaixo).

A Home ganha um card de status do dia. A rota entra em *Jogos* na barra lateral.

A base técnica já existe: `@pkmn/sim` no servidor, leitores de protocolo no cliente, dados da Cynthia em `gym-leaders.json`, sprites via `@pkmn/img`. O trabalho novo é:
- a IA;
- o modo jogador × CPU;
- a interface de console.

---

## 1. Experiência do jogador (fluxo)

1. **Home → card "Desafio da Campeã"**. Mostra a silhueta do primeiro Pokémon da Cynthia hoje, o estado (*disponível*, *vitória*, *derrota*), a sequência de dias e o tempo até o próximo time.
2. **Arena (tela de cima).** Sala da Liga vista de cima, com o anel da Poké Ball no centro e a Cynthia no topo.
   - O jogador anda com o D-pad (celular) ou com setas/WASD (desktop).
   - Também pode tocar num ponto do chão para o boneco andar sozinho até lá.
   - Enquanto isso, a tela de baixo mostra o **Pokétch** com o time escolhido.
3. **Encontro.** Ao chegar na frente da Cynthia, aparecem o balão "!" e um diálogo com efeito de máquina de escrever.
   - Se ainda não houver time escolhido, o seletor abre na tela de baixo.
4. **Transição de batalha.** Flash e espiral (cerca de 1 s; com *reduced motion* vira um fade simples).
5. **Batalha (tela de cima).** Cenário da imagem de referência: céu claro, chão verde-água e duas plataformas elípticas.
   - A Cynthia entra com o sprite de Gen 4.
   - Seis Poké Balls indicam o time de cada lado.
   - Caixas de HP no estilo DPPt e caixa de texto embaixo.
6. **Comandos (tela de baixo).** Estilo DPPt:
   - **LUTAR** abre os 4 golpes, coloridos pelo tipo e com PP.
   - **POKÉMON** abre a equipe no estilo Pokétch, com HP, para trocar.
   - **DESISTIR** pede confirmação com `confirmAction()`.
   - Não há BOLSA (sem itens, como na Battle Tower).
7. **Turno.**
   - O jogador escolhe; a caixa de texto mostra "Cynthia está pensando…" (feedback otimista, ver wound 2026-07-27).
   - O servidor responde e os eventos do turno são animados em sequência: golpe, dano, efetividade, desmaio, troca.
   - Tocar na caixa de texto, ou apertar A, acelera a sequência.
8. **Fim.** Tela de vitória ou derrota com turnos, Pokémon restantes e sequência de dias.
   - Botão **Revanche (treino)**: mesmo time da Cynthia, sem contar para a sequência.
   - Compartilhamento entra na fase 6.

Quem volta pode pular a caminhada: o botão "Ir até a Cynthia" fica visível depois da primeira vez. A caminhada é charme na primeira vez e atrito na trigésima (skill `ux`, "fewer steps").

---

## 2. O que já existe e será reaproveitado

| Peça existente | Onde | Uso no desafio |
|---|---|---|
| Simulador autoritativo | `api/_lib/battleResolver.js` (`packTeam`), `@pkmn/sim@0.10.11` | Mesma versão, mesmo formato `gen9customgame`, nível 50 |
| Times aleatórios determinísticos | `api/_lib/randomTeams.js` → `generateRandomTeam({seed})` | **Time do dia** (seed derivada da data) |
| Leitores de protocolo | `src/utils/battleProtocol.js` (`readMyRequest`, `describeLogLines`), `src/utils/battleState.js` (`readBattleField`, `hpTone`) | Estado da cena, menu de golpes, textos da caixa |
| Sprites de batalha | `src/utils/battleSprites.js` + `@pkmn/img` (suporta `gen4`) | Pokémon em estilo DS (≤ #493), com fallback para gen5 |
| Times da Cynthia | `public/data/gym-leaders.json` (DP, Pt, BDSP, Renegade Platinum) | Fonte do pool de rotação |
| Sprite da Cynthia | `trainer-sprites.json` → `cynthia-gen4` (Showdown) | Intro da batalha, idêntico à referência |
| Avatar do jogador | `src/utils/avatar.js` (sprite de treinador escolhido) | Identidade do jogador na tela de VS |
| Export de time | `buildShowdownExportText` + `buildBattleTeamText` (`src/utils/battle.js`) | Time salvo → texto Showdown para o servidor |
| Sets competitivos | `src/utils/loadCompetitivePreset.js` | Completar membros sem golpes |
| Dados de UI | `battle-dex.json`, `move-types.json` (lazy) | Tooltips, cor de tipo nos botões |
| Padrões de endpoint | `api/battle-turn.js` (`loadDeps`, `?ping`, self-check), `runtimeGuards.js`, `httpBasics.js` | Esqueleto do endpoint novo |
| Teste com Firestore em memória | `api/battle-turn.test.js` | Modelo para o teste do handler novo |
| Card diário da Home | `CozyHomeView.jsx:437-512` (`cozy-day__card--feature`) | Modelo do card de status |

---

## 3. Decisões de arquitetura (com o porquê)

### 3.1 Simulador e IA rodam no servidor
- **Peso.** O `@pkmn/sim` tem 1018 KB gzip, e o chunk dele chegou a 6,5 MB quando vazou para o cliente: o precache foi a 13,7 MB (wound 2026-10-13, `vite.config.js:25-29`). A regra do projeto é que nada do mundo de `api/` (sim, dex, randoms) é importado por `src/`.
- **Sets ocultos.** É o mesmo motivo do PvP: no navegador, os sets da Cynthia estariam visíveis no DevTools.
- **Integridade.** Vitória, sequência e ranking só valem se o servidor for a autoridade.
- **Descartado:** um motor "simplificado" no cliente feito com `damageCalc.js`. Duplicaria a mecânica, divergiria do sim e seria trapaceável.

### 3.2 API síncrona `Battle` em vez de streams
O resolver PvP usa `BattleStreams` com 5 ms de espera por escolha. Num duelo contra CPU o processo é um só, então a API síncrona é mais simples e mais segura. Spike medido nesta sessão:

| Medida | Resultado |
|---|---|
| `require('@pkmn/sim')` a frio (local) | 544 ms |
| Replay completo de 42 turnos / 91 escolhas | **64 ms**, log byte a byte idêntico ao da partida ao vivo |
| `battle.choose('p1', 'move 3')` ilegal | Retorna `false` e emite `\|error\|[Invalid choice] …`, ou seja, o sim é o validador |
| `Battle.fromJSON(battle.toJSON())` + `actions.getDamage(...)` | Funciona; a IA calcula numa **cópia** e não toca o PRNG da batalha real |
| `extractChannelMessages` | Exportado pelo pacote; gera o log na perspectiva do p1 a partir de `battle.log` |
| Regras extras via `Dex.formats.validate('gen9customgame@@@…')` | Aceita Sleep Clause Mod, Species, OHKO, Evasion Moves e Terastal Clause |

Sem streams, não existem as promises soltas que derrubavam a função (wound 2026-07-27).

### 3.3 As partidas ficam **fora** de `users/{uid}/`
A regra `match /users/{userId}/{document=**} { allow read, write: if isOwner(userId) }` (`firestore.rules:38-40`) dá escrita total ao dono. Regras do Firestore somam permissões: uma sub-regra não consegue tirar o que o curinga deu. Uma partida guardada ali poderia ser marcada como vitória pelo console. Por isso:
- **Partidas:** `artifacts/{appId}/challengeRuns/{uid}_{dayKey}`. O dono lê; ninguém escreve pelo cliente; o dono pode apagar (necessário para a exclusão de conta).
- **Estatísticas:** `artifacts/{appId}/challengeStats/{uid}` (sequência, recordes). Só o servidor escreve.
- **Exclusão de conta:** `accountDeletion.js` precisa apagar esses dois caminhos (consulta por `uid`). A regra do `CLAUDE.md` sobre `USER_COLLECTIONS` cobre só `users/`, então este caso vira item explícito do plano.

### 3.4 O "dia" é o dia local, como no PokéPuzzle
- O cliente envia `dayKey` (`YYYY-M-D`, o mesmo formato de `useDailyPuzzle.js:21`) e o fuso.
- O servidor só aceita um `dayKey` que seja "hoje" em algum fuso válido (UTC−12 a UTC+14 em relação ao relógio do servidor).
- O cálculo do dia hoje está duplicado em 3 lugares. O plano extrai um `localDayKey()` compartilhado em `src/utils/dayKey.js`, e o desafio passa a usá-lo.
- **Achado paralelo, fora do escopo:** `advanceStreak` em `useAuthStore.js` usa `toISOString()` (data UTC). Para quem está em UTC−3 e joga depois das 21h, a sequência do PokéPuzzle conta no dia seguinte. Vale uma correção separada com `/log-wound`.

### 3.5 Regras da batalha
- **Formato:** simples, 6×6, `gen9customgame` com Sleep Clause Mod, Species Clause, OHKO Clause, Evasion Moves Clause e **Terastal Clause**. A tela não tem botão de Tera, e o DPPt também não tinha.
- **Nível:** todos no 50, inclusive a Cynthia, como na Battle Tower. O `showdownExport` já emite `Level: 50`.
- **Itens:** sem itens de bolsa; itens segurados valem.
- **Restrições ao time próprio:** decisão em aberto (§14.4).

### 3.6 Renderização em DOM + CSS, na resolução do DS
- Cada tela tem coordenadas internas de **256×192** (resolução nativa do DS).
- Toda a geometria da cena é escrita em "pixels de DS", multiplicados por uma variável `--px`. Um `ResizeObserver` calcula `--px` e o arredonda para inteiro quando a escala for ≥ 2, para manter os pixels nítidos.
- **Sem engine de jogo** (Phaser e similares custam cerca de 1 MB). Uma sala de 16×12 tiles com dois personagens e uma cena de batalha com dois sprites cabem bem no DOM.
- Vantagens do DOM: texto real (i18n, leitor de tela, zoom), botões reais e nenhuma dependência nova.
- Os sprites do Showdown não mandam cabeçalho CORS, então só podem ir em `<img>`, nunca em `<canvas>` (`useTrainerSprites.js:19-24`). Mais um motivo para DOM.

---

## 4. Rotação diária do time da Cynthia

### 4.1 Pool de possibilidades
O pool fica no servidor, em `api/_lib/championPool.js`, para que os sets continuem ocultos.

| Grupo | Espécies | Fonte |
|---|---|---|
| Núcleo (sempre presente) | **Garchomp** (sempre o último, como no jogo) | Todas as versões |
| Frequentes | Spiritomb, Lucario, Milotic, Togekiss, Roserade | DP, Pt, BDSP, Renegade Platinum (`gym-leaders.json`); pokemon.com |
| Ocasionais | Gastrodon, Glaceon, Eelektross, Braviary | Gastrodon: DP/BDSP (`gym-leaders.json`). Glaceon (PWT), Eelektross e Braviary (Unova): pokemon.com, **sets a confirmar na Bulbapedia** |

Cada espécie tem de 1 a 3 **variantes de set**, por exemplo:
- `spiritomb:platinum`: Dark Pulse / Shadow Ball / Psychic / Silver Wind.
- `spiritomb:renegade`: Lum Berry, Pressure, Dark Pulse / Will-O-Wisp / Confuse Ray / Rest.

Cada variante guarda o texto Showdown completo e a fonte (wiki ou jogo).

### 4.2 Algoritmo
Função pura `championTeamFor(dayKey)` em `api/_lib/championRotation.js`:

1. `seed = hash('champion:' + dayKey)`, usando o `PRNG` do próprio sim.
2. Sorteia o **primeiro Pokémon** entre os frequentes, com peso maior para Spiritomb (o primeiro clássico).
3. Sorteia mais 4 espécies sem repetição: no mínimo 3 frequentes e no máximo 1 ocasional.
4. Garchomp fecha o time.
5. Escolhe a variante de cada espécie conforme a **dificuldade do dia** (abaixo).
6. **Anti-repetição:** a composição de hoje não pode ser igual à de nenhum dos últimos 7 dias. Se for, sorteia de novo com `seed+1`. Isso é determinístico, porque calcular os 7 dias anteriores é só aritmética.

### 4.3 Dificuldade pelo dia da semana

| Dia | Nome do desafio | Sets | IA |
|---|---|---|---|
| Seg, Ter | Diamante & Pérola | Golpes dos jogos originais, sem item, sem EVs | Temperatura alta (erra às vezes) e prevê pouco |
| Qua, Qui | Platina | Golpes do Platinum, itens simples | Média |
| Sex, Sáb | Revanche | Itens e habilidades (estilo Renegade/BDSP), EVs distribuídos | Baixa, prevê trocas |
| Dom | Campeã Mundial | Sets competitivos (estilo PWT) | Mínima, a Cynthia "a sério" |

"Atualiza diariamente conforme possibilidades" significa composição, variantes e dificuldade mudando juntas. O card da Home e a tela de abertura mostram o nome do desafio do dia.

---

## 5. Time do jogador

O seletor abre na tela de baixo, com duas abas:

**Meus times.** Os times salvos (`useFirestoreTeams`), cada um com mini-sprites e validação na hora:
- Membro **sem golpes**: aviso e botão **"Completar com set competitivo"**, que usa `loadCompetitivePreset`. Também há um link para o Builder.
- Mais de 6 membros, ou time vazio: bloqueado, com o motivo.
- O texto enviado é o de `buildBattleTeamText`. O servidor valida de novo (o `packTeam` existente mais a construção do `Battle`).

**Time do dia.** Time igual para todos os jogadores no mesmo dia:
- Gerado no servidor com `generateRandomTeam({seed: hash('daily-team:' + dayKey)})` e nível forçado em 50.
- Aparece aberto, com golpes, item e habilidade, porque o time é do jogador.
- É a modalidade "justa" do ranking (fase 6).

---

## 6. A IA da Cynthia

Arquivo: `api/_lib/cynthiaAI.js`. Exporta uma função pura:
`decide({ battle, request, history, rng, difficulty }) → 'move 2' | 'switch 4' | 'default'`.

### 6.1 Invariantes (cada um vira teste)
1. **Decide antes de ver a escolha do jogador.** A IA recebe uma cópia feita *antes* de `choose('p1', …)` ser aplicado. Se recebesse a batalha depois, poderia ler a ação do jogador na fila. Teste: a decisão é idêntica para qualquer escolha do p1.
2. **Nunca consome o PRNG da batalha.** Todo cálculo (`getDamage`, ordem de velocidade) roda em `Battle.fromJSON(battle.toJSON())`. Teste: replay depois de um turno ao vivo gera log idêntico.
3. **É determinística.** A aleatoriedade vem de `rng = PRNG(hash(seed, turn, 'ai'))`. A mesma partida reproduz as mesmas decisões, e os testes ficam estáveis.
4. **Escolhas ficam gravadas.** O histórico guarda as escolhas dos dois lados. O replay nunca chama a IA de novo, então ajustar a IA (`AI_VERSION`) não altera partidas em andamento.
5. **Só usa informação que a Cynthia teria.** Golpes e itens do jogador só contam depois de revelados no log. Golpes ainda não vistos são estimados: um STAB de 80–90 de poder por tipo da espécie.
6. **Nunca faz escolha ilegal.** As opções saem do `request` do lado p2. Fuzz: 200 batalhas aleatórias sem nenhum `|error|`.

### 6.2 Como decide (por turno)
1. **Lista as opções legais:** golpes com PP e não desabilitados, trocas válidas, `forceSwitch` e `trapped`.
2. **Estima o confronto** com `getDamage` na cópia (máximo e mínimo):
   - dano esperado de cada golpe meu no Pokémon ativo do jogador, já com precisão e prioridade;
   - quem age primeiro (`getStat('spe')` com boosts, paralisia, Trick Room);
   - a maior ameaça do jogador contra mim (golpes revelados mais os STAB estimados).
3. **Pontua cada opção:**
   - **Ataque:** dano esperado em %, mais um bônus grande se nocauteia. O bônus é maior se eu ajo antes, e um golpe de prioridade quando o alvo está baixo vale extra (Extreme Speed, Sucker Punch).
   - **Preparação** (Nasty Plot, Swords Dance, Coil…): vale se a ameaça do jogador contra mim estiver abaixo de ~35% e meu HP acima de 60%. O valor cai a cada boost já acumulado.
   - **Status:**
     - Will-O-Wisp contra atacante físico;
     - Thunder Wave contra quem é mais rápido;
     - sono só se a Sleep Clause permitir.
     Nada disso vale contra quem já tem status ou é imune.
   - **Cura** (Recover, Roost, Rest): HP abaixo de 50% e o jogador sem chance de nocaute no turno.
   - **Troca:** só quando o ativo leva nocaute antes de agir, ou o confronto é muito ruim. O substituto é quem resiste à ameaça e bate forte de volta. Trocas seguidas têm penalidade, e **Garchomp nunca sai**.
4. **Escolhe** com softmax sobre as notas. A temperatura vem da dificuldade: no domingo é praticamente o argmax.
5. **Substituição após desmaio:** entra o melhor confronto contra o ativo do jogador. Garchomp fica por último enquanto houver outro.

### 6.3 Como reage ao jogador ("IA dinâmica")
A memória é **derivada do histórico** a cada replay. Não há estado extra, então tudo continua determinístico.

| Padrão do jogador | Resposta da Cynthia |
|---|---|
| Troca com frequência | Às vezes usa o golpe que pune quem entra (previsão de troca), a partir de Revanche |
| Repete o mesmo golpe | Considera esse golpe como a próxima ameaça e troca para quem resiste |
| Prepara boosts | Prioriza nocaute imediato ou Haze (Milotic) |
| Está com o último Pokémon | Joga para fechar a partida: prioridade, golpe mais seguro |

Falas reativas aparecem na caixa de texto: início, primeiro nocaute sofrido, envio do Garchomp, último Pokémon, vitória e derrota. Os textos são originais (sem copiar o diálogo do jogo), ficam em `translations.js` e saem do servidor como **chaves**, não como texto.

### 6.4 Desempenho
- Por turno: replay de ~5–70 ms mais a IA (cópia + no máximo 4×6 chamadas de `getDamage`), meta < 50 ms.
- Com a leitura e a escrita no Firestore, a meta é **p50 < 400 ms com a função quente**.
- **Partida a frio:** carregar sim + firebase-admin custa cerca de 1 s. O cliente faz `GET /api/challenge?ping=1` ao **entrar na arena**, e a caminhada até a Cynthia (3–5 s) esconde o tempo de partida a frio.

---

## 7. Endpoint e dados

**Função nova:** `api/challenge.js`. Passa de 7 para 8 das 12 funções do plano Hobby; conferir com `find api -name '*.js' ! -name '*.test.js' ! -path 'api/_lib/*'`.

Ela segue o padrão de `battle-turn.js`:
- imports estáticos só de builtins, `httpBasics` e `runtimeGuards`;
- o resto carrega em `loadDeps()`;
- `?ping=1` responde antes de carregar qualquer coisa;
- o `GET` sem parâmetros é um self-check que inclui um turno real de IA.

`POST /api/challenge` exige `Authorization: Bearer <ID token>`. Contas anônimas também têm token.

| `action` | Entrada | Saída |
|---|---|---|
| `today` | `dayKey`, `tz` | `{dayKey, challengeName, difficulty, cynthia: {species: [ids]}, dailyTeam, run}`. As espécies servem para as silhuetas do Pokétch; os sets continuam ocultos |
| `start` | `dayKey`, `team: {source: 'saved', showdownText, teamId} \| {source: 'daily'}`, `practice?` | `{runId, log, request}` (perspectiva p1, até o primeiro pedido) |
| `choose` | `runId`, `turn`, `choice` | `{logDelta, request, status, result?}`. Uma escolha ilegal volta 400 com a mensagem do sim |
| `forfeit` | `runId` | `{status: 'lost', result}` |

**Fluxo de `choose`** (dentro de uma transação):
1. Carrega a partida e confere dono, `status: 'active'` e `turn`. Se o turno já avançou, devolve o delta guardado (idempotência).
2. Faz o replay a partir de `seed` + `teams` + `choices`.
3. Faz a cópia para a IA.
4. Aplica a escolha do p1. Se for ilegal, responde 400.
5. Enquanto o p2 dever escolha (`owesChoice`), pede a decisão à IA e aplica. Isso cobre a substituição após desmaio sem esperar o p1 (wound 2026-07-27).
6. Grava as escolhas, o delta do log do p1 e o novo pedido.
7. Se a batalha acabou, grava o resultado, atualiza `challengeStats` (sequência pelo `dayKey` local) e, na fase 6, a entrada do ranking.

**Documento da partida** em `challengeRuns/{uid}_{dayKey}`; treinos usam `…_{dayKey}_p{n}`:
`{uid, dayKey, practice, teamSource, teamName, playerTeam (texto Showdown), logRounds, turn, status: 'active'|'won'|'lost', result: {turns, remaining, hpPct}, engineVersion, aiVersion, createdAt, updatedAt}`.
- O cliente **não** pode ler o set da Cynthia, nem `seed` e `choices`: com eles, daria para refazer a batalha e prever o RNG.
- Por isso o time da Cynthia, `seed` e `choices` ficam numa subcoleção `challengeRuns/{id}/secret/state` com `allow read: if false`. Só o servidor lê, com o Admin SDK.

**Regras novas em `firestore.rules`:**
- `challengeRuns/{id}`: o dono lê (`resource.data.uid == request.auth.uid`); `create, update: if false`; `delete: if isOwner(...)`.
- `challengeRuns/{id}/secret/{doc}`: `allow read, write: if false`.
- `challengeStats/{uid}`: o dono lê; o servidor escreve.
- Fase 6: `public/data/challengeBoards/{dayKey}/entries/{uid}`, com leitura pública e escrita só do servidor.

---

## 8. Interface

### 8.1 Layouts

**Desktop (≥ 1024 px): horizontal, "híbrido" de emulador**
```
┌───────────────────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────┐  ┌──────────────────────┐ │
│ │                                     │  │  TELA DE BAIXO       │ │
│ │  TELA DE CIMA  (256×192 × 3)        │  │  (256×192 × 2)       │ │
│ │  arena  ⇄  batalha                  │  │  Pokétch / comandos  │ │
│ │                                     │  │  ┌──────────────────┐│ │
│ │                                     │  │  │      LUTAR       ││ │
│ │ ┌─ caixa de texto ────────────────┐ │  │  └──────────────────┘│ │
│ │ │ Garchomp usou Dragon Claw!      │ │  │  [POKÉMON] [DESISTIR]│ │
│ │ └─────────────────────────────────┘ │  └──────────────────────┘ │
│ └─────────────────────────────────────┘   Teclas: ←↑→↓ · Z/Enter=A │
│                                           X/Esc=B · 1–4 golpes      │
└───────────────────────────────────────────────────────────────────┘
```

**Celular (< 1024 px): vertical, como o DS aberto**
```
┌────────────────────────┐
│ TELA DE CIMA           │  largura total, 4:3
│ arena / batalha        │
│ [caixa de texto]       │
├──────── dobradiça ─────┤
│ TELA DE BAIXO          │  na arena: D-pad + A/B + Pokétch
│ ┌────┐  ┌───┐┌───┐     │  na batalha: LUTAR / POKÉMON / DESISTIR
│ │ ✚  │  │ A ││ B │     │
│ └────┘  └───┘└───┘     │
└────────────────────────┘
```
- No celular a escala é a largura disponível ÷ 256. Em 390 px de largura, cada tela tem cerca de 358×268, e as duas cabem com o cabeçalho e o dock (cerca de 708 px úteis).
- Valem as regras de celular do `design-system`: altura em `dvh`, nunca `100vh`; chrome sólido, sem `backdrop-filter`; a barra de abas continua sendo a navegação.

### 8.2 Tela de cima: arena
- Grade de 16×12 tiles de 16 px: piso escuro quadriculado, luminárias e pilares nas laterais (com colisão), anel verde-água da Poké Ball no centro, painel azul atrás da Cynthia.
- Movimento em grade: um passo por tile a cada ~160 ms, com 3 quadros de caminhada nas 4 direções.
- `arenaMap.js` (puro, testado) guarda o mapa de colisão e um BFS para o "toque para andar".
- Gatilho do encontro: tile em frente à Cynthia, ou A apertado de frente para ela.
- O handler de teclado confere `event.target` e se há diálogo aberto antes de mover (wound 2026-10-13, PokéPuzzle engolindo digitação).

### 8.3 Tela de cima: batalha
- O cenário é só CSS: gradiente de céu, chão verde-água e duas elipses. Não precisa de imagem.
- **Sprites de Pokémon:** `@pkmn/img` com `gen: 'gen4'` (frente e costas, até #493) e fallback para gen5 nos mais novos. O toggle animado/estático que já existe (`ptb:battleAnimatedSprites`) é respeitado.
- **Linha de Poké Balls** dos dois lados: vivo, desmaiado, com status. Hoje o cliente só sabe quantos desmaiaram (`TeamStrip`), e isso basta.
- **Caixas de HP** no estilo DPPt: nome, nível, barra verde/amarela/vermelha com `hpTone`, e números de HP do lado do jogador. A barra drena com `transform: scaleX`.
- **Animações** dirigidas por uma fila de eventos (`battleTimeline.js`, puro e testado, que converte linhas novas do log em `{type, side, ...}`):

| Evento | Animação | Duração |
|---|---|---|
| golpe | atacante avança e volta (`translate`) | 240 ms |
| dano | alvo pisca (`opacity` em degraus) + HP drena | 300 + 400 ms |
| super efetivo / pouco efetivo | flash da tela + texto | 150 ms |
| desmaio | sprite desce cortado (`translateY` + `clip-path`) | 350 ms |
| troca | Poké Ball abre, flash branco, sprite cresce de 0 a 1 | 400 ms |
| clima | partículas de areia ou chuva em CSS (só `transform`/`opacity`) | contínuo |

- **Velocidade de texto** 1×/2× e "toque para avançar".
- Com `prefers-reduced-motion`, tudo pula para o estado final e o texto aparece inteiro.
- **Exceção documentada ao design-system:** dentro de `.ds-screen` a unidade é `--px` (pixel de jogo) e a paleta é a do jogo (tokens `--ds-*` declarados uma vez, como as cores canônicas de tipo). Fora da tela (moldura, página), valem `--space-*` e os tokens de tema. Essa exceção precisa ser registrada na skill `design-system` na mesma entrega.

### 8.4 Tela de baixo: Pokétch e comandos
**Pokétch** (como na referência): LCD verde, silhuetas verde-escuras e uma barra de HP por membro.
- As silhuetas são os mesmos sprites com um filtro SVG `feColorMatrix` de 2 tons (funciona em `<img>`, sem canvas).
- O botão vermelho lateral troca de "app":
  1. **Equipe:** o time escolhido, com HP ao vivo durante a batalha.
  2. **Relógio:** contagem até o próximo time da Cynthia.
  3. **Contador:** sequência de dias e vitórias.
  4. **Ficha da Campeã:** silhuetas do time de hoje, reveladas conforme ela os envia. É um mini-jogo de adivinhar silhuetas, no espírito dos jogos do app.

**Menu de batalha:** botões grandes no estilo DPPt.
- LUTAR abre os 4 golpes com a cor do tipo (`move-types.json`), PP e tooltip (`battle-dex.json`).
- POKÉMON abre a equipe para trocar.
- Some ao escolher e dá lugar a "Cynthia está pensando…".

**Desktop:** `1–4` escolhem golpes, `S` troca, `Esc` volta.

### 8.5 Arte e fontes
- **Arte original** (sem ripar arquivos do DS): tileset da sala, sprite do jogador andando (4 direções × 3 quadros) e sprite de costas do jogador na batalha.
  - PNG-8 em resolução nativa, ampliado por CSS com `image-rendering: pixelated`. Para pixel art, a regra "WebP em 2× do tamanho exibido" não se aplica; fica registrado como exceção.
  - Orçamento total ≤ 60 KB.
- **Cynthia** (`cynthia-gen4`) e **Pokémon** vêm dos sprites do Showdown e do PokéAPI que o app já usa, com cache no service worker.
- **Fonte de pixel** do Google Fonts (sugestão: *Pixelify Sans*), carregada só nesta rota. O texto continua sendo texto real.

### 8.6 Acessibilidade
- A caixa de texto é `aria-live="polite"`.
- Todo comando é `<button>`, o foco vai para o menu de golpes quando é a vez do jogador, e a navegação completa funciona por teclado.
- HP e efetividade também aparecem como texto.
- O D-pad tem `touch-action: none` e área de toque ≥ 44 px.

---

## 9. Integração no app

| Item | Onde | Detalhe |
|---|---|---|
| Rota | `AppLayout.jsx` | `lazy()` para `ChampionChallengeView`; `<Route path="/challenge">`; chave `challenge` no encadeamento `currentPage` (sem isso a rota cai em `notFound`). **Não** entra no `MOBILE_PREFETCH` |
| Barra lateral | `navigationGroups` → grupo `guessing` ("Jogos") | Item `{key: 'challenge', label: t('nav.challenge'), path: '/challenge', icon}`. Busca e "Mais" no celular herdam automaticamente |
| Home | `CozyHomeView.jsx`, painel `yourDay` | Card de **status**, não lançador (wound 2026-09-04): silhueta, nome do desafio, estado, sequência, contagem. Entra também no `journey` da lateral |
| OG / SEO | `api/render-meta.js` + `useDocumentMeta` | Novo ramo `/challenge` com título, descrição e imagem |
| Guia da página | `pageGuideTips.challenge` + `guide.challenge` | Exatamente 2 dicas em PT e EN (`translations.test.js` exige) |
| i18n | `translations.js` | Namespace `challenge.*` (UI, falas da Cynthia, nomes dos desafios) e `cozyHome.challenge*` |
| Notas de versão | `PATCH_NOTES_VERSION` (`theme.js`) | 1.14.0 → 1.15.0 |
| Notificações (fase 6) | `api/daily-puzzle.js` (cron 12:00 UTC) | Tópico `dailyChallenge` no mesmo cron, sem função nova |
| Docs | `docs/modules/daily_challenge.md` + `docs/index.md` | Módulo próprio, sem inchar os existentes |

---

## 10. Alterações propostas

**Servidor**
- `[NEW]` [api/challenge.js](../../api/challenge.js): endpoint (`today`/`start`/`choose`/`forfeit`, `?ping`, self-check).
- `[NEW]` [api/_lib/challengeEngine.js](../../api/_lib/challengeEngine.js): replay síncrono, log por perspectiva, `owesChoice`, validação.
- `[NEW]` [api/_lib/cynthiaAI.js](../../api/_lib/cynthiaAI.js): decisão da IA (§6).
- `[NEW]` [api/_lib/championPool.js](../../api/_lib/championPool.js): espécies, variantes e fontes (ocultos).
- `[NEW]` [api/_lib/championRotation.js](../../api/_lib/championRotation.js): `championTeamFor(dayKey)`, `dailyTeamFor(dayKey)`, `difficultyFor(dayKey)`, `isPlausibleDayKey()`.
- `[NEW]` testes: `api/challenge.test.js` (handler + Firestore em memória), `api/challenge.deps.test.js` (imports estáticos), `api/_lib/cynthiaAI.test.js` (cenários + fuzz), `api/_lib/championRotation.test.js`.
- `[MODIFY]` [firestore.rules](../../firestore.rules): `challengeRuns`, `challengeRuns/*/secret`, `challengeStats`.
- `[MODIFY]` [vercel.json](../../vercel.json): `memory`/`maxDuration` da função nova, iguais aos de `battle-turn`.

**Cliente: estado e lógica pura**
- `[NEW]` [src/store/useChampionChallengeStore.js](../../src/store/useChampionChallengeStore.js): `today`, `run`, `hasLoadedRun` (wound 2026-09-21: lista vazia ≠ "ainda não respondeu"), escolha pendente otimista, configurações.
- `[NEW]` [src/hooks/useChampionChallenge.js](../../src/hooks/useChampionChallenge.js).
- `[NEW]` [src/utils/dayKey.js](../../src/utils/dayKey.js) + teste: `localDayKey()` compartilhado.
- `[NEW]` [src/utils/battleTimeline.js](../../src/utils/battleTimeline.js) + teste: log → fila de animação.
- `[NEW]` [src/utils/arenaMap.js](../../src/utils/arenaMap.js) + teste: mapa, colisão, BFS.
- `[MODIFY]` [src/utils/battleSprites.js](../../src/utils/battleSprites.js): opção `style: 'gen4'` com fallback.
- `[MODIFY]` [src/services/accountDeletion.js](../../src/services/accountDeletion.js): apagar `challengeRuns` (por `uid`) e `challengeStats/{uid}`.
- `[MODIFY]` [src/hooks/useDailyPuzzle.js](../../src/hooks/useDailyPuzzle.js), [src/hooks/useSessionGame.js](../../src/hooks/useSessionGame.js), [src/components/views/PokePuzzleView.jsx](../../src/components/views/PokePuzzleView.jsx): passar a usar `localDayKey()` (só refatoração, mesmo formato).

**Cliente: interface**
- `[NEW]` `src/components/views/challenge/`:
  - `ChampionChallengeView.jsx`: orquestra as fases arena → seletor → batalha → resultado;
  - `ConsoleShell.jsx`: moldura DS, layout horizontal/vertical, cálculo de `--px`;
  - `ArenaScreen.jsx` + `useArenaMovement.js`;
  - `BattleScene.jsx` + `useTimelinePlayer.js`;
  - `HpBox.jsx`, `TextBox.jsx`;
  - `CommandPanel.jsx`: LUTAR, POKÉMON, DESISTIR;
  - `PoketchPanel.jsx`: os apps Equipe, Relógio, Contador e Ficha;
  - `TeamPicker.jsx`: Meus times e Time do dia;
  - `DPad.jsx`;
  - `ResultScreen.jsx`.
- `[NEW]` [src/styles/champion-challenge.css](../../src/styles/champion-challenge.css): tokens `--ds-*`, `--px`, keyframes da cena.
- `[NEW]` `public/challenge/`: tileset e sprites originais (PNG-8).
- `[MODIFY]` [src/components/AppLayout.jsx](../../src/components/AppLayout.jsx): rota, `currentPage`, item de navegação, chunk.
- `[MODIFY]` [src/components/views/CozyHomeView.jsx](../../src/components/views/CozyHomeView.jsx) + [src/styles/cozy-home.css](../../src/styles/cozy-home.css): card de status e item no `journey`.
- `[MODIFY]` [api/render-meta.js](../../api/render-meta.js): ramo `/challenge`.
- `[MODIFY]` [src/constants/translations.js](../../src/constants/translations.js): `challenge.*`, `nav.challenge`, `guide.challenge`, `cozyHome.challenge*`.
- `[MODIFY]` [src/constants/theme.js](../../src/constants/theme.js): `PATCH_NOTES_VERSION`.

**Docs**
- `[NEW]` `docs/modules/daily_challenge.md`.
- `[MODIFY]` [docs/index.md](../index.md).
- `[MODIFY]` [.claude/skills/design-system/SKILL.md](../../.claude/skills/design-system/SKILL.md): a exceção `.ds-screen`.

---

## 11. Fases de entrega

Cada fase termina com lint (zero warnings), `npm test` e `npm run build` verdes.

| Fase | Entrega | Pronto quando |
|---|---|---|
| **F0 — Alinhamento e arte** | Respostas da §14; tileset, sprite do jogador e fonte escolhidos | Arte original aprovada; pool da Cynthia conferido nas wikis (Glaceon, Eelektross, Braviary) |
| **F1 — Motor + IA** | `challengeEngine`, `cynthiaAI`, `championPool`, `championRotation`, `api/challenge.js`, regras | Batalha completa pelo handler no teste; fuzz de 200 batalhas sem `\|error\|`; os 6 invariantes da §6.1 com teste; rotação determinística sem repetir 7 dias; 8/12 funções |
| **F2 — Jogável** | Store, hook, `TeamPicker`, uma cena de batalha simples (com os leitores existentes) | Dá para vencer e perder no navegador; escolha ilegal mostra erro; "pensando…" otimista; partida retomada depois de recarregar |
| **F3 — Console DS** | `ConsoleShell`, cena DPPt, HP, linha de Poké Balls, `battleTimeline` + animações, `CommandPanel`, Pokétch | `/verify-ui` em 1440 e 390 px, escuro e claro; quadros no meio da animação; *reduced motion* |
| **F4 — Arena** | `ArenaScreen`, movimento, BFS, diálogo, transição, ping de aquecimento | D-pad por toque (CDP) e teclado; "Ir até a Cynthia" para quem volta |
| **F5 — Integração** | Card da Home, navegação, OG, guia, i18n, notas de versão, docs | Card mostra os 3 estados; rota na busca e no "Mais"; `render-meta` responde a `/challenge` |
| **F6 — Depois** | Ranking diário (Time do dia e Livre), cartão de compartilhamento estilo PokéPuzzle, push no cron diário | Escrita do ranking só pelo servidor; regras testadas |

F1 e F2 sozinhas já entregam um desafio jogável. F3 e F4 trazem o "uau".

---

## 12. Testes e verificação

**Unitários (Vitest):**
- `championRotation`: mesmo `dayKey` → mesmo time; Garchomp sempre por último; 6 espécies distintas; nenhuma repetição em 7 dias; dificuldade por dia da semana.
- `cynthiaAI`, por cenário:
  - escolhe o golpe que nocauteia;
  - usa prioridade para fechar;
  - sai de um nocaute garantido;
  - não tira o Garchomp;
  - só se prepara quando está seguro;
  - não usa Will-O-Wisp em tipo Fogo.
- `cynthiaAI`, invariantes: os 6 da §6.1.
- `battleTimeline`, `arenaMap`, `dayKey`.

**Handler:** `api/challenge.test.js` joga uma partida inteira contra o Firestore em memória e cobre:
- idempotência de `turn`;
- escolha ilegal → 400;
- substituição da IA após desmaio sem o p1 dever nada;
- o documento lido pelo cliente não contém o time da Cynthia.

**Init:** `api/challenge.deps.test.js` força uma dependência a falhar e confere que o endpoint ainda responde JSON.

**Dependências:** `node --no-experimental-require-module -e "require('@pkmn/sim')"` deve passar (regra do `CLAUDE.md`).

**Build:**
- o bundle **não** contém `BattleStream` nem `@pkmn/sim` (invariante do ARCHITECTURE);
- o boot JS não cresce;
- o chunk da rota fica ≤ 60 KB gzip;
- o precache continua ≤ 1,5 MB por arquivo.

**UI:** `/verify-ui` (1440 e 390 px × escuro e claro, gestos de toque, quadros de animação) e a receita de medição da skill `ux`:
- toque → primeira mudança < 100 ms;
- sem quadro > 50 ms durante as animações.

**Produção:**
- `GET /api/challenge?ping=1` primeiro; depois o self-check completo.
- Latência p50 de `choose` com a função quente < 400 ms.

---

## 13. Riscos

| Risco | Mitigação |
|---|---|
| Direitos sobre a arte do DS | Arte original "inspirada em"; só os sprites que o app já usa (Showdown/PokéAPI) |
| Partida a frio do Vercel (cerca de 32 MB de sim + firebase-admin) | Ping ao entrar na arena; a caminhada esconde a espera; caixa de texto honesta |
| Limite de 12 funções | Uma função só, com `action`; ficam 4 vagas |
| IA fácil ou difícil demais | Dificuldade por dia; `AI_VERSION` permite ajustar sem quebrar partidas em andamento; F6 mede a taxa de vitória por dia |
| Times do Builder incompletos | Validação no seletor + "Completar com set competitivo" |
| Sets de Glaceon, Eelektross e Braviary sem fonte primária conferida (Bulbapedia bloqueada nesta sessão) | Ficam marcados como "a confirmar" e só entram no pool depois da F0 |
| Conflito com a grade de espaçamento | Exceção explícita para `.ds-screen`, registrada na skill |

---

## 14. Dúvidas em aberto (decisões para o Enzo)

1. **"Time diário".** O plano entende que é um **time de aluguel do dia, igual para todos**, gerado pelo servidor. Se a ideia for outra (por exemplo, o último time editado), a §5 muda.
2. **Tentativas.** Recomendação: **1 tentativa oficial por dia**, que conta para a sequência e o ranking, mais **revanches de treino ilimitadas** depois. A alternativa é tentativas ilimitadas em que só a primeira vitória conta.
3. **Arte.** Recomendação: **arte original** no estilo DPPt para a sala e o boneco. Usar arquivos ripados do jogo seria mais fiel, porém arriscado.
4. **Restrições do time próprio.** Liberar lendários e Ubers? Recomendação: liberar tudo e marcar a partida com o tier (`tier-legality.json`). O ranking "justo" é o do Time do dia.
5. **Ranking** já no lançamento ou só na F6? Recomendação: F6.

---

## Fontes

- Times da Cynthia em DP, Pt, BDSP e Renegade Platinum: `public/data/gym-leaders.json` (origem declarada no arquivo: pokemondb.net e guias da comunidade).
- Espécies usadas pela Cynthia em outras regiões (Glaceon no PWT, Eelektross e Braviary em Unova, Gastrodon em Sinnoh), segundo [pokemon.com — Trainer Spotlight: Champion Cynthia](https://www.pokemon.com/uk/pokemon-news/trainer-spotlight-champion-cynthia), via resumo de busca (o acesso direto ao site está bloqueado nesta sessão).
- [Bulbapedia — Cynthia](https://bulbapedia.bulbagarden.net/wiki/Cynthia): conferir os sets na F0.
- Decisões de arquitetura existentes: `docs/plans/ARCHITECTURE-friends-and-battles.md`, `docs/plans/friends-and-async-battles.md`, `docs/wounds.md` (2026-07-27, 2026-09-04, 2026-09-21, 2026-10-13).
