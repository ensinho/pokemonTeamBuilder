# IA de batalha — como a Cynthia decide

> Par do plano [daily-champion-challenge.md](./daily-champion-challenge.md) e da especificação
> [daily-champion-challenge-tech.md](./daily-champion-challenge-tech.md).
> Todo o código desta IA vive em `api/_lib/ai/` e roda **só no servidor**.
> A parte **aprendida** (regressão logística: chance de vitória, previsão da jogada, calibragem) está em
> [daily-champion-challenge-ml.md](./daily-champion-challenge-ml.md).
> Data: 2026-10-14. Números medidos em `@pkmn/sim@0.10.11`, Node local.
> **Implementada em 2026-10-14 (F1).** Este documento foi atualizado para o código: pesos ajustados (§8), *lookahead* (§10), perfis calibrados (§14) e resultados da arena (§16).

## 0. O que é uma IA "de qualidade" aqui

| Qualidade | Significa | Como é garantida |
|---|---|---|
| **Justa** | Decide só com o que a Cynthia poderia saber | Neblina (§5) + teste "não espia" (§11) |
| **Crível** | Joga como uma campeã: nocauteia, protege o ás, troca quando apanha | Avaliadores (§8) + personalidade (§12) |
| **Desafiadora e vencível** | Difícil no domingo, acessível na segunda | Perfis de dificuldade (§14) + metas de calibragem (§16) |
| **Reativa** | Percebe o padrão do jogador e responde | Memória derivada do histórico (§11) |
| **Explicável** | Toda decisão mostra o porquê | `trace` gravado + painel de admin (§15) |
| **Rápida** | Não pesa no turno | Orçamento < 50 ms por decisão (§10) |
| **Determinística** | Mesma situação → mesma decisão | RNG semeado, sem tocar o PRNG da batalha (§1) |

---

## 1. Invariantes (cada um tem teste)

| # | Invariante | Teste |
|---|---|---|
| I1 | **Decide antes da escolha do jogador.** Recebe o snapshot feito *antes* de `apply('p1', …)` | Mesma decisão para qualquer escolha do p1 |
| I2 | **Nunca consome o PRNG nem escreve na batalha real.** Todo cálculo roda em clones com log próprio (`fog.js` `cloneOf`): `toJSON()` devolve o `log` por referência, e um clone ingênuo escreveria os turnos simulados na batalha real (achado pelo teste, wound 2026-10-14) | Replay depois de turnos ao vivo = log idêntico |
| I3 | **É determinística.** Toda aleatoriedade vem de `rngFor(seed, turn, 'ai')` | Mesma entrada → mesma escolha e mesmo `trace` |
| I4 | **Escolhas ficam gravadas.** O replay nunca chama a IA | Mudar `PROFILES` não altera o replay de uma partida gravada |
| I5 | **Não espia.** Item, habilidade, EVs, golpes e banco não revelados do jogador são crenças, não fatos | Trocar o item ou os EVs ocultos do p1 não muda a decisão |
| I6 | **Nunca faz jogada ilegal.** As opções saem do `request` do p2 | Fuzz de 200 batalhas por perfil sem nenhum `\|error\|` |
| I7 | **Respeita a personalidade.** O ás (Garchomp) nunca sai por troca voluntária e entra por último | Cenários + fuzz conferindo a ordem de envio |
| I8 | **Cabe no orçamento.** p95 < 80 ms por decisão no perfil mais caro | `npm run ai:bench` (fora do portão de CI, para não ficar instável) + limite folgado no teste (< 250 ms) |

---

## 2. Organização dos arquivos

```
api/_lib/ai/
  index.js              decide(input) → {choice, trace}; AI_VERSION
  rng.js                rngFor(seed, ...tags) → PRNG do sim (hashSeed vem de challenge/seed.js)
  view.js               buildView(battle, knowledge, personality) → BattleView (só leitura, para trace/testes)
  knowledge.js          knowledgeFrom(p2Lines) → o que foi revelado + eventos (uma passada no log)
  memory.js             memoryFrom(knowledge) → perfil do jogador nesta partida
  fog.js                fogClone / estimationClone / simulationClone, todos com log próprio (cloneOf)
  estimate.js           createEstimator(clone) → damage, actsFirst, threatOf, bestMoveAgainst (§6)
  features.js           variáveis dos modelos (fonte única: jogo, coleta e treino) — documento de ML
  model.js              predictWin / predictActions — documento de ML
  models/               winprob-v1.js (treinado), foe-v0.js (pesos de mão)
  observe.js            trainingRow (linha anônima) e winProbFull (ponto da curva pós-batalha)
  options.js            legalOptions(request) → [{choice, kind, moveId?, slot?, species?}]
  foeModel.js           predictFoe({est, foe, me, memory}) → {moves: [{id, p, exp}], pSwitch, top}
  evaluators/
    classify.js         qual avaliador é dono de cada golpe (um só, sem contar duas vezes)
    abilities.js        habilidades que absorvem um tipo ou impedem sono (possíveis × reveladas)
    attack.js           golpes de dano
    setup.js            boosts (Swords Dance, Nasty Plot, Dragon Dance, Coil, Calm Mind…)
    status.js           Will-O-Wisp, Thunder Wave, sono, Toxic, Confuse Ray; evaluateOther (resto)
    recovery.js         Recover, Roost, Rest, Wish, Aqua Ring…
    utility.js          Haze/Roar/Whirlwind, Protect, hazards, clima/terreno
    switch.js           trocas voluntárias + matchup(x) e hazardDamage(x)
  lookahead.js          simulação de 1 turno nos clones com neblina (perfis altos)
  policy.js             softmax top-N com temperatura → escolha
  replacement.js        quem entra depois de um desmaio (e quem volta com Revival Blessing)
  profiles.js           PROFILES: dp, platinum, rematch, world (§14)
  personality/
    cynthia.js          ás, frieza com vantagem (genérico por campeão)
  testing/
    scenario.js         DSL de cenários para os testes (§17)
    robots.js           random / greedy / epsilon, para a arena e o autojogo
  *.test.js             scenarios, invariants (fuzz), estimate, knowledge
scripts/ai-arena.mjs    autojogo para calibrar (§16); npm run ai:arena / ai:bench
```

Cada avaliador é uma função pura `(ctx, move) → {score, parts, reason}` e não conhece os outros. `classify` decide qual avaliador é dono de cada golpe. Para adicionar um comportamento, cria-se um avaliador, uma regra em `classify.js` e uma linha de peso em `profiles.js`.

---

## 3. Fluxo de uma decisão

```
decide({ snapshot, request, p2Lines, seed, turn, profileKey, championId, model? })
  │
  ├─ request.wait? ───────────────────────────────► nenhuma decisão
  ├─ uma opção só? ───────────────────────────────► ela, sem calcular nada
  ├─ knowledge = knowledgeFrom(p2Lines); memory = memoryFrom(knowledge)
  ├─ fogged    = fogClone(snapshot, knowledge)                 (~0,6 ms)
  ├─ est       = createEstimator(estimationClone(fogged))      (um clone por decisão)
  ├─ foe       = predictFoe({est, foe, me, memory})
  ├─ options   = legalOptions(request)
  ├─ request.forceSwitch? → replacement.js
  │  senão      → options × avaliadores (com pesos do perfil) + leitura de troca
  ├─ perfil com lookahead? → lookahead.js nos top-K            (~20–35 ms)
  └─ policy.pick(scored, profile, rng) ────────────────────────► { choice, trace }
```

Na entrada (vinda de `_lib/challenge/actions.js`):
- `snapshot` é `engine.snapshot(battle)` antes do p1 (o `toJSON()` com o log copiado);
- `turn` é uma etiqueta da decisão (`'<turno>.<n>'`): várias decisões cabem numa chamada (a jogada e as trocas forçadas depois), e cada uma precisa do próprio dado;
- `model` é o M1 (`models/winprob-v1.js` por padrão); os testes passam modelos fixos;
- `request` é `battle.sides[1].activeRequest`;
- `p2Lines` é o log no canal do p2, via `extractChannelMessages(…, [1])` (o motor devolve junto com as linhas do p1);
- `seed` é a da partida.

---

## 4. `BattleView` (o que a IA enxerga)

```js
{
  turn, field: { weather, terrain, trickRoom, sides: { me: {hazards, screens}, foe: {hazards, screens} } },
  me:  { active: Mon, bench: Mon[], aceSlot, faintedCount },            // dados completos (são dela)
  foe: { active: FoeMon, seenBench: FoeMon[], remaining: number },      // só o que é público
}
Mon    = { slot, species, types, hpPct, hp, maxhp, status, boosts, moves: [{id, pp, disabled}], item, ability, stats }
FoeMon = { species, types, hpPct, status, boosts, revealed: {moves: Set, item?, ability?} }
```
O HP do jogador é **percentual**, como a Cynthia vê na tela; o valor absoluto só existe nas crenças.

---

## 5. Conhecimento e neblina (justiça)

**`knowledgeFrom(p2Lines)`** varre o log do p2 e junta, por espécie do jogador:
- golpes usados (`|move|p1a: X|Move`);
- item revelado (`|-item|`, `|-enditem|`, `[from] item:`);
- habilidade revelada (`|-ability|`, `[from] ability:`);
- espécies do banco já vistas (`|switch|`);
- quantos Pokémon restam (`|poke|` / contagem de desmaios).

**Crenças para o que não foi revelado:**

| Desconhecido | Crença |
|---|---|
| EVs/IVs/natureza | 84 EVs em tudo, IV 31, natureza neutra (espalhamento padrão de random battle) |
| Item | Nenhum (até aparecer) |
| Habilidade | A primeira habilidade da espécie; se alguma possível dá imunidade (Levitate, Flash Fire, Water/Volt Absorb, Sap Sipper, Lightning Rod…), o golpe afetado leva o desconto da §8 |
| Golpes não vistos | Até 4: os revelados + 1 STAB por tipo da espécie (poder 90, categoria pelo maior ataque base) |
| HP absoluto | `hpPct × maxhp` acreditado |

**`fogClone(snapshot, knowledge)`**:
1. `Battle.fromJSON(snapshot)` e `send = () => {}`.
2. No lado p1 (o jogador), para cada Pokémon já visto:
   - `item = ''` se não revelado;
   - `storedStats` recalculados com a crença;
   - habilidade acreditada se não revelada;
   - `moveSlots`/`baseMoveSlots` trocados pelos golpes acreditados;
   - `hp` = percentual × `maxhp` acreditado.
3. O banco não visto do jogador não é usado: a simulação nunca troca o p1 (§10).

Validado no spike desta sessão. No mesmo Stone Edge do Garchomp contra um Togekiss real com Assault Vest e 252 HP/SpD, o dano real foi 120–142; contra a crença, 110–130. A IA erra como erraria um jogador humano, e não "sabe" o set.

---

## 6. Estimativas (`estimate.js`)

**Como ficou na implementação (mais barato que o desenho original):** o spike fazia duas cópias do clone por cálculo. Medido: clonar custa ~0,6 ms e `getDamage` ~0,075 ms. Por isso cada decisão faz **um** clone de estimativa e memoiza `(atacante, defensor, golpe)`. O dano máximo vem de `getDamage` com `randomizer = d => d`, e o mínimo é derivado (`⌊máx × 0,85⌋`, o piso do sorteio de dano), com erro de um ou dois pontos e metade das chamadas. Nesse clone, `eatItem`/`useItem` são neutralizados: sem isso, a primeira estimativa "come" a Yache Berry e todas as seguintes veem o Pokémon sem ela. Uma decisão completa, trocas incluídas, custa poucos ms.

| Função | Como | Custo |
|---|---|---|
| `damage(atk, def, moveId)` → `{min, max, expPct, ko, acc, immune, status, fallback}` | `move = dex.getActiveMove(id)` com `willCrit = false`; `actions.getDamage(atk, def, move, true)`; golpes de múltiplos acertos × acertos esperados (3,1 para 2–5). `false`/`undefined`/`null` = imune | ~0,075 ms; memoizado na decisão |
| `koChance(range, hp)` | Fração linear do intervalo ≥ HP; × precisão do golpe | O(1) |
| `actsFirst(a, moveA, b, moveB)` | Prioridade (`dex.moves.get(id).priority`, Prankster/Gale Wings pela crença) → `getActionSpeed()` → Trick Room inverte; empate = 0,5 | O(1) |
| `threatOf(foe → me)` | Maior dano esperado (%) entre os golpes revelados e acreditados do jogador contra o meu ativo | Até 4 `damageRange` |
| `bestMoveAgainst(mine → foe)` | Maior `E[dano%] × precisão` entre meus golpes | Até 4 `damageRange` |

Medido no spike: Garchomp `getActionSpeed()` = 169 e Togekiss = 100; Extreme Speed tem prioridade 2.

**Robustez (achado do spike):** `getDamage` fora de uma jogada real **lança erro** em golpes que dependem do contexto de execução (Beat Up: `move.allies` indefinido; 19 vezes em ~7 mil turnos). Toda chamada fica em `try/catch`; no erro, a estimativa cai para o poder base × efetividade × STAB e o `trace` marca `estimateFallback`. Um teste passa **todo golpe do dex** pelo estimador.

---

## 7. Opções legais (`options.js`)
- Lê `request.active[0].moves`: aceita `move i` se `!disabled` e `pp > 0`. Se todos estiverem bloqueados, o sim oferece Struggle como `move 1`.
- Trocas: `switch j` para cada `request.side.pokemon[j]` que não esteja desmaiado nem ativo, e só se não estiver `trapped`.
- `forceSwitch`: só trocas.
- `maybeTrapped` conta como preso: uma troca recusada seria jogada ilegal.
- **Revival Blessing:** depois dele, o pedido de "troca" é para escolher um Pokémon **desmaiado** (a entrada ativa traz `reviving`). As opções viram os desmaiados, e `replacement.js` revive o mais forte, com preferência pelo ás. Achado pelo autojogo: o curinga Pawmot usa o golpe.
- **Nunca** gera `terastallize`, `mega` ou `dynamax` (a Terastal Clause recusa; validado).

---

## 8. Avaliadores (pontuação em "pontos ≈ % de HP")

`E[d]` = dano esperado em % do HP máximo do alvo; `pKO` = chance de nocaute; `acc` = precisão.

| Avaliador | Fórmula | Detalhes |
|---|---|---|
| **attack** | `acc × (E[d] + 60·pKO) + 20·pKO·first + 15·[prioridade ∧ alvo mais rápido ∧ pKO > 0,5] − penalidades` | Penalidades: −8 por queda de status em mim sem nocaute (Leaf Storm, Close Combat, Draco Meteor); −10 recoil se HP < 30%; −6 contato contra Rough Skin/Iron Barbs/Rocky Helmet revelados; × 0,3 se o alvo **pode** ser imune por habilidade acreditada |
| **setup** | `35 × safe × (1 − boostAtual/4) + 15·[com o boost eu nocautearia]` | `safe` = 1 se `threatOf < limiar do perfil` e meu HP > 60%; senão 0. O "com o boost" refaz `damageRange` num clone com `boosts` somados. Vale 0 com boost ≥ +4 |
| **status: Will-O-Wisp** | `45 × razãoFísica × acc` | `razãoFísica` = atk/(atk+spa) da crença; 0 contra Fogo, quem tem status ou Guts revelado |
| **status: Thunder Wave** | `40 × [jogador mais rápido que meu ativo ou que o ás]` | 0 contra Elétrico/Terra/quem tem status |
| **status: sono** | `50 × acc` | 0 se a Sleep Clause já está em uso, contra Grama (golpes de pó), Insomnia/Vital Spirit possíveis ou Electric Terrain |
| **status: Toxic / Confuse Ray** | 30 contra alvo resistente (HP×Def alto) / 20 | 0 contra Aço/Veneno (Toxic) |
| **recovery** | `0,8 × (100 − meuHP%)` | Só se meu HP < 55% **e** `threatOf < meuHP%` (o jogador não me nocauteia neste turno). Rest só com status ou HP < 40% |
| **utility: Haze/Roar/Whirlwind** | `15 × soma dos boosts positivos do jogador` | Responde à preparação do jogador (§11) |
| **utility: Protect** | 10; 0 se usado no turno anterior | Raro de propósito |
| **utility: hazards** | `25 × restantesDoJogador/5` se ainda não postos e turno ≤ 5 | — |
| **switch → j** | `M(j) − M(ativo) − 15 − 10·trocasRecentes − danoDeEntrada(j)` | `M(x)` = `0,6·bestMoveAgainst(x→jogador) − 0,8·threatOf(jogador→x) + 10·[x age primeiro]`. Só é avaliado se o ativo leva nocaute antes de agir, ou se a diferença de confronto passa de 40. **Ás: −∞** |

Os pesos (60, 20, 35…) são o ponto de partida. Cada perfil pode multiplicá-los (§14), e o autojogo calibra (§16).

**Ajustes feitos na implementação (cada um com o cenário que o motivou):**
- **Queda de status própria:** a penalidade cresce com a queda já sofrida: `8 + 12 × estágios já perdidos`. Com −8 fixo, um segundo Leaf Storm a −2 ainda ganhava (cenário 18).
- **Confuse Ray:** 20 → **12**. Empatava com Will-O-Wisp num atacante físico, e queimar vale muito mais que confundir (cenário 8).
- **Efeitos secundários** entram no ataque: status 12, flinch 10 (só agindo antes), boost próprio 6, queda no alvo 4, cada um × chance (× 2 com Serene Grace).
- **Status sem avaliador** (Embargo, Sweet Scent, Attract…): nota simbólica **3**. O perfil DP, com temperatura alta, às vezes os usa, como a IA do DS; os perfis altos quase nunca. Memento vale 25 com HP < 30%.
- **Recarga** (Giga Impact) −15 sem nocaute; **golpe de dois turnos** −10 sem Power Herb; **Fake Out** só no primeiro turno; **Dream Eater** só em alvo dormindo; status atrás de **Substitute** = −∞.

---

## 9. Previsão do jogador (`foeModel.js`)
- **Golpes:** `p(m) ∝ exp(E[d(m → meu ativo)] / 15)` sobre os golpes revelados e acreditados. Ganha +30% de peso o golpe repetido nos últimos 2 turnos (memória).
- **Isso já é o modelo M2** (softmax linear) com pesos de mão (`models/foe-v0.js`). Na F6, os pesos aprendidos com batalhas humanas anônimas substituem os de mão, sem mudar o código (documento de ML, §1).
- **Troca:** `pSwitch = clamp(0,10 + 0,4·taxaDeTroca, 0, 0,5)`. Sobe +0,15 se o meu ativo nocauteia o dele antes de ele agir.
- **Usos:**
  - `threatOf` esperado;
  - a avaliação de troca (o substituto recebe o golpe previsto);
  - as respostas simuladas no lookahead;
  - a "leitura de troca": nos perfis que leem, golpes de cobertura ganham `pSwitch × E[d]` contra os Pokémon do banco **já vistos**, ou um bônus de cobertura neutra se nenhum foi visto.

---

## 10. Simulação de 1 turno (`lookahead.js`)
Só nos perfis `rematch` e `world`. Dá precisão onde a heurística erra: habilidades, itens, ordem, recoil, efeitos secundários.

1. Candidatos = top-K pela heurística (K = 3 em `rematch`, 4 em `world`).
2. Respostas do jogador = top-3 golpes de `foeModel` (com probabilidade). **Sem trocas do p1 na simulação**, porque o banco dele é desconhecido.
3. Para cada par, S = 2 amostras num clone do `fogged`, com `prng = new PRNG(hashSeed(seed, turn, i, j, s))`, e `choose` dos dois lados.
4. **`Δ = (P(depois) − P(antes)) × 600`**, com P = chance de vitória do modelo **M1** (`models/winprob-v1.js`). A escala `MODEL_SCALE = 600` põe Δ na mesma unidade da heurística ("pontos ≈ % de HP"). Sem modelo carregado, cai para a fórmula manual: `(HP% que o jogador perdeu + 100·[desmaiou]) − (HP% que eu perdi + 100·[desmaiei]) + 15·[status novo no jogador]`.
   - **Nos dois casos soma-se a variação de boosts:** 15 por estágio de ataque ou ataque especial, 10 de velocidade, 5 de defesa (os do jogador apagados contam a favor, como no Haze).
   - **Por quê:** um horizonte de 1 turno não enxerga o valor de uma preparação, e Swords Dance parece só um turno apanhando (cenário 6). O M1, treinado com robôs que nunca se preparam, também dá peso quase nulo a boosts (0,09).
5. `sim(candidato) = Σ p(resposta) × média(Δ)`, e `final = (1 − w)·heurística + w·sim`, com `w` do perfil.

**Custo medido:** clonar ~1,3 ms; clonar + simular um turno ~1,1 ms. Com K = 4, 3 respostas e 2 amostras, são 24 simulações ≈ 30 ms. Cabe no orçamento.

---

## 11. Memória e adaptação (`memory.js`)
Derivada do log do p2 a cada replay. Não há estado extra, então I3 e I4 continuam valendo.

| Medida | Definição |
|---|---|
| `switchRate` | Trocas voluntárias do jogador ÷ turnos |
| `repeat` | `{moveId, count}`: mesmo golpe em turnos seguidos |
| `setupCount` | Boosts do jogador nesta partida |
| `lastFoeMove`, `turnsSinceMySwitch`, `myFaints`, `foeFaints` | — |

| Padrão percebido | Resposta | Perfis |
|---|---|---|
| `switchRate > 0,35` | Leitura de troca (§9) | `rematch`, `world` |
| `repeat.count ≥ 2` | O golpe repetido vira a ameaça principal; a troca considera quem resiste | `platinum`+ |
| `setupCount ≥ 1` e boost ativo | `utility: Haze` ×2; ataque com nocaute ×1,3 | todos |
| Jogador no último Pokémon | Peso de risco maior: prioridade e golpe mais preciso | `platinum`+ |
| Cynthia no último Pokémon (o ás) | Sem preparação se `threatOf > 40%`; tudo no ataque | todos |

---

## 12. Política (`policy.js`)
1. **Filtros de sanidade** (nota = −∞):
   - golpe contra imunidade conhecida (`damageRange` = sem efeito);
   - status em quem já tem status;
   - sono com a cláusula em uso;
   - Dream Eater em alvo acordado;
   - Rest com HP cheio;
   - Protect duas vezes seguidas;
   - preparação com +6.
2. **Personalidade** (`personality/cynthia.js`):
   - **Ás:** Garchomp nunca sai por troca voluntária e entra por último na substituição.
   - **Primeiro Pokémon:** vem da rotação (Spiritomb tem peso maior); a IA não reordena.
   - **Frieza:** com vantagem de 2+ Pokémon, evita golpes com recoil e prefere os precisos.
3. **Modo de risco** (modelo M1): com `P < 0,25`, soma `+0,5 × desvio das amostras` à nota, aceitando golpes arriscados; com `P > 0,75`, subtrai. Jogar seguro numa partida perdida perde do mesmo jeito.
4. **Escolha:**
   - softmax sobre os top-N com temperatura `T` do perfil;
   - `T ≤ 0,5` vira argmax;
   - o sorteio usa `rngFor(seed, turn, 'ai')`.
5. **Saída:** `{choice: 'move 2' | 'switch 4', trace}`.

## 13. Substituição após desmaio (`replacement.js`)
- Nota de cada reserva: `M(x)` (§8) + 50 se age primeiro **e** nocauteia o ativo do jogador (revenge kill).
- O ás fica excluído enquanto houver outro.
- Em `dp`, a escolha tem temperatura alta (pode errar).

---

## 14. Perfis de dificuldade (`profiles.js`)

| Parâmetro | `dp` (Seg/Ter) | `platinum` (Qua/Qui) | `rematch` (Sex/Sáb) | `world` (Dom) |
|---|---|---|---|---|
| Sets da Cynthia (pool) | Golpes originais, sem item, 84 EVs em tudo | Golpes do Platinum, Sitrus Berry, 84 EVs | Itens + habilidades + naturezas do Renegade, 84 EVs | Competitivos (estilo PWT), spreads próprios |
| Temperatura `T` / top-N | **6** / 3 (era 18 / 4) | **6** / 3 (era 10 / 3) | **12** / 3 (era 5 / 3) | 1,5 / 2 |
| Lookahead (`w`, K, S) | — | — | 0,5 · 3 · 2 | 0,7 · 4 · 2 |
| Leitura de troca | não | não | sim (`pSwitch > 0,35`) | sim (`> 0,25`) |
| Adaptação (§11) | só preparação | completa | completa | completa |
| Trocas voluntárias | só se levar nocaute antes de agir; máx. 1 | máx. 2 | livres, com custo | livres, com custo |
| Limiar de segurança para preparação | 25% | 30% | 35% | 40% |
| Neblina (justiça) | sempre | sempre | sempre | sempre |

---

## 15. Explicabilidade
- **`trace`** de cada decisão: `{aiVersion, modelVersion, winProb, turn, profile, candidates: [{choice, label, heuristic, parts: {attack: 41, setup: 0, …}, sim, final}], foe: {moves: [{id, p}], pSwitch}, chosen, roll, ms}`.
- Gravado em `secret/state.aiTrace` (últimas 10 decisões), nunca enviado a jogadores comuns.
- **Painel de admin** (F3, opcional): `POST {action: 'trace', runId}` só para e-mails de `ADMIN_EMAILS`, com a mesma checagem de `send-admin-reply.js`. Uma sobreposição na batalha mostra as notas da última decisão, para calibrar jogando.
- **`AI_VERSION`** em semver, gravado na partida, no documento do dia e no `trace`:
  - patch: ajuste de pesos;
  - minor: avaliador novo;
  - major: mudança de modelo.

  O histórico de versões fica em `docs/modules/daily_challenge.md`.
- Um deploy no meio do dia muda as decisões **seguintes** das partidas em andamento; as já gravadas não mudam (I4). Ajustes de IA devem ir ao ar de madrugada.

---

## 16. Calibragem: `scripts/ai-arena.mjs`
Roda local, importando `api/_lib/challenge/engine.js` e `api/_lib/ai/` direto, sem Firestore.

```
npm run ai:arena -- --cynthia world --vs greedy --games 300 --days 30
npm run ai:bench                        # tempo por decisão, p50/p95, por perfil
```

- **Robôs adversários:**
  - `random`: jogada legal uniforme;
  - `greedy`: maior dano imediato, troca só quando obrigado;
  - `cynthia:<perfil>`: para confronto entre perfis.
- **Times:** a escalação da Cynthia de N dias seguidos contra **Times do dia** (randoms, nível 50) dos mesmos dias. É o confronto real do jogo.
- **Saída:** taxa de vitória com IC de 95%, turnos médios, ms por decisão (p50/p95), escolhas ilegais (precisa ser 0) e erros. Tabela em Markdown para colar no PR.

**Metas** (taxa de vitória **da Cynthia**):

| Adversário | `dp` | `platinum` | `rematch` | `world` |
|---|---|---|---|---|
| `random` | ≥ 90% | ≥ 95% | ≥ 97% | ≥ 98% |
| `greedy` | 40–55% | 50–65% | 60–75% | ≥ 70% |
| `world` × `platinum` (mesmos times, lados trocados) | — | — | — | `world` ≥ 60% |

O alvo humano entra na F6, com dados reais: vitória do jogador entre 35% e 60% por dia da semana. Se sair da faixa, ajustam-se os pesos e sobe a versão patch.

**Resultado da calibragem (2026-10-14, 80–120 partidas, M1 carregado):**

| Cynthia | vs guloso | meta | vs aleatório | meta | ms p50 / p95 |
|---|---|---|---|---|---|
| `dp` | 43,8% | 40–55% ✓ | 98,8% | ≥ 90% ✓ | 2,6 / 5,1 |
| `platinum` | 61,3% | 50–65% ✓ | 97,5% | ≥ 95% ✓ | 2,6 / 4,8 |
| `rematch` | 68,3% | 60–75% ✓ | 98,8% | ≥ 97% ✓ | 17,9 / 32,5 |
| `world` | 88,8% | ≥ 70% ✓ | 100% | ≥ 98% ✓ | 21,3 / 37,3 |

Zero jogadas ilegais e zero partidas sem fim. Como se chegou lá:
- Na primeira rodada, DP e Platinum perdiam feio (12,5% e 35%): os sets do DS **sem EVs** enfrentavam o Time do dia com 84 em tudo, uma vantagem bruta de status no nível 50.
- Com o spread uniforme, a diferença entre os dias ficou nos sets e na IA.
- A Revanche ficava acima da meta mesmo sem *lookahead* (81%), porque a força vinha dos spreads 252/252 do Renegade. Com 84 uniforme e T=12, caiu para a faixa.
- **Pendente:** o confronto `world × platinum` (IA contra IA) exige a IA jogando do lado p1; ela é escrita para o p2. Fica para quando houver necessidade.

`--set perfil.chave=valor` testa um parâmetro sem editar `profiles.js` (ex.: `--set rematch.T=12 --set rematch.lookahead.w=0.4`).

---

## 17. Testes

**DSL de cenário** (`testing/scenario.js`):
```js
const s = scenario({
  p1: 'Togekiss @ Leftovers\nAbility: Serene Grace\n- Air Slash\n- Moonblast\n- Roost\n- Thunder Wave',
  p2: 'Garchomp @ Yache Berry\nAbility: Rough Skin\n- Dragon Claw\n- Stone Edge\n- Swords Dance\n- Earthquake',
  turns: [['move 4', 'move 3']],          // jogadas até chegar na situação (p1, p2)
  set: { p1: { hpPct: 35 } },             // ajuste direto no snapshot de teste
  profile: 'world',
});
expect(decide(s.input).choice).toBe('move 2');   // Stone Edge nocauteia
```

**Cenários (mínimo):**
1. Nocauteia quando pode.
2. Usa prioridade (Extreme Speed) para fechar contra alguém mais rápido.
3. Não usa Earthquake em Voador ou com Levitate revelado.
4. Troca para quem resiste ao sair de um nocaute garantido.
5. O ás nunca troca.
6. Prepara quando está seguro.
7. Não prepara quando ameaçado.
8. Will-O-Wisp contra atacante físico.
9. Nada de Will-O-Wisp contra Fogo.
10. Nada de status em quem já tem status.
11. Recover com HP baixo e seguro.
12. Ataca em vez de curar quando morreria do mesmo jeito.
13. Respeita a Sleep Clause.
14. A substituição escolhe quem faz revenge kill.
15. A substituição deixa o ás por último.
16. Lê a troca (`rematch`) depois de o jogador trocar 3 vezes.
17. Haze (Milotic) contra quem prepara.
18. Leaf Storm não é usado duas vezes seguidas sem nocaute.
19. Com P baixa (M1), escolhe o golpe arriscado que pode virar; com P alta, o seguro.
20. Todo golpe do dex passa pelo estimador sem lançar erro (Beat Up incluído).

**Propriedades** (`invariants.test.js`):
- I1 a I8 (§1);
- fuzz `random × cynthia` por perfil: zero `|error|`, sempre termina em menos de 300 turnos, o ás nunca sai por troca voluntária e nunca entra antes da hora, decisão < 250 ms.
  - Em `npm test` roda **6 batalhas por perfil** para a suíte continuar rápida.
  - `AI_FUZZ=200 npx vitest run api/_lib/ai/invariants.test.js` faz a varredura completa, e `npm run ai:arena` também conta jogadas ilegais.

Todos os 20 cenários acima passam (o 20 está em `estimate.test.js`: mais de 800 golpes do dex, nos dois sentidos).

---

## 18. Evoluções futuras (fora do escopo atual)
- Lookahead de 2 turnos no perfil `world`, se o orçamento permitir.
- Pesos dos avaliadores (§8) ajustados por regressão sobre os dados da F6, em vez de calibrados à mão (documento de ML).
- Outros campeões: um arquivo em `personality/` + pool + rotação, com o mesmo motor (premissa A5).
- Tera da Cynthia num "evento de domingo" (exige botão de Tera para o jogador também).
