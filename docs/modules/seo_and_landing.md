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

- **JSON-LD** (`structuredData`): `Organization` everywhere; `WebSite` +
  `SearchAction` on Home; `WebApplication` on Home and the tool pages;
  `Article` + `FAQPage` on a guide; `BreadcrumbList` below Home. The SearchAction points at
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

### Pokémon pages in tournaments (2026-10-23)

People search "best team with Garchomp". `src/utils/tournamentPresence.js`
(pure, tested, Node-safe) reads the baked `tournaments.json`: how many recent
teams carried the Pokémon, the latest of them and its most frequent partners
(tournament ids are base species, so a Mega counts as its base). The Data tab
shows it as **Em torneios** (`TournamentPresence.jsx`, the hook
`useTournamentPresence`; a card on desktop, a band on the phone), and the
prerender writes the same teams and partners as links on `/pokemon/:name` and
`/meta/:name`. The Competitive tab's tournament list shows six teams, the
prerender six, the Data tab three with a link to the rest.

### Best teams (`/best-teams`, 2026-10-24)

`BestTeamsView` over `src/utils/bestTeams.js` (pure, tested): of the baked
tournament teams, those in the regulation most of them are in — the top
finishes (`placementRank`: the number wins, so "31st" is not "1st"), the most
used Pokémon and the pairs most often together. Every Pokémon and team is a
link; the prerender writes the same three lists. In the Competitive nav
section, the sitemap (weekly, 0.8) and `STATIC_PAGES`. The tournament card is
`TournamentTeamCard.jsx`, shared with `/tournaments`.

### Most used build (2026-10-24)

"Best Garchomp build" is the question. `src/utils/mostUsedBuild.js` (pure,
tested) takes one entry of the default format's usage file: the top item,
ability, spread, Tera and four moves, each with its share. The Data tab shows
it above *Em torneios* (`MostUsedBuild.jsx`, hook `useMostUsedBuild`), and the
prerender writes the same rows (`render-meta` reads `usage-index.json`'s
default format; `seoSnapshot`'s `build`). The tournament card and the
prerender link to `/best-teams`, which is also in the prerendered nav.

### Indexed pages must be in the page's language

`/pt/damage-calculator` was indexed in Portuguese and drawn in English until
2026-10-24; its copy is now `damageCalc.*`. Game terms (moves, abilities,
items, natures) stay as the games print them in English, and the copied calc
keeps Showdown's English format. Before adding an indexable route, make sure
its screen speaks both languages, not just its title.

### What AI crawlers read (2026-10-30)

Answer engines (ChatGPT search, Perplexity, Claude) and their crawlers do not
run the app: they read `render-meta`'s HTML. Measured on production with
GPTBot's user agent, most tool and reference pages were 13–35 words. What
changed (Organicus AI-readiness report, Enzo):

- **The English home is prerendered at build time** (`scripts/lib/prerenderHome.mjs`)
  because Vercel serves `/` as the static `index.html`, never through the
  function; `render-meta` reads the clean template from `dist/shell.html`.
- **Existence:** unknown paths and unknown Pokémon / tournament teams / types /
  guides are **404 + `noindex`**; the visitor's own pages are 200 + `noindex`
  (`NOINDEX_ROUTES`); a move/ability/item the dex cannot describe is 200 +
  `noindex` (the app still draws it from PokéAPI) and is left out of the sitemap.
- **First paragraph:** the prerender is breadcrumb → `<main>` (H1, then the
  page's definition) → `<footer>` with the brand and the site links. Before,
  every page's first `<p>` was the word PokemonBuilder.
- **Moves, abilities and items** carry their facts: type, category, power,
  accuracy, PP and effect (battle-dex.json); an ability's effect and holders and
  an item's effect and Mega target (`public/data/seo-dex.json`,
  `scripts/build-seo-dex.mjs` — offline, from the installed `@pkmn/sim`, rebuilt
  by every build).
- **JSON-LD:** `Organization` (with founder and GitHub `sameAs`) on every page;
  `WebApplication` with a `featureList` (`content/structuredCopy.js`, only what the page
  does) on Home and the tools; `Article` + `FAQPage` on a guide.
- **Titles and descriptions** were rewritten to say the subject (the English
  builder and calculator titles lacked "Pokémon") and to sit between ~115 and
  158 characters. The old ones claimed the calculator and speed tiers load your
  team — they do not; keep feature claims to what the code does.
- **Data notes** ("Where does this data come from?", `utils/dataNotes.js` +
  `DataNotes.jsx`): Best teams and Meta & usage state their source, sample and
  freshness; the prerender writes the same paragraphs, and `/meta`'s HTML lists
  the default format's top 30.
- **`public/llms.txt`**: what the site is, its sources, what it does not do, and
  its key pages and guides.

### Guides (`/guides`, `/guides/:slug`, 2026-10-30)

`GuidesView.jsx` over `src/content/guides.js` (text, both languages) and
`src/content/guideIndex.js` (slug, date, title, description — small, because
`seoPages.js` reads it on every route). Written for the questions the report
showed the site missing from: a first VGC team (speed tiers, damage
calculator, Switch), choosing a team from tournament data, and how team
builders compare. Section headings are questions; every answer links to the
tool that does it. `guides.test.js` keeps the languages on the same structure
and links, and checks every link is a real route. Only claim what the site
does today and what a competitor's own pages say (Pikalytics, checked
2026-10-30). In the Competitive nav section and the sitemap.

## 4. Sitemap

`scripts/build-sitemap.mjs` (prebuild) lists each page once per language with
`xhtml:link` alternates. It now also lists `/types`, the 18 `/types/:type`
pages, `/challenge`, and `/items/:slug` for the battle items only
(`battle-items.json`, not PokéAPI's 2000). Moves and abilities still come from
PokéAPI at build time and are skipped when offline.

`<lastmod>` comes from the data, never the build time (Google ignores a lastmod
that changes on every deploy): the tournaments' `generatedAt` for
`/best-teams` and `/tournaments`, the usage file's for `/meta/*`, and the later
of the two for Pokémon pages. Pages with no dated source carry none.

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
- While it is up, `useLandingStore.isOpen` is true (set by `HomeEntry`): the
  shell drops the phone dock (and its bottom reservation, `.is-landing`), so the
  CTAs are the only way forward, and `useFirestoreTeamsStore` keeps the
  "couldn't load your saved teams" toast off it — a first visit has no teams to
  lose (the error still goes to the console).
- The demo runs the builder's real `analyzeTeam` / `rateTeam`; "Open this team in
  the builder" adds the members through `handleAddPokemon` (optimistic slots), so
  the hand-over is instant.
- Its copy (`landing.*`) is also what the prerender writes for `/`.
- **The banner** (`.landing-banner`) is the page's one hero surface and the one
  place it uses a gradient — since 2026-10-22 a single soft pool of the theme's
  primary behind the stage, with no box around the banner (it stands on the
  page like every heading). Copy on the left — the eyebrow line, the headline,
  the CTAs, the figure strip — and on the right the **stage**: the demo's six as
  a party on two tiers (feet above the front row's heads, so no one hides
  anyone), animated, each on a battle platform, in front of a Poké Ball drawn
  in hairlines. Nothing floats over it: the two callouts that used to repeat the
  demo's verdict were removed. The page is one centred 72rem column; every
  section opens with `.landing-section-head` (title + one line), and sections
  are `--space-16` apart.
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
  `--feature-tone`, a canon type colour mixed into tokens — in the illustration
  only; titles, kickers and links stay in the page's ink (one accent per view).
  Below 640px the five smaller cards drop their illustration and read as a list. The mini chart
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
