---
name: app-screens
description: The market's phone-app screen patterns — splash, welcome, sign-in, the greeting Home, the week strip, the "of the day" hero, avatar rows, horizontal rails, the streak sheet and the label-on-active dock — taken apart from the 2026-11-09 references and rebuilt in PokemonBuilder's own material. Use before designing or restructuring any phone screen (home, welcome, login, onboarding, a dashboard, a profile, a "today" surface), when a screen "parece site, não app", "tá cheio", "não tem cara de app moderno", and whenever someone hands you a Dribbble/Behance-style reference to adapt. Covers what to keep above the fold, where the thumb is, what each reference device becomes here, the files that already implement each recipe, and the audit that proves a screen meets the bar.
---

# App screens — the market's phone grammar, in our material

> **Brief (Enzo, 2026-11-09):** five references — a mascot-led AI app (Milo),
> a podcast app before/after (Poddi), a mood-streak sheet and a cozy journal
> (sign-up, home, splash, welcome) — with the ask: *"reestruturar para mais
> costume com mercado móbile e de design clean e moderno"*, phone first, desktop
> where it fits, Home and login above all. This skill is that work written
> down so the next screen starts from it.

**Scope.** `/design-system` says how a thing is built (tokens, grid, borders,
type, motion curves, the taste gate). `/ux` says how it behaves and how fast.
`/mobile-native` owns the platform layer (safe areas, tap highlight, input
zoom). [creative_direction.md](../../../docs/modules/creative_direction.md)
says what it should *feel* like (a scene that answers, franchise devices). This
skill says **what a phone screen is made of** — the arrangement users already
know from every app on their phone — and how each piece is spoken here. When it
disagrees with one of those four, they win; tell Enzo.

## The one idea

A website shows everything it has. An app shows **what you came for now**, and
keeps the rest one tap away. The references all do the same four things:

1. **Say hello, then get out of the way.** A greeting with the person's name
   and one question ("What are we making today?") replaces a page title and a
   row of filters.
2. **One hero, one action.** Exactly one big surface says the one thing that
   matters today, with its action inside it, in the thumb zone.
3. **Rails, not stacks.** Secondary things run sideways (avatars, cards) so the
   page stays short; a phone Home is two to three thumb-scrolls, not ten.
4. **The chrome whispers.** Navigation is a floating pill whose only loud
   element is where you are; labels appear only where they disambiguate.

Our analogy for it: the old Home was **Bill's PC** — every box open on the
table. The market Home is **the party** — six slots on the belt, the PC one
tap away.

## The references, taken apart (never copied)

Each was decomposed into anatomy; the right column is the device it became
here. Third-party shots are **not committed** to the repo — the anatomy is the
reference.

| # | Reference | Anatomy that makes it work | Our device |
|---|---|---|---|
| 1a | Milo splash | brand colour full-bleed; huge cropped characters bleeding off the corners; giant wordmark; a tagline pill; tiny caps footer | `.boot-splash`: Volt ground, the Gengar mascot huge and cropped at two corners, `<BrandWordmark>`, a mono tagline pill |
| 1b | Milo welcome | a chat bubble that speaks for the product; a trio of characters, each its own shape and colour; two-line headline; full-width pill CTA + dark pill "I already have an account"; a trust line | landing on a phone: the mascot's speech bubble, the three persona Pokémon (Pikachu · Garchomp · Mewtwo — their type colours *are* the trio's colours), CTA stack pinned to the bottom, "Grátis · sem cadastro" |
| 1c | Milo home | "Hey, Alex." + a question; a composer; "Your little dream team" as a row of round avatars with a name and a role; "A little further along" as one big card; a floating pill tab bar whose active tab is the only labelled one | the greeting header; the **party row** (six round slots, name + type, dashed "+" for an empty one); the hero of the day; the dock with label-on-active |
| 2 | Poddi before → after | before: a list of small cards. After: ONE "of the day" card in a soft brand tint with a huge condensed headline, a photo as protagonist and a **mini-player bar** embedded at its foot; 2-up big-image cards in a sideways rail; an icon-only floating dock overlapping content | `.day-hero`: lead Pokémon's type tint, official artwork as protagonist, Unbounded headline, the "player" bar = team progress + round ▶; "Seu dia" as a scroll-snap rail of big-art cards |
| 3 | Mood streak | a sheet, not a page; "You are on a **12 day** Streak!" — light weight, one accent word; a month grid where every day is a face or a ×; today a red "+" | the **streak sheet**: "Sequência de **12 dias**", a month of Poké Balls (caught · missed · today "+"), the mascot's mood answers the state |
| 4a | Journal sign-up | a soft ground with the app icon at the top; a white sheet rising with rounded top corners; centred title + one-line sub; **filled, borderless fields with a leading icon**; a dark pill CTA; "or continue with" + provider pills; "Already have a journal? Log in" | the auth sheet: the partner on its pad on the persona's tint, the form surface rising over it, `.field--filled` with Mail/Lock, the mode switch as a footer link |
| 4b | Journal home | avatar + "Hello, Baskey!" + a 🔥12 pill top-right; a big question as the title; a **week strip** (Mon–Sun columns, today inverted, a face per day); entry cards; a mini tab segment + a FAB | the greeting's gold streak pill; `CheckinWeek` (seven pill columns, today inverted, a Poké Ball per day, "+" is the check-in) |
| 5 | Journal splash + welcome | splash = solid brand + the icon; welcome = a **sticker-collage headline** (words interleaved with little objects), a one-line promise, stacked pill buttons, "Not new? Log in" | landing headline with inline franchise stickers (a type chip, a Poké Ball) — on a phone only, the h1 text unchanged for crawlers |

What we **refuse** from them: emoji faces (the mascot has named moods), stock
photography (official artwork is the protagonist), lime-on-black as a palette
(Neon Sticker already *is* that family: Volt on Void), a new font (the three
families never change), glassmorphism and blur on phones (design-system: chrome
is solid), a FAB that competes with the dock, count-up numbers.

## Recipes

Every recipe lists the anatomy, the rules, and where it lives. A new screen
reuses these pieces before inventing one.

### Splash — `AppLayout.jsx` (`.boot-splash`), `app-shell.css`
- Full-bleed `--color-primary` ground; the mascot icon (`MascotIcon`, the static
  one — never the engine chunk on the boot path) scaled large and cropped by
  the screen edge; the wordmark centred; one tagline pill in mono.
- Timing is `utils/bootSplash.js`'s, never a new floor: invisible for 300 ms,
  ≥ 450 ms once seen. A warm start never sees it.
- The PWA's `background_color` paints before the page: keep it the same family
  so the OS splash hands over without a seam.

### Welcome — `LandingView.jsx` below 640px, `landing.css`
- The landing **is** the welcome on a phone. Its h1, lede and links stay in the
  DOM unchanged: `scripts/lib/prerenderHome.mjs` and `api/_lib/seoSnapshot.js`
  serve that copy to crawlers. Only the arrangement changes.
- Top: brand. Middle: the scene (persona trio + the mascot's bubble). Bottom:
  the CTA stack in the thumb zone — primary "Montar meu time", secondary "Já
  tenho conta" (opens sign-in, the way back for a returning trainer on a new
  device), the skip as a text link — then the trust line.
- Everything below (demo, features) is still there for whoever scrolls.

### Sign in — `AuthModal.jsx`, `auth/AuthDialogShell.jsx`, `auth-dialog.css`
- Phone: one sheet, scene on top (the partner on its pad, persona tint), the
  form surface rising over it with its top corners rounded, title centred,
  fields filled with a leading icon, the CTA a full-width pill, the other mode
  a footer sentence with a link ("Novo por aqui? **Criar conta**"). The mascot
  that covers its eyes at the password stays — it is the only thing on this
  screen no other app has.
- Desktop: the two columns stay; the same fields and footer switch.
- Social sign-in (Google) is its own change: `signInWithPopup` /
  `linkWithPopup` with `browserPopupRedirectResolver` passed **at the call
  site** (`services/firebase.guard.test.js`), `linkWithPopup` for a guest so
  the teams survive, and a `/__/auth` proxy before the catch-all in
  `vercel.json` for iOS standalone. Do not ship it half.

### Home (phone) — `CozyHomeView.jsx`, `components/home/*`, `home-today.css`
The order is the priority list (wounds 2026-09-14): each block earns its place
by being what ≥ 80% of visits need.

1. **Greeting** (`HomeGreeting`): the partner as the avatar (silhouette until
   chosen), "Boa noite, Enzo", the persona's question; the gold streak pill
   (earned → gold) opening the streak sheet; a guest gets an "Entrar" pill
   there instead. Replaces the chip strip and the section tabs.
2. **Week strip** (`CheckinWeek`): this week's seven days as pill columns,
   today inverted; each day a Poké Ball — caught (in the run), dashed (missed),
   "+" today (the check-in, the strip's one loud moment, shiny burst), a dot
   ahead. A muted line under it: the level and what the next check-in pays.
3. **Hero of the day** (`DayHero`): one surface tinted by the lead's type
   (the partner's with no team), official artwork as protagonist, the headline
   in Unbounded, and the **player bar** at its foot: team name, "4 de 6 ·
   cobertura 12/18", a thin progress, the round ▶ that continues. Which hero
   is the persona's call — `personaHero(profile)` in `utils/trainerProfile.js`,
   never decided in the view.
4. **Party row** (`HomeParty`): the active team as six round slots, name + type
   under each, dashed "+" for an empty one; a tap edits the team.
5. **Seu dia** as a rail: big-art cards (the Champion and her six, the puzzle's
   silhouette, the next badge, the meta's leader), scroll-snap, the next card
   peeking at the edge. The hero's subject is not repeated in the rail.
6. Then the persona's blocks (`personaHomeOrder`), the journey's next step,
   *Hoje no Centro*, and the guest card **only once there is progress to
   save**.

Budget at 390×844: greeting, the strip and the hero's headline and action are
above the fold; the whole Today fits in ~3 screens (was ~5).

### Home (desktop) — same file, ≥ 1024px
Same order, two columns: main = greeting, hero (its player bar carries the
party row inline), the persona's blocks; rail = the week strip, *Hoje no
Centro*, the journey. No section tabs: Teams, Community and Journeys have
routes of their own, one click away in the rail.

### Streak sheet — `components/rewards/StreakSheet.jsx`
- A `BottomSheet`/dialog, never a page. Title "Você está numa sequência de
  **N dias**" (one accent word, `.accent-word`), the mascot above it with the
  mood the state earns (`radiante` checked in today, `acenando` waiting for
  today's, `sonolento` no run), the month as a grid of balls from the same pure
  util as the strip, then shields and the record as "figure + muted word".
- The history is *derived*: the check-in stores a count and a last day, not a
  diary. The grid draws the run as the streak counts it (the last N days up to
  the last visit) and says so; never invent per-day activity it cannot know.

### Dock — `AppLayout.jsx` (`.app-shell__tabbar`), `app-shell.css`
- The active tab is a pill that carries its label; the others are glyphs with
  an `aria-label`. The pill's width travels with the selection (continuity);
  the compact-on-scroll capsule stays.

## The audit (run it on any phone screen)

At 390×844 and 360×740, dark and light (`/verify-ui` §2 has the harness):

- [ ] **Above the fold:** the greeting/title, the one hero and its action are
      visible without scrolling; nothing above them is chrome that repeats the
      page title.
- [ ] **One primary** (filled Volt) per screen; the hero's action is it.
- [ ] **Thumb zone:** the primary sits in the bottom two-thirds, ≥ 44px tall.
- [ ] **Rails:** every sideways rail scrolls *itself* (`scrollWidth >
      clientWidth` on the scroller), snaps, bleeds to the screen edge and
      never scrolls the page sideways (document `scrollWidth` = viewport).
- [ ] **Screens of scroll:** report it (`scrollHeight / clientHeight` of
      `.app-shell__content`); a Home over 4 needs a reason.
- [ ] **Same object once:** the hero's subject is not also a card below it.
- [ ] **Every block has an empty state** that offers the next step.
- [ ] **pt-BR strings** (20–30 % longer) fit — check "Construtor", "Comunidade",
      the greeting with a long name.
- [ ] **Reduced motion:** the state still changes, nothing travels.

## Anti-patterns (each one seen in this codebase before 2026-11-09)

| Seen | Instead |
|---|---|
| A header title, a chip strip and a tab bar (≈190px) before any content | the greeting; chips become what they describe (partner → avatar, streak → pill) |
| A card inside a scene inside a card (three surfaces) | one tinted surface; the copy sits on it |
| Section tabs inside a page that also has a dock | the sections are routes; the page is one priority list |
| Nine blocks stacked on "Today" | the recipe's six; the rest is a route away |
| Every reward rendered as a card (the check-in card ~350px) | a strip; the full card lives on the Rewards tab |
| The same team in the hero, the party row *and* the list | the hero says the status, the row shows the members, the list (desktop / `/teams`) shows the others |
