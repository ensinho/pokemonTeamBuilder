# Brand intro — the name that paints itself (2026-11-22)

> **Enzo, 2026-11-22**, on the proposal ("Ta tudo fenomenal"): *pincel oficial*
> on the logo, the ghost as the iris, the night scene, the name PokemonBuilder,
> the official mascot in the onboarding. This is the boot splash and the
> opening of the Primeira Jornada.

## What it is

A reference loop (a VTuber's logo sting, 60 fps, 2.43 s) was studied frame by
frame and rebuilt in the brand's material — mechanics kept, material swapped:

| Reference | Here |
|---|---|
| Letters popping in | The official brush wordmark (`public/logo-wordmark.svg`) painted on by a slanted brush stroke, landing on a spring (squash and stretch) |
| A cloud-shaped iris | The mascot's own outline (`GHOST_PATH`, equal to the rig's `headPath()` — a test keeps them equal) |
| The ground closing in around the logo | The night (`--intro-ground`) appears from the edges as a page-coloured ghost shrinks behind the name |
| Clouds in the corners | The splash's two corner ghosts (`MascotIcon`) in Volt, with a magenta rim offset toward the middle |
| Stars, hearts, rings | The rig's sparkle and heart, rings, crosses, a diamond, a Poké Ball (`INTRO_DECOR`) |
| The orbiting arc | A magenta arc and a Volt trail that draw on, go round and erase (`orbitFrames`) |
| The "Live" tag | The pill `splash.intro` ("Monte · analise · jogue") |
| The exit into a dot | The ground closes onto the name through the ghost, then everything winds up and shrinks to a point, revealing the app |

## Files

- `src/utils/brandIntro.js` — pure: the timeline (`INTRO`, `INTRO_LEGIBLE_MS`,
  `INTRO_FULL_MS`), the springs, every piece as sampled keyframes, the iris
  geometry (`coverScale`, `wrapScale`, `ghostFrame`, `dockMove`). Tested.
- `src/components/brand/BrandIntro.jsx` — the scene. `variant="splash"` covers
  the screen; `variant="journey"` docks the name into `dockRef` and stays as the
  hello screen's ground. `leaving` plays the exit, then `onLeft`.
- `src/styles/brand-intro.css` — layers and the CSS loops at rest. The night's
  tokens are `--intro-*` in `index.css`'s brand layer (theme-independent, like
  the receipt).
- `src/utils/bootSplash.js` — `introMinVisibleMs(seen)`, `BRAND_INTRO_SEEN_KEY`.

## Rules

- **Never hold the app for the show.** A boot ready before `SPLASH_REVEAL_MS`
  (300 ms) shows nothing. A seen splash stays until the name is legible
  (`INTRO_LEGIBLE_MS`, 450 ms); only the first intro on a device plays whole
  (`INTRO_FULL_MS`, 1150 ms), recorded in `ptb:brandIntroSeen` (a `DEVICE_KEYS`
  entry). The mobile ceiling still wins.
- **Compositor only.** Keyframes are sampled once on mount and played with the
  Web Animations API: transform, opacity, clip-path and the orbit's dashes.
  No JavaScript per frame — the splash runs while the app's chunks parse, and
  the exit runs while the app mounts underneath. The iris is a scaled shape,
  never an animated mask: the entrance shrinks a page-coloured ghost (the
  hole), the exit shrinks the night's own ghost-shaped plate.
- **One intro, kept alive across the switch.** `AppLayout` renders the intro
  and the app as keyed children of one fragment, so the intro is not remounted
  when the app appears under its exit.
- **Reduced motion:** the resting scene fades in (220 ms) and fades out; no
  springs, no orbit, no loops.
- **No gold** (nothing here was earned) and the wordmark is never redrawn or
  sliced: the official vector is the protagonist.

## The Primeira Jornada's hello

`journeySteps` opens the welcome flow with `hello` (outside the step count,
no chrome). The name docks into `.fj__mark` in the bar, then the official 3D
bot climbs into his slot (`climbFrames` on `.fj__bot-in`) and waves, and his
speech bubble ("Oi! Eu sou o Fantasminha.") and "Começar a jornada" arrive.
Starting goes to `play` without pushing `hello` to the history (going back
would replay the intro), and the scene leaves through the ghost.

## The session's goodbye and the arrival (2026-11-22)

`SessionTransition` is `<BrandIntro variant="session">`: the night closes in
around the mascot waving (then vanishing) and the goodbye line, while
`leaveSession` does its work. The reload that follows starts AppLayout with
`arrival` (read from `LEFT_SESSION_KEY` before `initAuth` removes it): the
splash opens on the same night already at rest — no entrance — and leaves
through the ghost as soon as boot allows (no legibility floor). See
[living_moments.md](./living_moments.md).
