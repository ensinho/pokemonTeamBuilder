# PokeBuilder — Agent Knowledge Base

> **For all AI agents:** Read this document before making architectural changes, modifying UI components, or adding features. This is the entry map. For build commands and high-level architecture, read `CLAUDE.md` at the repo root first.

---

## Module Map

| Module | When to Read |
|--------|-------------|
| [Views & Routing](./modules/views_and_routing.md) | Adding routes, modifying views, wiring modals |
| [Styles & Aesthetics](./modules/styles_and_aesthetics.md) | Any UI/visual change — **read first without exception** |
| [Components](./modules/components.md) | Modifying or creating shared UI components |
| [Firebase Architecture](./modules/firebase_architecture.md) | Auth, Firestore reads/writes, data model changes |
| [Firebase Security](./modules/firebase_security.md) | Adding a new Firestore path, admin logic, auth rules |
| [State & Stores](./modules/state_and_stores.md) | Adding/modifying Zustand stores or hooks |
| [Data Layer](./modules/data_layer.md) | Pokémon data, cache strategy, PokéAPI integration |
| [Analytics & share loop](./modules/analytics.md) | `track()` and the funnel's event names, why analytics is off the boot path, the shared-team page `/t/:id` and its generated preview image (`api/og.js`) |
| [SEO & landing](./modules/seo_and_landing.md) | Titles/descriptions, the `/pt` language prefix and `LocaleRouter`, hreflang, JSON-LD, the prerendered body, the sitemap, the type chart and the first-visit landing |
| [Notifications](./modules/notifications.md) | Toasts, OS banners, Web Push, the daily nudge |
| [Forum](./modules/forum.md) | The /feed forum: three-pane workspace, Hot/New/Top ranking, comment tree, topic likes, sharing and link previews |
| [Journeys](./modules/journeys.md) | Onboarding missions, journey badges, the mission guide, the Home's journey card |
| [Rewards](./modules/rewards.md) | Trainer Level (computed XP), the daily check-in + streak shields, cosmetics (frames, titles, reward themes) and where they show |
| [Friend battles](./modules/friend_battles.md) | PvP as built (2026-10-20): challenge-with-team → one-tap accept, `secret/state` + claimed rounds (no polling), the device log cache, the console screen, VS card, music |
| [Champion Challenge](./modules/daily_challenge.md) | The daily battle vs the Cynthia AI as built: endpoint, engine, AI, the DS-console client, Home card, invariants, traps, calibration |
| [Wounds Log](./wounds.md) | Before any non-trivial work — anti-pattern registry |
| [UX audit 2026-10-20](./audits/2026-10-20-battles-forum.md) | Battles (Mega Evolution, the HUD, the anime flare) and the forum on a phone: findings by category, what changed, what is still open |
| [UI audit 2026-10-22](./audits/2026-10-22-profile-journeys-landing.md) | Profile, Journeys/Rewards and the landing at 1440 and 390: findings by category, before → after figures, and a site-wide sweep (nested boxes, small touch targets, overflow) with what is still open |
| [Agent Directives](./agent_directives.md) | Failure recovery protocol and learned constraints |
| [Handoff: Friends & battles](./plans/HANDOFF-friends-and-battles.md) | History of the feature's build (2026-07) — status, traps. **The current flow and server state are in [Friend battles](./modules/friend_battles.md)** |
| [How friends & battles work](./plans/ARCHITECTURE-friends-and-battles.md) | The running system — data flow, turn loop, security model, invariants |
| [Plan: Friends & async battles](./plans/friends-and-async-battles.md) | The decisions and the measured research behind them, phase by phase |
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
All user-facing copy lives in `src/constants/translations.js`. Never hardcode UI strings in JSX.

### 8. State
All app state lives in Zustand stores (`src/store/`), not React Context. Prefer the thin hook wrappers in `src/hooks/` over accessing stores directly in components.
