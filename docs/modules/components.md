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

Like counter, "Have a suggestion?" form (submits to Firestore) and fan disclaimer. Rendered in two places: the page footer on desktop, and the drawer tail (`.app-shell__drawer-meta`) below 1024px, where the footer is hidden. Both dialogs are `createPortal`ed to `<body>` — the drawer moves with `transform`, which would otherwise become the containing block for their `position: fixed` and trap them inside it.

---

### SidebarAccountMenu
**File:** `src/components/SidebarAccountMenu.jsx`

Account section at the bottom of the sidebar. Shows: greeting Pokémon avatar, trainer name/status, streak badge, and action buttons (sign in / profile / sign out). Consumes `useAuthStore`.

---

### Forum message attachments
**Files:** `src/components/BattleInviteCard.jsx`, `src/components/PuzzleShareCard.jsx`

A forum message can carry three things besides text, all passed through
`sendMessage(topicId, text, team, replyTo, attachments)` — one named bag rather
than a growing tail of positional arguments:

| Attachment | Card | Shape |
|---|---|---|
| `sharedTeam` | inline in `FeedView` | the serialized roster |
| `battleInvite` | `BattleInviteCard` | **a pointer** (`battleId`), so the card reads the live battle and everyone sees it claimed |
| `sharedPuzzle` | `PuzzleShareCard` | a finished PokéPuzzle board from `utils/pokePuzzleShare` |

All three reuse the `forum-team-share-card` shell, so a thread keeps one visual
language for "somebody attached something".

**The puzzle share must never carry the answer.** The daily puzzle is the same
for everyone, so `buildPuzzleShare` takes the target and returns only per-letter
statuses (`'c'`/`'p'`/`'a'` per row) — no target, no guesses, since for a win a
guess *is* the answer. A test asserts the payload contains neither. The card
renders those codes as tiles using the same tokens as the game's own board
(`--color-success` / `--color-warning` / `--color-border`), restated in
`forum-view.css` because `pokepuzzle-view.css` is not loaded on the feed.

### PatchNotesModal + the release ledger
**Files:** `src/components/modals/PatchNotesModal.jsx`, `src/constants/patchNotes.js`

Releases live in **`constants/patchNotes.js`** as data — `RELEASES`, newest first,
each `{ version, month: 'YYYY-MM', notes: [{ key, title, … }] }`. The modal renders
the first entry in full (icon, illustration, CTA) and the rest as a collapsed
history, so an announcement can be re-read after it is dismissed.

**Shipping a release:**
1. Bump `PATCH_NOTES_VERSION` in `constants/theme.js` — that constant gates the
   modal *and* supplies the ledger's first version, so the two cannot disagree.
2. Push the previous release down the ledger, keeping only its note **titles**
   (history rows are titles; descriptions and illustrations belong to the current
   release only). Its title keys must stay in `translations.js`.
3. Add the new notes with `icon` and `visual` names, resolved to components by
   `NOTE_ICONS` / `NOTE_VISUALS` in the modal — the ledger stays JSX-free so it
   can be unit-tested.
4. Dates are formatted from `month` per language (`formatReleaseMonth`), so a
   release never needs new date copy.

`patchNotes.test.js` guards the invariants: head version equals
`PATCH_NOTES_VERSION`, versions descend, none repeat, every release has a month
and notes, and the current release carries the illustration data.

**Reopening:** the version button (`app-shell__footer-version` — in the page
footer on desktop and in the drawer tail on phones; the only entry point a guest
can reach) and the account menu's "What's new" item, all wired to
`handleOpenPatchNotes` in `AppLayout`.

### ShellNavGroup
**File:** `src/components/ShellNavGroup.jsx`

One labelled section of the sidebar navigation, foldable — with **at most two sections open at once**.

The header keeps the type of a quiet label (12px, muted, 500) and is shorter than a nav row, so only the chevron marks it as a control; a folded section holding the current page shows a dot. On the icon rail it renders **no header at all** — labels are hidden there, so a header would be an empty control — just the bare list carrying its name on `aria-label`.

**The two-open cap is the design.** Independent folds let the rail grow to whatever the user last left open (everything, plus a scrollbar); a strict accordion left it empty — four chevron rows over 400px of nothing, the tail invisible *and* two clicks away (both logged in `docs/wounds.md`, 2026-09-10). Opening a third section closes the least recently opened, so the cap enforces itself and no click is ever refused.

State lives in `AppLayout` as an **ordered, oldest-first list** (`openNavGroups`, capped by `MAX_OPEN_NAV_GROUPS`) and persists to `localStorage` as `ptb-sidebar-open-groups`, keyed by stable section slugs — never by the translated title. Both entry points (a click, and navigating into a folded section) append through the same `withGroupOpen` helper so they cannot disagree about which section gets evicted. First run opens `DEFAULT_OPEN_NAV_GROUPS`, because landing on an empty rail is the failure the whole shape exists to avoid.

Section labels and nav rows share one inline inset, `--app-shell-row-inset` on `.app-shell`, so the label's first letter lands on the same left edge as the icons under it at every breakpoint. Change it there, never per-rule.

### TextSizeControl
**File:** `src/components/TextSizeControl.jsx`

A− / percentage / A+ stepper for the interface scale (`useThemeStore.uiScale`). Two variants: `menu` (account popover, full width) and `compact` (desktop page footer). Below 1024px the footer is hidden and the drawer tail renders the `menu` variant instead — together these are the only places a signed-out visitor can reach it. The percentage doubles as the reset to 100%.

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
