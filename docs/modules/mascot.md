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
| `src/utils/mascot/catalog.js` | The vocabulary: 29 `MOODS` (faces) and 27 `POSES` (paws + props), `sizeTraits(px)` (the size ladder), `seasonalHat(date)`, `isNight(date)`, `personaTone(id)`. |
| `src/utils/mascot/constants.js` | What the boot path needs without the rig: `TONES`, `VIEWS` (framings), `MASCOT_SIZES`. |
| `src/utils/mascot/icon.js` | **Generated** (`node scripts/build-mascot-icon.mjs`): the mascot at rest as static markup, drawn before the engine chunk lands and by the boot splash. `catalog.test.js` fails when it drifts from the rig. |
| `src/components/Mascot.jsx` | `<Mascot>`, `<MascotTip>` (same API as before: `size`, `cheer`), `<MascotIcon>` (splash, no engine). |
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
| Route fallback (AppLayout) | `capturando`: peeks over a Poké Ball that rocks three times (CSS) |
| Tips: PageGuide, Home welcome, JourneyCoach, Journeys lead, BadgeUnlock | xs icon · waves · jumps when a guided mission is done · crowned when all is done (still) · holds the badge |
| BuilderCoach | points (empty) → excited → determined → radiant; **celebrates only on the step to 6/6** |
| EmptyState (`mascot` prop) | `empty` peeks over the edge · `search` shrugs · `lost` (not-found pages) · `error` worries |
| 404 (NotFoundView) | 4, the mascot as the 0, 4 — the full playground |
| SessionTransition | waves and vanishes like a ghost |
| VersionUpdateModal | holds the new version, gift-wrapped (Live Pink: it is new) |
| Password fields | covers / peeks |
| Global search, no results | shrugs (shake once per query) |
| Daily check-in result | hops, or **evolves** on a level up (the games' white silhouette) |
| Profile → Aparência → Mascote | the playground, eight moods, the tone picker, the reactions switch |
| Toasts / connection | the stage mascot hops on success, says oops on error; offline/online toasts |

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
  thinking dots, sparkles, the loader's ball) and stop under reduced motion;
  everything else is a short JS one-shot. Under reduced motion every state
  still changes, without travel (`keyFrame`).
- **No raw colours.** The rig paints with `--m-*` (mapped from `--mascot-*`)
  or canon type colours; a tone is one inline `--m-line`.

## Budgets (measured 2026-11-06)

Entry JS 148.4 → 151.8 KB gz (+3.3: the icon markup, the component, the
store), CSS +1.4 KB, the engine chunk 17.4 KB gz off the boot path. In
exchange the boot splash no longer requests `logo-mark.webp` (7 KB), empty
states and the loader no longer fetch the Gengar sprite, and the precache
drops 50 KB (the 404 PNGs).

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
(seasons incl. Carnaval from Easter, night, size ladder, the icon guard).

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
- **`icon.js` is generated** (`npm run mascot:icon`); edit the rig, then
  regenerate — `catalog.test.js` says when.
