# Pokémon Team Builder — Agent Knowledge Base

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
| [Wounds Log](./wounds.md) | Before any non-trivial work — anti-pattern registry |
| [Agent Directives](./agent_directives.md) | Failure recovery protocol and learned constraints |
| [Handoff: Friends & battles](./plans/HANDOFF-friends-and-battles.md) | **Start here** for this feature — status, blockers, traps, next steps |
| [How friends & battles work](./plans/ARCHITECTURE-friends-and-battles.md) | The running system — data flow, turn loop, security model, invariants |
| [Plan: Friends & async battles](./plans/friends-and-async-battles.md) | The decisions and the measured research behind them, phase by phase |

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
All routes are defined in `AppLayout.jsx`. The router is `BrowserRouter` (real paths, `basename` from `BASE_URL`; legacy `#/` links are rewritten in `main.jsx`). Do not create new `<Route>` entries anywhere else.

### 6. Data Access
Never call the PokéAPI directly from a component. Always go through `src/services/pokemonDataCache.js`. Never query Firestore for the Pokémon list — it comes from `public/data/pokemon-index.json`.

### 7. i18n
All user-facing copy lives in `src/constants/translations.js`. Never hardcode UI strings in JSX.

### 8. State
All app state lives in Zustand stores (`src/store/`), not React Context. Prefer the thin hook wrappers in `src/hooks/` over accessing stores directly in components.
