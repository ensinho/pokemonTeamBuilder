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
| `src/store/useOnboardingStore.js` | `isOpen` + `source` (`landing`, `auto`, `home`, `profile`). |
| `src/components/onboarding/TrainerOnboarding.jsx` + `src/styles/onboarding.css` | The dialog: a lazy chunk, mounted by AppLayout while open. |
| `HomeEntry.jsx` | Every way off the landing opens it (`landing`) — over wherever the CTA went. |
| `AppLayout.jsx` | Auto-offers it (`auto`) on Home only, once per session; sorts `navigationGroups`; picks the dock's fourth tab. |
| `CozyHomeView.jsx` | "Para você" panel (answered) or the setup card (not answered); the compact journey card follows `suggestedJourney`. |
| `JourneyList.jsx` | The "Para você" tag on recommended journeys. |
| `ProfileView.jsx` | Preferences → "Perfil de treinador": the persona, its tags, Configurar/Refazer. |

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
