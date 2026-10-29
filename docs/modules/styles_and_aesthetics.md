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
--ease-smooth:    cubic-bezier(0.4, 0, 0.2, 1)    Default — state changes (hover, colour, fill)
--ease-out:       cubic-bezier(0.23, 1, 0.32, 1)  Presses and anything answering one
--ease-drawer:    cubic-bezier(0.32, 0.72, 0, 1)  Sheets and the drawer (the iOS sheet curve)
--ease-bounce:    cubic-bezier(0.34, 1.56, 0.64, 1) Spring/bounce entrances
--ease-spring:    cubic-bezier(0.175, 0.885, 0.32, 1.275)
--ease-out-expo:  cubic-bezier(0.16, 1, 0.3, 1)   Sprite reveals

--duration-press:    100ms   Press feedback
--duration-fast:     150ms   Hover states, micro-interactions, dialog exits
--duration-normal:   150ms   Standard transitions
--duration-slow:     250ms   Sprite reveals, card entrances
--duration-entrance: 350ms   Sheets and the drawer sliding in

--ease-glide / --duration-glide: 520ms   v2 — real spring (ζ 0.72), anything that travels
--ease-pop   / --duration-pop:   690ms   v2 — real spring (ζ 0.42), one-shot rewards
--duration-reveal: 560ms                 v2 — the theme reveal, nothing else

--press-scale:       0.97    How far a pressed button sinks (via the `scale` property)
--control-h-sm/md/lg 1.75 / 2.25 / 2.75rem — shared by buttons, inputs, segmented controls
```

**Hover is gated by the build.** `scripts/lib/postcssHoverGate.mjs` (wired in
`postcss.config.js`) moves every hand-written `:hover` into
`@media (hover: hover) and (pointer: fine)` and re-emits its fill/colour
declarations on `:active` for touch devices. See `docs/wounds.md`, 2026-09-22.

---

## Global Component Classes

These utility classes are defined in `src/index.css` and available everywhere.

### Buttons

```css
.btn              Base — use with a voice
.btn-primary      Solid primary fill — the view's one affirmative action
.btn-secondary    Raised fill, no line
.btn-outline      Hairline (--color-border-strong) on the surface it sits on
.btn-ghost        No chrome until touched — toolbars, row actions, close
.btn-danger       Solid danger fill — destructive actions
.btn-sm / .btn-lg Size (height from --control-h-*)
.btn-icon         Square, icon only (give it an aria-label)
.btn-block        Full width
```

Hover mixes the fill toward `--color-fg` (lighter on dark themes, deeper on light).
Press sinks by `--press-scale` on `--ease-out`. `.btn` rules sit after
`@tailwind utilities`, so a utility on the same element loses — use the modifiers.

### Segmented control, tabs, counts

```css
.segmented             Raised track; chosen item lifted onto it (aria-pressed / aria-selected)
.segmented--sm/--lg/--block
.tabs > .tabs__item    Underlined tabs, indicator in --color-fg (aria-selected)
.count-badge           Mono tabular count inside a tab or segment
```

### Dialogs

`.modal-scrim` > `.modal-panel` (`--sm` … `--full`), with `.modal-header`,
`.modal-title`, `.modal-subtitle`, `.modal-close`, `.modal-body`, `.modal-footer`
(`--ruled` when the body scrolls under it). Put `ref={useModalA11y(onClose)}` on the
panel: it handles Escape, focus in and out, drag-to-dismiss on phones and an exit
animation. Below 640px every panel is a bottom sheet with a grabber.

### Badges

```css
.badge            Base — use with a variant modifier
.badge-success    Green tint
.badge-accent     Accent color tint
.badge-outline    Muted/bordered — metadata labels
```

### Type chips

```css
.type-chip        Standard Pokémon type chip — icon + label, outlined and
                  tinted in the type's canonical colour. Use via <TypeChip>.
.type-chip--sm    Dense rows (move lists)
.type-badge--*    The older solid-fill badge — dense grids only
```

A canon colour (type, game version) is **never written raw into a rule**. It arrives as
a custom property and is mixed into theme tokens — border 45%, fill 14%, label 45%
mixed toward `--color-fg` — so one chip is legible on all six themes. See
`components.md → TypeChip` for the measured contrast behind those numbers.

### Inputs

```css
.field > .field-label       Label above a control
.input-clean / .select-clean / .textarea-clean
                            One height (--control-h-md), --color-border-strong edge,
                            inset primary ring on focus (never nudges the row)
```

---

## Themes

Ten themes in `src/constants/theme.js` (`THEMES` + `THEME_META`), mirrored in
`index.css` under `:root[data-theme="..."]`. Six are free; four are rewards
(locked in the picker until earned — `localStorage.theme` still applies them,
which is how to test one). `applyTheme` writes each theme's colours onto
`:root` inline, so per-theme CSS only adds what `THEMES` has no field for
(`--color-primary-text`, `--color-primary-lip`, `--color-border-strong`).

| Key | Mode | Description |
|-----|------|-------------|
| `dark` | dark | Default. **Neon Sticker** night: Void `#0C0816`, Volt `#7C3AFF` |
| `eclipse` | dark | Near-black, soft violet |
| `midnight` | dark | Navy, cyan |
| `daybreak` | light | Blue-tinted daylight |
| `light` | light | **Neon Sticker** day: lavender paper, Volt `#6A2BF0` |
| `solar` | light | Warm paper, amber |
| `ember` | dark | Reward — warm embers, orange |
| `viridian` | light | Reward — forest green |
| `aurum` | dark | Reward — gold on black |
| `blossom` | light | Reward — fairy pink |

### Neon Sticker (2026-10-26 → shipped as 1.18.0)

"Calm data, loud moments." The full rule table lives in the first section of
`.claude/skills/design-system/SKILL.md`; this is the map.

- **Base layer (everywhere):** flat surfaces with a real 1px border (no sheen
  on `dark`/`light`), one accent (`--color-primary`), canon type colours carry
  meaning. Volt as *text* is `--color-primary-text` (Tailwind `text-primary`
  reads it) — the fill is only 3.4:1 as a word on `dark`'s surface.
- **Brand layer (held objects and moments only)** — tokens in `index.css`
  "BRAND LAYER", valid in all ten themes:
  - `--ring-logo` (ink · pink · gold) = `--ring-focus`: every `:focus-visible`,
    the team slot being edited, the trainer's own frameless avatar.
    `--ring-logo-inset` draws it inward for a control inside a clipping
    container (a card with `overflow: hidden`, a scrolling strip, a tab).
  - `--sticker` / `.sticker` / `--sticker-filter`: filled team slots, the
    hovered or selected Pokémon card, earned badges, hero sprites.
  - `--brand-gold` (+ `--brand-on-gold`, word = `--color-accent`): only for
    something earned — streak, level, badges, rewards, the peak stat.
  - `--brand-live` (+ `--brand-on-live`, word = `--brand-live-text`): only
    for new/live — your-turn battles, pending counts, a live toast.
  - `--spark-burst` / `.spark-host`: one per screen at most.
- **Type:** Unbounded (`--font-heading`) for `h1`, page/dialog-level `h2`
  (`.modal-title`, any dialog's `h2[id$="-title"]`, `h2.text-xl+`, the listed
  view titles) and the large primary CTA (`.btn-primary.btn-lg`). Space
  Grotesk for everything read or operated; JetBrains Mono for figures.
- **Primary button:** Volt on a 4px lip (`--color-primary-lip`); hover deepens
  toward the lip (`--color-primary-fill-hover`) so the label keeps AA; press
  translates onto the lip.
- **Motion:** `.is-peeling` on a slot the user just filled; the global
  reduced-motion rule flattens it with everything else.
- **Measured contrast (2026-10-29, all ten themes, browser-resolved):** fg on
  every ground ≥ 13:1; muted ≥ 4.8:1 on surface/raised/bg; primary text ≥
  4.6:1 on bg and ≥ 5.0:1 on surface; on-primary on primary ≥ 5.0:1 and on its
  hover ≥ 5.5:1; gold word ≥ 5.9:1; live word ≥ 4.8:1; ink on gold 12.6:1,
  ink on pink 5.5:1. The ring always has one layer ≥ 3:1 on the page (gold /
  pink on dark grounds, ink on light ones). Known and accepted: the control
  edge `--color-border-strong` is 1.3–1.9:1 (fields also differ by fill and
  show a Volt edge on focus).

### Adding a New Token

1. Add the value to each theme block in `src/index.css` under `:root[data-theme="..."]`.
2. Add a matching entry in `src/constants/theme.js` in the `colors` object.
3. Add it to the `applyTheme` function so it gets injected at runtime.

---

## Aesthetic Patterns

### Glassmorphism
Cards and panels frequently use `backdrop-blur` with semi-transparent backgrounds. The border is `var(--color-border)` at 1px solid. Do not add a second solid background behind a blur panel — it defeats the effect.

### Micro-Animations — design system v2 (2026-09-24)
Structure stays calm; controls behave like objects. The full rules, the spring
generator and the taste gate are in the `/design-system` skill ("v2 — the material
layer"); the short version:
- **Hover** is a fill or colour change — never a lift on a card (v1, still true).
- **Press:** buttons and small controls sink by `--press-scale` via the `scale`
  property; a `<Switch>` knob stretches toward the side it is leaving.
- **Continuity:** `.segmented` thumbs and `.tabs` underlines *travel* to the new
  selection (CSS anchor positioning on the glide spring; `anchor-scope`-gated,
  older engines keep the per-item fill).
- **Reward:** `useShinyBurst` — the shiny sparkle, once, only from the click that
  earned it (favouriting, flipping to shiny).
- **Figures:** `<RollingNumber>` rolls digits that change while visible; never a
  count-up on load.
- **Theme:** a change spreads from the pressed control as a circular View
  Transition (`chooseTheme(id, originFromEvent(e))`).
- **Entrance:** the page fades in on route change; `.motion-enter` /
  `.motion-stagger` on desktop only. Sprite reveal: `.sprite-fade`.

### Skeleton Loading
Use the `.skeleton` class. It is a shimmer animation that uses `var(--color-surface-raised)` so it adapts to all themes automatically.

### Typography Conventions

**Two faces with separate jobs** (2026-09-14). `--font-display` is JetBrains
Mono and carries the interface's *structure* — headings, panel titles, eyebrows,
nav and tab labels, badges and every figure. `--font-body` is Space Grotesk and
carries the *content* — prose, descriptions, names, inputs. `--font-mono` stays
JetBrains Mono for code and `tabular-nums`. Never set the display face on
running prose, never add a fourth family, and never a serif (tried 2026-08-28,
rejected). See the `/design-system` skill for the tracking and font-weight
consequences of the mono swap.

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
| `src/styles/more-sheet.css` | MobileMoreSheet — the phone's "Mais" tile grid |
| `src/styles/interactions.css` | Design system v2 primitives: `.switch`, `.check`, `.loader`, `.rolling-number`, `.shiny-burst`, `.theme-toggle`, the theme reveal. Loaded after `index.css` (main.jsx) |
| `src/styles/motion.css` | `.motion-enter`, `.motion-stagger`, `.interactive-lift` (desktop entrances) |
| `src/styles/meta-view.css` | MetaUsageView — phone layout only (desktop is utilities) |
| `src/styles/gyms-view.css` | GymsView — phone layout only (desktop is utilities) |

**Convention:** When writing new CSS for a view, write it in that view's dedicated `.css` file. Never add view-specific rules to `index.css`.

---

## Responsive Strategy

- Breakpoints follow Tailwind defaults: `sm` (640), `md` (768), `lg` (1024), `xl` (1280).
- The team builder has two full variants: `TeamBuilderView` (desktop) and `MobileTeamBuilderView` (mobile). AppLayout selects between them based on a `isMobile` check.
- iOS Safari input zoom: Inputs enforce `font-size: 16px` on mobile via the global rule in `index.css` to prevent auto-zoom.
- Touch targets: Interactive elements should be at least 44×44px on mobile.

### The phone layer (< 1024px) — 2026-09-24

- **Chrome.** Solid header (page title on the left edge, glyph actions on the right, a hairline that fades in once content scrolls under it — a scroll-driven opacity animation, `app-shell.css`), solid tab bar with a tinted pill on the current tab, and no sidebar at all: the tab bar's "Mais" opens `MobileMoreSheet` (see components.md). Pages fade in on route change (opacity only, `backwards` fill).
- **No blur on phones** — not on bars, sticky strips, scrims or glass cards. Blur over a scroller is recomputed every frame it moves; phones get opaque fills (and `--scrim` alone behind sheets).
- **The page is the panel.** Views drop their top-level box on phones and their contents take `--color-surface`; controls on the page take `--color-surface` + `--color-border-strong`. Headings are sentence case in the display voice.
- **Motion.** No per-item entrances (`.motion-enter` / `.motion-stagger` are off below lg); infinite animations animate opacity/transform only; skeletons breathe instead of shimmering.
- **Lists.** `content-visibility: auto` on long lists of cheap rows (Speed Tiers); memoised rows where data streams into one map (the database lists).
- **Cascade order.** View stylesheets load before `index.css`, so to override a Tailwind utility on the same element from a view stylesheet, use a compound selector. Details in the `/design-system` skill and `docs/wounds.md`.

---

## Accessibility

- Focus ring: every focusable control gets `box-shadow: var(--ring-focus)` (the Neon Sticker logo ring, 6px) from the `FOCUS` block in `index.css`; Tailwind `focus-visible:ring-2` controls are mapped onto it there too. A ring a container clips is no ring: inside `overflow: hidden`/scrolling containers use `--ring-logo-inset` or give the strip a ring's width of padding (given back with a negative margin), and keep `scroll-padding` on the scrollers so a tabbed control lands clear of the header and the phone dock. Fields keep their own inset Volt edge.
- Reduced motion: Global `@media (prefers-reduced-motion: reduce)` in `index.css` overrides all animation/transition durations to `0.001ms`. Do not add `!important` overrides that would bypass this.
- Modals use `useModalA11y` (`src/hooks/useModalA11y.js`) for focus trap and escape-key close.
