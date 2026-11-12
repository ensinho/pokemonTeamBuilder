# PokemonBuilder — Agent Knowledge Base

> **Creative direction (Enzo, 2026-11-05):** the trainer-profile onboarding's creativity — a scene that answers the user, Pokémon's own devices (evolution lines, silhouettes, type colours, artwork) as the UI language — is the standard from now on, "definitivamente". Read [creative_direction.md](./modules/creative_direction.md) before designing any new screen.

> **Phone screens (Enzo, 2026-11-09):** the market's app grammar — greeting, week strip, one hero with a player bar, rails, label-on-active dock, splash, welcome, filled sign-in — lives in the [`/app-screens` skill](../.claude/skills/app-screens/SKILL.md). Read it before restructuring any phone screen.

> **For all AI agents:** Read this document before making architectural changes, modifying UI components, or adding features. This is the entry map. For build commands and high-level architecture, read `CLAUDE.md` at the repo root first.

---

## Module Map

| Module | When to Read |
|--------|-------------|
| [Views & Routing](./modules/views_and_routing.md) | Adding routes, modifying views, wiring modals |
| [Styles & Aesthetics](./modules/styles_and_aesthetics.md) | Any UI/visual change — **read first without exception** |
| [Creative direction](./modules/creative_direction.md) | **Before designing any new screen, flow or component** — the "living scenes" standard Enzo set on 2026-11-05, the franchise devices, what is built that way, and the inspiration bank (reference 5's patterns mapped to places here) |
| [Components](./modules/components.md) | Modifying or creating shared UI components |
| [Firebase Architecture](./modules/firebase_architecture.md) | Auth, Firestore reads/writes, data model changes |
| [Firebase Security](./modules/firebase_security.md) | Adding a new Firestore path, admin logic, auth rules |
| [State & Stores](./modules/state_and_stores.md) | Adding/modifying Zustand stores or hooks |
| [Data Layer](./modules/data_layer.md) | Pokémon data, cache strategy, PokéAPI integration |
| [Asset Mirror](./modules/asset_mirror.md) | Sprite hosts, the Cloud Storage copy, `npm run assets:mirror` |
| [Analytics & share loop](./modules/analytics.md) | `track()` and the funnel's event names, why analytics is off the boot path, the shared-team page `/t/:id` and its generated preview image (`api/og.js`) |
| [SEO & landing](./modules/seo_and_landing.md) | Titles/descriptions, the `/pt` language prefix and `LocaleRouter`, hreflang, JSON-LD, the prerendered body, the sitemap, the type chart and the first-visit landing |
| [Notifications](./modules/notifications.md) | Toasts, OS banners, Web Push, the daily nudge |
| [Forum](./modules/forum.md) | The /feed forum: three-pane workspace, Recentes/Em alta/Top feed cut by day, the explorer/drawer map, comment tree, topic likes, sharing and link previews |
| [Mascot](./modules/mascot.md) | The live mascot (2026-11-06): the traced rig, moods and poses by name, motion as `pose(t)`, the lazy engine chunk, the interactive controller, where it appears, its rules (one per screen, celebrate only the trainer's own act, gold only when earned) and `npm run mascot:export` |
| [Journeys](./modules/journeys.md) | Onboarding missions, journey badges, the mission guide, the Home's journey card |
| [Trainer profile & onboarding](./modules/trainer_profile.md) | The first-visit questions (competitive / games / minigames, level, format), the personas, and what they arrange: rail order, dock tab, Home "Para você", journey tags, the builder's first regulation; the trainer card other trainers see |
| [Rewards](./modules/rewards.md) | Trainer Level (computed XP), the daily check-in + streak shields, cosmetics (frames, titles, reward themes) and where they show |
| [Friend battles](./modules/friend_battles.md) | PvP as built (2026-10-20): challenge-with-team → one-tap accept, `secret/state` + claimed rounds (no polling), the device log cache, the console screen, VS card, music |
| [Champion Challenge](./modules/daily_challenge.md) | The daily battle vs the Cynthia AI as built: endpoint, engine, AI, the DS-console client, Home card, invariants, traps, calibration |
| [Social media](./modules/social_media.md) | Before making a reel or post for `@pokemonbuilder_`: the 2026-11-11 Shorts research (what beats its own channel), the three formats we post, **the reel standard (the mascot hosts every video, each reel has its own score, the edit is cut to the bars)** and how to render the next one |
| [Wounds Log](./wounds.md) | Before any non-trivial work — anti-pattern registry |
| [UX audit 2026-10-20](./audits/2026-10-20-battles-forum.md) | Battles (Mega Evolution, the HUD, the anime flare) and the forum on a phone: findings by category, what changed, what is still open |
| [UI audit 2026-10-22](./audits/2026-10-22-profile-journeys-landing.md) | Profile, Journeys/Rewards and the landing at 1440 and 390: findings by category, before → after figures, and a site-wide sweep (nested boxes, small touch targets, overflow) with what is still open |
| [Agent Directives](./agent_directives.md) | Failure recovery protocol and learned constraints |
| [Handoff: Friends & battles](./plans/HANDOFF-friends-and-battles.md) | History of the feature's build (2026-07) — status, traps. **The current flow and server state are in [Friend battles](./modules/friend_battles.md)** |
| [How friends & battles work](./plans/ARCHITECTURE-friends-and-battles.md) | The running system — data flow, turn loop, security model, invariants |
| [Plan: Friends & async battles](./plans/friends-and-async-battles.md) | The decisions and the measured research behind them, phase by phase |
| [The social heart](./modules/social_heart.md) | **Built 2026-11-06**: Diário do dia, reactions, Pokégear, mentions, Sua liga, weekly season, puzzle day, quiz duel, weekly tournament, Q&A, team verdicts, chapter 2 journeys — pieces and invariants |
| [Plan: The social heart](./plans/social-heart.md) | 2026-11-06 proposals (all three phases built — see the module): forum as the Centro Pokémon (Diário do dia, battle-text reactions, Pokégear inbox, mentions, weekly tournament), the Champion Challenge social (friends board, replays, seasons, XP), social minigames (puzzle distribution, quiz duel by link), persona journeys chapter 2 |
| [Plan: Battle gimmicks](./plans/battle-gimmicks.md) | 2026-11-09, not built: what `@pkmn/sim` allows in our Gen 9 battles — Tera (switched off by `Terastal Clause`, phase 1), Z-Moves (work with a held crystal, phase 2), Dynamax (Gen 8 only, a separate mode) — and Enzo's open decisions |
| [Plan: Persona onboarding](./plans/persona-onboarding.md) | The 2026-11-05 onboarding + personalisation + UI/UX pass (shadows, grouped settings): built vs open proposals, skills to add |
| [Plan: Daily champion challenge](./plans/daily-champion-challenge.md) | Daily single-player battle vs a Cynthia AI — product plan and decisions (§14). F1 (server + AI) built 2026-10-14 |
| [Spec: Daily champion challenge](./plans/daily-champion-challenge-tech.md) | Files, API contract, Firestore model and rules, client store and state machine, tests and per-phase tasks |
| [Spec: Cynthia battle AI](./plans/daily-champion-challenge-ai.md) | AI module layout, fairness (fog), evaluators, lookahead, difficulty profiles, self-play calibration |
| [Spec: Challenge prediction models](./plans/daily-champion-challenge-ml.md) | Logistic regression: win chance, player-move prediction, difficulty calibration; anonymous training data |

---

## Core Rules (Non-Negotiable)

### 1. Colors
Never push raw hex values into JSX. Use the `colors` object from `src/constants/theme.js` or CSS variables (`var(--color-*)`) defined in `src/index.css`. New color tokens must be added in all three places: `theme.js` (value), `applyTheme` (injection), and `index.css` (CSS variable declaration per theme).

### 2. Theming
Six themes exist: `dark` (default), `eclipse`, `midnight`, `daybreak`, `light`, `solar`. All are defined in `THEME_META` in `src/constants/theme.js`. Test visual changes against at least two themes — dark and light.

### 3. Icons
Prefer existing SVG components from `src/components/icons.jsx`. `lucide-react` is also used across views — match the convention of the file you are editing. Do not introduce a third icon source.

### 4. Styling Approach
- **Layout and spacing:** Tailwind utility classes.
- **Component-level styles:** Dedicated CSS files in `src/styles/`.
- **Dynamic values only:** Inline `style={{}}` is reserved for injecting runtime theme colors — not for layout or spacing.

### 5. Routing
All routes are defined in `AppLayout.jsx`. The router is `LocaleRouter` (real paths; the basename is `BASE_URL` plus the language prefix — English at the root, Portuguese under `/pt` — so routes never mention the language; legacy `#/` links are rewritten in `main.jsx`). See [SEO & landing](./modules/seo_and_landing.md). Do not create new `<Route>` entries anywhere else.

### 6. Data Access
Never call the PokéAPI directly from a component. Always go through `src/services/pokemonDataCache.js`. Never query Firestore for the Pokémon list — it comes from `public/data/pokemon-index.json`.

### 7. i18n
All user-facing copy lives in `src/constants/translations/en.js` and `pt.js` (one chunk per language, loaded by `src/i18n/catalog.js`). Never hardcode UI strings in JSX, and never import the tables statically from browser code.

### 8. State
All app state lives in Zustand stores (`src/store/`), not React Context. Prefer the thin hook wrappers in `src/hooks/` over accessing stores directly in components.
