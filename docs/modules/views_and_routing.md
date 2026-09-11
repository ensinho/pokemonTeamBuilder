# Views & Routing

---

## Router Setup

The app uses React Router's **`BrowserRouter`** mounted in `src/main.jsx`, with `basename` taken from `import.meta.env.BASE_URL` so the same build serves both deploy targets. URLs are real paths (`/builder`, `/pokedex`); a legacy `#/...` link is rewritten to its path equivalent before the router mounts. **The `vercel.json` rewrite is required** — it routes every non-`/api` request to `api/render-meta.js`, which serves the SPA shell with per-route OG tags. Do not remove it.

All `<Route>` definitions are **centralized in `src/components/AppLayout.jsx`**. Do not define routes anywhere else.

---

## Route Table

| Path | Component | Description |
|------|-----------|-------------|
| `/` | `HomeView` | Dashboard — active team, pinned Pokémon, daily puzzle teaser, timeline |
| `/builder` | `TeamBuilderView` / `MobileTeamBuilderView` | Core team editor — desktop and mobile variants |
| `/pokedex` | `PokedexView` | Full Pokédex browser with detail panel |
| `/favorites` | `FavoritePokemonsView` | Saved favorite Pokémon grid |
| `/teams` | `AllTeamsView` | Saved teams dashboard — grid and list view |
| `/generator` | `RandomGeneratorView` | Random team generator with filter controls |
| `/quiz` | `GenerationQuizView` | Generation naming quiz with streak tracking |
| `/pokepuzzle` | `PokePuzzleView` | Wordle-style daily/ongoing Pokémon guessing game |
| `/feed` | `FeedView` | Community forum — topics, messages, team sharing |
| `/profile` | `ProfileView` | Trainer profile, theme, language, account settings |
| `/admin` | `AdminDashboardView` | Admin feedback management (gated by `ADMIN_EMAILS`) |
| `*` | — | Redirects to `/` |

---

## AppLayout

`src/components/AppLayout.jsx` is the real entry point — `App.jsx` is only a boot shell (auth init + reference data). AppLayout owns:

- The sidebar (navigation links, account menu, collapse state)
- The top bar (mobile menu, page title)
- All modal mounts (every modal is instantiated here and controlled by local state)
- The `<Routes>` table
- Mobile vs desktop detection and the `isMobile` prop passed to the builder

Key state in AppLayout:
- `sidebarCollapsed` — persistent via localStorage
- `showAuthModal`, `showSyncPrompt`, `showPatchNotes`, etc. — modal visibility flags
- `detailPokemon` — the Pokémon currently shown in `PokemonDetailModal`
- `editorPokemon` — the slot open in `TeamPokemonEditorModal`

---

## Views Directory

`src/components/views/` — barrel-exported via `index.js`.

### HomeView
**Path:** `/`  
**File:** `src/components/views/HomeView.jsx`  
**Style:** `src/styles/home-view.css`

The landing page and primary dashboard. Sections:
- Greeting header with trainer name, avatar, and streak badge
- Active team card — current team composition with type coverage summary
- Pinned items row — recent Pokémon, quick stats
- Timeline / chat widget — recent community activity
- Daily puzzle teaser — links to PokePuzzle with today's status
- Quick-access recent teams row

Data: `useAuthStore` (greeting, streak), `useFirestoreTeamsStore` (active team), `useActiveTeamStore` (analysis).

---

### TeamBuilderView / MobileTeamBuilderView
**Path:** `/builder`  
**Files:** `src/components/views/TeamBuilderView.jsx`, `MobileTeamBuilderView.jsx`  
**Style:** `src/styles/team-builder-view.css`

AppLayout selects the variant based on `isMobile`. Both share the same underlying state.

Desktop layout (TeamBuilderView):
- Left column: 6-slot team composition, each slot showing sprite + nickname + type badges
- Center: Pokémon picker — search, type filter, generation filter, paginated grid
- Right panel: Team analysis — weaknesses, resistances, coverage suggestions, Showdown export

Mobile layout (MobileTeamBuilderView):
- Sticky top bar: active team name, analysis chip (collapsed summary)
- Full-width Pokémon picker grid
- Expandable filter panel (bottom sheet)
- Bottom section: recent teams strip

State: `useActiveTeamStore` (slots, analysis), `usePokedexStore` (list, filters), `useFirestoreTeamsStore` (save/load).

---

### PokedexView
**Path:** `/pokedex`  
**File:** `src/components/views/PokedexView.jsx` (~2100 lines — largest view)  
**Style:** (uses Tailwind directly + shared card styles)

Two-panel layout:
- Left: search bar, type/generation filters, paginated Pokémon grid (`PokemonCard` components)
- Right: detail panel — lazy-loaded on card click

Detail panel tabs:
- **Info** — base stats (`StatBar`), type defenses, abilities, height/weight, flavor text
- **Moves** — level-up, TM, egg moves table with type badges
- **Evolution** — evolution chain with conditions
- **Locations** — encounter areas by game version
- **Forms** — alternate forms, regional variants, mega evolutions

State: `usePokedexStore` (list, search, filters, pagination), `pokemonDataCache` (detail fetch).

---

### AllTeamsView
**Path:** `/teams`  
**File:** `src/components/views/AllTeamsView.jsx`  
**Style:** `src/styles/all-teams-view.css`

Two display modes: grid (card thumbnails) and list (compact rows). Controls:
- Search bar (name filter)
- Favorite toggle filter
- Sort: recent / alphabetical
- Active team indicator — highlighted card/row

Actions per team: set active, rename, duplicate, share (ShareSnippetModal), delete (ConfirmDialog).

State: `useFirestoreTeamsStore` (teams list, active team, favorites).

---

### RandomGeneratorView
**Path:** `/generator`  
**File:** `src/components/views/RandomGeneratorView.jsx`  
**Style:** `src/styles/random-generator-view.css`

Filters: generation range, type include/exclude, legendary toggle, number of Pokémon.  
Output: full card per generated Pokémon showing sprite, types, base stats, evolution line, and alternate forms.  
Add-to-team shortcut: each card has a slot-picker to add directly to the active team.

Has an intro modal (guessing game mode) that hides sprites until the user guesses.

---

### GenerationQuizView
**Path:** `/quiz`  
**File:** `src/components/views/GenerationQuizView.jsx`  
**Style:** `src/styles/generation-quiz-view.css`

Naming quiz — silhouette/sprite shown, user types the Pokémon name via `PokemonGenerationQuizAutocomplete`. Tracks per-session streak, correct/incorrect counts, and generation stats. Triggers `QuizCelebrationModal` on milestone streaks.

Right sidebar shows quiz history log (collapsible). Results saved to `useQuizRunsStore` → Firestore.

---

### PokePuzzleView
**Path:** `/pokepuzzle`  
**File:** `src/components/views/PokePuzzleView.jsx` (~1760 lines)  
**Style:** `src/styles/pokepuzzle-view.css`

Wordle-style game with two modes:
- **Daily** — one puzzle per calendar day, shared across all users, streak tracked
- **Ongoing** — unlimited practice mode

Each guess row shows attribute feedback tiles: type match, generation match, height/weight comparison arrows, correct/incorrect color coding. Virtual keyboard at the bottom. Share button generates a spoiler-free emoji grid.

Hint system: reveal type, generation, or height/weight at a streak cost.  
History: `usePokePuzzleHistory` hook, synced to Firestore for logged-in users.

---

### FeedView
**Path:** `/feed`  
**File:** `src/components/views/FeedView.jsx`  
**Style:** `src/styles/forum-view.css`

Community forum. Structure:
- Topic list — filterable by category tag; full-bleed rows with a hairline between them
- Thread view — messages with user avatars, timestamps, reactions
- Team sharing cards embedded in messages
- New topic / reply composer

State: `useForumStore` (topics, messages, real-time `onSnapshot`).

**Layout contract** (rebuilt 2026-09-11 — see `docs/wounds.md`):
- The feed **fills through the layout** at every width (`flex: 1 1 0; min-height: 0`
  down `.app-shell__body` → `.app-shell__page-frame` → `.forum-view`). No viewport
  units: `calc(100vh - 8rem)` is a guess about the chrome above and below it.
- **Two scrollers, one per pane** — `.forum-topics-list` and `.forum-message-list`.
  A message body never gets an `overflow` of any kind; `min-width: 0` plus
  `overflow-wrap: anywhere` is what contains wide content.
- A post is a **grid** (`--forum-avatar` | content), and `--forum-rail` is reserved
  on the header, list and composer alike so all three share one right edge.
- Below 640px the sidebar and the thread are **two screens**, toggled by
  `is-pane-topics` / `is-pane-thread`; `useChatAutoScroll`'s `pinKey` re-pins the
  thread, because hiding a pane resets its `scrollTop`.

---

### ProfileView
**Path:** `/profile`  
**File:** `src/components/views/ProfileView.jsx`  
**Style:** `src/styles/profile-view.css`

Sections:
- Trainer card — avatar (greeting Pokémon), display name, streak, member since
- Theme selector — 6 theme swatches
- Language selector
- Sync status — anonymous vs signed-in account indicator
- Account actions: sign in, sign out, delete account

---

### FavoritePokemonsView
**Path:** `/favorites`  
**File:** `src/components/views/FavoritePokemonsView.jsx`

Grid of favorited Pokémon cards. Search and type filter. Favorites are toggled from the PokemonDetailModal and synced to Firestore via `useFirestoreTeamsStore`.

---

### AdminDashboardView
**Path:** `/admin`  
**File:** `src/components/views/AdminDashboardView.jsx`

Gated to `ADMIN_EMAILS` list. Displays user feedback submissions. Admin can compose and send email replies via the `api/send-admin-reply.js` Vercel function. Includes email template previews and submission status filters.

---

## Modals

All modals are mounted in `AppLayout.jsx` and controlled by its local state. They are **not** routed — they overlay the current view.

`src/components/modals/` — barrel-exported via `index.js`.

| Modal | Trigger | Purpose |
|-------|---------|---------|
| `AuthModal` | Manual / sync prompt | Email-link sign in / anonymous upgrade |
| `SyncPromptModal` | On first significant action as anonymous | Nudge to save progress |
| `PokemonDetailModal` | Clicking any Pokémon card | Full detail panel overlay |
| `TeamPokemonEditorModal` | Clicking a team slot | Edit slot: moves, item, ability, EVs, nature |
| `ShareSnippetModal` | Share button on a team | Canvas-based team image export |
| `UserProfileModal` | Clicking a user's avatar in feed | Public trainer profile view |
| `ConfirmDialog` | Delete / destructive actions | Generic confirmation prompt |
| `PatchNotesModal` | On version bump (`PATCH_NOTES_VERSION`) | What's new changelog |
| `QuizCelebrationModal` | Quiz milestone streaks | Celebration overlay |
| `GreetingPokemonSelectorModal` | Profile — change avatar | Pick greeting Pokémon |

**Canvas taint rule:** `ShareSnippetModal` uses `canvas.toDataURL()`. Any image drawn onto the canvas from an external URL must be loaded with `crossOrigin = 'anonymous'` — failing to do so throws a `DOMException` and breaks export.

---

## Hooks (`src/hooks/`)

| Hook | Purpose |
|------|---------|
| `useActiveTeam` | Thin wrapper over `useActiveTeamStore` — prefer this in components |
| `useFirestoreTeams` | Thin wrapper over `useFirestoreTeamsStore` |
| `usePokedex` | Thin wrapper over `usePokedexStore` |
| `useQuizRuns` | Thin wrapper over `useQuizRunsStore` |
| `useTranslation` | Resolves i18n keys from `translations.js` |
| `useDebounce` | Input debounce (used in Pokédex search) |
| `useModalA11y` | Focus trap + escape-key close for modals |
| `useEdgeSwipe` | Left-edge swipe gesture to open sidebar on mobile |
| `usePWAInstall` | Intercepts `beforeinstallprompt` for PWA install banner |
| `usePokePuzzleHistory` | PokePuzzle session and history state |
| `useSessionGame` | Session-scoped game state (quiz, generator guessing mode) |

---

## Modal Development Checklist

Every modal must follow this standard. Deviating causes accessibility failures and visual inconsistency.

### ARIA requirements
- Outer wrapper: `role="dialog"` `aria-modal="true"` `aria-labelledby="<modal-id>-title"` `tabIndex={-1}`
- Title element: `id="<modal-id>-title"`
- Close button: `aria-label={t('common.close')}`
- Use `useModalA11y(onClose)` hook — provides focus trap, Escape key close, and focus restore. Call it **unconditionally** (before any early returns). Pass `null` when the modal is closed.

```jsx
const dialogRef = useModalA11y(isOpen ? onClose : null);
// then on the inner dialog div:
// ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="<id>-title" tabIndex={-1}
```

### Backdrop standard
```jsx
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 animate-fade-in"
     onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
```
- Always `bg-black/65 backdrop-blur-sm`. Exception: `QuizCelebrationModal` uses `backdrop-blur-md` (intentional theater).
- Always `animate-fade-in` on the backdrop, `animate-scale-in` on the inner dialog.

### Entry animation
- **Backdrop:** `animate-fade-in`
- **Inner dialog:** `animate-scale-in`
- Exception: `QuizCelebrationModal` keeps its theatrical entrance.

### Close button placement
Top-right of the header. Consistent pattern:
```jsx
<button type="button" onClick={onClose} aria-label={t('common.close')}
        className="rounded-md p-1 text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
    <CloseIcon />
</button>
```

### Footer button layout
```jsx
<footer className="flex items-center justify-end gap-2 border-t border-surface-raised px-5 py-3">
    <button className="btn btn-outline">Cancel</button>
    <button className="btn btn-primary">Confirm</button>  {/* primary action rightmost */}
</footer>
```

### Scrollable content
```jsx
<div className="overflow-y-auto custom-scrollbar max-h-[60vh]"
     style={{ '--scrollbar-track-color': 'var(--color-surface)', '--scrollbar-thumb-color': 'var(--color-border)' }}>
```
Always pair `overflow-y-auto` with `custom-scrollbar`. Use inline CSS variable injection to match the modal's background.

### Canvas image rule
`ShareSnippetModal` uses `canvas.toDataURL()`. Any image drawn to canvas from an external URL **must** have `crossOrigin="anonymous"` on the `<img>` element, or the export will throw a `DOMException` (canvas taint).
