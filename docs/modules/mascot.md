# The mascot (2026-11-06)

The little ghost of the app icon, drawn live. Before this it was the raster
icon (`logo-mark.webp`) in the tips, the official Gengar sprite
(`GengarPresence`, removed) in empty states and the route loader, and two
60 KB PNGs on the 404. The design proposal it implements — expressions,
poses, themes, states, motion, interactions, scenes, GIFs/stickers/video —
was approved by Enzo on 2026-11-06 ("nossa eu amei").

## The pieces

| File | What it is |
|---|---|
| `src/utils/mascot/rig.js` | The drawing as data. The outline was traced from `public/LogoCuteGengarRounded.png` and fitted to its pixels (93.5% overlap); eyes, mouths, blush, sparks, paws, props, hats and effects are parts. `mascotInner(pose)` → SVG markup. Pure, Node-safe (explicit `.js` imports). |
| `src/utils/mascot/motion.js` | Every sequence is `pose(t)`: hop, jump, celebrate, oops, wake, vanish, evolve, capture, Shadow Ball… `merge(base, ...layers)` composes them; `E.pop`/`E.glide` are the design system's springs (same constants as `--ease-pop`/`--ease-glide`). |
| `src/utils/mascot/catalog.js` | The vocabulary: 32 `MOODS` (faces) and 28 `POSES` (paws + props), `sizeTraits(px)` (the size ladder), `seasonalHat(date)`, `isNight(date)`, `personaTone(id)`. |
| `src/utils/mascot/constants.js` | What the boot path needs without the rig: `TONES`, `VIEWS` (framings), `MASCOT_SIZES`, `LOADER_SCENES` (names only). |
| `src/utils/mascot/icon.js` | **Generated** (`node scripts/build-mascot-icon.mjs`): the mascot at rest as static markup, drawn before the engine chunk lands and by the boot splash. `catalog.test.js` fails when it drifts from the rig. |
| `src/components/Mascot.jsx` | `<Mascot>`, `<MascotTip>` (same API as before: `size`, `cheer`), `<MascotIcon>` (splash, no engine), `<MascotFace>` (a still sticker for places where a face repeats). |
| `src/utils/mascot/assistant.js` | What he says as an assistant: `teamVerdict`, `homeNote`, `patienceStage`, the costumes. Pure; see "The assistant". |
| `src/components/mascot/engine.js` | The lazy chunk (≈17 KB gz): rig + motion + catalog + the controller. Loaded by `useMascotEngine`, warmed first in AppLayout's idle prefetch. |
| `src/components/mascot/stage.js` | `MascotStage`, the interactive controller: looks at the pointer, answers taps; on a `playground` also petting, long press, drag and dozing off. Imperative: frames are written into the `<svg>`, no React render per frame, and it runs frames only while something moves. |
| `src/components/mascot/ticker.js` | One shared rAF loop, none when nothing moves. |
| `src/store/useMascotStore.js` | Device prefs (`ptb:mascot`, a `DEVICE_KEYS` entry: tone + reactions + `shinyFound`), the stage owner, `react(name)`, the password `cover` flag. |
| `src/hooks/useMascotReactions.js` | Mounted by the shell: success toast → hop, error → oops; offline/online toasts. |
| `src/styles/mascot.css` | Sizes, the `--m-*` mapping, CSS loops, the bubble, the stage tile, the 404 digits. Tokens `--mascot-*` live in index.css' brand layer. |

## Using it

```jsx
<Mascot size="lg" mood="preocupado" />                        // a face
<Mascot size="xl" framing="body" pose="capturando" loop="..." />  // a pose
<MascotTip mood="animado" play="jump">Missão concluída!</MascotTip>
<Mascot size="hero" mood="perdido" pose="pataNoQueixo" playground stage label={t('mascot.label')} />
```

- **Ask by name.** Moods and poses come from `catalog.js`; never assemble a
  face in a view. A new face is a new `MOODS` entry (the tests draw every one).
- **`size`** xs 24 · sm 36 · md 48 · lg 64 · xl 120 · hero 176 · `fill`. The
  stroke thickens and blush/fangs drop at small sizes on their own (`sizeTraits`).
- **`framing`** `head` (tips, ≤ 64 px default) · `body` (paws and props) · `wide`
  (the playground). The SVG overflows its box on purpose: a hop or raised paws
  never change layout.
- **`play`** runs a sequence once (`playKey` replays it). It is the app's
  celebration, so it honours the trainer's "Reações e comemorações" switch;
  `cheer` is the old one-hop API.
- **`interactive`** looks and hops; **`stage`** also plays the app's reactions;
  **`playground`** adds petting (rub the top of the head; five and it is tired
  for 20 s, the Pokémon Refresh rule), a 450 ms hold for a Shadow Ball, drag,
  and dozing off when left alone (25 s, 12 s at night). Three taps on the
  sparks turn it shiny (unlocks the shiny tone), eight quick taps make it
  angry and it hides for a moment.
- **`coverable`**: covers its eyes while any password field has focus, peeks
  when the password is shown (the Rive login bear). One per dialog —
  `PasswordField mascot`.

## Where it is

| Surface | Mood / pose / motion |
|---|---|
| Boot splash (AppLayout) | `MascotIcon` — static icon, CSS pop + sparks + one blink |
| Every region's wait (`<Loader size="md\|lg">`, the route fallback included) | a **scene** chosen by what is loading — see below |
| Tips: PageGuide, Home welcome, JourneyCoach, Journeys lead, BadgeUnlock | xs icon · waves · jumps when a guided mission is done · crowned when all is done (still) · holds the badge |
| BuilderCoach | points (empty) → excited → determined → radiant; **celebrates only on the step to 6/6** |
| EmptyState (`mascot` prop) | `empty` peeks over the edge · `search` shrugs · `lost` (not-found pages) · `error` worries |
| 404 (NotFoundView) | 4, the mascot as the 0, 4 — the full playground |
| SessionTransition | waves and vanishes like a ghost |
| VersionUpdateModal | holds the new version, gift-wrapped (Live Pink: it is new) |
| Password fields | covers / peeks (the dialog's working state: the scene; deleting an account keeps the ball) |
| Global search, no results | shrugs (shake once per query) |
| Daily check-in result | hops, or **evolves** on a level up (the games' white silhouette) |
| Profile → Aparência → Mascote | the playground, eight moods, the tone picker, the reactions switch |
| Toasts / connection | the stage mascot hops on success, says oops on error; offline/online toasts |

## Loader scenes (2026-11-06)

Enzo, after the first round: "pode aparecer em mais telas, carregamentos de
champion challenge por exemplo e outros que atualmente eh só uma pokebola".
Every wait that has a region to itself is now a small scene — the creative
direction's rule that the scene answers the user, applied to waiting.
`<Loader size="md|lg" scene>` draws it; `xs`/`sm` (buttons, rows, the end of
a list) keep the Poké Ball alone, because they repeat and sit beside content.

| `scene` | Mood + pose | What moves (CSS, at rest) | Where |
|---|---|---|---|
| `capture` (default) | `expectante` + `capturando` | the ball rocks three times — will it hold? | route fallback, Pokémon detail, builder grid, favourites, shared team, signing in |
| `battle` | `desafiador` + `shadowBall` | the Shadow Ball's glow breathes, its swirl turns | Champion Challenge ("Entrando na sala da Cynthia…"), friend battles, the battle list |
| `pokedex` | `concentrado` + `lendoPokedex` | a page turns over the spine; the eyes read two lines, then follow it | Pokédex, moves/items/abilities (lists and pages), Speed Tiers, Meta, tournaments, best teams, the greeting picker, a Pokémon's moves |
| `think` | `pensando` + `matutando` | the thought bubble's dots | quizzes, PokéPuzzle, team compare, verifying a password |
| `search` | `curioso` + `investigando` | the lens sweeps; the eyes follow it | friends (list and search), where a Pokémon is found |
| `ball` | — | the plain Poké Ball | inside a `.ds-screen` (the friend battle's lobby panel), deleting an account |

- **It fades in after a beat** (200 ms, `.loader--scene`), so a short wait
  shows nothing. When one wait hands over to the next — the route's chunk,
  then the view's data — the second scene shows at once (`is-handoff`, the
  module-level clock in `Loader.jsx`), so the trainer sees one wait, not a
  blank beat between two.
- **Never interactive.** A controller re-renders the markup on every frame,
  which would restart the CSS loops; a loader is decorative (`aria-hidden`),
  the label or the `sr-only` text says what is loading.
- **Not the celebrations switch.** A scene's loop is a status, like the ball's
  wobble, so it runs with reactions off; reduced motion stops it (the scene
  stays, still).
- A new scene is a `LOADER_SCENES` entry naming a mood and a pose whose prop
  loops at rest; `catalog.test.js` fails if a scene names something that does
  not exist or does not move.

## The assistant (2026-11-10)

Enzo: "tenha ele como pequenino assistente em certas tarefas do sistema, com
suas animaçõezinhas, sempre quando for coeso". What he says is decided in one
pure file, **`src/utils/mascot/assistant.js`** (tested), never in a view.

| Piece | Where | What it does |
|---|---|---|
| **Recado do dia** | `components/home/MascotNote.jsx`, under the greeting (`homeNote(facts)`) | ONE line a day: a friend's battle waiting → the streak (evening only, never a threat; says when a shield covers it) → the open PokéPuzzle → the Champion → "Tudo feito por hoje" (asleep at night). The line is the link; × sends him off until tomorrow (`ptb:mascotNote`). Silent while a fact is unknown and for a brand-new trainer |
| **Veredito do time** | `components/builder/MascotVerdict.jsx` (desktop composer, the phone's analysis sheet; his face leads the phone's analysis chip) (`teamVerdict`) | start · growing · hole · weak · complete · coverage. Reads the same analysis **and grade** as `rateTeam`, so he never frowns beside "Excelente". Cheers only a step up the trainer just made (`verdictImproved`); stays out while the beginner's coach is on screen (`builder/coachState.js`) |
| **Reaction faces** | `forum/ReactionBar.jsx`, `REACTION_KINDS[].mood` | Each battle-text line is said by his face in the line's type colour — `<MascotFace>`, a still sticker drawn once per mood and reused (no store, no controller, never loops) |
| **A wait that runs on** | `Loader.jsx` (`PATIENCE_STEPS` 4 s / 10 s) | After 4 s a second line says what he is doing ("Segurando a bola…"); after 10 s he yawns and the line admits it is long. The caller's label stays |
| **Rosto da batalha** | `challenge/ds/DsBattleStage.jsx`, beside the battle's message (`battleMood`) | The moment's readout in the Champion Challenge and friend battles: sparkling at a super-effective hit on the rival, startled at one on you, confident at your boost, worried on a turn at low HP, radiant at a win. A face only — the message is the copy. Colours pinned to the dark-surface tokens inside `.ds-screen` |
| **Trajes** | Profile → Mascote, `prefs.costume` (`COSTUMES`, `PERSONA_COSTUME`) | none (default) · the persona's (Professor / Explorador / Gamer / Elegante) · eight outfits. From 48 px up; a season's hat wins on its dates; the crown is never a costume (gold is earned) |

Rules, each from the market study (sources in the 2026-11-10 proposal):

- **The face is the readout** (Duolingo's widget, Notion AI's face): one mood
  per state. Use `md` (48 px) where the mood must read; a 20 px sticker says
  "a face in this colour", not which face.
- **He gestures, the app speaks** (Mailchimp's Freddie "does not talk"): the
  sentence is UI copy beside him, never first person.
- **One thing, closable, and silence is an answer** (Clippy had to be closed
  by hand; the Rotom Dex "would never shut up"): never a second note, never a
  note that changes its mind, nothing when there is nothing to say.
- **No guilt** (Duolingo's reminders, Forest's dead tree): the streak line
  states what the check-in keeps.
- **Do not judge early**: with one or two members every weakness is
  "team-wide" — the first capture said "Muitas fraquezas…" for a lone
  Bulbasaur, and then "Muitas fraquezas…" beside "94 Excelente". Both are tests now.

Declined on purpose: a mascot face as the toast's severity icon (the icon's
shape is what a colour-blind reader has), a floating always-on companion (the
JourneyCoach already holds that corner), mascot stickers as free-form forum
content (a new field, rules and moderation — its own change).

## Rules (from the creative direction and the design system)

- **One per screen.** The stage is held by the most recently mounted `stage`
  mascot; app reactions go only there.
- **Quiet in the middle, loud at the peak.** A celebration answers the
  trainer's own act (sixth member, a guided mission, a check-in). Never on
  data that loaded: opening the builder on a full team does not celebrate.
- **Gold only when earned** — crown, trophy, badge, streak flame, the shiny
  sparkle. Live Pink only for new things (the update's ribbon, a letter's dot).
- **The text carries the message.** The drawing is `aria-hidden`; a
  playground is focusable and labelled (`mascot.label`).
- **Motion:** loops are CSS, transform/opacity only (breathe, float, Zzz,
  thinking dots, sparkles, the loader scenes' ball, Shadow Ball, page, lens
  and eyes) and stop under reduced motion;
  everything else is a short JS one-shot. Under reduced motion every state
  still changes, without travel (`keyFrame`).
- **No raw colours.** The rig paints with `--m-*` (mapped from `--mascot-*`)
  or canon type colours; a tone is one inline `--m-line`.

## Budgets (measured 2026-11-06)

Entry JS 148.4 → 151.8 KB gz (+3.3: the icon markup, the component, the
store), CSS +1.4 KB, the engine chunk 17.4 KB gz off the boot path. The loader
scenes (measured against the commit before them): entry 151.8 → 152.2 KB gz
(+0.4, the Loader now draws the mascot), CSS +0.2 KB, engine 17.4 → 17.7 KB gz. In
exchange the boot splash no longer requests `logo-mark.webp` (7 KB), empty
states and the loader no longer fetch the Gengar sprite, and the precache
drops 50 KB (the 404 PNGs).

The assistant (measured 2026-11-10 against `main`): entry 159.49 → 161.05 KB gz
(+1.56: the note, the verdict, the sticker, the copy of one language), engine
17.86 KB gz.

## Media

`npm run mascot:export` (`scripts/export-mascot.mjs`) renders the rig frame by
frame in Chromium and encodes with ffmpeg: GIFs for e-mail/Discord (Outlook
for Windows shows only the first frame, so the first frame carries the
message), WebP 512 stickers with a die-cut edge (WhatsApp: ≤ 500 KB
animated), a WebM VP9 sticker for Telegram (≤ 256 KB, ≤ 3 s). It needs
`playwright` (or `playwright-core`) and `ffmpeg` on the machine; neither is a
project dependency. Output goes to `mascot-export/` (git-ignored).

## Tests

`rig.test.js` (outline pinned, every part/mood/pose/effect draws without NaN,
sanitising, tones), `motion.test.js` (springs, every sequence finite and ending
at rest, responses short, a key frame for reduced motion), `catalog.test.js`
(seasons incl. Carnaval from Easter, night, size ladder, the icon guard,
every loader scene names a real mood and pose and loops at rest),
`components/Loader.test.jsx` (scene for a region, the ball for a control or
on request, the label always there).

## Traps (found while building it)

- **The tone lives inside the markup** (`m-root`'s `style`), not on the
  `<svg>`: a sequence can then change it mid-play (the shiny easter egg did
  nothing while the tone sat on the wrapper).
- **A playground at rest may be asleep.** Its mode layers override the face,
  so the component pokes the controller when its props change — picking a
  mood in the Profile room wakes him (with the startle) before showing it.
- **The route fallback only shows on a direct load.** Client-side navigation
  keeps the old page while a lazy chunk downloads (a transition); to look at
  the loader, hold the chunk and load the URL.
- **`utils/mascot/*` import with explicit `.js`**: the export script and the
  icon generator run them in Node.
- **A loop inside the rig needs its own `<g>`.** A CSS `transform` replaces
  the element's `transform` attribute, so a looping part is wrapped
  (`atRest()` in rig.js) inside the group that positions it; a loop class on
  the positioned group itself would throw the part to the rig's origin.
- **A Suspense swap renders the new view before the fallback unmounts**, so
  the handoff counts scenes on screen (mount/unmount effects), not the last
  one that left.
- **`icon.js` is generated** (`npm run mascot:icon`); edit the rig, then
  regenerate — `catalog.test.js` says when.
