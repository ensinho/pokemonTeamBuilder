# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A Pokémon team-building web app (live at https://pokemonbuilder.app). Pure client-side React SPA (Vite) backed by Firebase (Auth + Firestore) for persistence, plus a single Vercel serverless function for admin email replies. Data comes from PokéAPI, fronted by a pre-baked static cache.

## Commands

```bash
npm run dev            # Vite dev server (localhost:5173)
npm run build          # production build to dist/
npm run preview        # serve the production build (localhost:4173)
npm run lint           # eslint . --max-warnings 0  (zero-warning gate)
npm test               # vitest run (unit tests for src/utils/*)
npm run test:watch     # vitest in watch mode
npm run deploy         # build + publish dist/ to GitHub Pages (gh-pages branch)

# Rebuild the static PokéAPI cache in public/data/ (see "Data layer")
npm run data:cache                 # index, reference data, manifest
npm run data:cache:details         # also fetch full details for ids 1-151
node scripts/build-pokemon-cache.mjs --all-details   # all 1025
```

Quality gates: `lint` (zero warnings) plus `npm test` (Vitest). Tests cover the pure domain logic in `src/utils/` (`teamAnalysis`, `showdownExport`) and the serverless battle code in `api/` — colocated as `*.test.js` throughout. Add tests for new pure utils there; keep heavy domain math out of stores so it stays testable. `api/battle-turn.test.js` is the exception to "pure only": it drives the real HTTP handler against an in-memory Firestore stub, because the bugs that actually bite there live in the handshake between the endpoint and the simulator, not in either one alone.

## Deploy targets (dual)

The app deploys to **two** places, and `vite.config.js` `base` adapts automatically:
- **GitHub Pages** (`npm run deploy`) → base path `/pokemonTeamBuilder/`.
- **Vercel** (the live domain) → base `/`, set via the `VERCEL` env var.

Override with `VITE_BASE_PATH` if needed. The `/api/*` serverless function (`api/send-admin-reply.js`) only runs on Vercel.

Routing uses **`BrowserRouter`** (`src/main.jsx`) with `basename` from `import.meta.env.BASE_URL`; real paths are what search engines index. Legacy `#/...` links are rewritten to their path equivalent before the router mounts, so old bookmarks still work. **The `vercel.json` rewrite is load-bearing** — every non-`/api` request goes to `api/render-meta.js`, which serves the SPA shell with per-route OG tags. Removing it breaks deep links and social previews. (It changed from HashRouter on 2026-07-01; the docs said otherwise until 2026-09-04.)

## Architecture

### State: Zustand stores (`src/store/`)
All app state lives in Zustand stores, **not** React Context. Stores are the source of truth and often call each other (`useAuthStore` reads `useThemeStore`/`useLanguageStore`/`useToastStore`). Key stores:
- `useAuthStore` — Firebase auth lifecycle (anonymous → email link upgrade), trainer streak, greeting Pokémon, profile hydration. `initAuth()`/`cleanupAuth()` are wired in `App.jsx`.
- `useFirestoreTeamsStore` — real-time `onSnapshot` listeners for saved teams + favorites; tracks the `activeTeamId` (mirrored to localStorage as `ptbActiveTeamId`).
- `useActiveTeamStore` — the team currently being edited **and the type-coverage engine** (see below).
- `useReferenceStore` — generations/items/natures, fetched once on boot.
- `usePokedexStore`, `useQuizRunsStore`, `useForumStore`, `useLanguageStore`, `useThemeStore`, `useToastStore`.

Several stores have thin hook wrappers in `src/hooks/` (e.g. `useActiveTeam`, `useFirestoreTeams`, `useQuizRuns`) — prefer these in components.

### Type-coverage engine
The core domain logic. `src/constants/types.js` holds `typeChart` (per-type `damageTaken`/`damageDealt` multipliers, the full Gen-6+ chart) plus `typeColors` and `typeIcons` (imported PNGs). The pure engine lives in **`src/utils/teamAnalysis.js`** (`analyzeTeam(team, pokemonsList)` multiplies per-Pokémon `damageTaken` across types to derive weaknesses/resistances and suggest fillers) and **`src/utils/showdownExport.js`** (`buildShowdownExportText`). `useActiveTeamStore` keeps thin wrappers (`recalculateAnalysis`, `buildShowdownExportText`) that delegate to these utils — call the store methods from components, edit the math in the utils (both have `*.test.js`).

### Routing & layout
`App.jsx` is a thin shell. **`src/components/AppLayout.jsx` is the real entry point** — it owns the sidebar, all modals, and the `<Routes>` (`/`, `/builder`, `/pokedex`, `/favorites`, `/quiz`, `/pokepuzzle`, `/teams`, `/generator`, `/profile`, `/feed`, `/admin`). It's large and central; expect most cross-cutting wiring to pass through it. Views live in `src/components/views/`, modals in `src/components/modals/` (both barrel-exported via `index.js`).

### Data layer (`src/services/pokemonDataCache.js`)
Three-tier cache for PokéAPI data, all funneled through `fetchJsonCached`:
1. In-memory `Map` (per session).
2. `localStorage`/`sessionStorage` with TTL + a versioned `ptb:pokemon-data:${CACHE_VERSION}:` key prefix (reference data → local/30d, volatile → session/24h). **Bump `CACHE_VERSION` in `pokemonDataCache.js` whenever the shape of any cached file changes** — otherwise long-TTL users get a broken UI from a stale-format cache after deploy (a one-time sweep purges old versions).
3. Network — **static pre-baked JSON in `public/data/` is preferred over live PokéAPI**. A `cache-manifest.json` declares which static files exist; `getStaticPokemonDetail` consults it before falling back to PokéAPI. `scripts/build-pokemon-cache.mjs` generates all of `public/data/` (index, generations, items, natures, moves, per-id details, manifest).

**The Pokédex/Team Builder list loads from `pokemon-index.json`** (1025 entries with `id`, `name`, `types`, `generation`; sprites derived from id via `pokemonSprites.js`) — loaded once, then filtered/searched/paginated **client-side** in `usePokedexStore`. It does **not** query Firestore for the list (that was a perf wound — see `docs/wounds.md`). The detail panel still lazy-loads the full doc from the Firestore `pokemons` collection (or static detail / PokéAPI) on click.

When changing how Pokémon data is fetched, work through this service — never `fetch` PokéAPI directly from components. If you add new static data, regenerate the manifest via the `data:cache` scripts.

### Firestore data model
All documents are namespaced under `artifacts/${appId}/` (`appId` from `VITE_APP_ID`, default `pokemonTeamBuilder`):
- `users/{userId}/teams`, `users/{userId}/quizRuns` — per-user private data.
- `public/data/teams`, `public/data/forumTopics/{topicId}/messages` — shared/forum content.

### i18n
Custom, no library. All copy lives in `src/constants/translations.js`; `useLanguageStore` holds the active language and `useTranslation()` (`src/hooks/`) resolves keys. Add new user-facing strings there, not inline.

### Serverless email (`api/send-admin-reply.js`)
Vercel function that lets admins reply to feedback. Verifies the caller's Firebase ID token via `jose` against Google's JWKS, checks the email against the admin allowlist, then sends mail with `nodemailer`. Has its own CORS allowlist and Firebase project-id resolution independent of the client config.

### Serverless battle resolver (`api/battle-turn.js`)
The authority on async battles — `@pkmn/sim` runs here and never ships to the browser. Every call replays the battle from its stored seed + choice history, so only those two things are persisted. Shared helpers live in `api/lib/`: `serverAuth.js` (token verification, admin Firestore), `battleResolver.js` (the sim), `battleNotify.js`/`mailer.js` (turn nudges), `runtimeGuards.js`.

Three rules this code exists to enforce, all learned the hard way (`docs/wounds.md`, 2026-07-27):
- **Never assume a round needs both players.** The sim prompts one side alone after a faint; who owes a move comes from `awaitingChoiceFrom` on the battle doc, via `sidesOwingChoice()`.
- **Never leave a promise unawaited in `api/`.** An unhandled rejection kills the function process, and Vercel reports that as an opaque `FUNCTION_INVOCATION_FAILED` 500 that no `catch` in this code can turn into a useful message. `runtimeGuards.js` is the net; awaiting properly is the fix.
- **Keep `battle-turn.js`'s static imports to builtins and dependency-free local modules.** A top-level import runs during the platform's init phase, where nothing can catch it. `firebase-admin`, `@pkmn/sim` and friends load via the memoised `loadDeps()` inside the handler, so a failure returns JSON naming the module instead of killing the process. `api/battle-turn.deps.test.js` fails if that's undone.

**Dependency trap:** Vercel's function loader does **not** support `require(esm)`, but local Node ≥22.12 does — so a CommonJS package requiring an ESM-only one loads fine here and kills the function there (`ERR_REQUIRE_ESM`, exit 1, no stack). This is why `package.json` has an `overrides` entry pinning `jwks-rsa`'s `jose` to v5. Before adding or upgrading anything under `api/`, check it with `node --no-experimental-require-module -e "require('<pkg>')"`; `api/lib/dependencies.test.js` automates that for the known-fragile paths.

Two unauthenticated probes, in order, when battles misbehave in production:
- `GET /api/battle-turn?ping=1` — answers before loading anything. JSON means the function starts at all; another `FUNCTION_INVOCATION_FAILED` means the fault is the deployment or platform config, not this code.
- `GET /api/battle-turn` — full self-check: dependency load, credentials (shape only, never contents), a Firestore round-trip, and a real two-Pokémon sim run.

## Config & environment

- All client config is via `VITE_*` env vars read in `src/constants/firebase.js` (Firebase config, `VITE_APP_ID`, `VITE_POKEAPI_BASE_URL`, `VITE_ADMIN_EMAILS`, `VITE_ADMIN_EMAIL_ENDPOINT`). `.env` lists the required keys.
- Admin gating is purely client-side via `ADMIN_EMAILS`; the `/admin` route and serverless function both check it.
- PWA via `vite-plugin-pwa` (auto-update service worker, runtime caching for sprites + Google Fonts). Sprites load from `raw.githubusercontent.com` (`src/utils/pokemonSprites.js`).
- Styling: Tailwind (`tailwind.config.js`) plus per-view CSS files in `src/styles/`. Theming is multi-theme (`src/constants/theme.js` `THEME_META`) driven by `useThemeStore`; `PATCH_NOTES_VERSION` there gates the patch-notes modal.

## Agent knowledge base

`docs/` is a modular knowledge base maintained for AI agents (`docs/index.md` is the root map, `docs/modules/*.md` hold topic detail). Consult `docs/index.md` for deeper context before large changes, and keep that documentation modular (no single bloated file).

- **`docs/agent_directives.md`** — strict protocol: if a change breaks the app or Enzo corrects you, revert if unbootable, ask for intent, then record the lesson.
- **`docs/wounds.md`** — the project's running log of fixed bugs, root causes, and dispatterns-to-avoid, plus a backlog of proposed improvements. **Read it before non-trivial work** to avoid re-introducing solved problems. Append to it via the `/log-wound` skill (`.claude/skills/log-wound/`) whenever you fix a bug or correct a pattern.
- **`/design-system` skill** (`.claude/skills/design-system/`) — **read before editing any CSS.** Carries the strict spacing grid (every padding/margin/gap resolves to a `--space-*` token — no exceptions), the interaction tokens (`--color-surface-hover/active`, `--color-on-primary`, `--ring-primary`), the never-write-a-raw-colour rule, the never-nest-a-border rule, and the drift-detection commands including an undefined-token audit. The 2026-08-28 wound exists because these were not enforced.
