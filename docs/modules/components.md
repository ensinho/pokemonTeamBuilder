# Components

Shared UI building blocks live in `src/components/`. Views use these — components do not import views. Modals are a separate sub-directory (`src/components/modals/`).

---

## Shared Components

### PokemonCard
**File:** `src/components/PokemonCard.jsx`  
**Style:** `src/styles/pokemon-card.css`

The grid card used in Pokédex, favorites, team builder picker, and generator. Props: `pokemon`, `onClick`, `onFavorite`, `isFavorite`, `isInTeam`. Shows sprite (via `Sprite`), name, type badges (via `TypeBadge`), and a hover overlay with quick-add or favorite toggle.

Card size adapts via a `size` prop: `sm`, `md` (default), `lg`.

---

### TypeBadge
**File:** `src/components/TypeBadge.jsx`

Pill badge for a Pokémon type. Takes `type` (string) and optional `size`. Colors come from `typeColors` in `src/constants/types.js`. Type icons (imported PNGs from `src/assets/typeIcons/`) are optionally shown with the `showIcon` prop.

Do not hardcode type colors in JSX — always use `TypeBadge` or the `typeColors` map.

---

### StatBar
**File:** `src/components/StatBar.jsx`

Horizontal bar showing a base stat value (0–255). Props: `label`, `value`, `max` (default 255). Bar fill color maps to the stat name (HP=green, Attack=red, Defense=blue, etc.) and uses CSS custom properties for theme adaptation.

---

### Sprite
**File:** `src/components/Sprite.jsx`

Wrapper around Pokémon sprite images. Handles:
- URL resolution via `getPokemonFrontSpriteUrl` (from `src/utils/pokemonSprites.js`)
- Loading state with `.skeleton` shimmer placeholder
- Fade-in animation via `.sprite-fade` on load
- `image-rendering: pixelated` for crisp upscaling (`.sprite-img` class)
- Shiny variant toggle

Props: `pokemonId`, `size`, `shiny`, `className`.

---

### SkeletonCard
**File:** `src/components/SkeletonCard.jsx`

Placeholder card shown while the Pokémon list is loading. Uses the `.skeleton` shimmer class. Matches `PokemonCard` dimensions so layout does not shift on load.

---

### EmptyState
**File:** `src/components/EmptyState.jsx`

Generic empty state block. Props: `icon`, `title`, `description`, `action` (optional CTA button config). Used consistently across filtered lists, empty team slots, and no-results states.

---

### TeamIdentitySummary
**File:** `src/components/TeamIdentitySummary.jsx`

Compact summary row of a team: 6 sprite thumbnails + team name + type coverage chips. Used in AllTeamsView cards and HomeView recent-teams strip.

---

### AbilityChip
**File:** `src/components/AbilityChip.jsx`

Chip for displaying a Pokémon ability name. On click, shows a popover with the ability description (fetched via `pokemonDataCache`). Uses `AnchoredPopover` internally.

---

### AnchoredPopover
**File:** `src/components/AnchoredPopover.jsx`

Generic anchored popover/tooltip container. Positions itself relative to a trigger element, handles viewport overflow, and closes on outside click or `Escape`. Used by `AbilityChip` and the analysis panel.

---

### PageGuide
**File:** `src/components/PageGuide.jsx`

Contextual help tooltip system. `pageGuideTips` is a map of route → tip array. Shown as a floating "?" button per view. Cycles through tips with prev/next controls. Content is translated via `useTranslation`.

---

### FooterFeedback
**File:** `src/components/FooterFeedback.jsx`

Sticky footer feedback button visible on all views. Opens a small form that submits to Firestore. Shown only once per session after a delay.

---

### SidebarAccountMenu
**File:** `src/components/SidebarAccountMenu.jsx`

Account section at the bottom of the sidebar. Shows: greeting Pokémon avatar, trainer name/status, streak badge, and action buttons (sign in / profile / sign out). Consumes `useAuthStore`.

---

### ShellNavGroup
**File:** `src/components/ShellNavGroup.jsx`

One labelled section of the sidebar navigation, foldable. Renders a plain always-open list when the sidebar is in icon-rail mode (labels are hidden there, so there is nothing to click); otherwise the label becomes the toggle and the item list sits in a `grid-template-rows: 0fr/1fr` panel. A folded section holding the current page shows a dot on its header. Fold state lives in `AppLayout` and persists to `localStorage` (`ptb-sidebar-collapsed-groups`), keyed by a stable slug — never by the translated title.

### TextSizeControl
**File:** `src/components/TextSizeControl.jsx`

A− / percentage / A+ stepper for the interface scale (`useThemeStore.uiScale`). Two variants: `menu` (account popover, full width) and `compact` (page footer — the only one of the two a signed-out visitor can reach). The percentage doubles as the reset to 100%.

### icons.jsx
**File:** `src/components/icons.jsx`

Hand-built SVG icon components for the project. Each export is a React component accepting `size`, `className`, and standard SVG props. Use these before reaching for `lucide-react`.

Current icons: `GithubIcon`, `LinkedinIcon`, `CloseIcon`, `CollapseLeftIcon`, `CollapseRightIcon`, `DownloadIcon`, `MenuIcon`, `PokeballIcon`, `SavedTeamsIcon`, `StarsIcon`, `SwordsIcon`, `DiceIcon`, `HomeIcon`, `SunIcon`, `MoonIcon`, `AccountIcon`, `ChartColumnIcon`, `SuccessIcon`, `PuzzleIcon`, `ForumIcon`, and more.

---

## Quiz Components

### PokemonGenerationQuizCard
**File:** `src/components/PokemonGenerationQuizCard.jsx`

Card shown during a quiz round — displays silhouette or sprite depending on reveal state. Animated flip on correct answer.

### PokemonGenerationQuizAutocomplete
**File:** `src/components/PokemonGenerationQuizAutocomplete.jsx`

Autocomplete input for the quiz answer field. Filters `pokemon-index.json` client-side and shows a dropdown. Debounced. Keyboard navigable.

---

## Composition Conventions

- Components receive data via props — they do not call stores directly unless they are "smart" wrappers (like `SidebarAccountMenu`).
- Shared components never import from `views/` or `modals/` — that would create circular dependencies.
- New shared components belong in `src/components/`. View-specific sub-components that will never be reused belong inline in the view file or as a local component in the same file.
- If a component needs a lot of CSS, create or extend the relevant `src/styles/*.css` file rather than adding a large Tailwind `className` string.
