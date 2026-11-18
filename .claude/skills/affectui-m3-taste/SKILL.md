---
name: affectui-m3-taste
description: >-
  Synthesize all 12 external design references — AffectUI (tactile telemetry,
  Decision Cards, Context Map, Trace Waterfall, Agent Trail, Number Ticker),
  Material Design 3 Expressive (semantic roles, adaptive panes, 0-1-2
  containment, spatial vs effects springs), Emil Design Engineering, Make
  Interfaces Feel Better (Jakub Krehel), Stageshow, Hallmark, Anti UI Slop
  (UIZZE), Impeccable, Taste Skill, Vercel Web Design Guidelines, Anthropic
  Frontend Design, and UI UX Pro Max — strictly inside PokemonBuilder's Neon
  Sticker & Living Scenes system (--space-* grid, Volt/Gold/Live-Pink rules,
  10 themes, franchise devices).
---

# AffectUI × M3 Expressive × 12-Skill Craft — in Neon Sticker & Living Scenes

> **Authority order (`Fantasminha de Plantão`, 2026-11-16):**
> *"Usar contra os nossos tokens, sem trocar paleta ou fontes."*
> `.claude/skills/design-system` (tokens, `--space-*` grid, borders, 10 themes,
> Unbounded + Space Grotesk + JetBrains Mono) and
> `docs/modules/creative_direction.md` (living scenes, franchise devices)
> **always win**. External skills supply anatomy, layout discipline, motion
> physics, and finish gates — never a new palette, font, shadow literal, or
> card-in-card wrapper.

---

## 1 — The 12-Reference Synthesis Matrix ("O que entra vs. O que fica de fora")

| # | Reference / Skill | What enters PokemonBuilder ("Vira aqui") | What stays OUT ("Fica de fora") |
|---|---|---|---|
| 1 | **AffectUI** (`affectui.com`, `flohoeller/affectui`) | Single-line tactile telemetry, **Decision Cards** (1-click mascot tactical fix + undo), **Context Map** (type/hazard coverage matrix), **Trace Waterfall** (stat/speed-tier & meta usage bars), **Agent Trail** (`LiveIsland` / step trails), **Number Ticker** (`<RollingNumber>`). | Zinc/Slate shadcn palette, `backdrop-blur`, card-in-card wrappers, count-up on initial load. |
| 2 | **Material Design 3 UI** (`material-design-3-ui`) | Semantic surface/ink roles, adaptive list-detail & supporting panes (`--page-rail-width`), **0–1–2 containment** (never card-in-card), **spatial vs. effects springs** separation. | Pastel Material You auto-palettes, Material Symbols font, pill-maximised radii everywhere, FABs competing with the dock. |
| 3 | **Emil Design Engineering** (`emil-design-eng`, `animate`, `choreograph`, `gestures`, `animation-performance`) | Unseen details compound: interruptible CSS `transition` for interactive state (keyframes only for one-shot sequences), press sink via `scale: var(--press-scale)` (`0.97`), popover `transform-origin`, circular View Transition theme reveal, composite-only loops (`transform`/`opacity`). | Animating layout (`width`/`height`/`top`/`left`), hover `scale` on full cards/rows, uninterruptible UI transitions. |
| 4 | **Make Interfaces Feel Better** (`make-interfaces-feel-better`, Jakub Krehel) | **Concentric radii** (`inner = outer − padding` or one step down: `--radius-lg` → `--radius-md`), **optical alignment** (`--space-0_5` 2px nudges on play icons/sprites), `font-variant-numeric: tabular-nums` on every figure column, icon stroke weight matching text + `currentColor`, `.touch-target` hit areas. | Raw `rgba()` layered drop shadows (our themes use `--card-sheen`, `--surface-sheen`, and `1px solid var(--color-border)`). |
| 5 | **Stageshow** (`stageshow`, Benji Taylor) | Miniature/showcase product UI (Landing `app-frame`, feature cards, Trainer Dossier previews): real product chrome & tokens at 1:1 scale, 3–7 real strings with quiet context, purposeful crop/bleed, causal beats. | Grey wireframe blobs, whole browser windows shrunk inside a padded box, unexplained cursor loops. |
| 6 | **Hallmark** (`hallmark`, Nutlope) | Hard anti-generated floor: tokens at `:root` only, never `transition: all`, `minmax(0, 1fr)` on image/content grid tracks, instant `:focus-visible` (`--ring-logo`), `prefers-reduced-motion` fallback, ~80-word hero restraint, no purple-to-blue gradients or emoji icons. | Hallmark's ban on mono eyebrows — **override:** Neon Sticker explicitly uses `JetBrains Mono` eyebrows (`≤ 0.75rem`) for kickers and readouts. |
| 7 | **Anti UI Slop / UIZZE** (`anti-ui-slop`, `uizze.com`) | Product-first contract: extend existing components (`HubSwitch`, `TypeChip`, `PartyPips`, `Mascot`, `Switch`, `Loader`) before writing CSS; cover every state (empty, `<Loader scene>`, guest, error, filled); run a hard pre-ship gate. | Generic SaaS KPI tiles, invented social-proof metrics, disconnected template layouts. |
| 8 | **Impeccable** (`impeccable`) | **Surface modes**: `Operate` (Builder, Pokédex, Meta → scanability & precision outrank decoration), `Persuade` (Landing → bold POV & immediate play), `Experience` (Games, Profile stage → artifact leads). Loaded-symbol ban (no Rising Sun radiating rays on red/gold — use rings, halftone, Town Map grid). | Replacing established Neon Sticker tokens or rewriting factual pt-BR copy without cause. |
| 9 | **Taste Skill** (`design-taste-frontend`, Leonxlnx) | Equal left & right content edges (`var(--page-gutter)`), one dominant focus per viewport, one dealt/loud moment per page, real UI over stock filler. | `translateY(-2px)` card hover in app views (**forbidden** by `design-system`: makes dense grids feel *mole*), WebGL/shader backgrounds. |
| 10 | **Vercel Web Design Guidelines** (`web-design-guidelines`) | Semantic HTML (`<button>`, `<dl>`/`<dt>`/`<dd>`, `aria-label` on `btn-icon`), keyboard operability, URL-synced tabs/filters, `16px` mobile input font-size guard, zero `CLS`, safe-area insets. | Generic Geist/monochrome look. |
| 11 | **Anthropic Frontend Design** (`frontend-design`) | Commit to a distinct world: **Living Scenes** (`creative_direction.md`) where official artwork is protagonist, sprites stand on `.type-platform`, evolution lines show progression, silhouettes mean "unknown/locked", and the 3D `Mascot` answers actions. | Safe, interchangeable AI dashboard layouts or introducing a fourth font family. |
| 12 | **UI UX Pro Max** (`ui-ux-pro-max`) | Used **strictly** as an accessibility contrast (`≥ 4.5:1` AA across all 10 themes) and touch-ergonomics (`≥ 44px` thumb zone) audit checklist. | Its 192 product palettes and 74 font pairings — **never** run its style/palette generator here. |

---

## 2 — M3 Expressive in Neon Sticker Tokens

### 2a — Semantic roles across all 10 themes

| M3 Expressive role | PokemonBuilder token | Rule |
|---|---|---|
| `surface` (ground) | `--color-bg` / `.app-shell__content` | Page ground (+ static `--canvas-dots` / `--canvas-shapes` on desktop). On phones `< 1024px`, the page *is* the panel. |
| `surface-container-low` | `--color-surface` | Top-level region panel (`1px solid var(--color-border)` on desktop; borderless on phone). |
| `surface-container` | `--color-surface-raised` | Borderless child card/group inside a bordered panel (desktop). Never place `--color-surface-raised` straight on a phone page. |
| `surface-container-high` | `--color-surface-elevated` | Lifted thumb on `.segmented--quiet` or active control track. |
| `primary` | `--color-primary` (Volt `#7C3AFF` dark / `#6A2BF0` light) | **One primary CTA or hub selection per screen.** As text, always use `--color-primary-text`. |
| `tertiary` (earned) | `--brand-gold` (`#FFD23F`) / `--color-accent` | **Earned only:** peak stat (`StatBar peak`), streak, completed journey/badge, shiny burst. |
| `error / live` | `--brand-live` (`#FF3D9A`) / `--brand-live-text` | **Live / new only:** your-turn battles, unread/pending badge, open daily pulse. |
| `outline` / `outline-variant` | `--color-border-strong` (controls, dashed empty slots) / `--color-border` (regions) | Never use `--color-border` on an input or dashed absent slot — it disappears on light themes. |

### 2b — Adaptive panes (`Operate` mode)

On desktop (`≥ 1024px`), list-detail and builder-inspector surfaces use the shell's shared rhythm tokens so columns align across every route:

```css
.tactical-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) var(--page-rail-width);
  gap: var(--page-gap);
}
```

- Always use `minmax(0, 1fr)` so wide tables, long pt-BR labels, or sprite rails never blow out the grid track (Hallmark #5).
- A third supporting pane only appears from `1440px` upward (accounting for the `13.5rem` nav rail).
- Below `1024px`, secondary/inspector panes become a draggable bottom sheet (`.modal-scrim > .modal-panel`), never a cramped second column and never a second vertical scrollbar (`.app-shell__content` is the sole vertical scroller).

### 2c — The 0–1–2 Containment Self-Audit

Count border depth from `.app-shell__content` inward on every screen:

- **0** = page ground (`--color-bg`, no border)
- **1** = region panel (`--color-surface`, `1px solid var(--color-border)`)
- **2** = inner group (`--color-surface-raised`, **`border: none`**) or whitespace (`--space-4` / `--space-6`)

**Depth 3 (`border` inside `border` inside `border`) is an automatic fail.**
Selected states use `box-shadow: var(--ring-primary)` or `inset 0 0 0 1px`, never a layout-shifting border. Concentric radii step down cleanly (`--radius-xl` 22px → `--radius-lg` 16px → `--radius-md` 10px → `--radius-sm` 6px).

### 2d — Spatial vs. Effects Springs

M3 Expressive and Emil's motion rules split curves into two non-interchangeable jobs:

| Motion class | Token pair | Physics | Use for |
|---|---|---|---|
| **Spatial — travel** | `var(--ease-glide)` + `var(--duration-glide)` (520ms) | Spring ζ 0.72 (+3.8% overshoot, settles ~200ms) | Traveling `.segmented` thumb, `.tabs` underline, `<Switch>` knob, `<RollingNumber>` digits, `LiveIsland` morph. |
| **Spatial — one-shot reward / stamp** | `var(--ease-pop)` + `var(--duration-pop)` (690ms) | Spring ζ 0.42 (+23% overshoot) | `.is-peeling` team slot placement, favourite/check pop, `<Stamp>` mark. Plays **once** on user act, never on load. |
| **Press sink** | `var(--ease-out)` + `var(--duration-press)` (100ms) | Fast start, `scale: var(--press-scale)` (`0.97`) | Buttons, icon buttons, small tactile chips (`.btn-primary` translates 3px onto `--color-primary-lip`). |
| **Sheet / drawer** | `var(--ease-drawer)` + `var(--duration-entrance)` (350ms) | iOS sheet deceleration | Bottom sheets and edge drawers only. |
| **Effects — colour / opacity** | `var(--ease-smooth)` + `var(--duration-fast)` (150ms) / `--duration-slow` (250ms) | **Zero overshoot** | Hover fill (`--color-surface-hover`), border tint, opacity fade. **Never bounce a colour or opacity change.** |

---

## 3 — AffectUI Component Translations (in PokemonBuilder Material)

### 3a — Decision Cards → Mascot Tactical Suggestion

**When:** Builder inspector detects a concrete gap (missing hazard removal, 4× shared Ice weakness, speed tier loss) and offers a 1-click swap or move fix.

```jsx
// Lives inside the bordered builder rail → borderless raised surface (depth 2).
// Never put .sticker on a container card; reserve sticker edges for held slots/sprites.
<article className="decision-card">
  <div className="decision-card__lead">
    <Mascot mood="pensando" size="sm" />
    <div className="type-platform" style={{ '--card-type': 'var(--type-ground)' }}>
      <Sprite pokemon={candidate} className="decision-card__sprite" />
    </div>
  </div>
  <p className="decision-card__body">
    4× gelo descoberto — testar <strong>Landorus-T</strong> no lugar de <strong>Garchomp</strong>?
  </p>
  <div className="decision-card__actions">
    <button type="button" className="btn btn-primary btn-sm" onClick={applyWithUndo}>
      Testar troca
    </button>
    <button type="button" className="btn btn-ghost btn-sm" onClick={dismiss}>
      Ignorar
    </button>
  </div>
</article>
```

```css
.builder-rail .decision-card {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--color-surface-raised);
  border: none;
  border-radius: var(--radius-md); /* concentric inside --radius-lg rail */
}
```

- **Mascot vocabulary:** always pass `<Mascot>` (`src/components/Mascot.jsx`) with real keys from `MOODS` (`src/utils/mascot/catalog.js`): `pensando` / `preocupado` when flagging a risk, `aliviado` when resolved, `orgulhoso` / `confiante` when synergy is strong, `feliz` on completion. Never use `MascotIcon` (boot-splash static glyph) or invent mood strings.
- **Sticker rule:** `--sticker` (`src/index.css:555`) is a `box-shadow` stack (`inset 0 0 0 3px var(--sticker-edge), 4px 4px 0 0 var(--sticker-drop)`), not a colour. Never put `.sticker` on `.decision-card` or any panel/row. When highlighting a held slot or selected Pokémon sprite, set `--sticker-edge: var(--type-a)` on that slot/card.
- **Reversible action:** clicking *Testar troca* applies immediately and triggers `toast.info(…, { actions: [{ label: t('toast.undo'), onClick: revert }] })` — undo beats confirmation dialogs (`design-system/SKILL.md:669`). Only one Decision Card renders at a time.

### 3b — Context Map → Type Synergy & Hazard Matrix

**When:** Builder inspector or Pokédex defensive matchup strip, replacing dense text tables with a proportional visual map.

```css
.coverage-map {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: var(--space-1_5);
}

.coverage-map__cell {
  padding: var(--space-1_5) var(--space-2);
  border-radius: var(--radius-sm);
  border: none;
  /* Canon type mix (design-system §Canon colours) — survives all 10 themes
     without turning Electric/Ground/Rock khaki on dark violet surfaces */
  background: color-mix(in srgb, var(--type-chip) 14%, transparent);
  color: color-mix(in srgb, var(--type-chip) 45%, var(--color-fg));
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
}

.coverage-map__cell--gap {
  /* Dashed = empty / absent / uncovered — MUST use --color-border-strong
     because --color-border vanishes on light themes */
  background: transparent;
  border: 1px dashed var(--color-border-strong);
  color: var(--color-muted);
}
```

- **Colour-is-light law (`design-system/SKILL.md:310`):** never flat-mix a canon type colour into `--color-surface` or `--color-surface-raised` (`color-mix(in srgb, var(--type) 30%, var(--color-surface-raised))` turns yellow/earth hues olive-khaki on dark violet). Use the `14% transparent` tint + `45% --color-fg` ink rule, or a radial lamp under `.type-platform`.
- **Non-colour state (M3 + UI UX Pro Max):** pair tint with crisp mono numerals (`2×`, `4×`, `0×`) or dashed emptiness so colour-blind trainers read weaknesses instantly.

### 3c — Trace Waterfall → Stat Bench, Speed Tiers & Meta Telemetry

**When:** `PokemonDetailView` / `PokemonDetailPanel` stat bench (with speed-tier benchmark ticks) and `MetaUsageView` / tournament usage & win-rate bars.

```css
.telemetry-row {
  display: grid;
  grid-template-columns: 5.5rem 2.75rem minmax(0, 1fr);
  align-items: center;
  gap: var(--space-3);
}

.telemetry-row__value {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.telemetry-row__track {
  position: relative;
  height: var(--space-2); /* 8px canonical bar height */
  background: var(--color-surface-elevated);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.telemetry-row__fill {
  height: 100%;
  border-radius: var(--radius-full);
  /* Stat bench: Volt (--color-primary), peak stat takes --brand-gold.
     Meta rows: Pokémon's primary type mixed toward --color-fg, never raw hex. */
  background: var(--bar-fill, var(--color-primary));
  transform-origin: left center;
  transition: transform var(--duration-fast) var(--ease-smooth);
}

.telemetry-row__tick {
  position: absolute;
  top: 0;
  bottom: 0;
  width: var(--space-0_5);
  background: var(--brand-gold); /* earned benchmark / peak marker */
}
```

- **Pure CSS layout, zero chart libraries:** never pull in Chart.js/Recharts for app telemetry (keep bundle & INP inside `/ux` budgets).
- **Rank & count discipline (`design-system` Taste pass):** ranks (`#1`, `#2`) and counts are plain `tabular-nums` mono figures — never wrapped in pill boxes. Inline meta usage % sits quietly beside moves/abilities/items as muted mono numerals (`48.2%`), keeping one primary accent on the screen.

### 3d — Agent Trail → `LiveIsland` & Step Trail

**When:** Active battle/game HUD (`LiveIsland`), Journey progression, or multi-step flows.

```css
.step-trail {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.step-trail__dot {
  position: relative;
  width: var(--space-3);
  height: var(--space-3);
  border-radius: var(--radius-full);
}

.step-trail__item--done .step-trail__dot {
  background: var(--color-primary);
}

.step-trail__item--active .step-trail__dot {
  background: var(--color-primary);
}

/* Paint the halo ONCE on ::after; loop ONLY opacity + scale (never box-shadow,
   and ONLY on the single active step — never on repeated list rows). */
.step-trail__item--active .step-trail__dot::after {
  content: '';
  position: absolute;
  inset: calc(-1 * var(--space-1));
  border-radius: var(--radius-full);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 28%, transparent);
  animation: step-trail-breathe 2s var(--ease-smooth) infinite alternate;
}

@keyframes step-trail-breathe {
  from { opacity: 1; scale: 1; }
  to   { opacity: 0.35; scale: 0.86; }
}

.step-trail__item--pending .step-trail__dot {
  border: 1px dashed var(--color-border-strong);
  background: transparent;
}

@media (prefers-reduced-motion: reduce) {
  .step-trail__item--active .step-trail__dot::after {
    animation: none;
  }
}
```

### 3e — Number Ticker → `<RollingNumber>` & Bold Figure + Muted Word

- **Reuse `<RollingNumber>`** (`src/components/RollingNumber.jsx`) — never install a second ticker component.
- **Still on first paint:** `<RollingNumber>` renders its initial number motionless and rolls digit columns on `--ease-glide` **only when the user changes a value** (e.g. dragging EV sliders, toggling Level 50/100, updating team synergy score, live turn counters). Counting up from `0` on page load is banned as a template tell.
- **Stat callouts (`ProfileView`, `TrainerCard`, `StreakSheet`):** render `<dd>` (bold mono figure) visually before `<dt>` (muted Space Grotesk word), with zero decorative icons cluttering the label and zero surrounding pill borders.

---

## 4 — Living Scenes & Franchise Devices (`creative_direction.md`)

A tidy arrangement of boxes still fails if the scene does not answer the trainer. Pair telemetry with Pokémon's own visual grammar:

| Need | Generic SaaS Slop (Reject) | PokemonBuilder Living Device (Build) |
|---|---|---|
| Team count off-screen | `"4/6"` pill badge | `<PartyPips team>` (6 pips toned by member type, dim dot when empty) |
| Locked / unknown / next | Grey placeholder icon or `"?"` text | Silhouette (`filter: brightness(0)` mixed to theme) that lights into official artwork on completion |
| Progression / tiers | Generic progress bar with `%` | Evolution line (Gible → Gabite → Garchomp), `<BadgeCase>` gems, `<PixelReveal>`, or `<EggMeter>` cracks (zero-guilt, never resets on a missed day per `drive-motivation`) |
| Daily summary | Analytics dashboard table | `<Receipt>` (`--receipt-paper` / `--receipt-ink`) + `<Stamp>` (`--ease-pop`, `< 600ms`, Gold only on 4/4 earned) |
| Sprite in a list / bench | Floating cut-out on flat grey | Grounded on `.type-platform` (`--card-type`), static battle base |
| Section filter under a hub | Second Volt `.segmented` bar | `.segmented.segmented--quiet` (neutral elevated thumb; only the hub owns Volt) |
| View CSS overriding Tailwind | Single-class `.my-thing` (loses in barrel cascade) | Compound selector `.view-root .my-thing` (`design-system/SKILL.md:795`) |

---

## 5 — Pre-Ship Finish Gate (0–1–2 + Anti-Slop Checklist)

Run every item before claiming a UI/UX task is done (pair with `/verify-ui` in headless Edge at `1440×900` and `390×844`, dark and light):

- [ ] **0–1–2 Containment:** max 1 border between `.app-shell__content` and any datum; zero card-in-card borders; concentric inner radii (`outer − padding` or one token step down).
- [ ] **Strict `--space-*` grid:** `0` ad-hoc `rem`/`px` paddings, margins, or gaps (`--space-0_5` through `--space-16` with underscores, never dots).
- [ ] **Zero raw palette drift:** `0` Tailwind `slate-*`/`gray-*`/`zinc-*`/`amber-*`/`red-*`/`emerald-*` classes and `0` literal hex/`rgba()` colours or shadows in view JSX/CSS.
- [ ] **Canon colour safety:** type colours mixed at `14% transparent` fill + `45% --color-fg` ink (never flat-mixed into dark violet surfaces; never raw type hex as `color:`).
- [ ] **Brand volume:** at most **one** filled Volt primary CTA, **one** loud moment (`.spark-host`, tinted hero, or `.sticker` on a held sprite/slot — never `.sticker` on a container), Gold (`--brand-gold`) strictly on earned items, Live Pink (`--brand-live`) strictly on live/new items.
- [ ] **Typography & figures:** sentence case headings (never shouting `ALL CAPS` above `0.7rem`), `≤ 3` sizes / `2` weights per region, `font-variant-numeric: tabular-nums` on every stat, rank, usage %, and counter.
- [ ] **Motion & springs:** spatial springs (`--ease-glide` / `--ease-pop`) only where something travels or stamps once; `--ease-smooth` (zero overshoot) for colour/opacity; no `transition: all`; loops animate `transform`/`opacity` only (never `box-shadow`); `<RollingNumber>` still on first paint; `prefers-reduced-motion: reduce` respected.
- [ ] **Phone & touch (`< 1024px`):** page is the panel, zero `backdrop-filter`, zero `100vh`/`100dvh`, zero horizontal overflow (`scrollWidth === clientWidth` at `390px`), nothing hover-only, primary action in thumb zone (`≥ 44px` or `.touch-target`).
