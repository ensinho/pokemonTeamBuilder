# Trainer profile & onboarding (2026-11-05)

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
| Desafiante (`challenger`) | minigames only | Mewtwo (silhouette until picked) | Jogos, Comunidade | PokéPuzzle |
| Mestre Pokémon (`master`) | all three | Gengar | Competitivo, PokéData, Jogos | PokéPuzzle |

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
