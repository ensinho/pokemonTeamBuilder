# Plano — Desafio da Campeã (batalha diária contra a Cynthia)

> Status: **alinhado** (fluxo `/feature`, etapa 2 concluída). As decisões da seção 14
> foram respondidas pelo Enzo em 2026-10-14. Próximo passo: F1 (motor + IA).
> Nenhum código produtivo foi alterado ainda.
> Documentos irmãos: [especificação técnica](./daily-champion-challenge-tech.md) (arquivos, contratos, dados, estados, tarefas), [IA de batalha](./daily-champion-challenge-ai.md) e [modelos de previsão](./daily-champion-challenge-ml.md).
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
   - **Convidado (sem conta):** a tela de baixo pede login ("Entre para desafiar a Campeã"). Ao entrar, o fluxo segue de onde parou.
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
8. **Fim.** Tela de vitória ou derrota com turnos, Pokémon restantes, sequência de dias e o **gráfico da chance de vitória** turno a turno, com a maior virada destacada.
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

### 3.4 O "dia" vira à meia-noite de Brasília, para todos
- Decidido em 2026-10-14 (§14). O **servidor** decide o dia com `America/Sao_Paulo`; o cliente não envia data.
- Todos enfrentam o mesmo time ao mesmo tempo. O ranking da F6 fica justo, e ninguém num fuso adiantado vê o time antes.
- O cliente tem um espelho do cálculo (`src/utils/challengeDay.js`) só para a contagem regressiva. Um teste compara as duas cópias.
- **Achado paralelo, fora do escopo:** `advanceStreak` em `useAuthStore.js` usa `toISOString()` (data UTC), enquanto o PokéPuzzle usa o dia local. Para quem está em UTC−3 e joga depois das 21h, a sequência do puzzle conta no dia seguinte. Vale uma correção separada com `/log-wound`.

### 3.5 Regras da batalha
- **Formato:** simples, 6×6, `gen9customgame` com Sleep Clause Mod, Species Clause, OHKO Clause, Evasion Moves Clause e **Terastal Clause**. A tela não tem botão de Tera, e o DPPt também não tinha.
- **Nível:** todos no 50, inclusive a Cynthia, como na Battle Tower. O `showdownExport` já emite `Level: 50`.
- **Itens:** sem itens de bolsa; itens segurados valem.
- **Restrições ao time próprio:** nenhuma. Lendários e Ubers são liberados. A partida é marcada com o tier do time (`tier-legality.json`), e o ranking "justo" da F6 é o do Time do dia (§14.4).

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
**Composição fixa (cláusula decidida em 2026-10-14): 1 ás + 3 frequentes + 1 ocasional + 1 curinga competitivo.**

| Vaga | Quantos | De onde |
|---|---|---|
| Ás | 1 | Garchomp, sempre o último |
| Frequentes | **exatamente 3** | Spiritomb, Lucario, Milotic, Togekiss, Roserade |
| Ocasional | **exatamente 1** | Gastrodon, Glaceon, Eelektross, Braviary |
| **Curinga** | **exatamente 1** | Qualquer Pokémon com set competitivo do gerador de random battle (`@pkmn/randoms`, `gen9randombattle`) |

2. Sorteia 3 frequentes sem repetição. O **primeiro Pokémon** sai entre eles, com peso maior para Spiritomb.
3. Sorteia 1 ocasional.
4. **Curinga:** gera um set competitivo com a semente `hash('wildcard:' + dayKey)`, tentando de novo (semente +1) até passar nos filtros:
   - não pode ser uma espécie do pool dela, nem repetir espécie do time;
   - sem lendários restritos e míticos (lista `Restricted Legendary`/`Mythical` das tags do sim), para não decidir a partida sozinho;
   - totalmente evoluído;
   - no máximo 1 tipo repetido com o resto do time, para ela não ficar com 3 fraquezas iguais.
5. **Ordem:** o primeiro (frequente) abre; ocasional e curinga ocupam posições sorteadas entre a 2ª e a 5ª; Garchomp fecha.
6. **Sets:** frequentes e ocasional usam a variante da **dificuldade do dia** (abaixo). O curinga usa **sempre** o set competitivo gerado, no nível 50; nos dias fáceis, a IA continua no perfil fácil.
7. **Anti-repetição:** a composição de hoje não pode ser igual à de nenhum dos últimos 7 dias. Se for, sorteia de novo com `seed+1`. Isso é determinístico, porque calcular os 7 dias anteriores é só aritmética.

No Pokétch, a silhueta do curinga aparece como **"?"** até ele entrar, porque é a surpresa do dia.

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

> Resumo de produto. **A organização completa (arquivos, fórmulas, perfis, calibragem e testes) está no [documento da IA](./daily-champion-challenge-ai.md).**

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

> **A fonte de verdade é a [especificação técnica](./daily-champion-challenge-tech.md)**: §2 (servidor, contrato da API, erros), §4 (documentos e regras do Firestore). Aqui fica só o resumo.

- **Uma função nova:** `api/challenge.js` (8 de 12). Ações `ensureDay`, `start`, `choose` e `forfeit`, mais `?ping=1` e o self-check no `GET`. Segue o padrão de `battle-turn.js` (imports leves, `loadDeps()`, tudo aguardado).
- **Leitura direto do Firestore, ação pela função.** A tela e a Home leem:
  - o documento público do dia (`public/data/challengeDays/{dia}`, com escalação e Time do dia);
  - a partida e as rodadas do jogador.

  Assim, abrir a tela ou a Home nunca acorda a função.
- **Partidas fora de `users/`:** `challengeRuns/{uid}_{dia}`. O dono lê; só o servidor escreve.
  - O que permitiria trapacear (seed, histórico de escolhas, time da Cynthia, trace da IA) fica em `secret/state`, que ninguém lê pelo cliente.
  - As estatísticas ficam em `challengeStats/{uid}`.
- **Cada turno:** replay síncrono (~64 ms numa partida longa) → snapshot → jogada do jogador → decisão da IA no snapshot → grava tudo numa transação → devolve as linhas novas e as falas.

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
- **Arte original desenhada no estilo DS** (decidido em §14.3; nenhum arquivo extraído do jogo): tileset da sala, sprite do jogador andando (4 direções × 3 quadros) e sprite de costas do jogador na batalha.
  - PNG-8 em resolução nativa, ampliado por CSS com `image-rendering: pixelated`. Para pixel art, a regra "WebP em 2× do tamanho exibido" não se aplica; fica registrado como exceção.
  - Orçamento total ≤ 60 KB.
- **Animações leves de interatividade** (pedido do Enzo). Todas animam só `transform`/`opacity` (regra de celular do `design-system`), e todas param com `prefers-reduced-motion`:

| Onde | Animação |
|---|---|
| Arena | Jogador e Cynthia "respiram" parados (2 quadros, ~1 s); luminárias pulsam a opacidade do brilho; o anel da Poké Ball pulsa devagar |
| Encontro | Balão "!" salta (`scale` com mola); seta da caixa de texto pisca quando há mais texto |
| Batalha | Pokémon ativos balançam de leve parados, como no DPPt; a linha de Poké Balls entra uma a uma |
| Controles | D-pad, A/B e botões de comando afundam ao toque (`translateY` + sombra pintada uma vez); o botão vermelho do Pokétch afunda e a tela pisca ao trocar de app |
| Pokétch | Barras de HP drenam com `scaleX`; silhueta revelada na Ficha da Campeã ganha um flash curto |
- **Cynthia na batalha:** sprite real `cynthia-gen4` do Showdown (pesquisado; o id consta em `trainer-sprites.json`). **Cynthia na arena:** desenhada em código com a paleta desse sprite, porque não há sprite de mapa hospedado e liberado para uso. **Pokémon:** sprites do Showdown e do PokéAPI que o app já usa, com cache no service worker.
- **Pipeline da arte em código:** grades de caracteres em `scripts/challenge-art/*.txt` → `scripts/build-challenge-art.mjs` → PNG-8 em `public/challenge/` (especificação técnica §3.11).
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

> **A lista completa, arquivo por arquivo, está na [especificação técnica](./daily-champion-challenge-tech.md)**: §2.1 (servidor), §3.1 (cliente), §5.1 (integração com linhas exatas). A organização da IA está no [documento da IA](./daily-champion-challenge-ai.md), §2.

Resumo:

| Área | Novo | Alterado |
|---|---|---|
| Servidor | `api/challenge.js`, `api/_lib/challenge/*` (9 módulos), `api/_lib/ai/*` (IA), Firestore falso compartilhado, `scripts/ai-arena.mjs` | `firestore.rules`, `vercel.json`, `package.json` (scripts), `battle-turn.test.js` |
| Cliente | Store + hook, `services/challengeApi.js`, `services/apiClient.js`, 5 utils puros com teste, ~25 componentes em `views/challenge/`, 2 folhas de estilo | `AppLayout.jsx`, `CozyHomeView.jsx`, `useBattlesStore.js`, `accountDeletion.js`, `translations.js`, `theme.js`, `PageGuide.jsx`, `render-meta.js` |
| Arte | `scripts/challenge-art/*.txt` → `scripts/build-challenge-art.mjs` → `public/challenge/*.png` | — |
| Docs | `docs/modules/daily_challenge.md` | `docs/index.md`, skill `design-system` (exceção `.ds-screen`) |

---

## 11. Fases de entrega

Cada fase termina com lint (zero warnings), `npm test` e `npm run build` verdes.

| Fase | Entrega | Pronto quando |
|---|---|---|
| **F0 — Alinhamento e arte** | ~~Respostas da §14~~ (feito em 2026-10-14); tileset, sprite do jogador e fonte escolhidos | Arte original estilo DS aprovada; pool da Cynthia conferido nas wikis (Glaceon, Eelektross, Braviary) |
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
- `championRotation`: mesmo `dayKey` → mesmo time; Garchomp sempre por último; 6 espécies distintas; sempre 3 frequentes + 1 ocasional + 1 curinga fora do pool; nenhuma repetição em 7 dias; dificuldade por dia da semana.
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
| Direitos sobre a arte do DS | Decidido: arte original no estilo DS; só os sprites que o app já usa (Showdown/PokéAPI) |
| Partida a frio do Vercel (cerca de 32 MB de sim + firebase-admin) | Ping ao entrar na arena; a caminhada esconde a espera; caixa de texto honesta |
| Limite de 12 funções | Uma função só, com `action`; ficam 4 vagas |
| IA fácil ou difícil demais | Dificuldade por dia; `AI_VERSION` permite ajustar sem quebrar partidas em andamento; F6 mede a taxa de vitória por dia |
| Times do Builder incompletos | Validação no seletor + "Completar com set competitivo" |
| Sets de Glaceon, Eelektross e Braviary sem fonte primária conferida (Bulbapedia bloqueada nesta sessão) | Ficam marcados como "a confirmar" e só entram no pool depois da F0 |
| Conflito com a grade de espaçamento | Exceção explícita para `.ds-screen`, registrada na skill |

---

## 14. Decisões (respondidas pelo Enzo em 2026-10-14)

| # | Pergunta | Decisão |
|---|---|---|
| 1 | O que é o "time diário" | **Time de aluguel do dia, igual para todos**, gerado pelo servidor (§5) |
| 2 | Tentativas | **1 tentativa oficial por dia** (conta para a sequência e, na F6, para o ranking) + **revanches de treino ilimitadas** depois |
| 3 | Arte | **Arte original desenhada no estilo DS**, com **animações leves** para dar interatividade (§8.5) |
| 4 | Restrições do time próprio | **Tudo liberado**, incluindo lendários e Ubers; a partida é marcada com o tier, e o ranking justo é o do Time do dia (§3.5) |
| 5 | Ranking | **Só depois**, na F6 |
| 6 | Quem produz a arte | **Claude cria em código** (cenário e boneco do jogador). Para a Cynthia, **sprites reais pesquisados**: `cynthia-gen4` do Showdown na batalha; na arena, desenhada com a paleta desse sprite (§8.5) |
| 7 | Animações de golpe | **3 moldes genéricos** (físico, especial, status) na cor do tipo **+ 12 golpes-assinatura** (especificação técnica §3.9) |
| 8 | Som | **Efeitos sintetizados em WebAudio**, sem arquivos e sem música; mudo lembrado (especificação técnica §3.12) |
| 9 | Virada do dia | **Meia-noite de Brasília para todos** (§3.4) |
| 10 | Login | **Obrigatório** (conta registrada, não anônima). Convidado vê a sala e o time do dia; o login é pedido no encontro com a Cynthia |
| 11 | Modelos de previsão | **Sim, regressão logística** (chance de vitória, próxima jogada, calibragem), com **dados anônimos** das batalhas ([documento de ML](./daily-champion-challenge-ml.md)) |
| 12 | Mostrar a chance de vitória | **Só no fim**, num gráfico da partida com a maior virada destacada |

Premissas assumidas sem pergunta (mecânica Gen 9, definição de sequência, convidados, partida abandonada…) estão na §0 da [especificação técnica](./daily-champion-challenge-tech.md).

---

## Fontes

- Times da Cynthia em DP, Pt, BDSP e Renegade Platinum: `public/data/gym-leaders.json` (origem declarada no arquivo: pokemondb.net e guias da comunidade).
- Espécies usadas pela Cynthia em outras regiões (Glaceon no PWT, Eelektross e Braviary em Unova, Gastrodon em Sinnoh), segundo [pokemon.com — Trainer Spotlight: Champion Cynthia](https://www.pokemon.com/uk/pokemon-news/trainer-spotlight-champion-cynthia), via resumo de busca (o acesso direto ao site está bloqueado nesta sessão).
- [Bulbapedia — Cynthia](https://bulbapedia.bulbagarden.net/wiki/Cynthia): conferir os sets na F0.
- Decisões de arquitetura existentes: `docs/plans/ARCHITECTURE-friends-and-battles.md`, `docs/plans/friends-and-async-battles.md`, `docs/wounds.md` (2026-07-27, 2026-09-04, 2026-09-21, 2026-10-13).
