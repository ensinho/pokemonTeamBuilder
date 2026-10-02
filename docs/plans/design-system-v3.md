# Design system v3 — audit, direction and rollout

> Started 2026-10-02 at Enzo's request: *"uma evolução real do produto: mais
> sofisticado, clean, organizado, consistente, autêntico"*, with the claude.ai
> interface as the reference for **quality and organisation**, not as a look to
> copy. This file is the record of that work: what was measured before anything
> changed, what the new system is and why, and what was applied where. The
> enforceable rules live in the `/design-system` skill and
> `docs/modules/styles_and_aesthetics.md`; this is the reasoning behind them.

---

## 1. Audit (measured on `main` @ 4745714, before any change)

Method: a script over every stylesheet (`src/index.css` + 35 files in
`src/styles/`, ~28k lines) and every component (~120 `.jsx`, ~21k lines of
views), plus 88 screenshots — 22 routes × 1440×900 / 390×844 × dark / light.

### 1.1 What v1/v2 already solved (keep)

| Area | State | Verdict |
|---|---|---|
| Spacing | 14-stop `--space-*` grid, audited to 0 literals | **Keep.** The grid is the foundation; nothing here changes it. |
| Motion | one curve per job, real springs (`--ease-glide`/`--ease-pop`), 0 bare `ease` | **Keep.** |
| Material layer | `<Switch>`, `<Loader>`, `<RollingNumber>`, `useShinyBurst`, `confirmAction`, travelling `.segmented`/`.tabs` | **Keep.** It is the part that is genuinely *ours*. |
| Dialogs | one `.modal-scrim` > `.modal-panel` + `useModalA11y` for 20 dialogs | **Keep.** |
| Phone layer | "the page is the panel", solid chrome, floating dock | **Keep, and extend the principle to desktop** (see §2). |
| Shadows in CSS | 0 literal shadows outside two documented knobs | **Keep.** |
| Hover gate | build-time `:hover` gating + `:active` copy | **Keep.** |

### 1.2 What is still inconsistent (the v3 work)

**Typography is the next "58 spacing values".** It is now the single largest
source of drift, the way spacing was on 2026-08-28.

| Measure | Value |
|---|---|
| `font-size` declarations in CSS | **677**, only **140** through a `--text-*` token |
| distinct font-size values | **76** (0.5, 0.55, 0.5625, 0.563, 0.6, 0.62, 0.65, 0.675, 0.68, 0.6875, 0.688, 0.7, 0.72, 0.725, 0.75, 0.76, 0.78, 0.8, 0.8125, 0.82, 0.85, 0.875, 0.88, 0.9, 0.92, 0.9375, 0.95, 1, 1.05, 1.0625, 1.1, 1.125 …) |
| arbitrary sizes in JSX | `text-[10px]` ×102, `text-[11px]` ×97, `text-[9px]` ×31, `text-[8px]` ×7, ~40 rem variants |
| **two scales with the same names** | Tailwind `text-sm` = 0.875rem but `--text-sm` = 0.8125rem; Tailwind `text-base` = 1rem but `--text-base` = 0.875rem. A component styled with utilities and one styled in CSS disagree on what "small" is. |
| font weights | CSS: 600 ×241, 700 ×111, **800 ×53**, 500 ×43, 650, 750, 900. JSX: `font-bold` ×344, `font-extrabold` ×47, `font-black` ×5. Space Grotesk tops out at 700, so every 800/900 is a clamp — and the sheer amount of bold is most of why screens read loud. |
| letter-spacing | 21 distinct values |
| line-height | 17 distinct values |
| caps | 30 `text-transform: uppercase` in CSS, **111 `uppercase` + 72 `tracking-wider`** in JSX ("ATRIBUTOS BASE", "DESCRIÇÃO DA POKÉDEX", "CORE DO META", solid "ELÉTRICO" badges) — after a rule that says caps live only in ≤0.7rem pill badges |
| prose in mono | Pokédex flavour text, panel copy and other running text render in JetBrains Mono, against the two-voice rule |

**Radius is tokenised in CSS but not in JSX.** 483 of 542 CSS radii use
`--radius-*`, but Tailwind's own scale (`rounded-lg` 8px ×117, `rounded-xl` 12px
×106, `rounded-md` 6px ×49, `rounded` 4px ×41, `rounded-2xl` 16px ×24) is not the
token scale (6 / 10 / 16 / 22). A card drawn with utilities and one drawn in CSS
have different corners.

**Shadows in JSX bypass the theme.** Tailwind's default `shadow-sm/md/lg/xl/2xl`
(≈70 uses) are black rgba values tuned for white pages — the exact failure the
`--shadow-*` aliases exist to prevent.

**Raw colour.** 133 raw colours left in CSS (tools/damage calc 27, guesser 24,
home 18, battle 14, forum 14 …), 147 hex literals and **161 raw Tailwind palette
colours** (`text-slate-500`, `bg-red-500/20`, `text-amber-400`) in JSX —
`PokemonDetailPanel` 25, `PokemonDetailModal` 25, `GymsView` 22. None follow the
theme.

**Colour contrast (WCAG AA, 4.5:1 for body text) fails in four themes.**

| Pair | Measured | |
|---|---|---|
| `eclipse` muted on surface | **3.89** | every caption in that theme |
| `solar` primary on white (links, active text) | **2.94** | |
| white on primary (`--color-on-primary`): midnight / eclipse / solar / dark | **2.14 / 2.72 / 2.94 / 4.13** | the known defect the skill already lists |
| `light` / `daybreak` muted on raised | 4.47 / 4.43 | marginal |
| `dark` primary on surface | 4.29 | links slightly under AA |

**Too many component systems for one product.**

| Kind | Distinct roots defined in CSS |
|---|---|
| buttons | **67** class roots besides `.btn` (`team-builder-button`, `team-builder-icon-button`, `profile-button`, `home-button`, `pdm__iconbtn`, `forum-*-btn`, `category-guesser__action-btn` …) |
| cards | 41 |
| badges | 38 (+ 33 chip/pill roots) |
| section titles / headings | **85** title roots, ~12 visibly different treatments |
| empty states | 38 roots (one `<EmptyState>` component, 30 uses, plus hand-rolled ones) |
| inputs / search fields | 22 |

`.team-builder-panel`, `.team-builder-field` and `.team-builder-button` — named
after one view — are the de-facto global panel, field and button in 11 views.
`.menu-surface` and `.select-clean` exist and have **zero** JSX call sites.
`TypeBadge` (solid, ALL CAPS) and `TypeChip` (tinted, icon + label) both name a
type, side by side.

**Dead CSS.** 325 classes are defined and never referenced (some are false
positives built from template strings): forum 70, home 59, the whole `pdv__*`
block of `pokemon-detail-view.css` (37 — the desktop detail page stopped using
it), damage calc 31, battle 22, `locations-view.css` (a legacy file) 21.

**Layout: a box around the page.** On desktop the Pokédex grid, the Pokémon
entry, the teams pages and the builder sit inside one large bordered panel
(`team-builder-panel`) on the canvas — a container whose only job is to contain
the page. Inside the Pokémon entry, sections are bordered boxes inside that
panel ("Atributos base", "Descrição", "Linha evolutiva" …). Meta and Tournaments,
built later, put cards straight on the canvas — so two layout models coexist.

**Colour is spent on chrome.** Every primary button, the active-team "Salvar",
fifty "Top Meta Pick" rings + corner sparkles in the builder grid, violet hover
borders (`--color-border-hover` ×51 is primary-tinted), the "Trocar jogo" link —
the brand violet competes with what is actually colourful and meaningful in this
product: the Pokémon, their types and their stats.

**Navigation mixes intents.** "Meus times" (your own work) sits in *PokéData*
next to Moves and Items; the Damage calculator and Speed tiers (building tools)
sit in *Competitivo* with Meta and Tournaments (data); the forum is pinned while
Friends and Battles live in *Atividade*. Labels are Title Case in Portuguese
("Calculadora de Dano"), which the language does not use.

**Shell type voice.** Nav labels, tab labels and the brand are set in JetBrains
Mono 500 — the sidebar reads as a terminal listing, and "Calculadora de Dano"
nearly fills the rail.

### 1.3 Keep / change / remove

| Keep | Change | Remove |
|---|---|---|
| spacing grid, motion tokens, springs | type scale → 9 roles, one scale shared by CSS and Tailwind | the 76 literal sizes, arbitrary `text-[Npx]` |
| two families (Space Grotesk + JetBrains Mono — Enzo's call, unchanged) | which **roles** each family carries (§3.2) | mono on prose and on controls |
| `.btn` / `.segmented` / `.tabs` / `.modal-*` / `<Switch>` / `<Loader>` | primary button becomes neutral-inverted; brand violet marks state | 800/900 weights, caps headings, wide tracking |
| six themes, their hues | four colours tuned to pass AA; per-theme `--color-on-primary`; one gold accent | primary-tinted hover borders, raw palette colours |
| fill-over-border, no nested borders | desktop drops the page-wrapping panel ("the page is the panel" at every width) | `team-builder-*` as global primitives (migrated), `TypeBadge` solid caps, dead CSS |
| Gengar empty state, Poké Ball loader, shiny sparkle | one card, one section head, one list/table, one stat, one badge | `--card-border-*`, `--ease-default`, `--duration-normal` aliases |

---

## 2. Direction — "the Pokédex as an instrument"

A Pokédex is a calm device that reads out facts about colourful creatures. That
is the brief for every screen:

1. **Colour is information.** The chrome is neutral; colour comes from what the
   user is looking at — type, stat, sprite, status. The brand violet marks
   *state* (focus, selection, current, link), never decoration. The view's one
   primary action is neutral-inverted (foreground fill), which is the strongest
   contrast on any theme and leaves the Pokémon as the colour on the page.
2. **One container level.** The page is the canvas, at every width. A card is an
   *object* — a Pokémon, a team, a tournament entry, a usage row. A section is a
   heading and its content, not a box. Nothing draws a box around the page, and
   nothing draws a box inside a box.
3. **Type carries the hierarchy.** Nine roles, three weights, two voices with
   fixed jobs, sentence case everywhere. Hierarchy is size + colour
   (`fg` → `fg-secondary` → `muted`), not more bold.
4. **The instrument voice reads out data.** JetBrains Mono is for what the device
   *displays*: titles, dex numbers, stats, percentages, counts, EVs, labels of
   figures — always tabular, so columns align. Space Grotesk is the human voice:
   prose, names, and every control you operate (nav, buttons, tabs, fields).
5. **Same anatomy on every page.** Shell title → optional lead → toolbar →
   sections (`section-head` + content) → items (card / row / table). The Pokédex,
   the builder, Meta, Tournaments and the move pages are built from the same
   five parts, so they read as one product.
6. **Material, not decoration** (v2, unchanged): controls behave like objects;
   rewards fire only for the user's own act.

What makes it *Pokémon Builder* and not a SaaS template: the mono readout voice
on data, type colour as the only saturated colour in most views, canon stat
colours, sprites as the imagery, the Poké Ball loader, the Gengar empty state,
the shiny sparkle, dex numbers as typography. What it deliberately avoids:
gradients on surfaces, glows, card grids for everything, caps headings, colour
on chrome.

---

## 3. Token architecture

All tokens live in `src/index.css` (`:root` and the six theme blocks), mirrored in
`src/constants/theme.js` for the values `applyTheme` writes, and exposed to
Tailwind in `tailwind.config.js` so a utility and a CSS rule resolve to the same
value.

### 3.1 Colour

| Token | Role |
|---|---|
| `--color-bg` | canvas |
| `--color-surface` | objects on the canvas (cards, sidebar, panels, menus) |
| `--color-surface-raised` | controls and fills inside a surface (inputs, tracks, secondary buttons) |
| `--color-surface-elevated` | things lifted above a surface (segment thumb, popover) |
| `--color-surface-hover` / `-active` | interaction fills (late-bound, mixed toward fg) |
| `--color-border` | region hairline (a whisper) |
| `--color-border-strong` | the visible edge of a control |
| `--color-fg` | primary text |
| `--color-fg-secondary` **new** | reading text that is not the headline: descriptions, prose, secondary lines |
| `--color-muted` | metadata, captions, placeholders, icons at rest |
| `--color-primary` | brand accent = state: focus, selection, current, link, progress |
| `--color-primary-soft` | tinted fill behind a selected/current thing |
| `--color-on-primary` | ink on a primary fill — **per theme now** (dark ink where white fails) |
| `--color-accent` | reward/highlight (favourite, streak, shiny) — **one gold in every theme** |
| `--color-success` / `-warning` / `-danger` / `-info` | status |
| `--color-inverse` / `--color-on-inverse` **new aliases** | the neutral-inverted primary button (fg fill, bg ink) |

Theme values changed for contrast (all now ≥ 4.5:1 on surface, raised and bg):
`dark` primary #7c6ae8 → #8b7cee · `solar` primary #ca8a04 → #9a5f07 ·
`eclipse` muted #737373 → #8a8a8a · `light` muted #71717a → #68686f ·
`daybreak` muted #64748b → #5b6a80 · `solar` muted #78716c → #6f6863.
`--color-border-hover` stops being primary-tinted (it was a raw hex mix per theme)
and becomes a neutral late-bound mix.

### 3.2 Typography

Two families (unchanged): `--font-body` Space Grotesk, `--font-display` /
`--font-mono` JetBrains Mono.

| Role | Token | Size | Face · weight | Use |
|---|---|---|---|---|
| hero | `--text-3xl` | clamp(2rem … 3rem) | mono 600, −0.04em | the home greeting, nothing else |
| display | `--text-2xl` | 1.75rem | mono 600, −0.04em | an entity's name: Pokémon, move, team |
| title | `--text-xl` | 1.375rem | mono 600, −0.035em | a page or panel title inside content |
| heading | `--text-lg` | 1.125rem | mono 600, −0.025em | section heading |
| subheading | `--text-md` | 1rem | mono 600, −0.02em | card title, modal title, group title |
| body | `--text-base` | 0.875rem | sans 400, lh 1.5 | prose, descriptions, list primary text |
| label | `--text-sm` | 0.8125rem | sans 500 | buttons, nav, tabs, fields, menu items, chips |
| caption | `--text-xs` | 0.75rem | sans 400, muted | metadata, helper text, table headers, timestamps |
| micro | `--text-2xs` | 0.6875rem | mono 500 | dex numbers, counters, tags — **floor of the scale** (was 10px; 8–10px text is gone) |

Weights: `--weight-regular` 400 · `--weight-medium` 500 · `--weight-semibold` 600.
Tailwind's `font-bold` / `extrabold` / `black` resolve to 600. Line heights:
`--leading-tight` 1.2 · `--leading-snug` 1.35 · `--leading-normal` 1.5. Tracking:
display −0.04em, heading −0.025em, body −0.011em, caps 0.06em (micro tags only).

Role classes (`.text-display`, `.text-title`, `.text-heading`, `.text-subheading`,
`.text-body`, `.text-label`, `.text-caption`, `.text-micro`, `.figure`) set size,
face, weight, tracking and line height in one class. Tailwind's `text-2xs … 3xl`
map onto the same tokens, so `text-sm` means one thing everywhere.

### 3.3 Spacing — unchanged (`--space-0_5` … `--space-16`).

### 3.4 Radius

`--radius-sm` 6 · `--radius-md` 10 · `--radius-lg` 16 · `--radius-xl` 22 ·
`--radius-full`. Tailwind's scale maps onto it: `rounded`/`-sm`/`-md` → sm,
`-lg` → md, `-xl`/`-2xl` → lg, `-3xl` → xl.

### 3.5 Elevation

`--shadow-sm/md/lg/xl` (aliases of the per-theme `--elevation-1…4`) and
`--ring-focus` / `--ring-primary`. Tailwind's `shadow-*` map onto the same four,
so a utility shadow follows the theme. `--card-border-style/-color/-shadow`
removed.

### 3.6 Motion — unchanged except the dead aliases (`--ease-default`,
`--duration-normal`) and Tailwind's own `ease-out` keyframe timings, which move
onto the tokens.

---

## 4. Components

| Need | Primitive | Replaces |
|---|---|---|
| button | `.btn` + voice `primary` (neutral-inverted) / `secondary` / `outline` / `ghost` / `danger` / `link`, size `sm`/`lg`, `btn-icon`, `btn-block` | `team-builder-button`, `team-builder-icon-button`, `profile-button`, `home-button`, ad-hoc Tailwind buttons |
| field | `.input-clean` / `.select-clean` / `.textarea-clean`, `.field` + `.field-label` + `.field-hint`; `.search-field` (icon + input) | `team-builder-field`, per-view search inputs |
| options | `.segmented`, `.tabs` (unchanged API) | — |
| card | `.card` (+ `--interactive`, `--selected`, `--flush`, `--quiet`) | `team-builder-panel` as a generic box, per-view card shells |
| section | `.section` > `.section-head` (`.section-title`, `.section-meta`, `.section-action`) | ~12 heading treatments |
| list / table | `.data-list` (`__head`, `__row`), numeric cells `.figure` | `.ref-list` (generalised), per-view tables |
| stat | `.stat` (`__label`, `__value`, `__unit`) | stat tiles per view |
| badge | `.badge` + tone (`neutral` default, `primary`, `success`, `warning`, `danger`, `info`, `accent`), `badge--caps` for micro tags | ad-hoc Tailwind pills |
| type | `TypeChip` everywhere a type is named; type icons alone in dense grids | `TypeBadge` (solid caps) — now renders the chip |
| stat bar | `StatBar` — thin canon-coloured bar, label and value in the readout voice | the 16px bar with white digits inside |
| empty | `<EmptyState>` — Gengar, heading role, caption, `.btn` action | hand-rolled empties |
| loading | `<Loader>`, `.skeleton` | — |
| menu | `.menu-surface` / `.menu-item` | — |

---

## 5. Pages, in order

1. Team Builder (desktop + phone)
2. Pokédex and the Pokémon entry (desktop + phone)
3. Meta & usage, Pokémon usage
4. Tournaments, tournament team
5. My teams, team detail
6. Moves / Abilities / Items (lists + entries)
7. Shell: sidebar IA, header, footer, phone dock and More sheet
8. Everything else inherits the foundation (type, weight, radius, shadow,
   colour); Home, Damage calc, Speed tiers, Gyms, Profile, Feed get targeted
   passes as time allows.

---

## 6. Rollout log

*(filled in as each step lands — see the end of this file)*
