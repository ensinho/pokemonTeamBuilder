# UI audit — Profile, Journeys/Rewards, the landing, and a site-wide sweep (2026-10-22)

> Asked for by Enzo, with a calm quiz card (generous padding, quiet type, one
> accent, one outlined pill to move on) as the reference: "investigar e
> analisar a UI e UX de fluxos do meu site, buscando ver onde podem haver falhas
> e inconsistências visuais"; "deixar o layout da landing page mais clean com
> espaço pra respirar"; "perfil mais fácil de mexer e aba de rewards/journey
> também"; mobile and desktop. Every finding below is fixed in this change
> unless it is in **Open**. The root cause is in [the wounds log](../wounds.md)
> (2026-10-22).

Categories (as in the 2026-10-20 audit): **Bug** · **Feedback** · **Layout** ·
**Hierarchy** (the important thing isn't the loudest) · **Consistency** (the same
thing shown two ways) · **Touch** · **i18n**.

How it was measured: headless Chromium against the dev server, a fake Firebase
config (so every page renders as a guest; the signed-in Account tab was checked
by setting `useAuthStore` in the page), 1440×900 and 390×844 (touch), dark and
light. Box counts, touch targets, overflow and page height come from
[`ui-sweep.mjs`](../../.claude/skills/ux/bench/ui-sweep.mjs), run against `HEAD`
and the change side by side.

## Profile (`/profile`)

| # | Category | Finding | Change |
|---|----------|---------|--------|
| P1 | Consistency | Each tab laid its cards out in up to three uneven columns, so a switch, a button or a value sat somewhere different on every tab | One centred 46rem column at every width; a section is a heading on the page over one card of rows, each row words-left / control-right (`SettingRow`, the `.switch--row` arrangement) |
| P2 | Hierarchy | The hero boxed its streak and two stats inside its own box (12 nested boxes on the first tab, 20 on Appearance) | The figures sit under one hairline, divided by hairlines; nothing inside the hero draws a box. Nested boxes 12→0 / 20→5 (the five are the dashed locked themes — dashed means "not there yet") |
| P3 | Consistency | The 27-card badge wall duplicated Journeys → Badges and equipped the same badge a different way | "Featured badge" shows only the earned ones (the same `.badge-tile` as Journeys; tap to show); "See all · n/27" opens Journeys → Badges |
| P4 | Consistency | The Tera switch lived under Appearance — it changes how the builder behaves, not how the app looks | Moved to Preferences → Team builder |
| P5 | Hierarchy | "Synced" said three times on Account (hero pill, card pill, row pill), four sync rows all saying "Synced", the email twice | One line says what syncs; the email once, on Account; "Cloud/Offline" one quiet badge |
| P6 | Hierarchy | Row labels repeated their buttons ("Alterar senha" / "Alterar senha"); "Excluir conta" three times as a section, a label and a button | Labels name the thing (Senha, Este aparelho), buttons the action; delete is the last row of the account card, in the danger tone, button "Excluir" |
| P7 | Touch | The avatar's pencil was `opacity: 0` until hover — never visible on a phone | Always visible, a small elevated dot |
| P8 | Touch | `btn-sm` row buttons were 28px tall on a phone | A 44px tap reach on coarse pointers (the `.touch-target` arithmetic, once, in `profile-view.css`) |
| P9 | Consistency | Outline buttons inside cards (a box in a box) and a white "primary" per card | Filled `btn-secondary` in rows; the only filled primary is the guest's "Create account" |
| P10 | Layout | On a phone the theme hints truncated to three words and an ellipsis; a sun/moon on every card repeated the group heading | Phones show swatch + name (+ lock / check); the mark appears only for the chosen or locked theme |
| P11 | i18n | `EmailVerifyRow`, "Escuros/Claros", the badge subtitle, alt texts, "Edit trainer name", "Cloud/Offline" were inline strings | All in `profile.*` (EN + PT) |
| P12 | Touch | `autoFocus` on the name field threw the keyboard up on phones | Autofocus only on a fine pointer; Enter submits through a real `<form>` |

## Journeys and Rewards (`/journeys`)

| # | Category | Finding | Change |
|---|----------|---------|--------|
| J1 | Hierarchy | Three boxed stats above the tabs repeated what the tabs are about | The figures ride the tabs as `count-badge`s (Journeys 0/5 · Badges 0/27); the missions figure is one line over the list; the "new rewards" count takes the primary |
| J2 | Hierarchy | Badges: ten bordered boxes, most two emblems wide (2,541px at 1440) | Groups stand on the page, apart by whitespace, two columns from 900px (1,317px) |
| J3 | Hierarchy | Every locked reward said "Bloqueado" in words beside the padlock — the loudest thing in the grid | The padlock alone (the word stays for screen readers); the line under the name already says how to earn it |
| J4 | Layout | On a phone, fourteen full-width reward rows, then eighteen filled track pills (3,366px) | Rewards two to a row on phones; the level track is one card of hairline rows that opens on the last level reached and the next four, the rest behind "show more" (2,273px) |

## Landing (`/`, first visit)

| # | Category | Finding | Change |
|---|----------|---------|--------|
| L1 | Hierarchy | The hero was a bordered box with a double gradient and two floating callouts that repeated the demo directly under it | No box; one soft pool of the primary behind the stage; no callouts |
| L2 | Consistency | Sections opened three different ways (a title inside the demo card, a bare title, a centred closing) | Every section opens with the same head — title + one line — on the page, above its box |
| L3 | Hierarchy | Each feature card tinted its title, kicker and link in its own type colour: six accents on one screen | Words in the page's ink; the tone stays in the illustration |
| L4 | Layout | The page ran edge to edge on a wide monitor, sections `--space-12` apart | One 72rem column, sections `--space-16` apart, a calmer eyebrow line instead of a pill |
| L5 | Layout | On a phone, six illustrated cards stacked (4,644px) | The featured card keeps its scene; the other five read as a list (3,683px) |
| L6 | Bug | (introduced and caught in this pass) the hero's glow with a negative inset made the phone page scroll sideways | Insets never pass the page's sides; the sweep's overflow column is clean on every route |

## Figures (HEAD → this change)

| Route | Width | Nested boxes | Page height (px) |
|---|---|---|---|
| `/` landing | 390 | 0 → 0 | 4,644 → 3,683 |
| `/` landing | 1440 | 18 → 15 (type chips, outlined by design) | 2,376 → 2,564 (more air) |
| `/profile` | 1440 | 12 → 0 | 962 → 1,172 |
| `/profile?tab=appearance` | 1440 | 20 → 5 (locked themes) | 991 → 1,291 |
| `/profile?tab=account` | 1440 | 6 → 0 | — |
| `/journeys?tab=badges` | 1440 | 0 → 0, boxes 18 → 5 | 2,541 → 1,317 |
| `/journeys?tab=rewards` | 390 | 0 → 0 | 3,366 → 2,273 |

The profile is taller on purpose: one column of rows with room between
sections, instead of three packed columns. Gates: `vitest` 1,125 passed (the one
failing file, `useSessionGame.test.js`, fails on `HEAD` too — it needs a real
Firebase key); lint total unchanged at 55, nothing in touched files; `vite
build` clean; spacing literals, literal `rgba()` shadows and undefined tokens 0
in the four stylesheets touched.

## Site-wide sweep — open (seen, not changed here)

The same sweep over the rest of the app. Outlined type chips (`.type-chip`)
inside cards are the documented canon-chip standard and are not counted as
findings. Some pages render a guest/loading state without a real Firebase
project (teams, feed, friends, challenge), so their numbers say little.

| # | Category | Where | Finding | Next step |
|---|----------|-------|---------|-----------|
| O1 | Touch | Speed tiers (390) | 462 of 491 controls under 44px | Rows are the target: make the whole row the control, or `.touch-target` on the icon buttons |
| O2 | Touch | Builder (390) | 168 of 252 controls under 44px (picker filters, slot actions) | Same, starting with the slot actions |
| O3 | Touch | Types, Pokédex, damage calculator (390) | 74 / 56 / 53 controls under 44px | Chips as filters need `.touch-target touch-target--y` |
| O4 | Consistency | Damage calculator (1440) | 61 nested boxes: outline `btn`s inside the calculator cards | Filled `btn-secondary` inside cards, as on the profile |
| O5 | Consistency | Meta & usage (both) | 30 `rounded-full` bordered pills inside cards | Fill-only pills (`.badge`) |
| O6 | Consistency | Quiz (1440) | 10 bordered selector pills inside a bordered panel | `.segmented` or fill-only pills |
| O7 | Consistency | Speed tiers / Moves (1440) | `team-builder-field` (bordered) inside bordered lists | A field on a card takes `--color-surface` with no edge, like the phone layer |
| O8 | Hierarchy | Landing demo, light theme | A picked Pokémon's fill (`--color-surface-active`) reads heavy grey | A primary-tinted fill like `.card--selected` |
