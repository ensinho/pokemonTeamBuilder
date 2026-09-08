# Styles & Aesthetics

> **Critical:** This app targets a premium, polished feel. Generic-looking UI is a failure. Read this module before any visual change.

---

## Styling Architecture

The project uses a three-layer model. Each layer has a specific purpose — mixing them creates technical debt.

| Layer | Tool | Purpose |
|-------|------|---------|
| Layout & spacing | Tailwind utility classes | `flex`, `items-center`, `gap-4`, `p-3`, etc. |
| Component styles | `src/styles/*.css` | Complex selectors, animations, variants, responsive rules |
| Runtime theming | Inline `style={{}}` | **Only** for injecting dynamic CSS variable values |

**Rule:** Never use inline styles for layout. Never use Tailwind for complex multi-state styles. Never write component styles directly in JSX `className` strings that exceed ~4 classes of substance.

---

## Design Token System

All tokens are defined as CSS custom properties in `src/index.css` and scoped per theme via `[data-theme="..."]` attribute selectors.

### Color Tokens

```
--color-primary          Brand color (interactive elements, focus rings)
--color-primary-soft     Translucent primary (12% opacity — backgrounds, glows)
--color-accent           Highlight color (rewards, badges, streaks)
--color-accent-soft      Translucent accent
--color-bg               Page background
--color-surface          Card / panel background
--color-surface-raised   Elevated surface (dropdowns, popovers, hover states)
--color-fg               Primary text
--color-muted            Secondary text, placeholders, disabled states
--color-border           Default border
--color-border-hover     Border on hover (color-mix of primary + border)
--color-success          #34D399 (dark) / #047857 (light)
--color-danger           #F87171 / #B91C1C
--color-warning          #FBBF24 / #B45309
--color-info             #60A5FA / #1D4ED8
```

### Interface Scale

```
--ui-scale    Root font-size multiplier: 0.9 | 1 | 1.1 | 1.25
```

Set on `:root` by `applyUiScale()` (`src/constants/theme.js`) from `useThemeStore.uiScale`, and consumed by exactly one rule: `html { font-size: calc(100% * var(--ui-scale, 1)) }` in `index.css`. Percent, not px, so a user running a larger browser default keeps it.

Because the shell is sized in `rem`, a step scales spacing along with type — that is the point: on a small monitor the user wants to fit more, not only to read larger. **Consequence for new CSS:** size type and spacing in `rem`/`em`, not `px`, or it will not participate. The one deliberate exception is the iOS zoom guard (`input { font-size: 16px !important }` under 768px) — scaling that back down would reintroduce Safari's zoom-on-focus.

### Spacing Scale — the strict grid

Two tiers, both on a 2px grid: fine control below 16px where components live,
coarse rhythm above it where layout lives.

```
--space-0_5: 2px    --space-1:   4px    --space-1_5: 6px    --space-2:  8px
--space-2_5: 10px   --space-3:   12px   --space-3_5: 14px   --space-4:  16px
--space-5:   20px   --space-6:   24px   --space-8:   32px   --space-10: 40px
--space-12:  48px   --space-16:  64px
```

Note the underscore in the fractional names (`--space-1_5`, not `--space-1.5`):
a `.` is legal in a custom property but breaks Tailwind's arbitrary-value parser.

**Every `padding` / `margin` / `gap` in the app must resolve to one of these.**
This is the rule the codebase most needs enforced, and the `/design-system` skill
carries the audit command. Before the 2026-08-28 sweep the app used **58 distinct
spacing values**, 27 of them crammed between 0.1rem and 2.5rem (`0.3` / `0.35` /
`0.375` / `0.4rem` all live simultaneously). Neighbouring elements differed by
fractions of a pixel, so nothing ever quite lined up — which is what made the UI
read as *mole, solto e desconexo*. Alignment is produced by repetition, not by
picking a pleasing number per element.

Legitimate exceptions: `clamp()`/`calc()` fluid gutters, `0`, percentages, and
values inside `@keyframes`. Comment any other exception or the next sweep will
"fix" it.

### Border Radius Scale

```
--radius-sm: 6px    Badges, chips, small tags
--radius-md: 8px    Buttons, inputs, small cards
--radius-lg: 12px   Cards, panels
--radius-xl: 16px   Modals, large panels
```

### Elevation (Box Shadow)

```
--elevation-1   Subtle lift — chips, inline elements
--elevation-2   Cards, dropdowns
--elevation-3   Modals, floating panels
```

Utility classes `.elevation-1`, `.elevation-2`, `.elevation-3` are available globally.

### Motion Tokens

```
--ease-smooth:    cubic-bezier(0.4, 0, 0.2, 1)    Default transitions
--ease-bounce:    cubic-bezier(0.34, 1.56, 0.64, 1) Spring/bounce entrances
--ease-spring:    cubic-bezier(0.175, 0.885, 0.32, 1.275)
--ease-out-expo:  cubic-bezier(0.16, 1, 0.3, 1)   Fast exits, sprite reveals

--duration-fast:     150ms   Hover states, micro-interactions
--duration-normal:   150ms   Standard transitions
--duration-slow:     250ms   Sprite reveals, card entrances
--duration-entrance: 350ms   Page transitions, modal opens
```

---

## Global Component Classes

These utility classes are defined in `src/index.css` and available everywhere.

### Buttons

```css
.btn              Base — use with a variant modifier
.btn-primary      Solid primary color, white text
.btn-secondary    Surface-raised background, bordered
.btn-outline      Transparent background, bordered
.btn-ghost        No background, no border — icon buttons
.btn-danger       Red background — destructive actions
```

All `.btn` variants include: `active:scale(0.98)`, disabled opacity/pointer-events, smooth transitions.

### Badges

```css
.badge            Base — use with a variant modifier
.badge-success    Green tint
.badge-accent     Accent color tint
.badge-outline    Muted/bordered — metadata labels
```

### Inputs

```css
.input-clean      Full-width, themed border, primary focus ring with soft glow
```

---

## Themes

Six themes defined in `src/constants/theme.js` under `THEME_META`:

| Key | Description |
|-----|-------------|
| `dark` | Default. Deep zinc dark, purple primary |
| `eclipse` | Near-black, violet/purple accent |
| `midnight` | Navy dark, cyan primary |
| `daybreak` | Blue-tinted light, strong blue primary |
| `light` | Clean white, muted purple |
| `solar` | Warm off-white, amber/gold primary |

### Adding a New Token

1. Add the value to each theme block in `src/index.css` under `:root[data-theme="..."]`.
2. Add a matching entry in `src/constants/theme.js` in the `colors` object.
3. Add it to the `applyTheme` function so it gets injected at runtime.

---

## Aesthetic Patterns

### Glassmorphism
Cards and panels frequently use `backdrop-blur` with semi-transparent backgrounds. The border is `var(--color-border)` at 1px solid. Do not add a second solid background behind a blur panel — it defeats the effect.

### Micro-Animations
Interactive elements must feel alive:
- Hover: `hover:-translate-y-0.5` or `hover:scale-[1.02]` on cards.
- Press: `active:scale-[0.97]` or `active:scale-[0.98]` on buttons.
- Entrance: `fade-in-up` keyframe (defined in `index.css`) for list items and cards.
- Sprite reveal: `.sprite-fade` class triggers `sprite-fade-in` keyframe — opacity + scale + blur.

### Skeleton Loading
Use the `.skeleton` class. It is a shimmer animation that uses `var(--color-surface-raised)` so it adapts to all themes automatically.

### Typography Conventions

**The typeface is settled: Inter everywhere**, JetBrains Mono for numbers. Both
`--font-display` and `--font-body` resolve to Inter deliberately. Do not
introduce a display/serif face — this was tried on 2026-08-28 and rejected. Calm
comes from layout, density and restraint, not from a new font.

- Section labels / metadata: `text-xs uppercase tracking-[0.12em] font-semibold text-[var(--color-muted)]`
- Card titles: `font-semibold text-sm` or `font-medium text-sm`
- Numbers/stats: `font-mono` or `font-bold tabular-nums`
- Never use `tracking` greater than `0.18em`.
- Max 3 sizes and 2 weights per view. Hierarchy comes from size *and* color
  (`--color-muted`), not from stacking more weights.

### Z-Index Layer System

All z-index values must use CSS token vars from `:root` in `src/index.css`. **Never use raw integer z-index values** outside of local stacking contexts.

| Token | Value | Usage |
|-------|-------|-------|
| `--z-content` | 10 | In-view sticky elements (quiz header) |
| `--z-dropdown` | 20 | Autocomplete panels, floating menus |
| `--z-sticky` | 25 | Sticky toolbars above dropdowns |
| `--z-overlay` | 30 | App shell sidebar overlay on mobile |
| `--z-sidebar` | 40 | App shell sidebar panel |
| `--z-modal` | 50 | All modal backdrops (`fixed inset-0 z-50`) |
| `--z-history-overlay` | 100 | Full-screen history overlay (quiz / puzzle) |
| `--z-history-panel` | 101 | History panel above its own overlay |

Key rule: autocomplete panels must use `--z-dropdown` (20), **not** `--z-overlay` (30) — they must not overlap the shell sidebar overlay.

### Custom Scrollbars
Apply `custom-scrollbar` class to any scrollable container. The class is defined in `index.css` and uses `var(--color-border)` / `var(--color-muted)` so it adapts across themes.

To match scrollbar colors to a specific container background (e.g. inside a modal), inject CSS variables inline:
```jsx
<div className="overflow-y-auto custom-scrollbar"
     style={{ '--scrollbar-track-color': 'var(--color-surface)', '--scrollbar-thumb-color': 'var(--color-border)' }}>
```
The `custom-scrollbar` class in `index.css` reads `--scrollbar-track-color` and `--scrollbar-thumb-color` when present, falling back to defaults.

---

## CSS File Map

| File | Scope |
|------|-------|
| `src/index.css` | Global tokens, reset, shared keyframes, `.btn`, `.badge`, `.input-clean` |
| `src/App.css` | Vite scaffold leftovers — effectively unused |
| `src/styles/app-shell.css` | Sidebar, top nav, layout shell |
| `src/styles/home-view.css` | HomeView — greeting, team card, widgets |
| `src/styles/team-builder-view.css` | TeamBuilderView — slots, picker, analysis panel |
| `src/styles/pokemon-card.css` | PokemonCard — grid card, type badge, hover |
| `src/styles/all-teams-view.css` | AllTeamsView — grid/list toggle, team rows |
| `src/styles/generation-quiz-view.css` | GenerationQuizView — quiz layout, stats |
| `src/styles/pokepuzzle-view.css` | PokePuzzleView — Wordle grid, keyboard |
| `src/styles/profile-view.css` | ProfileView — avatar, settings rows |
| `src/styles/random-generator-view.css` | RandomGeneratorView — cards, evolution chain |
| `src/styles/forum-view.css` | FeedView — topic list, messages, composer |
| `src/styles/locations-view.css` | Currently unused (legacy) |

**Convention:** When writing new CSS for a view, write it in that view's dedicated `.css` file. Never add view-specific rules to `index.css`.

---

## Responsive Strategy

- Breakpoints follow Tailwind defaults: `sm` (640), `md` (768), `lg` (1024), `xl` (1280).
- The team builder has two full variants: `TeamBuilderView` (desktop) and `MobileTeamBuilderView` (mobile). AppLayout selects between them based on a `isMobile` check.
- iOS Safari input zoom: Inputs enforce `font-size: 16px` on mobile via the global rule in `index.css` to prevent auto-zoom.
- Touch targets: Interactive elements should be at least 44×44px on mobile.

---

## Accessibility

- Focus ring: Global `*:focus-visible` rule in `index.css` applies `2px solid var(--color-primary)` with `outline-offset: 2px`. Do not suppress `outline` without a replacement.
- Reduced motion: Global `@media (prefers-reduced-motion: reduce)` in `index.css` overrides all animation/transition durations to `0.001ms`. Do not add `!important` overrides that would bypass this.
- Modals use `useModalA11y` (`src/hooks/useModalA11y.js`) for focus trap and escape-key close.
