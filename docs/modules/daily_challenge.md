# Champion Challenge (daily battle vs a Cynthia AI)

> The system as built. The *why* and the full design are in the plans:
> [product](../plans/daily-champion-challenge.md) ·
> [technical spec](../plans/daily-champion-challenge-tech.md) ·
> [battle AI](../plans/daily-champion-challenge-ai.md) ·
> [prediction models](../plans/daily-champion-challenge-ml.md).
>
> **Status (2026-10-15):** F1–F5 built and verified in the browser, uncommitted:
> the `/challenge` route as a DS console (walk to Cynthia, her dialogue, the
> Time do dia featured, an animated battle, result, practice), the Home card,
> search, OG, guide, patch notes 1.15.0, account deletion. M1 accepted at
> log-loss 0.501 (Enzo, 2026-10-15). F3 finished the same day: the win-chance
> report, the Pokétch dossier, WebAudio sound. Next: F6 (ranking, share card, push).

## Map

```
api/challenge.js                 the endpoint (8th of 12 functions): ensureDay | start | choose | forfeit,
                                 GET ?ping=1 (loads nothing), GET (self-check incl. one AI decision)
api/_lib/challenge/
  constants.js   FORMAT, LEVEL, ENGINE_VERSION, BANNED_MOVES, CHOICE_PATTERN, CHAMPIONS
  seed.js        hashSeed(...parts) → 4×16-bit sim seed (cyrb128)
  day.js         Brasília day: dayKeyAt, nextResetAt, weekdayOf, isoWeekOf…
  pool.js        Cynthia's species × {dp, platinum, rematch, world} sets, each with a source
  rotation.js    championLineupFor / championTeamTextFor / difficultyFor / publicLineup
  dailyTeam.js   the Time do dia (random-battle team at level 50, same for everyone)
  validateTeam.js saved team → packed text or a list of {slot, code}
  engine.js      createMatch / apply / replay / owes / outcome / snapshot (sync @pkmn/sim Battle)
  outcome.js     score, nextStats (streak), effectiveStreak
  dialogue.js    log lines → Cynthia's lines as i18n keys, once each per battle
  runs.js        Firestore paths + the public day document
  actions.js     the four actions, HTTP-free (tested against the fake Firestore)
  errors.js      ChallengeError(status, code, extra)
api/_lib/ai/                     Cynthia's AI — see "AI" below
api/_lib/testing/fakeFirestore.js  in-memory Firestore shared by the endpoint tests
scripts/ai-arena.mjs  ai-dataset.mjs  ai-train.mjs   calibration and the M1 model
scripts/lib/challengeDevApi.mjs  dev-only Vite plugin: /api/challenge on `npm run dev`, in memory
scripts/build-sprite-feet.mjs    public/data/sprite-feet.json (npm run data:sprite-feet; network)
```

### The client (`/challenge`, a lazy route chunk)

```
src/components/views/challenge/ChampionChallengeView.jsx   the stage machine:
    arena ─walk to her─▶ dialogue ─▶ pick | gate ─start─▶ transition ─▶ battle ─▶ result ─▶ practice
src/components/views/challenge/ds/
  DsConsole      two 256×192 screens (--px = width/256), the bar, D-pad/A/B (desktop only)
  DsArena        the room: grid walking (keys, D-pad, tap → BFS path), the "!" and her lines
  DsTextBox      typewriter; first press finishes the line, the second advances
  DsTeamPicker   Time do dia first and chosen by default; "Meus times" one level down
  DsBattleStage  plays the log moment by moment (useBattlePlayback) → DsBattleScene
  DsBattleScene  DPPt field: STAGE geometry, sprites 1:1 standing on their feet row
  DsCommandPanel LUTAR / POKéMON / DESISTIR; moves HGSS style (type, category, PP tone)
  DsPoketch      party silhouettes (#ds-lcd-ink), countdown, counter
src/store/useChampionChallengeStore.js  optimistic `pending`; the `state` action reads and warms
src/utils/  battleTimeline (pure playback reducer) · arenaMap · challengeArt (pixel grids)
            challengeText · challengeView · challengeTeams
src/styles/champion-challenge-ds.css   the design-system exception: --px, --ds-* palette,
                                       DotGothic16 (see the /design-system skill)
```

- **Resuming never replays:** lines already in the log when the screen opens are shown at once; only a battle started on this screen plays its opening.
- **Phones have no D-pad:** two 4:3 screens never leave room above the dock, so the screens are sized to fit by height and touch is the input (tap to walk, tap the text box).
- **Sprites:** Showdown Gen 4 (Gen 5 after #493), 96 × 96 drawn 1:1; the feet row comes from `sprite-feet.json` because the host sends no CORS header.
- **The room's art:** two 4 × 4 RPG-Maker sheets (rows down/left/right/up), drawn as CSS sprites at half their file size through `sheetStyle()` in `challengeArt.js`.
  - Cynthia is fan art by **zedubstep** (DeviantArt), supplied by Enzo: `src/assets/challenge/cynthia-overworld.png`, drawn 2×, 34 × 36 DS px per cell. She turns to face the player (`faceToward`).
  - The protagonist is Hilbert's Black & White overworld sheet, supplied by Enzo on 2026-10-16 (source not recorded): `src/assets/challenge/protagonist-overworld.png`, 64 px cells (32 × 32 DS px), set inside the shared cell by `offset`. The sheet has no ground shadow, so `.ds-actor--player::before` draws one.
- **Desktop rails** (`useRailMode`, `DsConsole rails`, `DsRails.jsx`):
  - The space a wide column leaves around the one screen holds the teams (yours with live HP, hers as the dossier) and the day's ranking with your record.
  - `railModeFor` decides from the column's width and the window's height. Two rails while the screen keeps 90% of its natural width; one rail (both stacked on the right) while it keeps 80%; none below that, where the ranking stays a menu over the screen.
  - Rail HP comes from the lines the playback has shown (`sideHp`, `railTeams`), never from the latest request, which already knows how the turn ends.
- **Data boxes:** Black & White's slim bar against the screen edge: name, gender, level, the HP bar in its frame behind the HP mark, and your figures under it. There are no balls in the box; they stand alone before the send-outs.
- **Home:** the challenge is the featured card of "Your day": Cynthia on a disc and her six as silhouettes (`useChallengeSummary` `lineup`, null for the wildcard). The puzzle, the next badge and the meta leader stack beside it as one-line rows.

### Black & White HUD, two layouts (2026-10-15)

- `useConsoleLayout`: **single** (≥ 1024 px) — one 4:3 screen as tall as the window, the console frame wrapping it; the room, the picker (a menu over the room), the battle with its HUD strip (message left; LUTAR / TIME DELA / POKéMON / DESISTIR right; moves replace the buttons and the left box describes the focused one; party and her team open over the field) and the result (chart above, a symmetric strip below — or the result filling the screen when there's no chart). **dual** — two screens on a phone: the field with BW's black message band on top, BW's red touch menu below (FIGHT capsule, both rows of balls, the three buttons; dimmed while the turn plays).
- One state for both: `useBattleCommands` (views main / moves / party / dossier, the focused move, keys 1–4, ←→↑↓, A, B). Renderers in `ds/DsBwCommands.jsx` (`DsTouchMenu`, `DsHud`). No BAG in this challenge: its yellow slot opens her team.
- Every sub-menu ends in VOLTAR: moves, party (unless the switch is forced), her team, the picker (Meus times → Time do dia → the room), the gate.

### After the battle, the Pokétch, sound

- **The report** (`DsBattleReport`, top screen of the result): the M1 curve, decision by decision, diverging fill around 50% (`--ds-chart-you` / `--ds-chart-her`, validated with the dataviz script), the biggest swing ringed and named from the log (`utils/winChart.js`: `biggestSwing`, `swingCause`). The server stores `winChanceMarks` beside the curve — per point, the battle turn and the player's log length — so a swing's lines are a slice of the log. A forfeit keeps the curve so far; fewer than two points shows the room instead.
- **Dossier** (Pokétch app 2): her six from `championRoster`, dim silhouettes and "???" until sent out.
- **Sound** (`utils/challengeSfx.js`): WebAudio recipes from the spec §3.12, no files; nothing before the first gesture on the route; mute on the bar, remembered (`ptb:challenge:muted`). Battle moments map through `soundFor(event)` — the hit sounds on the damage, "super effective" adds a second impact, because the log puts it after the damage.

### Move effects by type (2026-10-15)

`MoveFx` in `DsBattleScene.jsx`: eight particles at the target, a **pattern** (how they move: rise, fall, ring, slash, quake, swarm, burst; status moves sparkle) and a **shape** (flame, bubble, wisp, leaf, rock, shard, bolt, ring, sparkle, line, dot, star) per type (`FX_BY_TYPE`); a special move's particles wait for its orb. Heavy physical hits (ground, rock, fighting) shake the field (`is-shake`, the world layers only). Transform/opacity; none under reduced motion.

**CSS budget:** the route's stylesheet is ~10.9 KB gzip of its 12 KB — the BW pass layered rules over the DPPt ones. Before adding much more, merge the overridden blocks (`.ds-hpbox`, `.ds-textbox.is-*`, `.ds-picker*`, `.ds-result`).

### F6: ranking, share, push (2026-10-15)

- **Ranking** (`api/_lib/challenge/ranking.js`, pure + tested): one public doc per day, `public/data/challengeRanks/{day}` — `boards.daily` / `boards.free` (top 50: score, then fewer turns, then earlier), `played` / `wins` per board, `players` (uids on a board, for `array-contains`). Written inside the transaction that ends an official run (and by an official forfeit, which only counts); practice never touches it. `state` returns `publicRanks` (top 10, counts, `mine`; no uids). `forget` removes a player (account deletion calls it, best-effort). UI: the bar's "Ranking" chip → `DsRanking` (a BW menu: two tabs, your row in gold, VOLTAR); the result names your place.
- **Share** (`utils/challengeShare.js`): a few lines — day, difficulty, outcome, streak, place, the curve as ▁▂▄▆█ — and the link; the share sheet on a touch device, the clipboard elsewhere. Official runs only.
- **Forum card**: the share toast offers "Postar no fórum" → a `sharedChallenge` attachment (`buildChallengeShare`: day, level, outcome, figures, streak, place, the curve as blocks — no team) drawn by `src/components/ChallengeShareCard.jsx` in threads and comments, read back through `readChallengeShare` (whitelisted strings, clamped numbers — the payload is user-written; tested against a forged one). Self-reported, like a PokéPuzzle board; the ranking is the authoritative record.
- **Push**: `dailyChallenge` rides the daily cron (`api/daily-puzzle.js` `DAILY_TOPICS`), tag `ptb-challenge`, opt-out in Profile → Notifications.

### Outside the route

- **Home card** (`useChallengeSummary`, `CozyHomeView`): reads the public day, the run and the stats (≤ 3 `getDoc`) plus a `ptb:challenge:summary` cache; states guest / new / ready / active / won / lost (`challengeSummaryState`, tested), always with the countdown. ~1.3 KB gzip on the entry bundle; imports nothing from the route.
- **`src/utils/challengeDay.js`** mirrors `api/_lib/challenge/day.js` (tested over 800 instants). A run that doesn't exist is a *denied* read, not an empty one (its rule checks `resource.data.uid`) — the card treats both as "not played".
- **Account deletion** erases runs, their rounds and secret state, then the runs and the stats (two waves: a round's rule reads its run). `aiTraining` rows have no uid and stay.
- **Search** ("cynthia" finds it via `nav.challengeSearch`), the Mais sheet, `render-meta` OG tags, the page guide, patch notes 1.15.0.
- **Calls on mount wait for Firebase's session** (`callAuthedApi` → `auth.authStateReady()`): the app paints from a saved identity before the session is restored (wound 2026-10-15).

## Invariants (each has a test — don't break them)

1. **Nothing from `api/` reaches `src/`.** The sim is ~1 MB gzip and Cynthia's sets are the hidden information.
2. **Only the seed, both teams and the ordered choices are persisted** (`secret/state`). Every request replays (~64 ms for 42 turns). The replay never calls the AI.
3. **The AI decides on a snapshot taken before the player's choice is applied** (I1), on clones only (I2), with its own seeded dice (I3), and only from p2's channel of the log (I5, the fog).
4. **Who owes a choice comes from the sim** (`engine.owes`), never assumed — after a faint only one side is asked. `choose` answers Cynthia's forced replacements in the same request.
5. **The player's run can't be written by the player.** Runs and stats live outside `users/{uid}/` (`firestore.rules`, see [Firebase Security](./firebase_security.md)).
6. **`api/challenge.js` imports only builtins and dependency-free modules at the top** (`challenge.deps.test.js`).

## Traps found while building it

- **`Battle.toJSON()` returns `log` by reference, and `Battle.fromJSON` adopts it.** A clone made from a raw `toJSON()` writes its imagined turns into the live battle's log — the player would receive lines from simulated futures. `engine.snapshot()` copies the log; `fog.js` gives every clone its own (`cloneOf`). Caught by the I2 replay test (live log 2,220 lines vs replay 203).
- **`gen9customgame` is a debug format**: it reports exact HP to both sides (`reportExactHP`). The challenge uses `gen9anythinggoes@@@!Team Preview,Sleep Clause Mod,Terastal Clause` — percentages for the other side, no debug lines. (PvP still uses customgame; see wounds.)
- **`|t:|` lines carry `Date.now()`** — stripped in `engine.js`, or no two runs of a battle are byte-identical.
- **Nothing is emitted until `battle.sendUpdates()`**; `apply` flushes after every choice.
- **Per-player channels are 1 and 2** in `extractChannelMessages` (0 is the spectator, −1 omniscient).
- **Team Preview is off** so the wildcard stays a "?" until it is sent out.
- **Revival Blessing** turns the next "switch" prompt into "pick a *fainted* Pokémon" (`reviving` on the active entry) — `options.js` handles it.
- **`getDamage` eats berries.** Estimation clones stub `eatItem`/`useItem`, or every estimate after the first sees a Pokémon without its Yache Berry.

## Data

See the spec §4 for every field. Paths under `artifacts/{appId}/`:
`public/data/challengeDays/{day}` (public) · `challengeRuns/{uid}_{day}[_p{n}]` + `rounds/{seq}` (owner reads) + `secret/state` (nobody reads) · `challengeStats/{uid}` · `aiTraining/{autoId}` (anonymous, no uid).

A `choose` does the replay and the AI **outside** the transaction; the transaction re-reads `turn` and writes, so a second tab gets `staleTurn` and nothing it computed is stored.

## AI

`decide({snapshot, request, p2Lines, seed, turn, profileKey, championId, model?}) → {choice, trace}`:
knowledge + memory from the log → fogged clone → one estimation clone (memoised `getDamage`, ~0.075 ms a call) → each legal option scored by one evaluator (`attack`, `setup`, `status`, `recovery`, `utility`, `switch`; `replacement` after a faint) → one-turn lookahead on the top K (Fri–Sun) → softmax at the profile's temperature.

| Profile (days) | T / top-N | Lookahead (w·K·S) | Cynthia vs greedy robot (target) | vs random |
|---|---|---|---|---|
| dp (Mon/Tue) | 6 / 3 | — | 43.8% (40–55) | 98.8% |
| platinum (Wed/Thu) | 6 / 3 | — | 61.3% (50–65) | 97.5% |
| rematch (Fri/Sat) | 12 / 3 | 0.5·3·2 | 68.3% (60–75) | 98.8% |
| world (Sun) | 1.5 / 2 | 0.7·4·2 | 88.8% (≥ 70) | 100% |

Measured with `npm run ai:arena` on 2026-10-14 (80–120 games each, M1 loaded); decision time p95 ≈ 5 ms without lookahead, ≈ 33–37 ms with it. Zero illegal choices. `--set rematch.T=10` tries a knob without editing `profiles.js`.

**M1 (win probability)** is trained on self-play (`ai:dataset` → `ai:train`): 75.2% accurate, ECE 0.029, log-loss 0.501 against 0.576 for "more Pokémon left". It feeds the lookahead (ΔP × 600), the risk mode, Cynthia's "the battle turned" line and the post-battle chart. Its acceptance bar asked log-loss ≤ 0.50; it was installed at 0.501 with `--force` and **accepted by Enzo on 2026-10-15** (0.001 over, inside the test set's sampling error; details in the ML plan §1).

Changing the AI: bump `AI_VERSION` (patch: weights; minor: evaluator; major: model) and re-run `ai:arena`. Recorded battles are never affected (the replay doesn't ask the AI); in-progress ones change from the next decision on, so deploy AI changes at night.

## Commands

```
npx vitest run api/_lib/challenge api/_lib/ai api/challenge.test.js api/challenge.deps.test.js
AI_FUZZ=200 npx vitest run api/_lib/ai/invariants.test.js   # the full fuzz (default 6 per profile)
npm run ai:arena -- --cynthia all --vs random,greedy --games 80
npm run ai:dataset -- --battles 1500 && npm run ai:train      # retrain M1
curl https://pokemonbuilder.app/api/challenge?ping=1           # then the bare GET for the self-check
```
