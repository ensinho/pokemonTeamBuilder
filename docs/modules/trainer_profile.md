# Trainer profile & onboarding (2026-11-05)

> **Creative direction (Enzo, 2026-11-05):** the trainer-profile onboarding's creativity — a scene that answers the user, Pokémon's own devices (evolution lines, silhouettes, type colours, artwork) as the UI language — is the standard from now on, "definitivamente". Read [creative_direction.md](./creative_direction.md) before designing any new screen.

A few questions the first time a trainer arrives (what brings you here — any
of **competitive**, **playing the games**, **minigames**; for the competitive,
how deep and which format), saved as the trainer's profile. The profile then
arranges the app: the order of the rail, the dock's fourth tab, the Home's
"Para você" picks, the journeys tagged "Para você", the Home's next step and
the builder's first regulation. The plan and the proposals still open are in
[plans/persona-onboarding.md](../plans/persona-onboarding.md).

## Pieces

| File | Role |
|---|---|
| `src/utils/trainerProfile.js` | **The source of truth.** Constants (`INTERESTS`, `COMPETITIVE_LEVELS`, `BATTLE_FORMATS`, `PERSONAS`), `normalizeTrainerProfile`, `mergeTrainerProfiles`, `needsTrainerProfile`, and every derivation: `derivePersona`, `personaPicks`, `personaNavOrder`/`sortNavGroups`, `personaDockSlot`, `recommendedJourneyIds`/`suggestedJourney`, `builderRegulationSeed`. Pure, tested in `trainerProfile.test.js`. |
| `src/store/useAuthStore.js` | `trainerProfile` + `setTrainerProfile(answers)`. localStorage `ptb:trainerProfile` + the preferences doc (`trainerProfile` field). Hydration merges by **the copy touched last wins, whole** (answers are a set — a union would invent a third). |
| `src/store/useOnboardingStore.js` | `isOpen` + `source` (`landing`, `auto`, `home`, `profile`) + `entry` (`welcome`, `redo`, `signIn`; null lets the journey pick). |
| `src/utils/firstJourney.js` | **The Primeira Jornada's rules** (2026-11-12): which screens for which answers and entry (`journeySteps`), progress, the tour, the mascot's look per screen, the persona's costume, the real XP figures. Pure, tested in `firstJourney.test.js`. |
| `src/components/onboarding/FirstJourney.jsx` + `src/styles/first-journey.css` | The journey: a full-screen lazy chunk, mounted by AppLayout while open (replaced the `TrainerOnboarding` dialog). |
| `public/onboarding/tour-*.webp` | The tour's four phone captures (Construtor, Pokédex, PokéPuzzle, Meta), ~20 KB each, **outside the precache** (`vite.config.js` globIgnores). Retake them when those screens change a lot: 390×844, dark, a fresh guest. |
| `HomeEntry.jsx` | Every way off the landing opens it (`landing`) — over wherever the CTA went; "Já tem conta? Entrar" opens it on the account screen (`entry: 'signIn'`). |
| `AppLayout.jsx` | Auto-offers it (`auto`) on Home only, once per session; sorts `navigationGroups`; picks the dock's fourth tab. |
| `CozyHomeView.jsx` | "Para você" panel (answered — `PersonaDoors`, the first pick the big door) or the setup card (not answered); the compact journey card follows `suggestedJourney`. "Rota do dia" orders its cards by `personaDayCards` through `routeOrder` (utils/dayRoute.js), the Champion after the battles and the persona's first card. |
| `JourneyList.jsx` | The "Para você" tag on recommended journeys. |
| `ProfileView.jsx` | Preferences → "Perfil de treinador": the persona, its tags, Configurar/Refazer. |

## The Primeira Jornada (2026-11-12)

Enzo approved the proposal (artifact "Primeira Jornada", built from a
reference video's three frames) with "QUE INCRÍVEL" and asked for it shipped.
The onboarding and the account became one conversation with the 3D mascot,
in the order the market uses (Duolingo): value first, the questions next, the
account last and optional.

| Screen | What happens | The mascot |
|---|---|---|
| `peek` | dark scene, a hint; 2.6 s or a tap | cut by the bottom edge, only the eyes out, following the pointer |
| `hello` | "Monte times Pokémon **sem pontos cegos.**", Começar, "Já tem conta? Entrar" | rises to the centre on the glide spring, waves |
| `tour` | four real screens as stories (a card turning in in 3D, a caption; auto every 3.2 s, taps on either half) | beside the caption, a pose per screen (clipboard, Pokédex, thinking, lens) |
| `interests` | the three interests as pills; picked = the reference's white pill with a check | each pick's Pokémon flies from the pill into orbit around him; his face per interest; the glow takes its type |
| `level` (competitive only) | the levels as Gible → Gabite → Garchomp, with the games' white silhouette and flash; the format | beside the action, confident at "Ranqueada" |
| `xp` | the glowing Electric bolt; the real rules (`XP_RULES`: a mission 40, a journey 120, a badge 80) and one mission filling level 1 | starry eyes under the bolt, a hop |
| `persona` | the card turns in; **the answers are saved here** (so leaving at the account keeps them) | the persona's costume (`PERSONA_COSTUME`), a celebration with confetti |
| `account` (guests only) | the Trainer Card filling live (name, persona, format), name · email · password; Entrar / Criar conta / Esqueceu a senha in place; "Continuar como convidado" | covers his eyes at the password (`coverable`), peeks when shown; shakes at an error |
| `done` | "Valeu, **Nome!**", the answers as white pills with checks, two picks, Bora! | jumps; the layer rises away and he shrinks toward the corner |

- **Entries:** `welcome` (first run), `redo` (a trainer with answers, from Home
  or Profile: interests → level → persona → done), `signIn` (account → done).
- **Skip** (Pular, Escape) records `skippedAt` only on a first run with no
  answers — the journey never comes back uninvited. Signing in never does.
- **The name** is `displayName`, kept at once and saved quietly
  (`savePreferences`; the preferences sync carries it if that save cannot
  happen yet) — `setDisplayName`'s error toast would land mid-celebration.
- **The account** is `useAuthStore.handleSignUp` (a guest is upgraded in
  place — `linkWithCredential`, the uid and everything under it stay),
  `handleSignIn`, `sendPasswordReset`; errors through `prettifyAuthError`.
  Elsewhere in the app `promptSignIn` still opens the `AuthModal`.
- **The scene is dark in every theme:** `.fj` redefines the colour tokens from
  the brand layer (`--mascot-white`, `--brand-ink`, `--brand-black`), like
  `.ds-screen` keeps its own room; the theme's primary stays the accent.
- **Motion:** one shared element — the mascot travels to each screen's
  `[data-slot]` (WAAPI, `--ease-glide`, 720 ms) while the screen leaves up
  (200 ms) and the next arrives in a 70 ms cascade, the headline word by word
  out of a mask (`.fj-w`). Reduced motion: every state changes, nothing travels.

## Personas

| Persona | From | Art | Rail first | Dock 4th tab |
|---|---|---|---|---|
| Estrategista (`strategist`) | competitive first | Garchomp | Competitivo | Meta (unless minigames too) |
| Viajante (`traveler`) | franchise first | Pikachu | PokéData | Tabela de tipos (unless minigames too) |
| Desafiante (`challenger`) | minigames only | Mewtwo (silhouette until picked) | Jogos, Comunidade | Challenge (the Champion; PokéPuzzle in Mais since 2026-11-09) |
| Mestre Pokémon (`master`) | all three | Gengar | Competitivo, PokéData, Jogos | Challenge |

Priority is competitive → franchise → minigames; the others ride along as
tags and still get a pick in the first row of "Para você".

## Invariants

- **It offers itself once and never comes back uninvited.** Closing it any way
  but finishing records `skippedAt` (only when there were no answers — a redo
  that is closed keeps the old ones). Home's setup card and Profile reopen it.
- **Never over content someone came to read.** Auto-offer is Home only, not
  over the landing, the patch notes, or for a crawler (`isCrawler`). A
  headless test needs a normal user agent to see it.
- **The builder seed only fills a blank.** `tb-regulation` is written only if
  the builder has none stored: `none` (playthrough) for games-only, `gen9ou`
  for singles; doubles/both keep the default VGC.
- **No profile = the app as shipped.** Every derivation returns the default
  order/slot/journey for an empty profile; tests pin that.
- New copy goes under `onboarding.*` in both language files; a new pick needs
  `PICK_DESTINATIONS`, an icon in `CozyHomeView`'s `PICK_ICONS` and
  `onboarding.picks.<key>`.
- The privacy page lists the answers (`sitePages.js`, 2026-11-05); the funnel
  has `onboarding_complete` / `onboarding_skip` (analytics.md).

## The trainer card (2026-11-05)

What other trainers see of you: `components/trainerCard/TrainerCardDialog.jsx`
(lazy, mounted by AppLayout while `useTrainerCardStore.profile` is set — call
`openTrainerCard(profile, extras)`; the forum passes the teams shared in the
open thread). Opened from forum authors and the friends list.

- **Banner:** the trainer's uid drawn as pixels (`utils/trainerCardPattern.js`,
  seeded, tested) in the persona's type colour (`--tc-tone`), gold accent
  pixels, the partner's artwork standing in it.
- **Bio:** the persona and a third-person line (`trainerCard.bio.*`).
- **Numbers:** streak (`liveStreak` judges whether the stored one is still
  alive), level, wins — "bold figure + muted word", only those that exist.
- **Since:** the month the account was made.
- **Data:** `syncPublicProfile` publishes `streak`, `persona`, `memberSince`
  to `publicProfiles` (rules: `firestore.rules` `validPublicProfile`), and
  steps down to the older shapes if the deployed rules refuse them. It runs
  on profile changes, on finishing the onboarding and once per check-in.
  Your own card reads the live stores instead.

## Round 3 (2026-11-05)

- **Home order:** `personaHomeOrder(profile)` — Desafiante: Seu dia → Para
  você → times; Estrategista: times → Para você → Seu dia; Viajante: Para
  você → times → Seu dia; anyone else keeps `DEFAULT_HOME_ORDER`. Phones
  carry no teams block (the party row stands for it), so only the first two
  swap there.
- **Home hero (2026-11-09):** `personaHero(profile)` — the Desafiante's hero is
  the day's Champion battle, the Viajante's the next gym leader of the game
  they play (`components/home/BadgeHero.jsx`, lazy, with the case's progress
  in its bar; the Badge Case below stays where badges are tapped), everyone
  else's the team in progress (`HOME_HEROES`). The rail of the day's cards
  leaves the Champion out when she is the hero.
  The greeting's question is the persona's (`homeToday.ask.<persona>`).
- **Builder:** `isBeginnerTrainer` shows `BuilderCoach` (the mascot's next
  step by team size: empty / start / grow / full; closing it is for good,
  `ptb:builderCoachDismissed`). `isRankedTrainer` opens the analysis card on
  the meta threats and shows the meta's usage % on every picker card
  (desktop `PokemonCard`, phone `MobilePokemonPickerCard`), never in
  playthrough.
- **The trainer card also opens** from the Champion ranking's detail
  ("Cartão de treinador" — `publicRanks` now sends the uid of entries with a
  public profile, never a guest's), from battle opponents (the id-card button)
  and from the author's avatar on Home's community posts.

## Round 4 (2026-11-05)

- **Persona journeys** (`utils/journeys.js` `PERSONA_JOURNEYS`,
  `evaluatePersonaJourneys`, `personaJourneyFilter`): Sala de estratégia,
  Rumo ao próximo ginásio, Desafio diário — four missions each, a diamond
  badge each (`badge_persona_*`, `constants/badges.jsx`). They sit after the
  six levels under their own heading (the Master sees all three) and never
  change the current level, the level count or the Home's journey card.
  `useTrainerBadges` evaluates both lists; badges and XP read both; the
  floating coach guides their missions. New marks: page visits (bestTeams,
  tournaments, gyms, types, moves) and `threatsViewed` / `playthroughTeam`
  (the builder records them).
- **⌘K quick links:** `personaQuickLinks(destinations, profile)` — the
  persona's picks first with an empty query.
- **Badge Case** (`components/home/BadgeCase.jsx`, lazy; `utils/badgeCase.js`):
  the Traveler's Home leads with the eight gym leaders of the game they are
  playing — silhouettes until the trainer taps the badge they won in their
  game, the next leader called out, a gold rim when the case is full. Stored
  as `badgeCase` (localStorage `ptb:badgeCase` + the preferences doc, the copy
  touched last wins; privacy page updated).
- **Notification defaults:** left as they are on purpose. The daily nudges
  are already on for everyone (the Challenger case); turning them off for the
  other personas would silence people who never asked for less.
