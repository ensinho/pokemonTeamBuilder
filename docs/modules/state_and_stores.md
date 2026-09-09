# State & Stores

All app state lives in **Zustand stores** in `src/store/`. React Context is not used for app state. Prefer the thin hook wrappers in `src/hooks/` over accessing stores directly in components.

---

## Store Overview

| Store | Hook Wrapper | Responsibility |
|-------|-------------|---------------|
| `useAuthStore` | — | Firebase auth lifecycle, trainer profile, streak |
| `useFirestoreTeamsStore` | `useFirestoreTeams` | Saved teams, favorites, active team id |
| `useActiveTeamStore` | `useActiveTeam` | The team being edited + type coverage engine |
| `usePokedexStore` | `usePokedex` | Pokémon list, search, filters, pagination |
| `useReferenceStore` | — | Generations, items, natures (fetched once on boot) |
| `useQuizRunsStore` | `useQuizRuns` | Quiz run history, Firestore sync |
| `useForumStore` | — | Forum topics and messages, real-time listener |
| `useLanguageStore` | — | Active language, available locales |
| `useThemeStore` | — | Active theme, patch notes version gate |
| `useToastStore` | — | Toast notification queue |

---

## Store Details

### useAuthStore
**File:** `src/store/useAuthStore.js`

Central auth state. Wired in `App.jsx` via `initAuth()` / `cleanupAuth()`.

Key fields: `user`, `userId`, `displayName`, `isAnonymous`, `isAuthenticated`, `trainerStreak`, `lastStreakDate`, `greetingPokemonId`, `favorites[]`, `theme`, `language`.

Key actions: `initAuth()`, `cleanupAuth()`, `signInWithEmail()`, `upgradeAnonymous()`, `signOut()`, `updateProfile()`, `updateStreak()`.

Calls into: `useThemeStore` (apply theme on hydration), `useLanguageStore` (apply language), `useToastStore` (show feedback toasts).

---

### useFirestoreTeamsStore
**File:** `src/store/useFirestoreTeamsStore.js`

Manages saved teams and the active team selection. Attaches two `onSnapshot` listeners on auth: one for the user's private teams, one for public teams.

Key fields: `savedTeams[]`, `favoritePokemons` (Set of ids), `activeTeamId`, `deleteConfirmation`.

Key actions: `handleDeleteTeam()`, `setActiveTeamId()`, `handleToggleFavorite()`, `handleToggleFavoritePokemon()`, `handleDuplicateTeam()`.

`handleDuplicateTeam(team)` copies a saved team into a new document straight from the stored doc (no Pokémon details are re-resolved) and returns `{ id, ...data }` so the caller can offer to open the copy. Naming lives in `src/utils/teamDuplication.js` — the copy must arrive with a free name because `handleSaveTeam` rejects duplicates.

`activeTeamId` is also mirrored to `localStorage` key `ptbActiveTeamId` for cross-refresh persistence.

---

### useActiveTeamStore
**File:** `src/store/useActiveTeamStore.js`

The team currently being built — 6 slots, each with Pokémon id, nickname, moves, item, ability, EVs, nature, shiny flag.

**Contains the type-coverage engine.** `recalculateAnalysis()` delegates to `src/utils/teamAnalysis.js` (`analyzeTeam`). Call this store method — do not call `analyzeTeam` from components directly.

Key fields: `slots[]`, `teamName`, `analysis` (weaknesses, resistances, fillers).

Key actions: `addPokemon()`, `removePokemon()`, `updateSlot()`, `reorderSlots()`, `clearTeam()`, `recalculateAnalysis()`, `buildShowdownExportText()`.

---

### usePokedexStore
**File:** `src/store/usePokedexStore.js`

Holds the full Pokémon list (1025 entries from `public/data/pokemon-index.json`) plus filter state. Filtering and pagination are fully client-side — no Firestore queries.

Key fields: `pokemons[]` (the revealed slice), `filteredPokemons[]` (the full filtered set), `visibleCount`, `listSignature`, `hasMore`, plus two parallel filter sets — `selected*` for the Builder and `pokedexSelected*` for the Pokédex.

Key actions: `fetchInitial(isPokedex)`, `fetchMore()`, `setFilter(key, value)`, `toggleTypeSelection(type, isPokedex)`.

The list is loaded once on first mount via `usePokedex()` hook. Subsequent renders use the cached store state.

**Page depth is remembered per list.** `usePokedex()` is mounted in the shell, so leaving the Pokédex for `/pokemon/:id` flips the store to the Builder's filters and back — which used to reset the revealed slice to page one. `fetchInitial` restores the count previously revealed for the same `listSignature` (`src/utils/pokedexListKey.js`: mode + filters), clamped to the current result length. Pair it with `useScrollRestoration` for the matching scroll offset; see the 2026-08-26 wound.

---

### useReferenceStore
**File:** `src/store/useReferenceStore.js`

Static reference data fetched once on boot from the static cache: generations list, item catalog, nature table. Used in the team editor modal for item/nature pickers.

Key actions: `loadReferenceData()` — called from `App.jsx` after auth init.

---

### useQuizRunsStore
**File:** `src/store/useQuizRunsStore.js`

Quiz run history. Stores session state + syncs completed runs to `users/{userId}/quizRuns` in Firestore for logged-in users.

---

### useForumStore
**File:** `src/store/useForumStore.js`

Forum topics and messages. Attaches `onSnapshot` listeners to `public/data/forumTopics` and the active topic's messages subcollection. Manages compose state and send actions.

---

### useLanguageStore
**File:** `src/store/useLanguageStore.js`

Active language code (`en`, `pt-BR`, etc.) and list of available languages. Persisted to `localStorage`. Used by `useTranslation` hook.

---

### useThemeStore
**File:** `src/store/useThemeStore.js`

Active theme key and `PATCH_NOTES_VERSION` gate (whether the patch notes modal has been shown for the current version). Calls `applyTheme()` from `src/constants/theme.js` to inject CSS variables onto `:root`.

Also owns **`showTeraType`** — whether Tera Type (a generation IX mechanic) is
shown at all. It gates the Tera field in the team editor, the Tera pill on team
pages, the Terastallize block in the damage calculator, and the `Tera Type:` line
in Showdown exports; it deliberately does **not** touch Smogon set descriptions,
the move Tera Blast, meta/usage panels or the battle simulator, which describe
other people's play rather than the user's own build. Saved teams keep their
`teraType` either way, so switching it back on restores every choice.

Also owns **`uiScale`** — the interface scale (`setUiScale()` → `applyUiScale()` sets `--ui-scale`, which `html { font-size: calc(100% * var(--ui-scale)) }` in `index.css` consumes). Steps and clamping are pure helpers in `src/utils/uiScale.js`. Both theme and scale are applied at store construction, before first paint. The scale is stored in `localStorage` (`ptbUiScale`) and mirrored to the signed-in profile alongside theme/language, so it follows the account.

---

### useToastStore
**File:** `src/store/useToastStore.js`

Toast notification queue. Actions: `showToast({ message, type, duration })`. Type values: `success`, `error`, `info`, `warning`. Toasts auto-dismiss.

---

## Hook Wrappers

Thin wrappers in `src/hooks/` that select only the fields a component needs (avoiding unnecessary re-renders from full store subscriptions):

| Hook | File | Selects from |
|------|------|-------------|
| `useActiveTeam` | `src/hooks/useActiveTeam.js` | `useActiveTeamStore` |
| `useFirestoreTeams` | `src/hooks/useFirestoreTeams.js` | `useFirestoreTeamsStore` |
| `usePokedex` | `src/hooks/usePokedex.js` | `usePokedexStore` |
| `useQuizRuns` | `src/hooks/useQuizRuns.js` | `useQuizRunsStore` |
| `useTranslation` | `src/hooks/useTranslation.js` | `useLanguageStore` + `translations.js` |

**Convention:** Import from hooks in components, not directly from stores. This keeps components decoupled from store internals and makes selective re-subscription easier to maintain.
