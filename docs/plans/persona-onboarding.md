# Plan: persona onboarding, personalised surfaces and the UI/UX pass (2026-11-05)

> **Creative direction (Enzo, 2026-11-05):** the trainer-profile onboarding's creativity — a scene that answers the user, Pokémon's own devices (evolution lines, silhouettes, type colours, artwork) as the UI language — is the standard from now on, "definitivamente". Read [creative_direction.md](../modules/creative_direction.md) before designing any new screen.

Branch `claude/persona-onboarding`. Asked by Enzo with three references: a
phone onboarding card (coloured illustration on top, a curve, an icon tile, a
step pill, one big line, a round arrow, dots), "bad vs good shadow", and a
profile screen redesigned into grouped settings. The references are a
direction, not a spec.

How it works today is in [modules/trainer_profile.md](../modules/trainer_profile.md).
This file has the decisions, the proposals that are **built** (✅) or **still
open** (☐), and the tooling recommendations.

---

## 1. The onboarding

**Built ✅** — `TrainerOnboarding`, the reference's anatomy in this app's
material:

| Reference | Here |
|---|---|
| Illustration on a pink panel | Official artwork on a panel in the **type colour of the question** (Dragon for competitive, Electric for the games, Psychic for minigames), mixed into theme tokens — reads in all ten themes |
| Curve into the white sheet | The card's surface rising as an arc into the scene |
| Dark app-icon tile | The Gengar mark on `--color-inverse`, sitting on the crest |
| "Step 01" pill | Mono pill, "Passo 01", "Seu perfil de treinador" on the result |
| Round arrow + dots | Round primary arrow; dots where the current one stretches (glide spring) |

What makes it dynamic rather than a carousel of slides: **the scene answers
the questions**. Picking an interest lights its Pokémon (the unpicked ones go
grey; the minigames' Mewtwo is a "Quem é esse Pokémon?" silhouette until
picked); the competitive level is drawn as an evolution line — Gible, Gabite,
Garchomp — and the picked stage steps forward; the result stands the persona
alone on the screen's one gold spark burst.

Steps: welcome (with the three things the answers change) → interests (any of
three) → level + format (only if competitive) → persona + three places to
start (each one finishes and goes there). Copy differs for a returning
trainer ("Novidade: …").

Who sees it: a first visitor on every way off the landing (over wherever the
CTA went); an existing trainer the first time they open Home after this ships;
anyone from Home's setup card or Profile → Preferences. Closing it is a skip
and it never comes back on its own.

☐ **Proposals still open**
- A fourth optional question for the games persona: "which game are you
  playing now?" (from `games` in the builder) → seed `selectedGame`, the
  legacy type chart and the Gyms page's region.
- A tiny "why" link on each pick ("porque você escolheu Competitivo") — only if
  analytics show people editing their profile right after finishing.
- Animate the persona reveal with `DecryptText` on the name (the peak-end
  moment the UX skill asks for).

## 2. Personalised surfaces

| Surface | Built ✅ | Still open ☐ |
|---|---|---|
| **Rail** | Sections sorted by interest (`sortNavGroups`); admin stays last | Pin one persona-specific shortcut under the six pinned rows (e.g. Meta for a ranked Strategist) — only if usage shows they reach for it |
| **Phone dock** | 4th tab: Puzzle (plays / unknown), Meta (competitive only), Types (games only) | — |
| **Home** | "Para você" panel: four picks with why (desktop under the hero, phone after the check-in); setup card for no profile; the compact "next step" follows the recommended journey | **Order the Home by persona**: Desafiante → "Seu dia" (puzzle + Champion) above "Para você"; Estrategista → teams panel with the meta threats of the active team first; Viajante → partner + Pokédex progress |
| **Journeys** | "Para você" tag on recommended journeys | A persona journey per profile (e.g. Estrategista: "Leia o meta, calcule um OHKO, exporte para o Showdown"; Viajante: "Monte um time para o próximo ginásio") with its own badge |
| **Builder** | First regulation seeded: playthrough for games-only, OU for singles | Beginner (`competitiveLevel: new`): show the coach tips and explain each analysis line on first use; ranked: open the meta threats panel by default and show usage % on picker cards |
| **Search (⌘K)** | — | Rank the "Pages" group by `personaPicks` when the query is empty |
| **Notifications** | — | Default topics by persona: Desafiante gets the daily puzzle/Challenge nudge pre-ticked when they turn push on |

## 3. UI/UX pass (references 2 and 3)

**Shadows — built ✅.** The light themes `daybreak`, `solar`, `viridian` and
`blossom` drew elevation with neutral black (`rgba(0,0,0,…)`) — on a tinted
page that reads as dirt, the reference's "bad shadow". All five light themes
now use two layers (a tight key light, a wide faint ambient one) tinted with
the theme's own ink (`--color-fg`), like `light` already half did. Dark themes
are untouched: depth there comes from `--card-sheen` (light, not shadow).

☐ Still open on shadows:
- `home-view.css` `.partner-flare` falls back to a raw `rgba(0,0,0,.45)` glow;
  make the fallback `--elevation-2`.
- Audit for any `box-shadow` + `border` on the same element outside dialogs
  (design-system rule) with the skill's drift commands.

**Grouped settings — mostly already there.** Profile has used the reference's
"After" shape since 2026-10-22 (sections with a heading, one card each, rows
inside). Built ✅: the trainer profile is now the first section of
Preferences, in the same row shape. ☐ Open, taken from the reference:
- **Show the current value at the row's end** and open a sheet on tap for
  multi-choice settings (Idioma "Português ›", Tema "Escuro ›", Tamanho do
  texto "100% ›") instead of drawing the control inline — fewer controls on
  screen, the value readable at a glance.
- **The account menu** (`SidebarAccountMenu`) mixes settings and actions in one
  list: split into "Conta" / "Preferências" / "Suporte" groups with headings,
  the way the reference splits Account / Preferences / Support.
- **Mais sheet on phones**: already grouped; add the current persona's section
  first (follows `sortNavGroups`, a one-line change in `moreSheetSections`).

## 4. Tooling — skills and plugins

Already in the repo and worth using for this work: `/design-system` (tokens,
the taste gate), `/ux` (steps, budgets, the `ux-bench` battery), `/verify-ui`
(the browser pass), `/mobile-native`, plus the session-level
`frontend-design` skill and the Playwright MCP plugin.

Worth adding (third-party — read each `SKILL.md` before installing):
- **Vercel `web-design-guidelines`** (`vercel-labs/agent-skills`): audits a file
  against 100+ interface rules fetched fresh at review time — a good pre-PR
  check next to `/verify-ui`.
- **Impeccable `onboard`** (`pbakaus/impeccable`): onboarding-flow design
  heuristics (activation, empty states, progressive disclosure) — useful for
  the open items in §1–2.
- **UI UX Pro Max** (`nextlevelbuilder/ui-ux-pro-max-skill`): priority-ranked
  rule categories and a pre-delivery checklist; overlaps `/ux`, so mine it for
  rules rather than running both.
- **Figma MCP** (already offered by the claude.ai connectors, needs sign-in):
  if Enzo drafts the persona screens in Figma, the agent can read frames and
  tokens directly.
- For richer onboarding motion later: **Lottie** or **Rive** players, loaded
  lazily inside the onboarding chunk only (never on the boot path).

## 5. Round 2 (2026-11-05, same branch)

Enzo's verdict on round 1: "absurdamente incrível… quero ela pro futuro" —
recorded in [creative_direction.md](../modules/creative_direction.md) and the
banner on every main doc. Then four asks:

| Ask | Built ✅ |
|---|---|
| "Para você": one row instead of 2 × 2, icons that move on hover "no próprio design do ícone" | Four vertical tiles in one row (a snapping sideways strip on phones); each icon animates its own SVG parts (`data-motion`, cozy-home.css): trend line redraws, gauge needle sweeps, swords clash, lens scans, puzzle piece turns, crown lifts… |
| Visual inspirations from the "community boards" kit | Extracted into the inspiration bank in [creative_direction.md](../modules/creative_direction.md); used now on the trainer card's numbers and the tiles; the rest are mapped to places (ranking podium, quest pills, inverted chips…) as ☐ |
| A clean profile card everywhere a trainer is shown, with the streak | `TrainerCardDialog` replaces `UserProfileModal` (forum + friends list) — see trainer_profile.md "The trainer card" |
| The share card as a team sheet (no stats), per trainer | The share image's "Ficha": trainer face + "Time de X", six raked cards with art, item, ability, nature and type-signed moves, on the lead's type colour (or six fixed tones) |

☐ Open from round 2: show the card from the Champion ranking (rows carry no
uid yet), the Home's community posts and battle opponents; a "copy sheet as
text" (Showdown paste) beside the image.
