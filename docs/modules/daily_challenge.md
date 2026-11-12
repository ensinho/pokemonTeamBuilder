# Champion Challenge (daily battle vs a Champion AI — Cynthia, Blue)

> The system as built. The *why* and the full design are in the plans:
> [product](../plans/daily-champion-challenge.md) ·
> [technical spec](../plans/daily-champion-challenge-tech.md) ·
> [battle AI](../plans/daily-champion-challenge-ai.md) ·
> [prediction models](../plans/daily-champion-challenge-ml.md).
>
> **Status (2026-10-15):** F1–F5 built and verified in the browser, uncommitted:
> the `/challenge` route as a DS console (walk to Cynthia, her dialogue, the
> Time do dia featured, an animated battle, result, practice), the Home card,
> search, OG, guide, patch notes 1.16.0, account deletion. M1 accepted at
> log-loss 0.501 (Enzo, 2026-10-15). F3 finished the same day: the win-chance
> report, the Pokétch dossier, WebAudio sound. Next: F6 (ranking, share card, push).

## Champions (2026-11-05)

Two champions **in one room** (Enzo, 2026-11-05): Cynthia on the left, Blue on the right (`arenaMap` letters `C` / `U`, `CHAMPION_ROOM.champions`, mirrored around the door), each under a name plate — gold with ✓ once beaten today. **The choice is the walk:** arriving in front of one (`DsArena` `onArrive(id)`) loads that champion's day (`selectChampion` resolves with the load) and then plays their lines, or resumes their battle in progress. The plates are buttons ("Go to Blue"), the keyboard's and screen reader's path; the bar has no champion chips. The last one faced is remembered in `ptb:challenge:champion` and in `?champion=blue`, which also deep-links. **Cynthia's documents keep every id they launched with**; any other champion's carry `_{id}` (`runs.js` `championSuffix`), so nothing stored moved.

**Links to one battle (2026-11-12).** `?board=daily|free` opens straight on that board's team picker (a guest gets the gate), `?view=ranking` opens that board's ranking; a battle in progress still wins. Both are read once, after the asked champion's day has loaded, and then dropped from the address (`ChampionChallengeView` placement effect, `DsTeamPicker` `initialBoard`). Build them with `challengeLink()` / `championAction()` (`src/utils/challengeBoards.js`) — the champion is always named. The Home reads both champions' days in `useChallengeSummary` (`champions`: one public day and two runs each) and shows them as 0/2 · 1/2 · 2/2 per champion (`challengeDayPlan`, `components/home/ChampionDay.jsx`).

- **Each has their own day:** lineup, Time do dia (`dailyTeamFor(day, championId)` — Cynthia's seed unchanged, Blue's mixes his id), ranking (`challengeRanks/{day}_blue`), day doc (`challengeDays/{day}_blue`) and record (`challengeStats/{uid}.champions.blue` — the same document, so rules and account deletion are unchanged; `outcome.js` `statsOf` / `withStats`).
- **Blue rotates like Cynthia** (`BLUE_POOL`, sources in its comment; Wikidex checked 2026-11-04): 3 of the frequent six (Pidgeot, Alakazam, Rhydon, Exeggutor, Gyarados, Arcanine; Pidgeot leads most), 1 occasional (Tyranitar, Heracross, Machamp, Aerodactyl), the wildcard, and **an ace that changes by day**: one of his starters (Charizard, Blastoise, Venusaur — `rotation.aceFor`), kept away from the member that starter's team never has (`excludes`: Arcanine / Gyarados / Exeggutor), as in FRLG. The ace reaches the AI as `decide({ aceSpecies })` and the dialogue as `ctx.aceSpecies`. The difficulty keys are shared; Blue's labels are `challenge.champions.blue.difficulty.*` (Red & Blue, Yellow, Rematch, World). His `dp` sets start from gym-leaders.json; the rest is `design`.
- **Blue's AI is Cynthia's engine** — same evaluators, lookahead, M1 model and weekday profiles; his personality (`personality/blue.js`) differs only in the ace, which rotates. Calibrated with `npm run ai:arena -- --champion blue` (80 games each, 2026-11-05) against the greedy robot: dp 37.5% (target 40–55; the game's own Red & Blue sets won 21%, so `dp` trades their filler for one strong move each), platinum 47.5% (50–65), rematch 70.0% (60–75), world 71.3% (≥ 70); vs random 89–100%. Zero illegal choices. Rematch shows 16–23 estimate fallbacks a run (the sim's `getDamage` threw for some set in some state; Cynthia's Rematch shows 0) — harmless, not yet traced.
- **Lines** are `challenge.{championId}.*` (`dialogue.js` `keysFor`); Portuguese copy drops the article before a champion's name ("Desafiar Blue"), and the few gendered lines (greeting, VS tag) have a per-champion key.
- **Wildcard types:** `typesFit` counts only the wildcard's own types — Blue's regulars can already be three Flying-types. Identical for Cynthia (her 400 days of teams diffed byte-for-byte).
- **Art:** `challengeArt.js` `CHAMPION_ART`. Blue's overworld sheet and battle pose are cut from the rip Enzo supplied (`public/blueSprite.png`, "ripped by ChrisX698") into Cynthia's sheet layout and an 80 × 80 left-facing sprite (Showdown has no Gen 4 Blue).
- **The "next champion" hint:** for a trainer who has beaten this champion (today or ever) and hasn't played the other today — the bottom screen on a phone (`DsChampionHint`), a toast on a desktop, where a card would cover the room; its button walks you there. The result's last button is **Back** to the room. Patch notes 1.21.0 announce it (the donation card stays featured).

**One official per board:** the first battle of the day with the Time do dia (`{uid}_{day}`) and the first with your own team (`{uid}_{day}_free`) are both official — a trainer can stand on both boards, once each. Practice hangs off the board's official (`{officialId}_p{n}`). Only one battle at a time per champion (`officialAlreadyPlayed` while the other board's run is active). A day counts once in the record: a later official can only turn a lost day into a won one (`nextStats`, `brokenStreak`). `state` returns `officials: {daily, free}`, `champions: [{id, name, played, won}]` and `official` (the board on screen). The picker's `practice` is per board.

**Share** posts the result to the forum in one press (the `sharedChallenge` card, now with `champion`); the clipboard / share-sheet text is no longer offered from the result.

## Map

```
api/challenge.js                 the endpoint (8th of 12 functions): ensureDay | start | choose | forfeit,
                                 GET ?ping=1 (loads nothing), GET (self-check incl. one AI decision)
api/_lib/challenge/
  constants.js   FORMAT, LEVEL, ENGINE_VERSION, BANNED_MOVES, CHOICE_PATTERN, CHAMPIONS
  seed.js        hashSeed(...parts) → 4×16-bit sim seed (cyrb128)
  day.js         Brasília day: dayKeyAt, nextResetAt, weekdayOf, isoWeekOf…
  pool.js        Cynthia's and Blue's species × {dp, platinum, rematch, world} sets, each with a source
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
    arena ─walk to her─▶ dialogue ─▶ pick | gate ─start─▶ transition (the VS card) ─▶ battle ─▶ result ─▶ practice
src/components/views/challenge/ds/
  DsConsole      two 256×192 screens (--px = width/256), the bar, D-pad/A/B (desktop only)
  DsArena        the room: grid walking (keys, D-pad, tap → BFS path), the "!" and her lines
  DsTextBox      typewriter; first press finishes the line, the second advances
  DsTeamPicker   Time do dia first and chosen by default; "Meus times" one level down
  DsBattleStage  plays the log moment by moment (useBattlePlayback) → DsBattleScene
  DsBattleScene  DPPt field: STAGE geometry, sprites 1:1 standing on their feet row
  DsCommandPanel LUTAR / POKéMON / DESISTIR; moves HGSS style (type, category, PP tone)
  DsPoketch      party silhouettes (#ds-lcd-ink), countdown, counter
  DsVersus       the VS card (you vs Cynthia; friends' battles too) — its own chunk
                 through DsVersusLazy / versusChunk.js, styles in battle-versus.css
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
- **Desktop rails** (`useRailMode`, `DsConsole rails`, `ChallengeTeamsRail.jsx`, `ChallengeRanking.jsx`):
  - The space a wide column leaves around the one screen holds the teams (yours with live HP, hers as the dossier) and the day's ranking with your record.
  - Since 2026-10-29 the challenge's rails are **app UI**, not the game: the console's panel (surface, 1px border, `--radius-xl`), theme tokens, the app's type — the BW blue menus are gone from them. `.ds-rail` itself is a neutral container; a game panel inside one (the friend battle's chat, `.ds-panel`) still carries the DS font and palette.
  - `railModeFor` decides from the column's width and the window's height. Two rails while the screen keeps 90% of its natural width; one rail (both stacked on the right) while it keeps 80%; none below that, where the bar's "Ranking" chip opens `ChallengeRankingSheet` (an app dialog — a draggable sheet on a phone), no longer a menu inside the screen.
  - Rail HP comes from the lines the playback has shown (`sideHp`, `railTeams`), never from the latest request, which already knows how the turn ends.
- **Data boxes:** Black & White's slim bar against the screen edge: name, gender, level, the HP bar in its frame behind the HP mark, and your figures under it. There are no balls in the box; they stand alone before the send-outs.
- **Home:** the challenge is the featured card of "Your day": Cynthia on a disc and her six as silhouettes (`useChallengeSummary` `lineup`, null for the wildcard). The puzzle, the next badge and the meta leader stack beside it as one-line rows.

### Black & White HUD, two layouts (2026-10-15)

- `useConsoleLayout`: **single** (≥ 1024 px) — one 4:3 screen as tall as the window, the console frame wrapping it; the room, the picker (a menu over the room), the battle with its HUD strip (message left; LUTAR / TIME DELA / POKéMON / DESISTIR right; moves replace the buttons and the left box describes the focused one; party and her team open over the field) and the result (chart above, a symmetric strip below — or the result filling the screen when there's no chart). **dual** — two screens on a phone: the field with BW's black message band on top, BW's red touch menu below (FIGHT capsule, both rows of balls, the three buttons; dimmed while the turn plays).
- One state for both: `useBattleCommands` (views main / moves / party / dossier, the focused move, keys 1–4, ←→↑↓, A, B). Renderers in `ds/DsBwCommands.jsx` (`DsTouchMenu`, `DsHud`). No BAG in this challenge: its yellow slot opens her team.
- Every sub-menu ends in VOLTAR: moves, party (unless the switch is forced), her team, the picker (Meus times → Time do dia → the room), the gate.

### The HUD in the site's material, stat stages, the mascot (2026-11-10)

Enzo: "deixar o HUD mais aesthetic e clean conforme o design e estilo do site, usando talvez também do mascote, além de exibir visualmente os buffs/debuffs". The field stays the game (sky, platforms, sprites, DS pixels, DotGothic16); everything laid over it is the app's.

- **Material:** `--hud-*`, declared once on `.ds-screen` — ink, surface, raised, edge, muted, Volt and its lip, and the stat tones. The `--bw-*` names that survive point at them, so the picker, the sheet, her team, the result and the friend battle's lobby and chat moved together. `--hud-ground` is the page's dotted ink (touch menu, picker, panels, overlays). One primary per menu: LUTAR / FIGHT / the start capsule are Volt on a lip; the teams are raised fills with an edge; DESISTIR is a ghost. A move is a raised card tinted by its type with the type's bar down its left edge; type chips use the `.type-chip` mixes.
- **HP boxes:** the BW slant stays, **painted with background layers, not `clip-path`** (the clip came and went between paints in Chrome while chips changed); yours carries a Volt line along its foot.
- **Stat stages:** `readBattleField` keeps `active.boosts` (`-boost`, `-unboost`, `-setboost`, `-clearboost`, `-clearallboost`, `-clearpositiveboost`, `-clearnegativeboost`, `-invertboost`, `-swapboost`, `-copyboost`; a switch and a faint clear them, `[from] Baton Pass` hands them on — fixture lines from a real sim run in `battleState.test.js`). `StateRow` (in `DsBattleScene`) draws them as chips on the field side of each box (under hers, over yours): arrow, stages, stat — warm for a rise, cool for a drop, the games' colours; `title` gives the multiplier (`boostMultiplier`). The chip whose line is playing pops; `StatFx` sends three arrows up (or down) over the Pokémon. Both are transform/opacity and absent under reduced motion.
- **The mascot:** his face sits at the left of the battle's message (the band on a phone, the strip's box on a desktop) as the moment's readout — `battleMood(event, facts)` in `utils/mascot/assistant.js` (tested: every moment names a real mood; he roots for the trainer). He never speaks: the message beside him does. Inside a `.ds-screen` the `--mascot-*` tokens are pinned to their dark-surface values, so he reads in every theme.
- **The sheet and her team** (the screen Enzo's reference showed): no border inside the overlay's border — tabs, the body and the cards are raised fills; the selected tab wears a Volt ring; ENVIAR is the sheet's primary and VOLTAR the quiet capsule beside it; "EM CAMPO" is a Volt-tinted chip.
- **Polish (2026-11-10, Enzo's review):** the strip's message is 9 px on an 11 px line, centred beside the face — three lines fit ("What will Gouging Fire do?" spilled under the box). In the two-rail deck the teams' rail is 85% of the ranking's. The ranking gets a step more air in a tall rail, and roomier rows only where the rail is ≥ 19rem (narrower, the extra padding cut names). **A phone's bar is crown · clock · Ranking · ⋯**: the streak and the music / sound / speed switches live in the ⋯ menu (`ConsoleMoreMenu`, a `.menu-surface`; `ConsoleSoundControls` renders the three chips on a desktop and the menu on a phone, for this console and the friend battle's — back · opponent · chat · ⋯ there), the Ranking chip keeps its label and stays during the battle, and every chip shares the row's height.
- **Conditions (2026-11-10):** the same reducer keeps what a player has to remember between turns — a side's screens and hazards (`side.conditions`, from `-sidestart` / `-sideend`; Spikes arrives once per layer; `-swapsideconditions` is Court Change), what clings to the Pokémon out (`active.volatiles`, from `-start` / `-end`; `perishN` is one chip with a count; a switch and a faint clear them, Baton Pass hands on the ones the sim copies) and the field (`weather`, `terrain`, `rooms`). Only ids in `CONDITIONS` (`utils/battleState.js`) exist: the table is the whitelist, the chip's abbreviation (SR, SPK 2, REF, LS, SUB, SEED — move names stay English, as in the battle text) and its kind. `sideConditions(side)` / `fieldConditions(field)` are what the scene draws: a side's chips follow its stat stages in the same row (volatile white, screen Volt, hazard amber), the field's row sits over her box. Turn counters are not shown — an item stretches a screen or a weather and the log never says. Still not modelled: Protect-style one-turn effects, type changes, the Substitute's own HP.

### The team sheet (Ficha, 2026-10-17)

BW's Summary for your own team, before and during the battle (`ds/DsTeamSheet.jsx`, data from `utils/challengeSheet.js`, tested):
the six as tabs (icon + HP), then one in full — types, level, gender, HP, status, ability, item (with its sprite), the four moves (type, category, PP in battle / power before it) and the six stats (real in battle, **base** before it, labelled).
- **Before:** in the picker, a tap on a member of the Time do dia opens its sheet; "Ficha ▸" opens a saved team's. VOLTAR returns one level; A still starts.
- **During:** POKéMON opens the sheet, **also while the turn plays** (phone: the button stays lit in the dimmed menu; desktop: POKéMON / TIME DELA beside the message in the HUD). On your turn the member shown can be sent in (ENVIAR); ← → walk the six. A forced switch opens on the first who can come in and waits for the faint to finish playing. On a desktop the sheet covers the HUD too (`.bw-overlay.is-full`).
- **Never ahead of the field:** the sheet is built from the newest `|request|` among the lines already played (`settledRequest` — the sim sends it after its turn), with HP and status from the played lines (`shownConditions`). The order follows the sim's: the active Pokémon is first, as in the games.
- Terastal Clause was on until 2026-11-09 (see **Tera and Z-Moves** below); the sheet still shows no Tera type.

### After the battle, the Pokétch, sound

- **The report** (`DsBattleReport`, top screen of the result): the M1 curve, decision by decision, diverging fill around 50% (`--ds-chart-you` / `--ds-chart-her`, validated with the dataviz script), the biggest swing ringed and named from the log (`utils/winChart.js`: `biggestSwing`, `swingCause`). The server stores `winChanceMarks` beside the curve — per point, the battle turn and the player's log length — so a swing's lines are a slice of the log. A forfeit keeps the curve so far; fewer than two points shows the room instead.
- **Dossier** (Pokétch app 2): her six from `championRoster`, dim silhouettes and "???" until sent out.
- **Sound** (`utils/challengeSfx.js`): WebAudio recipes from the spec §3.12, no files; nothing before the first gesture on the route; mute on the bar, remembered (`ptb:challenge:muted`). Battle moments map through `soundFor(event)` — the hit sounds on the damage, "super effective" adds a second impact, because the log puts it after the damage. `versus` and `whoosh` belong to the VS card.
- **Music** (`utils/battleMusic.js`, 2026-10-20): an original chiptune loop per opponent (`champion` here, `rival` for friend battles), synthesized on the effects' context and master gain — one mute silences both — with its own switch on the bar (`ptb:battle:music`). Faster while your active Pokémon is at ≤ 25% HP; stops at the `end` moment so the result's jingle plays alone; nothing scheduled while the tab is hidden. The bar's three switches are `useBattleSound`.

### Move effects by type (2026-10-15)

`MoveFx` in `DsBattleScene.jsx`: eight particles at the target, a **pattern** (how they move: rise, fall, ring, slash, quake, swarm, burst; status moves sparkle) and a **shape** (flame, bubble, wisp, leaf, rock, shard, bolt, ring, sparkle, line, dot, star) per type (`FX_BY_TYPE`); a special move's particles wait for its orb. Heavy physical hits (ground, rock, fighting) shake the field (`is-shake`, the world layers only). Transform/opacity; none under reduced motion.

### Tera and Z-Moves (2026-11-09)

- **The player's, never the champion's** (Enzo: "ter tera onde couber", Cynthia "melhor não"). Terastal Clause is off; `CHOICE_PATTERN` accepts `move N terastallize` and `move N zmove`; `ai/options.js` `legalOptions` never offers either. Dynamax stays out — the sim allows it only in Gen 8. Plan and sim facts: `docs/plans/battle-gimmicks.md`.
- **One switch, three faces.** A Pokémon has at most one gimmick (a Mega Stone or a Z-Crystal rules Tera out), so `useBattleCommands` derives one (`gimmickOf`: mega → zmove → terastallize) and the MEGA button becomes MEGA, Z or TERA (in the Tera type's colour). MEGA starts on, Z and TERA off — Z and Tera are once a battle; Mega is once a battle in PvP and once per Pokémon in the challenge (Multi Mega Mod). With Z on, only the moves with a Z-Move (`canZMove[slot]`, read as `move.zMove`) can be picked and they show its name.
- **The moment:** `-terastallize` → a `tera` timeline event (line, `mega`-sized flare in the type's colour, the Mega sound) and `teraType` on the active (also read from `tera:X` in a switch's details) — the HP box adds a TERA mark. `-zpower` → a `zpower` event (line, gold flare); the Z-Move is the next `move` line. Tests: `src/utils/battleGimmicks.test.js`, `api/_lib/challenge/gimmicks.test.js` (real sim, both formats).

### Mega Evolution and the anime flare (2026-10-20)

- **Mega Evolution** works in both battle types. The request's `canMegaEvo` becomes `canMega` (`readMyRequest`); `useBattleCommands` keeps a **MEGA** switch, on by default and reset with every request, and sends `move N mega` (`M` toggles it; it sits beside the moves on a phone and beside the move's name in the HUD). The server pattern accepts it. The AI Mega Evolves whenever the sim lets it (`legalOptions`). A team saved as a Mega forme starts as its base (`toStartingForme` in `validateTeam`), so it Mega Evolves in battle. Since 2026-11-12 that forme goes out holding its stone whatever the set said, and the challenge's **Multi Mega Mod** (`api/_lib/simRules.js`) lets every Pokémon holding its stone Mega Evolve — the sim's one-a-battle limit is put back for allies on `AfterMega`. PvP keeps the games' single Mega.
- **The moment:** the sim writes `detailschange` (the new forme) and then `-mega`. The timeline emits one `mega` event naming the forme; the field swaps the sprite as of the forme line; the Pokémon turns into a white silhouette that swells into the new forme (WAAPI on `.ds-mon__body`); the HP box keeps the name and adds a MEGA mark. Mega sprites are Showdown's Gen 5 (no Gen 4 Megas exist).
- **Readers keyed by species follow `detailschange`** both ways: the sim renames a fainted Mega back to its base (`|detailschange|p2: Lucario|Lucario, L50, M|[silent]`). See `src/utils/megaEvolution.test.js`.
- **The anime flare** (`ds/DsFlare.jsx`, choice in `src/utils/battleFlare.js`, tested): neon line art (a white `--flare-core` over a wider stroke of the moment's colour) with an X glint, a four-point star, rings, a blade, rays and a dot. `hit` on a direct hit (a `-damage` with no `[from]`, tagged `strike` by the timeline) in the move's type colour; `crit` when it was critical or super effective; `mega`; `win` on a battle you won; one behind the VS slam. It uses the Web Animations API with transform and opacity only, so it costs the stylesheet one positioning rule. It is not drawn under reduced motion.

**CSS budget:** **13.53 KB gzip on 2026-11-10** (Vite's report; the HUD pass added ~0.3 KB, the polish and the condition chips ~0.2 KB — the route had already passed the old 12 KB line with Tera and the champions). Earlier: 11.75 KB gzip on 2026-10-20 after Mega, the flare and the HUD grid** (Vite's report). The route's stylesheet was 11.7 KB gzip of its 12 KB (2026-10-17, with the team sheet; 11.1 KB on 2026-10-16); **11.54 KB on 2026-10-20** — the spiral transition went, and the VS card's 2.5 KB is its own lazy chunk (`DsVersus`), loaded from the team picker on, so it never counts here. The friend battles load this stylesheet too (a shared `champion-challenge-ds` chunk) plus `battle-pvp.css`. The BW pass had layered rules over the DPPt ones; those are merged now, one rule per selector, with the DPPt panel colours gone. A refactor of this stylesheet is checked by diffing computed styles across 16 states (desktop with and without rails, phone; room, picker, ranking, battle and its menus, result with its chart) before and after. The same diff found this merge left nothing different but the dead declarations it meant to drop.

### F6: ranking, share, push (2026-10-15)

- **Ranking** (`api/_lib/challenge/ranking.js`, pure + tested): one public doc per day, `public/data/challengeRanks/{day}` — `boards.daily` / `boards.free` (top 50: score, then fewer turns, then earlier), `played` / `wins` per board, `players` (uids on a board, for `array-contains`). Written inside the transaction that ends an official run (and by an official forfeit, which only counts); practice never touches it. `state` returns `publicRanks` (top 10, counts, `mine`; the uid only for a row with a public profile — 2026-11-05, so its trainer card opens — never a guest's). `forget` removes a player (account deletion calls it, best-effort). Each winning row stamps the trainer's public profile at the moment of the win (`rankProfileOf`: avatar, frame, title, level — read from `publicProfiles/{uid}` inside the finishing transaction), so the screen gets a face without a uid; your own row uses your live avatar and frame. UI (2026-10-29): `ChallengeRanking` — app cards (place, avatar in its frame, name, turns · standing, score; #1's place in gold, your row ringed; since 2026-11-05 the top three stand on a podium and a row's detail opens the trainer card), a row opens the attempt in place (who, title, level, place, score, turns, Pokémon standing, time of the win). The result names your place.
- **Share** (`utils/challengeShare.js`): a few lines — day, difficulty, outcome, streak, place, the curve as ▁▂▄▆█ — and the link; the share sheet on a touch device, the clipboard elsewhere. Official runs only.
- **Forum card**: the share toast offers "Postar no fórum" → a `sharedChallenge` attachment (`buildChallengeShare`: day, level, outcome, figures, streak, place, the curve as blocks — no team) drawn by `src/components/ChallengeShareCard.jsx` in threads and comments, read back through `readChallengeShare` (whitelisted strings, clamped numbers — the payload is user-written; tested against a forged one). Self-reported, like a PokéPuzzle board; the ranking is the authoritative record.
- **Push**: `dailyChallenge` rides the daily cron (`api/daily-puzzle.js` `DAILY_TOPICS`), tag `ptb-challenge`, opt-out in Profile → Notifications.

### Outside the route

- **Home card** (`useChallengeSummary`, `CozyHomeView`): reads the public day, the run and the stats (≤ 3 `getDoc`) plus a `ptb:challenge:summary` cache; states guest / new / ready / active / won / lost (`challengeSummaryState`, tested), always with the countdown. ~1.3 KB gzip on the entry bundle; imports nothing from the route.
- **`src/utils/challengeDay.js`** mirrors `api/_lib/challenge/day.js` (tested over 800 instants). A run that doesn't exist is a *denied* read, not an empty one (its rule checks `resource.data.uid`) — the card treats both as "not played".
- **Account deletion** erases runs, their rounds and secret state, then the runs and the stats (two waves: a round's rule reads its run). `aiTraining` rows have no uid and stay.
- **Search** ("cynthia" finds it via `nav.challengeSearch`), the Mais sheet, `render-meta` OG tags with its own card (`public/challenge-og.png`, 2026-10-18: Cynthia, Garchomp and her Platinum six, in the PokéPuzzle card's layout), the page guide, patch notes 1.16.0.
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
- **`gen9customgame` is a debug format**: it reports exact HP to both sides (`reportExactHP`). The challenge uses `gen9anythinggoes@@@!Team Preview,Sleep Clause Mod,Quick Thaw Mod,Multi Mega Mod` (Terastal Clause until 2026-11-09; Quick Thaw Mod since 2026-11-11; Multi Mega Mod since 2026-11-12; runs keep the format they were created with) — percentages for the other side, no debug lines. (PvP still uses customgame; see wounds.)
- **`|t:|` lines carry `Date.now()`** — stripped in `engine.js`, or no two runs of a battle are byte-identical.
- **Nothing is emitted until `battle.sendUpdates()`**; `apply` flushes after every choice.
- **Per-player channels are 1 and 2** in `extractChannelMessages` (0 is the spectator, −1 omniscient).
- **Team Preview is off** so the wildcard stays a "?" until it is sent out.
- **Revival Blessing** turns the next "switch" prompt into "pick a *fainted* Pokémon" (`reviving` on the active entry) — `options.js` handles it.
- **`getDamage` eats berries.** Estimation clones stub `eatItem`/`useItem`, or every estimate after the first sees a Pokémon without its Yache Berry.

### The VS card and friend battles (2026-10-20)

- **The VS card** (`ds/DsVersus.jsx`) replaces the spiral transition: a split band (blue for you; violet for the Champion, red for a friend), speed lines, the two portraits sliding in (your avatar: trainer sprite, else partner Pokémon, else Hilbert; Cynthia's Showdown sprite), the pixel VS slamming down (a 26 × 14 bitmap drawn as one SVG path, outline + shadow + gradient), then names, title and hexagon badges (level, streak; crown and difficulty for her). ~2.7 s, any tap or key skips it, a still card under reduced motion. `onDone` hands over to the battle; `DsVersusLazy` skips the card rather than wait more than 1.8 s for its chunk.
- **`DsBattleStage` is shared** with the friend battles through `rival` (opponent's sim name, trainer sprite, roster from the log, waiting line, labels, forfeit copy) and `music`; `DsTeamPicker` without `dailyMembers` is the friend lobby's team picker. See [Friend battles](./friend_battles.md).

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

## Our own rules and Transform (2026-11-11)

- **Quick Thaw Mod** (`api/_lib/simRules.js`): a frozen Pokémon thaws 1 time in 3 before it moves instead of the games' 1 in 5 (an extra 1-in-6 roll at priority 11, ahead of `frz`'s own). It is a ruleset registered on `Dex.data.Rulesets` when `simRules.js` is imported — `battleResolver.js`, `challenge/engine.js` and `ai/fog.js` do — and it joins a battle only through its format string, so a run or PvP battle created before it replays exactly as it was played. A new rule of ours goes in the same file and the same way. `simRules.test.js` measures the rate.
- **Transform** (Ditto, Imposter, Mew): `|-transform|p2a: Ditto|p1a: Iron Hands|…` — `readBattleField` sets `active.transformedInto` (the target as it looks, copying its stat stages, with a `transform` volatile chip, TRANSF) until the switch-out; `DsBattleScene` draws that sprite and keeps the box's own name; the timeline emits a `transform` event ("Ditto inimigo se transformou em Iron Hands!") that flashes like a Mega Evolution.
