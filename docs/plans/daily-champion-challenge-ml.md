# Modelos de previsão (regressão) — Desafio da Campeã

> Par do [documento da IA](./daily-champion-challenge-ai.md). Aqui fica a parte **aprendida** da IA:
> que modelos, para quê, com quais dados, como treinar, como medir e como não quebrar os invariantes.
> Decisões de 2026-10-14: **gravar dados anônimos das batalhas** e **mostrar a chance de vitória só no fim**, em gráfico.
> Data: 2026-10-14. Números medidos nesta sessão (`@pkmn/sim@0.10.11`). Os spikes estão em `scratch/ai-spikes/`
> e rodam da raiz do repo: `node scratch/ai-spikes/winprob.mjs 400` (M1), `node scratch/ai-spikes/clone-cost.cjs`, `node scratch/ai-spikes/ai-internals.cjs`.

## 0. Regressão linear ou logística?

Na prática, a pergunta "dá para usar regressão linear?" vira "qual tipo":
- A **regressão linear** prevê um número contínuo, como "quanto de HP vou perder". Para isso o simulador já dá a conta exata, então ela serve pouco aqui.
- O que a IA precisa prever são **categorias**: "quem vence" (sim/não) e "qual jogada o jogador vai fazer" (uma entre várias). A ferramenta certa é a **regressão logística**. É a mesma conta linear (`w·x + b`), passada por uma sigmoide (para sim/não) ou por uma softmax (para várias opções). O resultado vira uma **probabilidade** entre 0 e 1.

Por que modelos lineares, e não uma rede neural:

| Critério | Modelo linear/logístico |
|---|---|
| Explicável | Cada peso diz quanto cada fator importa; aparece no `trace` |
| Rápido | Previsão = um produto escalar (microssegundos) |
| Determinístico | Pesos fixos num arquivo versionado; não fere I3/I4 |
| Sem dependência | Treino em JavaScript puro (gradiente descendente), como no spike |
| Poucos dados | Funciona com milhares de turnos, não milhões |

---

## 1. Os três modelos

| Modelo | Pergunta | Tipo | Dados | Quando |
|---|---|---|---|---|
| **M1 — Chance de vitória** | "Qual a chance de a Cynthia vencer daqui?" | Logística (sigmoide) | Autojogo agora; batalhas humanas depois | **F1** |
| **M2 — Próxima jogada do jogador** | "Qual a chance de o jogador usar cada golpe ou trocar?" | Logística multinomial (softmax) sobre as opções | Batalhas humanas anônimas | Pesos iniciais na F1; aprendidos na **F6** |
| **M3 — Calibragem de dificuldade** | "Qual a chance de um jogador vencer neste dia?" | Logística, fora do jogo (análise) | Resultados humanos agregados | **F6** |

### M1 — Chance de vitória (medido)
Spike desta sessão:
- **Dados:** 400 batalhas simuladas entre robôs (times de random battle no nível 50, as mesmas regras do desafio), 6.938 turnos, 18 s de simulação.
- **Validação:** separação **por batalha**, 70% treino e 30% teste, sem vazar turnos da mesma partida.

| Previsor (dados de teste) | Log-loss ↓ | Brier ↓ | Acerto |
|---|---|---|---|
| Chute 50% | 0,693 | 0,250 | — |
| "Quem tem mais Pokémon vivos" | 0,527 | 0,173 | 72,2% |
| **Regressão logística, 6 variáveis** | **0,470** | **0,154** | **77,7%** |
| Mesma regressão, só os 3 primeiros turnos | 0,611 | 0,212 | 66,9% |

Pesos aprendidos (variáveis padronizadas): Pokémon vivos **0,72**, HP total **0,66**, confronto atual (melhor dano de cada lado) **0,40**, quem é mais rápido **0,23**, status **0,18**, boosts **0,09**. A ordem bate com a intuição de jogador, o que é um bom sinal de que o modelo não está "decorando" ruído.

**Treino de verdade (F1, 2026-10-14)** — `npm run ai:dataset` + `npm run ai:train`, variáveis com neblina (como no jogo):

| Dados (autojogo) | Divisão | Log-loss | Brier | Acerto | ECE |
|---|---|---|---|---|---|
| 600 batalhas, robôs ε = 25% | `battle % 10` | 0,551 | 0,187 | 70,7% | 0,062 |
| 1.500 batalhas, ε = 25% | por par de batalhas | 0,526 | 0,178 | 72,6% | 0,017 |
| 1.500 batalhas, ε = 25%, **informação completa** | por par | 0,523 | 0,176 | 73,0% | 0,016 |
| **1.500 batalhas, ε = 10%** (instalado) | por par | **0,501** | **0,167** | **75,2%** | **0,029** |
| 2.000 batalhas, ε = 10%, variáveis v2 (+ hazards, + vantagem × turno) | por par | 0,511 | 0,172 | 74,4% | 0,025 |

O que cada linha ensinou:
- **A divisão por número da batalha enviesava a calibração.** O conjunto alterna o confronto real (Cynthia × Time do dia) e times aleatórios, e `battle % 10` punha proporções diferentes de cada tipo no treino e no teste. Dividir por **par** de batalhas derrubou o ECE de 0,062 para 0,017.
- **A neblina quase não custa precisão:** 0,526 contra 0,523 com informação completa. Treinar com neblina, como o jogo usa, é de graça.
- **O piso vem do ruído dos robôs, não do modelo:** com 25% de jogadas aleatórias (trocas aleatórias inclusive), o resultado fica menos previsível a partir da posição. Com 10%, a log-loss cai para 0,501. O spike chegou a 0,470 com outra política (aleatoriedade só entre golpes).
- **A v2 não ajudou** (0,511, dentro da variação entre amostras, que é de ±0,01). Ficou a v1, mais simples.
- Pesos aprendidos (padronizados): HP total **1,44**, confronto 0,29, velocidade 0,25, boosts 0,09, Pokémon vivos 0,06 (colinear com o HP), status 0,02.

**Critério de aceite: aceito pelo Enzo em 2026-10-15 ("segue no 501").** Passou em Brier (≤ 0,17), ECE (≤ 0,05) e ganho sobre a referência (0,501 contra 0,576), mas ficou em log-loss 0,501 contra ≤ 0,50. Isso é 0,001 acima, abaixo do erro amostral do conjunto de teste (cerca de ±0,005). Foi instalado com `--force` porque um modelo calibrado com 75% de acerto é muito melhor que a fórmula manual. Opções para o Enzo: aceitar e ajustar o critério para o autojogo atual, ou exigir dados humanos (F6) antes de usar o M1 no *lookahead*.

**Variáveis** (`features.js`, versão 1 = as 6 do spike; a v2 foi medida e não entrou):

| # | Variável (sempre do ponto de vista da Cynthia) | v1 | v2 |
|---|---|---|---|
| 1 | Pokémon vivos (meus − dele) | ✓ | ✓ |
| 2 | Soma de HP% (meus − dele) | ✓ | ✓ |
| 3 | Confronto: melhor dano meu no ativo dele − melhor dano dele no meu | ✓ | ✓ |
| 4 | Quem age primeiro (−1, 0, 1) | ✓ | ✓ |
| 5 | Soma de boosts (meus − dele) / 6 | ✓ | ✓ |
| 6 | Pokémon com status (dele − meus) | ✓ | ✓ |
| 7 | Ás (Garchomp) ainda vivo | | ✓ |
| 8 | Hazards de cada lado | | ✓ |
| 9 | Clima/terreno a favor (−1, 0, 1) | | ✓ |
| 10 | Cobertura do meu banco contra o ativo dele | | ✓ |
| 11 | Turno (normalizado) | | ✓ |

**Usos de M1:**
1. **Lookahead:** a nota de um par simulado deixa de ser a fórmula manual de HP e passa a ser **ΔP = P(depois) − P(antes)**. É mais fiel, porque o modelo sabe que, por exemplo, perder o último Pokémon vale mais que perder 50% de HP no primeiro.
2. **Modo de risco** na política:
   - com P < 0,25, a Cynthia aceita golpes de maior variância (precisão baixa, poder alto), porque jogar seguro perde do mesmo jeito;
   - com P > 0,75, prefere os golpes seguros.

   A variância vem das amostras do lookahead.
3. **Falas:** queda de P maior que 0,25 num turno → "a batalha virou"; P > 0,85 → fala confiante.
4. **Gráfico pós-batalha** (decidido). Ao terminar a partida, o servidor refaz a batalha turno a turno **com informação completa** (sem neblina, porque já acabou) e grava a curva **na perspectiva do jogador** (`1 − P`). A tela de resultado mostra:
   - a curva;
   - o turno da maior virada, com a jogada que a causou (por exemplo, "Turno 12: Garchomp nocauteou Pelipper").

### M2 — Próxima jogada do jogador
- **Forma:** para cada opção legal do jogador `a`, um vetor `φ(a)`; `P(a) = softmax(w·φ(a))`.
- A previsão heurística de hoje (`exp(E[dano]/15)`, documento da IA §9) **é este mesmo modelo** com uma variável só e peso `1/15`. Começamos com esses pesos "de mão" e trocamos pelos aprendidos quando houver dados. A estrutura do código não muda.
- **Variáveis de cada opção:**
  - dano esperado no meu ativo (%) e chance de nocaute;
  - STAB;
  - super efetivo;
  - é o mesmo golpe do turno anterior;
  - é troca;
  - confronto de quem entraria;
  - HP% do ativo dele;
  - minha ameaça ao ativo dele;
  - taxa de trocas e repetição (memória, §11 da IA).
- **Por que precisa de dados humanos:** robôs não jogam como gente. Treinar M2 só com autojogo ensinaria a IA a prever robôs. Por isso a coleta anônima (§3).

### M3 — Calibragem de dificuldade (análise, fora do jogo)
- `P(jogador vence) = σ(w·x)`, com `x` = perfil do dia, força do time da Cynthia (média de M1 no turno 1), origem do time (salvo ou do dia) e tier.
- **Uso:** ajustar os perfis (temperatura, lookahead) para cada dia da semana ficar na faixa-alvo de 35–60% de vitória humana. Roda num script e gera um relatório; **não** roda durante a batalha.

---

## 2. Justiça e determinismo (como os invariantes continuam valendo)

| Invariante (documento da IA §1) | Como os modelos respeitam |
|---|---|
| I2/I3 Determinística | Pesos fixos em `models/*.js` versionados; previsão é aritmética pura |
| I4 Escolhas gravadas | Trocar os pesos muda só decisões futuras, nunca o replay |
| I5 Não espia | **Durante a batalha**, as variáveis são calculadas no clone com neblina. Treino e uso compartilham `features.js`, e o treino também passa pela neblina, para não haver diferença entre treino e uso. Só a curva pós-batalha usa informação completa, quando a partida já acabou |
| `AI_VERSION` | Pesos novos = versão minor; o `trace` grava a versão do modelo usado |

**Robustez do estimador** (achado do spike): `actions.getDamage` chamado fora de uma jogada real **lança erro** em golpes que dependem do contexto de execução. O caso visto foi Beat Up (`move.allies` indefinido), 19 vezes em ~7 mil turnos.

Regra para `estimate.js`:
- `try/catch` em toda chamada;
- no erro, cai para uma estimativa pelo poder base;
- o `trace` marca `estimateFallback`.

Teste novo: **todo golpe do dex** passa pelo estimador sem lançar erro.

---

## 3. Dados anônimos das batalhas (decidido: sim)

**O que é gravado**, um documento por partida terminada (oficial ou treino), em `artifacts/{appId}/aiTraining/{autoId}`:
```js
{
  schema: 1, aiVersion, engineVersion, featureVersion,
  week: '2026-W42',            // semana, não o dia: menos granularidade
  difficulty: 'platinum', teamSource: 'saved'|'daily',
  outcome: 1 | 0,              // 1 = Cynthia venceu
  turns: [{
    m1: [ /* variáveis do M1 com neblina, 3 casas decimais */ ],
    m2: { options: [{ features: [ /* φ de cada opção do jogador */ ] }], chosen: 2 },  // map por opção: o Firestore recusa array dentro de array
  }],
}
```

**O que não é gravado:** `uid`, e-mail, nome, nome do time, texto do time, `runId`, horário exato. Sem essas chaves, não há como ligar o registro a uma pessoa. Por isso a exclusão de conta não precisa (nem consegue) apagar esses documentos.

**Regras do Firestore:** `allow read, write: if false`. Só o Admin SDK grava, no fim da partida e dentro da mesma transação do resultado.

**Aviso ao jogador:**
- Uma linha no `TeamPicker` e no guia da página: "As partidas são gravadas de forma anônima para melhorar a IA da Campeã." Chave `challenge.privacy.notice`.
- **Achado:** o app não tem página de privacidade. Recomendo criar uma curta (`/privacy`) antes da F6, quando a coleta começar a ser usada para treino. Mesmo anônimos, é boa prática pela LGPD deixar claro o que é coletado.

**Tamanho:** ~30 turnos × (11 + 5×12) números ≈ 2 mil números ≈ 15 KB por partida, com 1 escrita por partida.

**Retenção:** 12 meses (um script de limpeza anual, ou TTL do Firestore no campo `expiresAt`).

---

## 4. Pipeline de treino

```
api/_lib/ai/
  features.js          [NEW] variáveis do M1 e φ do M2 (fonte única: jogo, coleta e treino)
  model.js             [NEW] predictWin(model, x), predictActions(model, φs) → probabilidades
  models/
    winprob-v1.js      [NEW] {version, featureVersion, trainedAt, rows, battles, mean, sd, weights, bias, metrics}
    foe-v0.js          [NEW] pesos "de mão" equivalentes à heurística atual
scripts/
  ai-dataset.mjs       [NEW] gera dados de autojogo (ndjson) usando ai-arena; --from-firestore exporta os anônimos (F6)
  ai-train.mjs         [NEW] treina M1/M2, valida por batalha, escreve models/*.js e um relatório
```

- **Treino** (`ai-train.mjs`): padronização (média e desvio guardados no modelo), gradiente descendente com L2, separação 70/30 **por par de batalhas** (o conjunto alterna confronto real e times aleatórios) e **sem dependência nova**. Treina em segundos.
- **Dados de autojogo** (`ai-dataset.mjs`): os dois lados são o mesmo robô ε-guloso (`--epsilon`, padrão 25; o modelo instalado usou 10), para que M1 aprenda "quem está ganhando", e não "qual lado joga melhor". Metade das batalhas é o confronto real do dia, metade são dois times aleatórios. `--full` gera variáveis com informação completa, para comparação.
- **Relatório:** log-loss, Brier, acerto, curva de calibração (10 faixas) e **ECE**, sempre comparados ao baseline "mais Pokémon vivos". Sai em Markdown para colar no PR.
- **Arquivos de dados:** os brutos ficam em `scratch/ai-data/`. A pasta `scratch/` é versionada, então `scratch/ai-data/` entra no `.gitignore` [MODIFY]. Só os pesos (`models/*.js`, poucos KB) são commitados.
- **Critério para aceitar um modelo novo:**

| Modelo | Exigência |
|---|---|
| M1 | Log-loss ≤ 0,50, Brier ≤ 0,17, ECE ≤ 0,05, e melhor que o baseline |
| M2 | Log-loss menor que o dos pesos de mão no conjunto de teste humano |
| Comportamento | `ai-arena` com perfis iguais ou melhores que a versão anterior nas metas da IA (§16) |

---

## 5. Testes

| Arquivo | Casos |
|---|---|
| `features.test.js` | Mesmas variáveis no jogo e no treino; mudar o item ou os EVs **ocultos** do jogador não muda nenhuma variável (neblina); valores esperados num cenário fixo |
| `model.test.js` | Pesos conhecidos → probabilidade conhecida; monotonia (mais Pokémon vivos → P maior); softmax soma 1 |
| `estimate.test.js` | Todo golpe do dex passa sem lançar erro; fallback marcado no `trace` |
| `ai-train` (teste rápido) | Em dados sintéticos com pesos conhecidos, o treino recupera o sinal e a ordem dos pesos |
| `challenge.test.js` | Fim de partida grava `aiTraining` sem `uid`/nome/texto do time; curva pós-batalha aparece no resultado e **não** durante a partida |

---

## 6. Fases

| Fase | Entrega |
|---|---|
| **F1** ✅ | `features.js` (v1), `model.js`, `winprob-v1.js` treinado em autojogo, M1 no lookahead, no modo de risco, nas falas e na curva, `foe-v0.js` com pesos de mão, `ai-dataset`/`ai-train`. Coleta anônima já gravada no fim de cada partida (`aiTraining`); o aviso na tela é da F5 |
| **F3** | Gráfico pós-batalha na `ResultScreen` (SVG próprio, seguindo a skill `dataviz`), com a maior virada destacada |
| **F5** | Coleta anônima ativa + aviso na tela; recomendada a página `/privacy` |
| **F6** | M2 treinado com dados humanos (a partir de ~2 mil partidas); M3 e ajuste dos perfis; retreino do M1 com humanos |
