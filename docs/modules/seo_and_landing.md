# SEO, languages in the URL and the landing (2026-10-21)

What a search engine, a link preview and a first-time visitor see. Built because
the site had **no Portuguese page Google could index**: the language was chosen
in the browser (`navigator.language` + localStorage), every URL served both
languages, and Googlebot (en-US, no storage) only ever saw English.

## 1. The language is in the URL

| URL | Language |
|---|---|
| `/pokemon/charizard` | English (the root, `x-default`) |
| `/pt/pokemon/charizard` | Portuguese (`pt-BR`) |

- **`src/utils/localePath.js`** is the one definition (pure, imported by the
  server too): `splitLocalePath`, `localizePath`, `routerBasename`,
  `resolveArrivalLanguage`, `alternateUrls`.
- **`src/components/LocaleRouter.jsx`** replaces `BrowserRouter`. The basename is
  the deploy base plus the prefix, derived from the *same* location the router
  renders — so `/pt/builder` and `/builder` are both the app path `/builder`, and
  no route, `navigate('/x')` or `<Link to="/x">` ever mentions `/pt`. Links render
  as `/pt/x` inside Portuguese pages, which is what lets a crawler stay in one
  language.
- **Never pass the basename as a separate prop that changes on its own.** For one
  render it disagrees with the location, the router matches nothing and unmounts
  the whole app. That is why `LocaleRouter` exists instead of
  `<BrowserRouter basename={...}>`.
- **Arrival:** an explicit choice (`localStorage.language`, the account
  preference) wins, then the URL prefix, then the browser — and the browser is
  only asked about an unprefixed URL. So a Brazilian browser opening `/builder`
  continues at `/pt/builder`, while a crawler gets exactly the language the URL
  names. `main.jsx` settles the address before the router mounts.
- **After arrival the store is the authority and the URL follows it:**
  `setLanguage` → `mirrorLanguageInUrl` (`src/services/localeHistory.js`), a
  history *replace* (a language switch is not a step for Back). A Back into an
  entry recorded in the other language is rewritten to match.
- Code that turns a full URL into an app path (the push-notification tap in
  `useNotifications`) must strip the prefix with `splitLocalePath`, not just the
  deploy base.
- `robots.txt` mirrors every `Disallow` under `/pt/`.

## 2. One table of titles, read on both sides

`src/utils/seoPages.js` → `pageMeta(appPath, language, { pokemon, team, name })`
returns title, description, image, canonical path and breadcrumbs for every
route it knows; the copy lives under `seo.*` in `translations.js`.

- **Server:** `api/render-meta.js` → `buildPage()` writes it into the shell: `<html
  lang>`, title, description, canonical (self-referencing per language), hreflang
  `en` / `pt-BR` / `x-default`, `og:locale`(+`alternate`), Open Graph/Twitter,
  JSON-LD, and the prerendered body (below). The language comes from the URL
  only — never `Accept-Language`.
- **Client:** `useDocumentMeta` uses the same table for every route the table
  knows, whatever text the view passes, so the title in the HTML is the title
  after hydration. A view's own text is used only for routes the table does not
  know (battles, profile, 404) or with `override` (an open forum topic). Views
  with data pass it as a lookup (`pokemon`, `team`, `name`).
- **A new indexable route:** add it to `STATIC_PAGES` (or a dynamic branch in
  `pageMeta`), add `seo.<key>` in **both** languages (`seoPages.test.js` checks
  parity and length), add it to `scripts/build-sitemap.mjs`.
- Shared files under `src/` that the server imports (`localePath`, `seoPages`,
  `typeMatchups`, `translateCore`, `constants/typeChart`, `constants/translations`)
  must stay Node-safe: no asset imports, no `import.meta.env`, explicit `.js`
  extensions. `typeChart.js` and `translateCore.js` were split out of `types.js`
  (PNG imports) and `translate.js` (reads the store) for exactly this.

## 3. Structured data and the prerendered body

- **JSON-LD** (`structuredData`): `WebSite` + `SearchAction` and `WebApplication`
  on Home; `BreadcrumbList` everywhere else. The SearchAction points at
  `/pokedex?q=`, which `PokedexView` honours — keep it that way or drop the
  action.
- **Prerender** (`api/_lib/seoSnapshot.js`): the page's text as plain HTML inside
  `#root` — headings, the description, a Pokémon's weaknesses / resistances /
  base stats, a type's matchups and Pokémon, the Pokédex's full list, the
  landing's copy — all as real links in the page's language. It is for readers
  that never run the app (link previews, AI crawlers, Bing's first pass, Google
  when its render budget runs out). React's `createRoot` replaces it on mount;
  it is visually hidden until then (`.seo-prerender` in `index.html`). **It must
  only say what the rendered page says.**

## 4. Sitemap

`scripts/build-sitemap.mjs` (prebuild) lists each page once per language with
`xhtml:link` alternates. It now also lists `/types`, the 18 `/types/:type`
pages, `/challenge`, and `/items/:slug` for the battle items only
(`battle-items.json`, not PokéAPI's 2000). Moves and abilities still come from
PokéAPI at build time and are skipped when offline.

## 5. Type chart (`/types`, `/types/:type`)

`src/components/views/TypesView.jsx` (+ `types-view.css`), on the entity-detail
cards. The matchups come from `src/utils/typeMatchups.js` (pure, tested), which
the prerender uses too. Types and Pokémon are `<Link>`s, not buttons, so the
pages are crawlable from each other.

- `/types`: the hero is split (copy | the 18 types), the chart fills its card
  (fixed table layout) with a row/column crosshair, and from 1280px it sits
  beside **Combine two types** in the rail column — pick one or two types for
  the 4× / 2× / ½ / ¼ / 0 tiers (`comboDefense`) and the Pokémon with exactly
  that typing. On a phone the chart's row heads are icon-only and sticky.
- `/types/:type`: the hero's right half shows the type's three strongest
  Pokémon by base stat total, animated.

## 6. The landing (first visit to `/`)

- `HomeEntry.jsx` decides on mount: landing for a first visit, `CozyHomeView`
  otherwise. "First visit" = none of `ptb:landingSeen`, `ptb:authSnapshot`,
  `ptbActiveTeamId` in storage (`src/utils/landing.js`), no saved teams, not
  signed in with an account. A crawler is always a first visit.
- Every exit marks it seen; "Go to my home" also swaps to the dashboard at once.
- The demo runs the builder's real `analyzeTeam` / `rateTeam`; "Open this team in
  the builder" adds the members through `handleAddPokemon` (optimistic slots), so
  the hand-over is instant.
- Its copy (`landing.*`) is also what the prerender writes for `/`.
- **The banner** (`.landing-banner`) is the page's one hero surface and the one
  place it uses a gradient (a wash of the theme's primary from the stage's
  side). Copy on the left — the eyebrow pill, the headline, the CTAs, the figure
  strip — and on the right the **stage**: the demo's six as a party on two tiers
  (feet above the front row's heads, so no one hides anyone), animated, each on
  a battle platform, in front of a Poké Ball drawn in hairlines. Two floating
  callouts show the builder's real verdict on exactly that six (types resisted,
  shared weaknesses); on phones they drop under the stage as one row.
- The demo is its own section under the banner (picker beside the verdict on
  wide screens); its cards animate only the Pokémon on the team (the bench is
  the still frame). A figure strip under the CTAs (1025 Pokémon · 18 types ·
  `THEME_META.length` themes · `LANGUAGES.length` languages) — computed, never
  typed in.
- Features (`src/components/landing/LandingFeatures.jsx`) are laid out like the
  patch notes: the **Champion Challenge** is the featured card — Cynthia walking
  in place (the room's local overworld sheet, `CYNTHIA_SHEET`), her Garchomp,
  today's six as "?" (the real team is drawn at midnight) — and the other five
  each carry an illustration of their own, all from real data: the builder's
  shared weakness (`analyzeTeam`), Gardevoir's base stats, base Speeds, battles
  per format from `usage-index.json` (15 KB, not the usage files), and the
  starter triangle from `typeMatchups`. Each card's identity is
  `--feature-tone`, a canon type colour mixed into tokens. The mini chart
  restates the chart's tones in `landing.css` because `types-view.css` only
  loads with the type pages.

## Animated sprites (`AnimatedSprite`)

`src/components/AnimatedSprite.jsx` draws Showdown's animated sprite from the
PokeAPI sprites mirror, keyed by id (`getPokemonAnimatedSpriteUrl`, jsDelivr,
service-worker cached) — no Showdown name slug to get wrong. **Showcase spots
only, never a list:** each GIF is 50–110 KB and loops. It falls back to the
static pixel sprite for `still`, `prefers-reduced-motion`, Data Saver, and a
GIF that fails to load; the still frame carries `data-still` for styling.

## What only the owner can do

Verify the domain in **Google Search Console** and **Bing Webmaster Tools**,
submit `https://pokemonbuilder.app/sitemap.xml`, and watch the *International
targeting* / hreflang report and impressions by country. Indexing of the `/pt`
pages typically takes weeks.
