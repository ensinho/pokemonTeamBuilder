---
name: design-system
description: Enforce the strict spacing grid, token vocabulary, and restraint rules that give this app its calm, aligned identity. Use before writing or editing ANY CSS in src/styles/ or src/index.css, before adding a new view, and when auditing drift ("the UI feels loose/soft/inconsistent"). Includes the drift-detection commands.
---

# Design System — the rules that make it feel calm

The app's identity is **restraint**. Calm comes from repetition, not decoration:
few values, used everywhere, landing on a grid. Every rule below exists because
breaking it produced a UI that read as *mole, solto e desconexo* (soft, loose,
disconnected) — see `docs/wounds.md`, 2026-08-28.

## The one rule that matters most

**Never invent a spacing value.** Every `padding`, `margin`, and `gap` must be a
`var(--space-*)` token. Not `0.35rem`. Not `0.4rem`. Not `0.6rem`.

The failure this prevents is subtle and cumulative. One card at `0.35rem` next to
one at `0.4rem` differ by 0.8px — invisible alone, but their edges never line up,
and no amount of polish elsewhere recovers the loss. The eye reads misalignment it
cannot consciously locate as cheapness. Before the 2026-08-28 sweep this codebase
used **58 distinct spacing values**, 27 of them crammed between 0.1rem and 2.5rem.

### The grid

Two tiers, both on a 2px grid. Fine control where components live, coarse rhythm
where layout lives.

| Token | Value | px | Use |
|---|---|---|---|
| `--space-0_5` | 0.125rem | 2 | hairline nudges, icon optical centering |
| `--space-1` | 0.25rem | 4 | tightest gap — icon↔label |
| `--space-1_5` | 0.375rem | 6 | chip padding, dense inline gaps |
| `--space-2` | 0.5rem | 8 | **default small gap** |
| `--space-2_5` | 0.625rem | 10 | button padding-inline (compact) |
| `--space-3` | 0.75rem | 12 | **default component padding** |
| `--space-3_5` | 0.875rem | 14 | input padding-inline |
| `--space-4` | 1rem | 16 | **default card padding / section gap** |
| `--space-5` | 1.25rem | 20 | roomy card padding |
| `--space-6` | 1.5rem | 24 | **section separation** |
| `--space-8` | 2rem | 32 | major block separation |
| `--space-10` | 2.5rem | 40 | page-level rhythm |
| `--space-12` | 3rem | 48 | hero padding |
| `--space-16` | 4rem | 64 | page top/bottom |

Bold rows are the defaults. **Reach for 2 / 3 / 4 / 6 first.** If a layout seems to
need `--space-2_5`, check whether the real problem is a sibling that should have
been `--space-3`.

Underscores (not dots) in token names: `--space-0_5`, not `--space-0.5`. A dot in
a custom-property name is legal CSS but breaks Tailwind's arbitrary-value parser
and several editor tools.

## Radius

`--radius-sm` 6px (badges/chips) · `--radius-md` 8px (buttons/inputs) ·
`--radius-lg` 12px (cards) · `--radius-xl` 16px (modals/panels) ·
`--radius-full` (pills/avatars).

Use `--radius-full` for pills — never `999px` or `9999px`. `50%` is acceptable
only for true circles where the element is known square.

**Nesting rule:** an inner radius must be smaller than its parent's. A 12px card
containing a 12px element reads as a mistake even when it's deliberate. Inner =
parent − 4px, or share a corner.

## Elevation

`--shadow-sm` / `--shadow-md` / `--shadow-lg` / `--shadow-xl` only. They alias
per-theme `--elevation-*`, so they resolve correctly in all six themes.

**Never write a literal `rgba()` shadow.** It will be wrong in at least three of
the six themes — a shadow tuned on `dark` is invisible on `solar` and muddy on
`daybreak`.

Prefer a border over a shadow. Most surfaces need `1px solid var(--color-border)`
and nothing else. Reserve shadow for things that genuinely float: modals,
dropdowns, drag states. Never both on the same element.

## Never nest a border inside a border

**This is the rule that decides whether the app looks calm.** A bordered element
placed inside an already-bordered container draws a box inside a box, and the
effect compounds: the home page once rendered **299 bordered containers, 139 of
them nested**, which is what made it read as busy no matter how well-tokenised it
was.

Inside a bordered panel, children separate themselves with **fill**, not lines:

```css
.panel { border: 1px solid var(--color-border); background: var(--color-surface); }
.panel .card { border: none; background: var(--color-surface-raised); }
.panel .card:hover { background: color-mix(in srgb, var(--color-fg) 7%, var(--color-surface-raised)); }
```

The container owns the border; everything inside owns a fill. Corollaries:

- **A filled button needs no border.** A solid `--color-primary` fill already
  reads as a button.
- **A selected state is an inset ring, not a border**:
  `box-shadow: inset 0 0 0 1px var(--color-primary)`. A real border changes the
  element's size and shifts its neighbours when selection moves.
- **`border-style: dashed` means "empty / absent / locked" — nothing else.** An
  unfilled team slot, an empty-state panel, a locked hint card: correct. A real
  control, a populated card, or a panel that merely wants texture: wrong, because
  it tells the user something is missing when it isn't.
- **A header inside a card rarely needs a divider.** Drop the `border-bottom` and
  let the type hierarchy carry it.

Before adding any border, ask what it separates that a fill or a gap could not.

## Restraint — what NOT to do

The temptation is to add. Calm comes from subtracting.

- **One accent per view.** If everything is highlighted, nothing is.
- **No gradient as decoration.** Gradients are for the one hero surface or a data
  bar that encodes a value. A gradient on a card background is noise.
- **No hover translate on large surfaces.** `translateY(-2px)` on a card makes the
  page feel like it wobbles — that is literally the "mole" complaint. Hover
  belongs in `background-color` and `border-color`. Reserve transform for small,
  clearly-clickable objects.
- **Motion is 150ms or it is wrong.** `--duration-fast` for hover,
  `--duration-slow` (250ms) for entrances. Nothing above 350ms except the
  deliberate sprite blur reveal.
- **Borders separate; whitespace groups.** Before adding a divider, try removing
  it and increasing the gap by one step. It is almost always better.
- **Type: 3 sizes and 2 weights per view, max.** Hierarchy comes from size *and*
  color (`--color-muted`), not from adding weights.
- **Section headings are sentence case, never ALL CAPS.** A heading set in
  800-weight caps at 0.08em tracking is the loudest thing on a page it only meant
  to organise, and caps are measurably slower to scan. Caps survive in exactly one
  place: tiny pill badges (≤ 0.7rem) where the extra tracking genuinely aids
  legibility. Losing caps loses apparent size, so step the size up and the weight
  down when converting one.
- **Don't stack de-emphasis.** `opacity: 0.5` on top of `--color-muted` pushes
  text to the edge of legibility. Muted color alone is the de-emphasis.

## Type

**Do not change the typeface.** Inter for everything, JetBrains Mono for numbers
(with `tabular-nums`). This is a settled decision — calm comes from layout,
density and restraint, not from a new font. `--font-display` and `--font-body`
both resolve to Inter by design; do not point `--font-display` at a serif.

## Alignment

Elements in a column share a left edge. Elements in a row share a baseline. If two
things nearly align but don't, that is the single most damaging thing on the page —
either commit to alignment or make the offset unmistakably intentional (≥ 2 steps).

Sibling cards get identical padding. A grid's `gap` should equal or exceed its
items' internal padding, never fall between.

## Sizing must scale

Size type and spacing in `rem`/`em`, never `px`. The interface-scale control
(`--ui-scale`) works by scaling the root font-size — `px` values silently opt out
and break the layout at non-100% scale. The one exception is the iOS zoom guard
(`input { font-size: 16px }` under 768px).

## Motion

One curve, one duration, unless there is a reason. `var(--ease-smooth)` with
`var(--duration-fast)` covers essentially everything; `--duration-slow` for
entrances. `--ease-spring` / `--ease-bounce` / `--ease-out-expo` exist for
deliberate moments, not for variety.

**Never write a bare `ease`.** It is `cubic-bezier(0.25, 0.1, 0.25, 1)` — a
visibly different deceleration from `--ease-smooth`, so elements animating side
by side settle at different rates. That mismatch is a large part of what reads as
"not fluid".

Scrollable panels get `overscroll-behavior: contain` (the `.custom-scrollbar`
utility now carries it). Without it, reaching the end of an inner list hands the
remaining momentum to the page behind it, and the whole app lurches.

**Never `transition: all`.** It animates layout properties (width, height,
padding) along with the one you meant, which is both janky and expensive. List
the properties: `background-color, border-color, color, box-shadow, opacity,
transform` covers essentially every hover state in this app.

**No infinite animation on a repeated element.** A pulsing glow on one card is a
highlight; the same glow on the fifty cards of a results grid is an alarm, and
fifty forever-animating shadows to composite. If a whole list qualifies for an
effect, the effect is not carrying information — make it static.

## Interaction tokens

Do not hand-write hover/active tints. Use these — they are defined once in
`index.css` and resolve per theme, and they mix toward `--color-fg`, so "raise on
hover" correctly means *darker* on the light themes and *lighter* on the dark
ones:

| Token | Use |
|---|---|
| `--color-surface-hover` | hover fill on any row, tile, card, menu item |
| `--color-surface-active` | selected/current fill (nav item, active tab) |
| `--color-on-primary` | text/icons on a filled `--color-primary` or `--color-danger` |
| `--ring-primary` | selection ring: `box-shadow: var(--ring-primary)` |

A hover tint written inline at each call site drifts, and drift is the whole
reason this document exists.

**Known defect — `--color-on-primary` is white in every theme, and in four of
them that fails.** Measured white-on-`--color-primary` contrast: `midnight`
2.14, `eclipse` 2.72, `solar` 2.94, `dark` 4.13 — all under the 4.5 AA needs for
body text (`light` 6.14 and `daybreak` 5.17 pass). Dark ink would score 8.80 /
6.93 / 6.42 / 4.56 on those same four. Fixing it means computing the token from
the primary's luminance in `applyTheme` (which already writes the theme's colors
onto `:root` as inline properties, so CSS alone cannot do it). That flips the
text on every filled button in four themes, so it is a deliberate visual
decision, not a sweep — do not change it without asking. Until then, a filled
primary button is legible but not AA-compliant on the dark themes; prefer it for
short labels, never for body copy.

**Never write a raw colour.** No hex, no `rgb()`, no `rgba()` for anything that
is part of the interface. Brand colours written as raw triples (`rgba(124, 58,
237, …)`) do not follow the theme — the app shipped 41 of them plus a
`--color-primary-rgb` that was **never defined anywhere**, so its fallback indigo
was wrong in all six themes. The exceptions are Pokémon type/stat colours (canon,
theme-independent) and scrims over photography, where white/black is correct
regardless of theme.

## Drift detection

Run these before claiming a visual task is done. Both should print `0`.

```bash
cd src

# Ad-hoc spacing literals (the cardinal sin)
grep -rhoE "(padding|margin|gap)[a-z-]*:[^;]+" styles/ index.css \
  | grep -oE "[0-9]*\.?[0-9]+(rem|px)" | grep -v "0px" | sort | uniq -c | sort -rn

# Literal shadows (theme-breaking)
grep -rnE "box-shadow:[^;]*rgba" styles/ index.css | grep -v "^\s*/\*"
```

**Undefined tokens fail silently — audit for them.** A `var(--typo)` with no
fallback makes the whole declaration invalid, so the rule just does nothing and
nothing warns you. This app carried 15 of them, including a dot-named
`--space-1.5` / `--space-2.5` / `--space-3.5` (the real tokens use underscores),
which meant a dozen paddings and radii silently did nothing for months.

```bash
cd src
python3 - <<'EOF'
import re, pathlib, collections
files = sorted(pathlib.Path('styles').glob('*.css')) + [pathlib.Path('index.css')]
defined = set()
for p in files:
    defined |= set(re.findall(r"^\s*(--[\w.-]+)\s*:", p.read_text(), re.M))
for p in list(pathlib.Path('constants').glob('*.js')) + list(pathlib.Path('components').rglob('*.jsx')):
    defined |= set(re.findall(r"['\"](--[\w.-]+)['\"]", p.read_text()))
bad = collections.Counter()
for p in files:
    for m in re.finditer(r"var\(\s*(--[\w.-]+)\s*(,|\))", p.read_text()):
        if m.group(1) not in defined and m.group(2) == ')':
            bad[m.group(1)] += 1
for t, n in bad.most_common(): print(n, t)
EOF
```

Legitimate exceptions — `1px` borders, `0`, `100%`, `clamp()` fluid gutters,
`calc()` against a token, and values inside `@keyframes` — are fine; everything
else is drift. When an exception is deliberate, leave a comment saying why, or the
next sweep will "fix" it.

## Layout scroll invariant

`.app-shell__content` is the single scroll container. Anything that should sit at
the bottom of a short page must be pushed there with `margin-top: auto` inside a
`min-height: 100%` flex column — never left to fall under the content, which
creates a phantom scroll that exists only to reveal a footer.

There is exactly one vertical scrollbar in this app. If you introduce a second,
you have made a mistake.

**Size to the screen with `dvh`, never `vh`.** On a phone `100vh` is the *large*
viewport (URL bar collapsed), so anything sized with it runs past the visible
screen. The shell carried exactly this until 2026-09-10 — its scroll container was
~90px taller than the screen, and the page kept scrolling after the screen ran
out. Write `height: 100vh; height: 100dvh;` (fallback first), or better, `100%` of
a parent that already has a definite height.

**Below 1024px there is no page footer.** Site chrome — credit, legal, version,
social links — lives in the drawer tail (`.app-shell__drawer-meta`). A phone page
ends where its content ends; do not add anything that re-creates a footer band.
