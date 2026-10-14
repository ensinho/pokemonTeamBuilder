# Especificação técnica — Desafio da Campeã

> Par do plano de produto [daily-champion-challenge.md](./daily-champion-challenge.md) (o quê e por quê)
> e do documento da IA [daily-champion-challenge-ai.md](./daily-champion-challenge-ai.md) (como a Cynthia decide).
> Este arquivo é o **como**: arquivos, contratos, dados, estados, testes e tarefas por fase.
> Data: 2026-10-14. Base: `main` em `10cb419`.

## 0. Premissas assumidas

Estas premissas não foram perguntadas por terem um padrão claro. Se discordar de alguma, avise antes da F1.

| # | Premissa | Por quê |
|---|---|---|
| A1 | **Mecânica de Gen 9** (`gen9customgame`), com visual de DS | Os times salvos têm Pokémon de todas as gerações; a mecânica de Gen 4 barraria tudo acima do #493 |
| A2 | **Sequência** = dias seguidos com **vitória na tentativa oficial**. "Dias jogados" é contado à parte | É o número que dá orgulho; jogar e perder não deveria manter a sequência |
| A3 | **Convidados (anônimos) jogam.** O progresso continua ao criar conta | `linkWithCredential` mantém o `uid` (`useAuthStore.js:709-713`) |
| A4 | Partida oficial abandonada pode ser **retomada até a virada do dia**. Depois vira `expired`, que não conta como vitória e quebra a sequência | A regra mais simples que não deixa "segurar" uma partida perdida |
| A5 | **O motor é genérico por campeão** (`championId`), mas só a Cynthia é lançada | Custa quase nada agora e abre espaço para Lance, Steven e outros |
| A6 | Nome: **Desafio da Campeã** / **Champion Challenge**; rota `/challenge`; ícone `Crown` (lucide) | O grupo "Jogos" já usa lucide |
| A7 | **Sem Tera e sem itens de bolsa**; itens segurados valem | Não há botão de Tera, e a Terastal Clause foi validada no spike |
| A8 | A versão do sim continua fixa em `@pkmn/sim@0.10.11` | O replay depende da versão exata; `ENGINE_VERSION` fica gravado em cada partida |
| A9 | **Sem cron novo.** O documento do dia é criado sob demanda pelo primeiro jogador | `vercel.json` já tem 2 crons; não vale arriscar o limite do plano |

### Decisões técnicas de 2026-10-14 (respondidas pelo Enzo)

| Tema | Decisão | Consequência técnica |
|---|---|---|
| Arte | Claude cria em código: cenário e boneco do jogador. Para a Cynthia, usar sprites reais pesquisados | §6.11: pipeline `scripts/challenge-art/*.txt` → PNG. Batalha usa `cynthia-gen4` do Showdown; a Cynthia na arena é desenhada com a paleta desse sprite (não há sprite de mapa hospedado com licença de uso) |
| Golpes | 3 moldes genéricos + 12 golpes-assinatura | §6.10 |
| Som | Efeitos sintetizados em WebAudio, sem música | §6.13 |
| Virada | **Meia-noite de Brasília** (`America/Sao_Paulo`) para todos | O servidor decide o dia sozinho; o cliente não envia data |

---

## 1. Arquitetura

```
 Navegador (src/)                                   Vercel (api/)                    Firestore
 ─────────────────                                  ─────────────                    ─────────
 ChampionChallengeView ──ping ao abrir──────────►  /api/challenge?ping=1
        │                                           (aquece a função)
        ├─ getDoc(challengeDays/{dia}) ─────────────────────────────────────────────► público
        ├─ getDoc(challengeRuns/{uid}_{dia}) + rounds ──────────────────────────────► dono lê
        │
        └─ POST {action} ───────────────────────►  challenge.js
             ensureDay | start | choose | forfeit    ├─ verifyCaller (token)
                                                     ├─ engine: replay síncrono ◄──── secret/state
                                                     ├─ ai: decide (clone com neblina)
                                                     └─ runs: grava rounds/estado ──► transação
```

A **leitura** vai direto ao Firestore: abre rápido e não acorda a função. A **ação** passa pela função, que é a autoridade. Assim, Home e retomada de partida nunca pagam a partida a frio.

**Sequência de um turno (`choose`):**
```
cliente                         challenge.js                                  Firestore
  │ POST choose {runId,turn,choice}  │                                            │
  │─────────────────────────────────►│ verifyCaller → uid                         │
  │  (UI: "Cynthia está pensando…")  │ tx: lê run + secret/state ◄────────────────│
  │                                  │ confere dono / status / turn / dia          │
  │                                  │ battle = replay(seed, teams, choices)       │
  │                                  │ snap = battle.toJSON()   ← antes do p1!     │
  │                                  │ apply(p1, choice) → inválida? 400           │
  │                                  │ enquanto p2 deve: ai.decide(snap…) → apply  │
  │                                  │ linhas novas do p1 + eventos de fala        │
  │                                  │ tx: grava round, choices, run, stats ──────►│
  │◄─────────────────────────────────│ {turn, lines, status, events, result?}      │
  │ anima a fila de eventos          │                                            │
```

---

## 2. Servidor

### 2.1 Arquivos

```
api/
  challenge.js                    [NEW] endpoint (8ª de 12 funções)
  challenge.test.js               [NEW] handler ponta a ponta com Firestore falso
  challenge.deps.test.js          [NEW] falha se um import pesado voltar ao topo
  _lib/
    testing/fakeFirestore.js      [NEW] FakeDoc/FakeCollection extraídos de battle-turn.test.js:34-87
    challenge/
      constants.js                [NEW] FORMAT, LEVEL, ENGINE_VERSION, BANNED_MOVES, CHAMPIONS
      day.js           (+ .test)  [NEW] dia de Brasília, próxima virada, dia da semana
      pool.js          (+ .test)  [NEW] dados da Cynthia: espécies, variantes, fontes
      rotation.js      (+ .test)  [NEW] time do dia da campeã, dificuldade, silhuetas
      dailyTeam.js     (+ .test)  [NEW] Time do dia do jogador (randoms + nível 50)
      validateTeam.js  (+ .test)  [NEW] time salvo → texto empacotado ou lista de erros
      engine.js        (+ .test)  [NEW] Battle síncrono: criar, replay, aplicar, quem deve, resultado
      runs.js          (+ .test)  [NEW] caminhos e transações do Firestore
      outcome.js       (+ .test)  [NEW] resultado, pontuação, sequência
      dialogue.js      (+ .test)  [NEW] eventos da batalha → chaves de fala
    ai/                           [NEW] ver o documento da IA, §3
api/battle-turn.test.js           [MODIFY] passa a importar o Firestore falso de _lib/testing
scripts/ai-arena.mjs              [NEW] autojogo para calibrar a IA (documento da IA, §16)
package.json                      [MODIFY] scripts "ai:arena" e "ai:bench" (sem dependência nova)
vercel.json                       [MODIFY] bloco de "api/challenge.js"
firestore.rules                   [MODIFY] §4.2
```

Tudo sob `api/_lib/` continua fora da contagem de funções, porque o prefixo `_` exclui a pasta inteira, subpastas incluídas. Conferir na mesma entrega: `find api -name '*.js' ! -name '*.test.js' ! -path 'api/_lib/*' | wc -l` precisa dar **8**.

### 2.2 `api/challenge.js`
Mesmo esqueleto de `battle-turn.js`:
- **Imports estáticos:** só `./_lib/httpBasics.js` e `./_lib/runtimeGuards.js`. Nada de `firebase-admin`, `@pkmn/*` ou `_lib/challenge/*` no topo.
- **`loadDeps()`** memoizada, como em `battle-turn.js:46-75`. Carrega `serverAuth`, `@pkmn/sim`, `_lib/challenge/*` e `_lib/ai/*`. Cada passo tem nome, e uma falha responde `500 {error: 'Failed to load <módulo>: …'}`. Se a carga falhar, o memo é zerado para a próxima chamada tentar de novo.
- **`GET ?ping=1`** responde `{ok: true, ping: true}` antes de carregar qualquer coisa.
- **`GET` sem parâmetros** é o self-check: dependências, formato das credenciais (nunca o conteúdo), ida e volta no Firestore, e uma batalha de 2 Pokémon com **uma decisão real da IA** e o tempo medido.
- **`POST`** faz CORS (`setCorsHeaders`), chama `verifyCaller(req)` → `uid` e despacha por `body.action`.
- **Erros:** um `HttpError(status, code, extra)` vira `res.status(status).json({error: code, ...extra})`.
- **Promises:** todas aguardadas. As transações usam `withTimeout`.

### 2.3 Módulos de `_lib/challenge/`

| Módulo | Exporta (assinatura) | Notas |
|---|---|---|
| `constants.js` | `FORMAT = 'gen9customgame@@@Sleep Clause Mod,Terastal Clause'`, `LEVEL = 50`, `ENGINE_VERSION = 'pkmn-sim@0.10.11'`, `BANNED_MOVES = ['fissure','guillotine','horndrill','sheercold','doubleteam','minimize']`, `CHAMPIONS = {cynthia: {trainerSprite: 'cynthia-gen4', aceSpecies: 'garchomp'}}` | OHKO e evasão são checados em `validateTeam`; essas cláusulas só agem na validação de time, que não roda |
| `day.js` | `dayKeyAt(ms) → 'YYYY-MM-DD'`, `nextResetAt(ms) → ms`, `weekdayOf(dayKey) → 0..6`, `previousDayKey(dayKey)` | Usa `Intl.DateTimeFormat('en-CA', {timeZone: 'America/Sao_Paulo'})` para continuar certo se o horário de verão voltar. Espelho idêntico em `src/utils/challengeDay.js` (§3.1) |
| `pool.js` | `CYNTHIA_POOL: Array<{species, dexNum, tier: 'core'\|'frequent'\|'occasional', leadWeight, variants: {[key]: {showdownText, source}}}>` | `showdownText` sem a linha `Level:` (o motor força 50). `source` é a URL da wiki ou a chave do jogo em `gym-leaders.json` |
| `rotation.js` | `difficultyFor(dayKey) → 'dp'\|'platinum'\|'rematch'\|'world'`, `championLineupFor(dayKey, championId) → [{species, dexNum, variantKey}]` (6, ás por último), `championTeamTextFor(dayKey, championId) → string` | Seed `hash('champion:'+dayKey)` com o `PRNG` do sim; anti-repetição de 7 dias (plano §4.2). Funções puras |
| `dailyTeam.js` | `dailyTeamFor(dayKey) → {showdownText, members: [{species, dexNum, item, ability, moves}]}` | `generateRandomTeam({seed: hashSeed('daily-team:'+dayKey)})` de `randomTeams.js:111`. Depois `Teams.import`, `set.level = 50` em cada um, e `Teams.export` |
| `validateTeam.js` | `validateTeam(showdownText) → {ok: true, text, packed, members} \| {ok: false, errors: [{slot, code, detail}]}` | Códigos: `parse`, `empty`, `tooMany` (>6), `noMoves`, `bannedMove`, `unknownSpecies`, `tooLong` (>8 KB). Reaproveita `packTeam` (`battleResolver.js:58`). O **tier** do time é só informativo: o cliente calcula com `src/utils/tierLegality.js`, manda em `start`, e o servidor grava sem confiar (vale só como etiqueta; o ranking justo é o do Time do dia) |
| `engine.js` | `createBattle({seed, teams}) → Battle`, `replay({seed, teams, choices}) → {battle, p1Lines, p2Lines}`, `apply(battle, side, choice) → {ok: true} \| {ok: false, error}`, `owes(battle, side) → boolean`, `outcome(battle) → {ended, winner, turns, remaining: {p1, p2}, hpPct: {p1, p2}}`, `snapshot(battle) → json` | `send` captura `update` (canais p1 e p2 via `extractChannelMessages(…, [0, 1])`) e o `sideupdate` de cada lado (`\|request\|`, `\|error\|`). As linhas do p1 vão para o cliente; as do p2 alimentam a IA e **nunca** saem do servidor. **`battle.sendUpdates()` depois de cada `choose`** (sem isso nada é emitido; medido no spike). `owes` lê `side.activeRequest` (`!wait`, com `active`/`forceSwitch`/`teamPreview`). Team preview é respondido com `default` automaticamente |
| `runs.js` | `paths(appId)`, `readDay`, `ensureDay(tx, dayKey)`, `readRun(tx, runId)`, `createRun(tx, …)`, `appendRound(tx, run, lines)`, `writeSecret(tx, …)`, `readStats/writeStats` | Uma transação por ação. Tudo aguardado |
| `outcome.js` | `scoreOf(outcome) → number`, `nextStats(stats, {dayKey, status, practice}) → stats`, `effectiveStreak(stats, todayKey) → number` | Pontuação: vitória = `1000 + 150×restantes + hp% médio − 5×turnos`; derrota = 0. Treino não mexe nas estatísticas |
| `dialogue.js` | `dialogueEvents(prevLines, newLines, ctx) → [{key, params, at}]` | `at` é o índice da linha depois da qual a fala entra. Chaves na §5.3 |

### 2.4 Contrato da API

`POST /api/challenge` com `Authorization: Bearer <Firebase ID token>`.

**`ensureDay`**: cria o documento público do dia se ainda não existir. É idempotente e protegido por transação.
```jsonc
// pedido
{ "action": "ensureDay" }
// 200
{ "dayKey": "2026-10-14", "created": false }
```

**`start`**: abre a partida oficial ou um treino.
```jsonc
// pedido: time salvo
{ "action": "start", "practice": false,
  "team": { "source": "saved", "teamId": "abc123", "name": "Chuva", "tier": "OU", "showdownText": "Pelipper @ Damp Rock\n..." } }
// pedido: Time do dia
{ "action": "start", "practice": true, "team": { "source": "daily" } }
// 200
{ "runId": "UID_2026-10-14", "turn": 0, "status": "active",
  "lines": ["|player|p1|...", "|request|{...}", "..."], "events": [{ "key": "challenge.cynthia.intro", "at": 0 }] }
```

**`choose`**: uma jogada do jogador.
```jsonc
// pedido
{ "action": "choose", "runId": "UID_2026-10-14", "turn": 7, "choice": "move 2" }
// 200
{ "turn": 8, "status": "active",
  "lines": ["|move|p1a: Pelipper|Hurricane|p2a: Garchomp", "..."],
  "events": [{ "key": "challenge.cynthia.ace", "at": 14 }],
  "result": null }
// 200 no fim
{ "turn": 23, "status": "won", "lines": ["...", "|win|Enzo"], "events": [...],
  "result": { "turns": 23, "remaining": 2, "hpPct": 41, "score": 1226, "streak": 4, "bestStreak": 9 } }
```
- `choice` precisa casar com `^(move [1-4]|switch [1-6]|default)$`; fora disso, 400 `invalidChoice` sem chegar ao sim.

**`forfeit`**: `{ "action": "forfeit", "runId": "…" }` → `{ "status": "lost", "result": {...} }`.

**Erros:**

| HTTP | `error` | Quando | Extra |
|---|---|---|---|
| 400 | `badRequest` | JSON ou campos inválidos | `detail` |
| 400 | `invalidTeam` | `validateTeam` falhou | `errors[]` |
| 400 | `invalidChoice` | Regex ou o sim recusou | `simError` (texto do `\|error\|`) |
| 401 | `unauthenticated` | Token ausente ou inválido | — |
| 403 | `notOwner` | A partida é de outro `uid` | — |
| 403 | `practiceLocked` | Treino antes de terminar a partida oficial | — |
| 404 | `runNotFound` | — | — |
| 409 | `officialAlreadyPlayed` | Segunda partida oficial no mesmo dia | `runId` |
| 409 | `staleTurn` | `turn` diferente do atual (duas abas, repetição) | `turn` atual |
| 410 | `dayClosed` | Partida de um dia que já virou | `status: 'expired'` |
| 500 | `internal` / `Failed to load …` | — | — |

**Regras de treino:**
- Só depois de a oficial terminar.
- Só um treino ativo por vez; começar outro encerra o anterior como `lost`.
- O id é `{uid}_{dayKey}_p{n}`.

---

## 3. Cliente

### 3.1 Arquivos

```
src/
  services/apiClient.js                  [NEW] callAuthedApi(endpoint, body), extraído de useBattlesStore.js:54-79
  services/challengeApi.js               [NEW] ping(), ensureDay(), start(), choose(), forfeit()
  store/useChampionChallengeStore.js     [NEW] (+ .test.js)
  hooks/useChampionChallenge.js          [NEW] seletores + derivados (request, field, transcript)
  hooks/useScreenScale.js                [NEW] ResizeObserver → --px inteiro quando ≥ 2
  hooks/useConsoleInput.js               [NEW] teclado + toque → up/down/left/right/a/b
  utils/challengeDay.js        (+ .test) [NEW] espelho de api/_lib/challenge/day.js + effectiveStreak
  utils/battleTimeline.js      (+ .test) [NEW] linhas do protocolo → fila de eventos animáveis
  utils/arenaMap.js            (+ .test) [NEW] mapa da sala, colisão, BFS, gatilho do encontro
  utils/moveFx.js              (+ .test) [NEW] golpe → efeito (assinatura ou molde por categoria)
  utils/challengeSfx.js        (+ .test) [NEW] síntese WebAudio, mudo lembrado
  components/views/challenge/
    ChampionChallengeView.jsx            [NEW] rota; orquestra as fases (§3.3)
    ConsoleShell.jsx                     [NEW] moldura DS, layout horizontal/vertical, filtro SVG do LCD
    TextBox.jsx                          [NEW] máquina de escrever, seta piscando, aria-live
    ResultScreen.jsx                     [NEW]
    ChallengeHomeCard.jsx                [NEW] card da Home: leve, sem sim, só Firestore
    arena/ArenaScreen.jsx                [NEW]
    arena/ArenaActor.jsx                 [NEW] sprite de mapa (jogador/Cynthia), quadros, respiração
    arena/useArenaMovement.js            [NEW] passo em grade, segurar para andar, BFS do toque
    battle/BattleScene.jsx               [NEW] camadas: fundo, plataformas, sprites, FX, HP, texto
    battle/HpBox.jsx                     [NEW]
    battle/BallRow.jsx                   [NEW]
    battle/MoveFxLayer.jsx               [NEW]
    battle/useTimelinePlayer.js          [NEW] toca a fila com Web Animations API
    bottom/CommandPanel.jsx              [NEW] LUTAR / POKÉMON / DESISTIR
    bottom/MovePanel.jsx                 [NEW]
    bottom/PartyPanel.jsx                [NEW]
    bottom/TeamPicker.jsx                [NEW] Meus times / Time do dia
    bottom/DPad.jsx                      [NEW] D-pad + A/B
    bottom/poketch/Poketch.jsx           [NEW] moldura + botão de app
    bottom/poketch/PartyApp.jsx, ClockApp.jsx, CounterApp.jsx, DossierApp.jsx   [NEW]
  styles/champion-challenge.css          [NEW] console, telas, arena, HUD
  styles/champion-challenge-fx.css       [NEW] efeitos de golpe (carregado com a rota)
scripts/
  challenge-art/*.txt                    [NEW] fonte da pixel art (grade de caracteres + paleta)
  build-challenge-art.mjs                [NEW] grade → PNG-8 em public/challenge/ (zlib nativo, sem dependência)
public/challenge/*.png                   [NEW] gerados e commitados, como public/data/
```

**Sobre o espelho `challengeDay.js`:** `src/` não importa de `api/` (wound 2026-10-13). As duas cópias têm cerca de 20 linhas, e `src/utils/challengeDay.test.js` importa as duas e compara 800 datas, incluindo viradas de ano e de mês. Se divergirem, o teste quebra.

### 3.2 Store: `useChampionChallengeStore`

```js
{
  day:   { status: 'idle'|'loading'|'ready'|'missing'|'error', dayKey, nextResetAt,
           difficulty, challengeKey, lineup: [{dexNum, species}], dailyTeam: {members, showdownText} },
  run:   { status: 'none'|'loading'|'active'|'won'|'lost'|'expired', runId, practice,
           teamSource, teamName, turn, lines: [], result },
  hasLoadedRun: false,            // wound 2026-09-21: [] não é "sem partida" antes da 1ª resposta
  stats: { streak, bestStreak, wins, played, lastWonDay },
  pending: null | { choice, turn }, // otimista: some quando o turno muda (wound 2026-07-27)
  queue:  [],                     // eventos ainda não animados (battleTimeline)
  ui:    { phase, battlePhase, poketchApp: 'party'|'clock'|'counter'|'dossier' },
  settings: { textSpeed: 'normal'|'fast', muted, animatedSprites },  // localStorage, try/catch
  error: null | { code, message },

  // ações
  loadDay(), loadRun(), warmUp(), start({practice, team}), choose(choice),
  forfeit(), setPhase(phase), consumeQueue(n), setSetting(k, v), reset()
}
```

- **Derivados no hook, não no store:** `request = readMyRequest(lines)`, `field = readBattleField(lines)`, `transcript = describeLogLines(lines)`, cada um memoizado por `lines.length`.
- **Assinaturas:** seletores com `useShallow`, nunca o store inteiro (skill `ux`, smell 1).
- **Escritas assíncronas:** `set((s) => …)` quando o estado é lido antes de um `await` e escrito depois (smell 4).
- **`staleTurn` (409):** `loadRun()` relê os rounds e mostra o estado real, sem toast de erro.

### 3.3 Máquina de estados da tela

| Fase | Tela de cima | Tela de baixo | Sai para |
|---|---|---|---|
| `boot` | Logo do console + `<Loader>` (só se passar de 300 ms) | Vazia | `arena`; `battle` se houver partida ativa; `result` se a oficial já terminou |
| `arena` | Sala, jogador anda | Pokétch + D-pad/A/B | `dialogue` ao chegar na Cynthia |
| `dialogue` | Balão "!", fala de abertura | Pokétch | `teamPick` (sem time) ou `transition` |
| `teamPick` | Cynthia na arena, esmaecida | `TeamPicker` | `transition` após `start` com sucesso; erro de time fica no próprio seletor |
| `transition` | Flash + espiral (~1 s; com *reduced motion*, fade de 150 ms) | Pokétch | `battle.intro` |
| `battle.intro` | Cynthia desliza, Poké Balls entram, envia o primeiro | Pokétch (equipe) | `battle.command` |
| `battle.command` | Cena parada, respiração | LUTAR / POKÉMON / DESISTIR | `moves`, `party`, `confirmForfeit` |
| `battle.moves` / `battle.party` | — | Golpes / equipe | `waiting` ao escolher; `command` com B |
| `battle.waiting` | "Cynthia está pensando…" | Escolha ecoada, botões ocultos | `playing` quando a resposta chega |
| `battle.playing` | Fila de eventos animada | Pokétch com HP ao vivo | `command`, `forceSwitch` (abre `party`) ou `result` |
| `result` | Vitória/derrota + números | Revanche (treino) / Voltar | `transition` (treino) ou Home |

A fase fica no store para que "Continuar batalha" na Home caia direto em `battle`.

### 3.4 Console e escala
- **`.ds-console`** é a moldura. Usa tokens de tema (`--color-surface`, `--space-*`) e segue o tema do app.
- **`.ds-screen`** é a tela do jogo, com paleta fixa `--ds-*` e unidade `--px`.
- **`useScreenScale(ref)`** observa a largura da tela e define `--px = largura / 256`. Arredonda para baixo até o inteiro quando o resultado for ≥ 2, e centraliza a sobra.
- **Desktop:** `grid-template-columns: minmax(0, 3fr) minmax(0, 2fr)`, tela de cima com `--px` ≈ 3 e de baixo ≈ 2.
- **Celular** (`@media (max-width: 1023px)`): coluna única, as duas telas na largura total. Sem `backdrop-filter`; altura em `dvh`; a reserva inferior vem das variáveis do dock em `app-shell.css`.
- Os sprites usam `image-rendering: pixelated` e caixa com tamanho fixo antes de carregar (smell 19).

### 3.5 Arena (`arenaMap.js`)
```js
export const CHAMPION_ROOM = {
  width: 16, height: 12, tile: 16,
  rows: [
    '################',
    '#L....BBBB....L#',
    '#......CC......#',
    '#P............P#',
    '#....oooooo....#',
    '#L...o....o...L#',
    '#....o....o....#',
    '#P...oooooo...P#',
    '#..............#',
    '#L............L#',
    '#.......S......#',
    '#######..#######',
  ],
  legend: { '#': 'wall', L: 'lamp', P: 'pillar', B: 'banner', C: 'champion', o: 'ring', '.': 'floor', S: 'spawn' },
  solid: ['wall', 'lamp', 'pillar', 'banner', 'champion'],
}
export const isSolid = (map, x, y) => …
export const findPath = (map, from, to) => …        // BFS 4-vizinhos; null se inalcançável
export const encounterTile = (map) => …             // tile abaixo da Cynthia, olhando para cima
export const stepTo = (map, pos, dir) => …          // {pos, facing, bumped}
```
- **Movimento:** um passo = 16 px de DS em 160 ms (`transform: translate3d` com transição). O React renderiza 1 vez por passo, não por quadro.
- **Profundidade:** atores ordenados pelo `y` (`z-index`).
- **Toque no chão:** converte a posição em tile, roda `findPath` e anda passo a passo. Um novo toque ou uma tecla cancela.
- **Encontro:** entrar em `encounterTile`, ou apertar A de frente para ela.

### 3.6 Entrada (`useConsoleInput`)
- **Teclado:** setas/WASD = direção; Z/Enter/Espaço = A; X/Esc/Backspace = B; 1–4 = golpes; S = equipe.
- **Guarda:** ignora o evento se `event.target` for um campo editável, ou se houver `.modal-scrim` aberto (wound 2026-10-13).
- **Toque:** `DPad` usa `pointerdown/up` com captura, `touch-action: none` e alvos ≥ 44 px. Segurar repete o passo.
- Saída única: `onAction(action)`. Arena e batalha só conhecem ações, nunca teclas.

### 3.7 Cena de batalha (coordenadas em px de DS, tela 256×192)

| Camada | Posição | Observação |
|---|---|---|
| Fundo | 0,0 – 256×192 | Gradiente de céu + chão verde-água (só CSS) |
| Plataforma do rival | centro (192, 84), 120×28 | Elipse |
| Plataforma do jogador | centro (64, 142), 136×32 | Elipse |
| Sprite do rival | base centrada em (192, 88), 80×80 | `@pkmn/img` `gen4` frente; fallback `gen5` |
| Sprite do jogador | base centrada em (64, 146), 80×80 | `gen4` costas |
| Cynthia (intro) | base em (200, 88), 80×80 | `cynthia-gen4` do Showdown, sai pela direita |
| HP do rival | (8, 12), 116×28 | Nome, nível, barra |
| HP do jogador | (132, 100), 120×36 | Nome, nível, barra, números |
| Linha de Poké Balls | rival (8, 44); jogador (140, 92) | 6 bolinhas 8×8 |
| Caixa de texto | (0, 144), 256×48 | Fonte de pixel; `aria-live="polite"` |
| FX | camada acima dos sprites | `pointer-events: none` |

### 3.8 Fila de eventos (`battleTimeline.js`)
`toTimeline(lines, {mySide}) → Event[]`. É pura e testada. Mapeamento:

| Linha | Evento |
|---|---|
| `\|move\|src\|Move\|tgt` | `{type: 'move', side, moveId, target, category, moveType}` (categoria e tipo vêm de `battle-dex.json`) |
| `\|-damage\|` / `\|-heal\|` | `{type: 'hp', side, from, to, cause}` |
| `\|-supereffective\|`, `\|-resisted\|`, `\|-immune\|`, `\|-crit\|`, `\|-miss\|` | `{type: 'effect', kind}` |
| `\|faint\|` | `{type: 'faint', side}` |
| `\|switch\|` / `\|drag\|` | `{type: 'switch', side, species, hp}` |
| `\|-status\|` / `\|-curestatus\|` | `{type: 'status', side, status}` |
| `\|-boost\|` / `\|-unboost\|` | `{type: 'stat', side, stat, amount}` |
| `\|-weather\|` | `{type: 'weather', weather}` |
| `\|-ability\|`, `\|-item\|`, `\|-enditem\|` | `{type: 'reveal', …}` |
| `\|turn\|`, `\|win\|` | `{type: 'turn'}`, `{type: 'end', winner}` |
| falas (`events` da API) | `{type: 'dialogue', key, params}` inseridas no índice `at` |

O texto de cada evento sai de `describeLogLines`, sem duplicar textos.

`useTimelinePlayer`:
- Consome a fila e roda cada passo com `element.animate(...).finished`, o que evita timers à deriva.
- Com *reduced motion*, a duração é 0.
- A ou toque acelera (`playbackRate = 3`); 2× fica nas configurações.

### 3.9 Efeitos de golpe (`moveFx.js` + `MoveFxLayer`)
`fxFor(moveId, {category, type}) → {kind: 'signature'|'physical'|'special'|'status', name, color}`.

| Molde / assinatura | Composição (só `transform`/`opacity`) |
|---|---|
| **physical** | Atacante avança 12 px e volta (240 ms); estrela de impacto `scale 0→1→0` na cor do tipo; alvo pisca |
| **special** | Orbe ou feixe da cor do tipo viaja do atacante ao alvo (280 ms) e explode em 6 partículas |
| **status** | 8 brilhos sobem em volta do alvo (ou de si mesmo) na cor do tipo |
| Dragon Claw | 3 cortes roxos em diagonal, um a cada 80 ms |
| Earthquake | `.ds-screen` treme (6 ciclos de `translateX`) + poeira no chão |
| Aura Sphere | Esfera azul cresce na mão e voa com rastro |
| Shadow Ball | Orbe roxo-escuro oscila no caminho |
| Extreme Speed | Atacante some, linhas de velocidade, impacto duplo |
| Moonblast | Lua rosa brilha no alto e desce um feixe |
| Hydro Pump | Coluna de água em 3 segmentos |
| Leaf Storm | 10 folhas em espiral |
| Dark Pulse | 3 anéis escuros concêntricos se expandindo |
| Air Slash | 2 lâminas brancas em arco |
| Ice Beam | Feixe ciano + cristais no alvo |
| Thunder Wave | Zigue-zague amarelo + faíscas de paralisia |

- A cor do tipo chega inline como `--fx-type`, pela mesma convenção do `--type-chip` (`index.css:1837`), a partir de `typeColors`.
- No máximo 12 partículas por efeito.
- Arquivo de keyframes próprio: `champion-challenge-fx.css`.

### 3.10 Pokétch
- **Moldura:** `bottom/poketch/Poketch.jsx`. O LCD é um `<div>` com fundo `--ds-lcd-bg` e grade de pixels sutil, pintada uma vez.
- **Silhuetas:** filtro SVG `#ds-lcd-2tone` (`feColorMatrix` → luminância → 2 tons do LCD), definido uma vez no `ConsoleShell` e aplicado por `filter: url(#ds-lcd-2tone)` nos `<img>`. Funciona sem CORS.
- **Apps:**

| App | Mostra |
|---|---|
| `PartyApp` | O time com barras de HP ao vivo (`readBattleField`) |
| `ClockApp` | Contagem até `nextResetAt`, atualizada a cada segundo só enquanto o app estiver visível |
| `CounterApp` | Sequência, vitórias, dias jogados |
| `DossierApp` | 6 silhuetas do time da Cynthia; cada uma se revela no `\|switch\|` |

### 3.11 Arte em código
- **Fonte:** cada arte é um `.txt` em `scripts/challenge-art/`, com cabeçalho de paleta (`. = transparente`, `k = #101820`, …) e uma grade de caracteres por quadro.
- **Build:** `scripts/build-challenge-art.mjs` lê as grades e monta folhas de sprite PNG-8 indexadas, com `node:zlib` e escrita manual dos chunks PNG (sem dependência). Grava em `public/challenge/` e imprime o tamanho total. O script é determinístico.
- **Peças:**

| Peça | Tamanho | Quadros |
|---|---|---|
| `room-tiles.png` | 16×16 cada | Piso ×2, parede, pilar, luminária (2 de brilho), anel ×8, painel |
| `player-walk.png` | 16×24 | 4 direções × 3 |
| `player-idle.png` | 16×24 | 4 direções × 2 (respirar) |
| `cynthia-map.png` | 16×24 | Frente × 2 (respirar) + "!" 8×8. Paleta copiada do sprite `cynthia-gen4` |
| `player-back.png` | 64×64 | 2 (intro e arremesso) |
| `ui-balls.png` | 8×8 | Normal, desmaiado, status |

- **Orçamento:** ≤ 60 KB no total.
- **Sprite da Cynthia na batalha:** `https://play.pokemonshowdown.com/sprites/trainers/cynthia-gen4.png`. O id consta em `public/data/trainer-sprites.json`, gerado do `battle-dex-data.js` do Showdown; **conferir no navegador na F0**, porque este ambiente não alcança o host. Já tem cache no service worker (`vite.config.js:63`).

### 3.12 Som (`challengeSfx.js`)
- **`unlock()`** é chamado no primeiro gesto dentro da rota e cria o `AudioContext`. Antes disso, nada toca (política de autoplay).
- **`play(name)`** monta osciladores e ruído por receita, sem arquivos:

| Som | Receita |
|---|---|
| `textBlip` | Quadrada 880 Hz, 18 ms, limitado a 1 a cada 40 ms |
| `cursor` / `confirm` / `cancel` | Quadrada 660 / 990 / 440 Hz, 40 ms |
| `step` / `bump` | Ruído filtrado 20 ms / triangular 110 Hz, 60 ms |
| `encounter` | Duas notas subindo (quadrada), 120 ms |
| `ballOpen` | Ruído + varredura 300→1200 Hz, 150 ms |
| `hit` / `hitSuper` / `hitWeak` | Ruído com queda de tom; super = 2 impactos; fraco = abafado |
| `faint` | Varredura 600→80 Hz, 500 ms |
| `heal` / `statUp` / `statDown` | Arpejo subindo / varredura subindo / varredura descendo |
| `victory` / `defeat` | Arpejo original de 8 notas / 4 notas descendo |

- **`setMuted(bool)`** fica lembrado em `localStorage['ptb:challenge:muted']`, sempre com try/catch.
- O botão de mudo fica na moldura do console.

### 3.13 Acessibilidade e movimento
- A caixa de texto é `aria-live="polite"`. Todo comando é `<button>`, e o foco vai para LUTAR quando é a vez do jogador.
- HP e efetividade também viram texto.
- `prefers-reduced-motion`: nenhuma animação de golpe, transição vira fade de 150 ms, texto aparece inteiro, sem respiração.
- **Exceções ao `design-system`**, registradas na skill na mesma entrega:
  - unidade `--px` e paleta `--ds-*` dentro de `.ds-screen`;
  - durações de jogo acima de 350 ms (transição, desmaio, efeitos), consideradas momentos de recompensa.

### 3.14 Orçamentos de desempenho

| Métrica | Limite |
|---|---|
| JS de boot | **não cresce**; o card da Home adiciona ≤ 2 KB gzip, sem nenhum import da rota |
| Chunk da rota (JS) | ≤ 60 KB gzip (sem contar o chunk `pkmn` de 42 KB, compartilhado com as batalhas) |
| CSS da rota | ≤ 12 KB gzip |
| PNGs da arte | ≤ 60 KB |
| Dependências novas | **nenhuma** |
| Precache | ≤ 1,5 MB por arquivo; a rota **não** entra no `MOBILE_PREFETCH` |
| Toque → primeira mudança | < 100 ms (o "pensando…" é otimista) |
| Quadros > 50 ms durante animação | ≤ 2 (receita da skill `ux`) |
| `choose` com a função quente | p50 < 400 ms |

---

## 4. Dados

### 4.1 Documentos
```
artifacts/{appId}/
  public/data/challengeDays/{dayKey}
    { dayKey, championId: 'cynthia', difficulty: 'platinum', challengeKey: 'platinum',
      weekday: 3, lineup: [{dexNum: 442, species: 'Spiritomb'}, …],      // ordem de envio, ás por último
      dailyTeam: { showdownText, members: [{species, dexNum, item, ability, moves: []}] },
      engineVersion, aiVersion, createdAt }

  challengeRuns/{runId}                // runId = {uid}_{dayKey} | {uid}_{dayKey}_p{n}
    { uid, dayKey, practice, practiceN, championId, challengeKey,
      teamSource: 'saved'|'daily', teamName, teamTier,
      status: 'active'|'won'|'lost'|'expired', turn, roundCount,
      result: {turns, remaining, hpPct, score} | null,
      engineVersion, aiVersion, createdAt, updatedAt, endedAt }
    rounds/{seq}  { seq, turn, lines: [...], createdAt }              // log na visão do p1
    secret/state  { format, seed: [4 ints], teams: {p1, p2}, choices: [{side, choice, turn}],
                    aiTrace: [últimas 10 decisões] }                  // ninguém lê pelo cliente

  challengeStats/{uid}
    { uid, played, wins, losses, streak, bestStreak, lastPlayedDay, lastWonDay,
      history: { 'YYYY-MM-DD': 'won'|'lost'|'expired' },             // últimos 60 dias
      updatedAt }
```
`secret/state` existe porque, com `seed` + `choices` + o time da Cynthia, daria para refazer a batalha e prever o RNG.

### 4.2 Regras (`firestore.rules`, dentro de `match /artifacts/{appId}`)
```
match /public/data/challengeDays/{dayKey} {
  allow read: if true;
  allow write: if false;                                   // só Admin SDK
}
match /challengeRuns/{runId} {
  allow read, delete: if request.auth != null && resource.data.uid == request.auth.uid;
  allow create, update: if false;
  match /rounds/{seq} {
    allow read, delete: if request.auth != null
      && get(/databases/$(database)/documents/artifacts/$(appId)/challengeRuns/$(runId)).data.uid == request.auth.uid;
    allow create, update: if false;
  }
  match /secret/{docId} {
    allow read, create, update: if false;
    allow delete: if request.auth != null
      && get(/databases/$(database)/documents/artifacts/$(appId)/challengeRuns/$(runId)).data.uid == request.auth.uid;
  }
}
match /challengeStats/{uid} {
  allow read, delete: if isOwner(uid);
  allow create, update: if false;
}
```
- Nenhum curinga existente cobre esses caminhos. Conferido: só `users/{userId}/{document=**}` e `/{path=**}/messages/{messageId}`.
- A exclusão de conta apaga primeiro `rounds` e `secret`, depois a partida, porque o `get()` do pai precisa existir.
- Índice: consulta `challengeRuns where uid ==` (campo único, índice automático).

---

## 5. Integração no app

### 5.1 Alterações pontuais

| Arquivo | Onde | O quê |
|---|---|---|
| `src/components/AppLayout.jsx` | ~`:150` (loaders lazy) | `const loadChampionChallengeView = () => import('./views/challenge/ChampionChallengeView')` + `lazy(...)` |
| | `:117-127` `ROUTE_CHUNKS` | `'/challenge': loadChampionChallengeView` (prefetch no hover) |
| | `:350` `currentPage` | `if (path.includes('/challenge')) return 'challenge';` |
| | `:951` grupo `guessing` | `{key: 'challenge', label: t('nav.challenge'), path: '/challenge', icon: <Crown className="w-5 h-5 shrink-0" />}` |
| | `:1877` `<Routes>` | `<Route path="/challenge" element={<ChampionChallengeView />} />` |
| `src/components/views/CozyHomeView.jsx` | `:437-512` painel `yourDay` | `<ChallengeHomeCard />` como card `--compact` ao lado do puzzle |
| | `:266-275` `journey` | Item "Desafio da Campeã" com o estado do dia |
| `api/render-meta.js` | `:89` | Ramo `urlPath === '/challenge'` com título, descrição e imagem |
| `src/components/PageGuide.jsx` | `:203` | `pageGuideTips.challenge` |
| `src/constants/translations.js` | EN perto de `:938`, PT espelhado | `challenge.*`, `nav.challenge`, `guide.challenge` (exatamente 2 dicas), `cozyHome.challenge*` |
| `src/constants/theme.js` | `:12` | `PATCH_NOTES_VERSION = '1.15.0'` + entrada nas notas |
| `src/services/accountDeletion.js` | `:44-50` | Consulta `challengeRuns where uid == uid` → apaga `rounds/*`, `secret/state`, a partida; e `challengeStats/{uid}` |
| `src/store/useBattlesStore.js` | `:54-79` | `callBattleApi` passa a usar `services/apiClient.js` (mesmo comportamento) |
| `vercel.json` | `functions` | `"api/challenge.js": {"memory": 2048, "maxDuration": 30, "excludeFiles": "api/**/*.test.js"}` |
| `.claude/skills/design-system/SKILL.md` | Seção nova | Exceção `.ds-screen` (`--px`, `--ds-*`, durações de jogo) |
| `docs/modules/daily_challenge.md` | — | Módulo do sistema pronto (fluxo, invariantes, armadilhas) |

### 5.2 Card da Home (`ChallengeHomeCard`)
- **Lê:** `challengeDays/{hoje}` e, com usuário logado, `challengeRuns/{uid}_{hoje}` + `challengeStats/{uid}`. Faz até 3 `getDoc`. Um cache em `localStorage['ptb:challenge:summary']` faz o card aparecer na hora, com try/catch e payload pequeno (wound 2026-06-18).
- **Não importa** nada da rota, do sim nem de `@pkmn/img`. A silhueta usa `getPokemonFrontSpriteUrl` com o filtro do LCD.
- **Estados:**
  - documento do dia ausente: "Novo time da Campeã disponível";
  - pronto: silhueta do primeiro Pokémon + nome do desafio;
  - em andamento: "Continuar batalha";
  - vitória: "Vitória! Sequência N";
  - derrota ou expirada: "Revanche de treino disponível".

  Sempre com a contagem até a virada.
- É card de **status**, não lançador (wound 2026-09-04).

### 5.3 Chaves de i18n (esqueleto)
```
challenge.title / subtitle / difficulty.{dp,platinum,rematch,world}
challenge.arena.{walkHint, skipWalk, talk}
challenge.picker.{mine, daily, empty, noMoves, autoComplete, banned, tier, start}
challenge.battle.{fight, pokemon, forfeit, forfeitConfirm, back, thinking, chose, pp}
challenge.result.{won, lost, expired, turns, remaining, streak, practice, home}
challenge.poketch.{party, clock, counter, dossier, nextIn}
challenge.cynthia.{intro, firstLoss, ace, lastOne, playerLow, win, lose, superEffective}   // falas originais
challenge.errors.{invalidTeam, invalidChoice, staleTurn, dayClosed, practiceLocked, offline, server}
nav.challenge · guide.challenge (2 dicas) · cozyHome.challenge{Title,Ready,Continue,Won,Lost,NextIn}
```

---

## 6. Testes, arquivo por arquivo

| Arquivo | Casos |
|---|---|
| `api/_lib/challenge/day.test.js` | 23:59 e 00:00 de Brasília; virada de mês e de ano; `nextResetAt`; o dia da semana bate com o calendário |
| `pool.test.js` | Toda variante importa no sim; nenhuma tem golpe banido; toda espécie tem `source`; Garchomp é `core` |
| `rotation.test.js` | Mesmo dia → mesmo time; 6 espécies distintas; ás por último; nenhuma composição repetida em 7 dias (365 dias simulados); distribuição de primeiros Pokémon dentro do peso esperado ±10% |
| `dailyTeam.test.js` | Determinístico; todos no nível 50; 6 membros com 4 golpes |
| `validateTeam.test.js` | Cada código de erro; time válido devolve `packed` e `tier` |
| `engine.test.js` | Replay = partida ao vivo (log idêntico); sem `sendUpdates` nada sai (guarda de regressão); jogada ilegal → `{ok: false, error}`; `owes` depois de desmaio (só um lado); log do p1 não contém o item do p2 |
| `outcome.test.js` | Sequência: vitória seguida, buraco de um dia, derrota zera, treino não conta, `expired` |
| `dialogue.test.js` | Primeiro nocaute sofrido, ás enviado, último Pokémon — cada fala uma vez por partida |
| `api/challenge.test.js` | Partida completa pelo handler; `officialAlreadyPlayed`; `practiceLocked`; `staleTurn`; `dayClosed` (relógio falso); `invalidChoice` com `simError`; substituição da IA sem o p1 dever; o documento lido pelo cliente não tem `seed`, `choices` nem o time do p2; `ensureDay` concorrente cria um só documento |
| `api/challenge.deps.test.js` | Força `@pkmn/sim` a falhar → `GET ?ping=1` responde e `POST` devolve JSON nomeando o módulo |
| `api/_lib/dependencies.test.js` | [MODIFY] incluir `require('@pkmn/sim')` com `--no-experimental-require-module` |
| `src/utils/challengeDay.test.js` | Espelho idêntico ao do servidor em 800 datas; `effectiveStreak` |
| `src/utils/battleTimeline.test.js` | Um turno real gravado (fixture) → eventos esperados; fala inserida no `at` certo; desmaio + troca forçada |
| `src/utils/arenaMap.test.js` | Colisão; BFS acha o caminho e respeita pilares; `encounterTile` |
| `src/utils/moveFx.test.js` | As 12 assinaturas; fallback por categoria; tipo desconhecido → cor neutra |
| `src/utils/challengeSfx.test.js` | Mudo lembrado; `play` antes do `unlock` não lança erro |
| `src/store/useChampionChallengeStore.test.js` | `pending` some quando o turno avança; `staleTurn` chama `loadRun`; `hasLoadedRun` |
| IA | Ver o documento da IA, §11 |

**Portões em toda entrega:**
- `npm run lint` (zero warnings), `npm test`, `npm run build`;
- o bundle não contém `BattleStream` nem `@pkmn/sim` (`grep` em `dist/`);
- 8 funções;
- `/verify-ui` (1440/390 × escuro/claro, quadros no meio da animação, toque via CDP);
- a receita de medição da skill `ux`.

---

## 7. Tarefas por fase

### F0 — Preparação
- [ ] Conferir no navegador `cynthia-gen4.png` e os sprites `gen4` de frente e costas do `@pkmn/img`.
- [ ] Conferir na Bulbapedia os sets de Glaceon (PWT), Eelektross e Braviary; sem fonte, a espécie fica fora do pool.
- [ ] Escolher a fonte de pixel (sugestão: Pixelify Sans) e testar acentos em PT.
- [ ] Rascunhar a arte (`scripts/challenge-art/*.txt`) e gerar os PNGs para aprovação.

### F1 — Servidor e IA
- [ ] `_lib/testing/fakeFirestore.js` (extrair) + `battle-turn.test.js` usando o arquivo extraído.
- [ ] `constants`, `day`, `pool`, `rotation`, `dailyTeam`, `validateTeam`, `engine`, `outcome`, `dialogue` + testes.
- [ ] `_lib/ai/*` + testes + `scripts/ai-arena.mjs` (documento da IA).
- [ ] `runs.js` + `api/challenge.js` + `challenge.test.js` + `challenge.deps.test.js`.
- [ ] `firestore.rules`, `vercel.json`, contagem de funções = 8.
- **Pronto quando:** todos os testes verdes; arena de IA com as metas do documento da IA (§10); self-check local verde.

### F2 — Jogável
- [ ] `apiClient`, `challengeApi`, store, hook, `challengeDay` (+ teste do espelho).
- [ ] `ChampionChallengeView` com cena **simples**: os leitores existentes + `TeamPicker` + `CommandPanel` + `MovePanel` + `PartyPanel` + `ResultScreen`.
- [ ] Rota, `currentPage` e navegação, para poder testar de verdade.
- **Pronto quando:** vencer e perder no navegador; retomar depois de recarregar; erro de jogada aparece; duas abas não corrompem a partida.

### F3 — Console DS
- [ ] `ConsoleShell` + `useScreenScale`, `BattleScene`, `HpBox`, `BallRow`, `TextBox`.
- [ ] `battleTimeline` + `useTimelinePlayer` + `moveFx` + `MoveFxLayer` (3 moldes + 12 assinaturas).
- [ ] Pokétch e os 4 apps; `challengeSfx`.
- **Pronto quando:** `/verify-ui` completo; *reduced motion*; orçamentos da §3.14 medidos.

### F4 — Arena
- [ ] `arenaMap`, `ArenaScreen`, `ArenaActor`, `useArenaMovement`, `useConsoleInput`, `DPad`.
- [ ] Diálogo, transição, ping de aquecimento ao montar a arena, "Ir até a Cynthia".
- **Pronto quando:** teclado e toque (CDP) andam e respeitam colisão; o encontro dispara uma vez.

### F5 — Integração
- [ ] Card da Home + `journey`, `render-meta`, guia, i18n completo, notas de versão, exclusão de conta.
- [ ] `docs/modules/daily_challenge.md`, `docs/index.md`, exceção na skill `design-system`.
- **Pronto quando:** card nos 5 estados; rota na busca e no "Mais"; excluir uma conta de teste apaga tudo do desafio.

### F6 — Depois
- Ranking diário, cartão de compartilhamento, push no cron diário existente.
