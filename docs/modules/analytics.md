# Product analytics and the share loop (2026-10-21)

Two things the site lacked to grow: **any measurement at all**, and a share that
sells itself. Both shipped together because the second is what the first
measures first.

## Analytics (`src/services/analytics.js`)

- **Google Analytics through the Firebase app**, keyed by the existing
  `VITE_FIREBASE_MEASUREMENT_ID`. No id → every call is a no-op (local, CI,
  GitHub Pages without it). Free, unlimited events, funnels and retention in
  GA4. Vercel Web Analytics was the alternative; its custom events need Pro.
- **Never on the boot path.** `initAnalytics()` (main.jsx, after the first
  render) waits for `load` and idle time, then imports `firebase/analytics`,
  which `vite.config.js` keeps in its own `firebase-analytics` chunk (≈7 KB gz)
  — in the shared `firebase` chunk it would have cost every visitor.
- **Crawlers and headless browsers are never counted** (`utils/crawler.js`, shared with auth, which never signs them up anonymously either). A
  test run in headless Chrome will therefore show no analytics requests; use a
  desktop user agent to see them.
- `track(name, params)` is safe anywhere: events raised before the module
  loads wait in a queue of 50.

### The funnel (event names are stable — GA4 reports key on them)

| Event | Where | Params |
|---|---|---|
| `landing_view` | `HomeEntry`, when the first-visit landing shows | — |
| `landing_cta` | every way out of the landing | `cta`: `hero_build`, `hero_pokedex`, `closing_build`, `demo_open_builder`, `feature_<key>`, `skip` |
| `team_first_pokemon` | `useActiveTeamStore.handleAddPokemon` on an empty team | `pokemon_id` |
| `team_saved` | `handleSaveTeam` success | `size` |
| `team_shared` | `shareTeamByData` success | `size` |
| `shared_team_view` | `SharedTeamView` loaded a team | `team_id`, `size` |
| `shared_team_import` / `shared_team_build_own` | its two buttons | `team_id` |
| `reminder_offer_view` / `_accept` / `_dismiss` | the "remind me tomorrow" offer after a daily win (`useReminderOffer`) | `topic`: `puzzle` or `challenge` |
| `team_of_week_open` | the forum's team of the week (`TeamOfTheWeek`) | `kind`: `community` or `tournament` |

Return visits, sessions and countries are GA4's own (no event needed).

**Privacy:** GA sets cookies; under the LGPD a consent banner may be required
before `initAnalytics()` — a product/legal decision, not taken here.

## The share loop

- **A share is a page now:** `/t/:id` (`SharedTeamView`), localized like every
  route. It previews the six with their sets and the builder's verdict, then
  offers *Import into my builder* (the store's `importTeam`, with undo) or
  *Build my own*. Before, a share was `/builder?team=id`, which replaced the
  recipient's team on open; those links now redirect to the page.
- **It unfurls as itself:** `render-meta` reads the team through Firestore's
  REST API (`api/_lib/sharedTeam.js`, the forumMeta pattern) and titles the card
  with its name and members; `og:image` points at **`api/og.js`**, which draws
  the six (satori → resvg-wasm, Space Grotesk WOFF) at 1200 × 630.
- `api/og.js` keeps its static imports to builtins and local modules (the
  battle-turn rule); any miss is a 302 to `/og-image.png`, never a broken image.
  `vercel.json` ships the wasm and the fonts via `includeFiles`. Endpoint count
  is 9 of the Hobby plan's 12.
- `@vercel/og` was tried first and rejected: importing it aborts the process
  (`ENOENT ./hb.wasm`) — the uncatchable failure CLAUDE.md warns about.
- **Daily results unfurl as the result too (2026-10-24).** The PokéPuzzle and
  Champion Challenge share texts link to `/pokepuzzle?r=…` / `/challenge?r=…`.
  The code (`src/utils/resultShareCode.js`, tested) is the board's c/p/a shape
  or the win's numbers: **never the answer, never free text**, decoded strictly
  (a bad code changes nothing). `render-meta` titles the link from it
  (`resultShareMeta` in `seoPages.js`) and points `og:image` at
  `/api/og?puzzle=…` / `?challenge=…` — the same endpoint, so still 9 of 12.
  `og:url` keeps the `?r=` (Facebook and WhatsApp re-read that page); the
  canonical stays the bare game page, so the variants never get indexed.
